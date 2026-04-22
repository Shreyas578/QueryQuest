const { EVENTS, ROOM_STATUS, QUESTION_TIME_LIMIT, RESULTS_DISPLAY_TIME, LOBBY_COUNTDOWN, BASE_SCORE, TIME_BONUS_FACTOR, ELO_K_FACTOR, QUESTION_TYPE } = require('../config/constants');
const RoomModel = require('../models/room.model');
const UserModel = require('../models/user.model');
const SandboxService = require('./sandbox.service');
const questions = require('../data/questions.json');

/**
 * GameService — in-memory game state manager.
 * One entry per active room in `activeGames` map.
 */
const activeGames = new Map(); // roomId → GameState

const GameService = {
  // ── Bootstrap ──────────────────────────────────────────────────────────────
  async startGame(io, roomId) {
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error('Room not found');

    const players = await RoomModel.getPlayers(roomId);
    if (players.length === 0) throw new Error('No players in room');

    await RoomModel.updateStatus(roomId, ROOM_STATUS.IN_PROGRESS);

    // Select questions by difficulty
    const pool = _selectQuestions(room.difficulty, room.num_questions);

    const gameState = {
      roomId,
      io,
      room,
      players: players.map(p => ({ ...p, score: 0, answers: [] })),
      questions: pool,
      currentIndex: -1,
      currentTimer: null,
      resultsTimer: null,
      answeredSet: new Set(), // userIds who answered current question
    };

    activeGames.set(roomId, gameState);

    // Check if all players are ready
    const allReady = await RoomModel.areAllPlayersReady(roomId);
    if (!allReady) throw new Error('Not all players are ready');

    // Countdown then start
    await _sendCountdown(io, room.code, LOBBY_COUNTDOWN);
    _nextQuestion(gameState);
  },

  // ── Answer submission ──────────────────────────────────────────────────────
  async submitAnswer(roomId, userId, answer) {
    const gs = activeGames.get(roomId);
    if (!gs) return;
    if (gs.answeredSet.has(userId)) return; // already answered

    gs.answeredSet.add(userId);
    const q = gs.questions[gs.currentIndex];
    const timeLeft = q._timeLeft ?? 0;

    let correct = false;
    let error = null;
    let resultRows = [];

    if (q.type === QUESTION_TYPE.MCQ) {
      correct = String(answer).trim().toLowerCase() === String(q.correct_option).trim().toLowerCase();
    } else {
      // SQL question — run in sandbox
      const res = await SandboxService.execute(answer, q);
      correct = res.correct;
      error = res.error;
      resultRows = res.result;
    }

    const score = correct ? BASE_SCORE + timeLeft * TIME_BONUS_FACTOR : 0;
    const player = gs.players.find(p => p.id === userId);
    if (player) {
      player.score += score;
      // Store full result details to reveal later
      player.lastResult = {
        correct,
        score,
        error,
        resultRows,
        correctAnswer: q.type === QUESTION_TYPE.MCQ ? q.correct_option : q.answer_sql,
        explanation: q.explanation,
      };
      player.answers.push({ questionIndex: gs.currentIndex, ...player.lastResult });
    }

    // ── Scoreboard broadcast removed from here to prevent early revelation ──

    // If everyone answered, advance early
    if (gs.answeredSet.size >= gs.players.length) {
      _endQuestion(gs);
    }
  },

  // ── Socket map (userId → socketId) ────────────────────────────────────────
  registerSocket(roomId, userId, socketId) {
    const gs = activeGames.get(roomId);
    if (!gs) return;
    if (!gs._socketMap) gs._socketMap = {};
    gs._socketMap[userId] = socketId;
  },

  getGame(roomId) {
    return activeGames.get(roomId) || null;
  },

  endGame(roomId) {
    const gs = activeGames.get(roomId);
    if (!gs) return;
    clearInterval(gs.ticker); // Clear the interval
    clearTimeout(gs.currentTimer);
    clearTimeout(gs.resultsTimer);
    activeGames.delete(roomId);
  },
};

// ── Question flow ───────────────────────────────────────────────────────────
function _nextQuestion(gs) {
  gs.currentIndex++;
  gs.answeredSet = new Set();

  if (gs.currentIndex >= gs.questions.length) {
    return _finalResults(gs);
  }

  const q = gs.questions[gs.currentIndex];
  q._timeLeft = QUESTION_TIME_LIMIT;

  // Strip answer from what we send
  const { answer_sql, correct_option, setup_sql, explanation, ...safeQ } = q;

  gs.io.to(gs.room.code).emit(EVENTS.QUESTION, {
    ...safeQ,
    index: gs.currentIndex,
    total: gs.questions.length,
    timeLimit: QUESTION_TIME_LIMIT,
  });

  // Count down time left
  gs.ticker = setInterval(() => {
    q._timeLeft = Math.max(0, q._timeLeft - 1);
    gs.io.to(gs.room.code).emit(EVENTS.TIMER_TICK, { seconds: q._timeLeft });
  }, 1000);

  gs.currentTimer = setTimeout(() => {
    clearInterval(gs.ticker);
    _endQuestion(gs);
  }, QUESTION_TIME_LIMIT * 1000);
}

function _endQuestion(gs) {
  clearInterval(gs.ticker); // Clear the ticker when question ends manually/early
  clearTimeout(gs.currentTimer);
  const q = gs.questions[gs.currentIndex];

  // 1. Send personalized results to each player who answered
  gs.players.forEach(p => {
    const socketId = gs._socketMap?.[p.id];
    if (socketId) {
      // If they didn't answer, they get a "wrong" result or just the revealed state
      const result = p.lastResult || {
        correct: false,
        score: 0,
        correctAnswer: q.type === QUESTION_TYPE.MCQ ? q.correct_option : q.answer_sql,
        explanation: q.explanation,
      };
      gs.io.to(socketId).emit(EVENTS.ANSWER_RESULT, { ...result, revealed: false });
    }
    // Clear lastResult for next question
    delete p.lastResult;
  });

  // 2. Reveal answer to all (switches phase to result)
  gs.io.to(gs.room.code).emit(EVENTS.ANSWER_RESULT, {
    revealed: true,
    correctAnswer: q.type === QUESTION_TYPE.MCQ ? q.correct_option : q.answer_sql,
    explanation: q.explanation,
    scores: _scoreboard(gs),
  });

  // 3. Broadcast final scoreboard for the round
  gs.io.to(gs.room.code).emit(EVENTS.SCORES_UPDATE, _scoreboard(gs));

  gs.resultsTimer = setTimeout(() => _nextQuestion(gs), RESULTS_DISPLAY_TIME * 1000);
}

async function _finalResults(gs) {
  await RoomModel.updateStatus(gs.roomId, ROOM_STATUS.FINISHED);

  // Sort by score desc and assign ranks
  const ranked = [...gs.players].sort((a, b) => b.score - a.score);
  ranked.forEach((p, i) => { p.rank = i + 1; });

  // Persist & update ELO
  for (const p of ranked) {
    try {
      await RoomModel.saveMatchResult({ room_id: gs.roomId, user_id: p.id, score: p.score, rank: p.rank });
      const user = await UserModel.findById(p.id);
      if (user) {
        const eloChange = Math.round(ELO_K_FACTOR * (1 - (p.rank - 1) / Math.max(ranked.length - 1, 1)) - ELO_K_FACTOR / 2);
        await UserModel.updateElo(p.id, Math.max(0, user.elo_rating + eloChange));
      }
    } catch (_) {}
  }

  gs.io.to(gs.room.code).emit(EVENTS.GAME_OVER, {
    results: ranked.map(p => ({
      id: p.id,
      username: p.username,
      avatarColor: p.avatar_color,
      score: p.score,
      rank: p.rank,
    })),
  });

  GameService.endGame(gs.roomId);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function _scoreboard(gs) {
  return gs.players
    .map(p => ({ id: p.id, username: p.username, avatarColor: p.avatar_color, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function _selectQuestions(difficulty, count) {
  let pool = difficulty === 'mixed'
    ? questions
    : questions.filter(q => q.difficulty === difficulty);

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function _sendCountdown(io, roomCode, seconds) {
  return new Promise(resolve => {
    let t = seconds;
    const tick = setInterval(() => {
      io.to(roomCode).emit(EVENTS.COUNTDOWN, { seconds: t });
      t--;
      if (t < 0) {
        clearInterval(tick);
        resolve();
      }
    }, 1000);
  });
}

module.exports = GameService;
