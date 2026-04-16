// ── Game constants ─────────────────────────────────────────────────────────────
module.exports = {
  // Room
  ROOM_CODE_LENGTH: 6,
  MAX_PLAYERS_DEFAULT: 4,
  MAX_PLAYERS_LIMIT: 8,
  ROOM_STATUS: {
    WAITING: 'waiting',
    IN_PROGRESS: 'in_progress',
    FINISHED: 'finished',
  },

  // Game
  QUESTION_TIME_LIMIT: 60,         // seconds per question
  RESULTS_DISPLAY_TIME: 8,         // seconds to show results after each question
  LOBBY_COUNTDOWN: 5,              // seconds before game starts
  MIN_PLAYERS_TO_START: 2,         // require 2 players
  DIFFICULTY: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    MIXED: 'mixed',
  },

  // Scoring
  BASE_SCORE: 1000,
  TIME_BONUS_FACTOR: 10,           // extra points per second left
  WRONG_ANSWER_PENALTY: 0,         // no negative scoring
  ELO_K_FACTOR: 32,

  // Matchmaking
  MATCHMAKING_TIMEOUT: 30,         // seconds to wait before creating a room solo
  MATCHMAKING_INTERVAL: 3000,      // ms between queue checks

  // Question types
  QUESTION_TYPE: {
    MCQ: 'mcq',
    SQL: 'sql',
  },

  // JWT
  JWT_EXPIRES_IN: '7d',

  // Event names (Socket.IO)
  EVENTS: {
    // Client → Server
    JOIN_LOBBY: 'join_lobby',
    LEAVE_LOBBY: 'leave_lobby',
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    START_GAME: 'start_game',
    SUBMIT_ANSWER: 'submit_answer',
    JOIN_MATCHMAKING: 'join_matchmaking',
    LEAVE_MATCHMAKING: 'leave_matchmaking',
    TOGGLE_READY: 'toggle_ready',

    // Server → Client
    ROOM_UPDATED: 'room_updated',
    GAME_STARTED: 'game_started',
    QUESTION: 'question',
    ANSWER_RESULT: 'answer_result',
    SCORES_UPDATE: 'scores_update',
    GAME_OVER: 'game_over',
    MATCHMAKING_STATUS: 'matchmaking_status',
    ERROR: 'error',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    COUNTDOWN: 'countdown',
    TIMER_TICK: 'timer_tick',
    READY_STATUS: 'ready_status',
  },
};
