const jwt = require('jsonwebtoken');
const { EVENTS, ROOM_STATUS, MIN_PLAYERS_TO_START } = require('../config/constants');
const RoomModel = require('../models/room.model');
const GameService = require('../services/game.service');
const MatchmakingService = require('../services/matchmaking.service');

/**
 * Socket.IO event handler — single entry point for all WS events.
 * Each socket authenticates via a JWT passed as auth.token in the handshake.
 */
const initSocketHandler = (io) => {
  MatchmakingService.init(io);

  // ── Auth middleware ──────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (_) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;
    console.log(`[Socket] ${username} connected (${socket.id})`);

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on(EVENTS.JOIN_ROOM, async ({ code }) => {
      try {
        const room = await RoomModel.findByCode(code?.toUpperCase());
        if (!room) return _err(socket, 'Room not found');

        await RoomModel.addPlayer(room.id, userId); // Database sync
        await socket.join(code.toUpperCase());
        GameService.registerSocket(room.id, userId, socket.id);

        const players = await RoomModel.getPlayers(room.id);
        io.to(code.toUpperCase()).emit(EVENTS.PLAYER_JOINED, {
          player: players.find(p => p.id === userId),
          players,
        });

        socket.data.roomCode = code.toUpperCase();
        socket.data.roomId = room.id;
      } catch (err) {
        _err(socket, err.message);
      }
    });

    socket.on(EVENTS.LEAVE_ROOM, async () => {
      await _leaveRoom(socket, io, userId);
    });
    
    // ── TOGGLE READY ─────────────────────────────────────────────────────────
    socket.on(EVENTS.TOGGLE_READY, async ({ isReady }) => {
      try {
        const { roomId, roomCode } = socket.data;
        if (!roomId) return;
        
        await RoomModel.toggleReady(roomId, userId, isReady);
        const players = await RoomModel.getPlayers(roomId);
        
        io.to(roomCode).emit(EVENTS.READY_STATUS, { userId, isReady, players });
      } catch (err) {
        _err(socket, err.message);
      }
    });

    // ── START GAME ───────────────────────────────────────────────────────────
    socket.on(EVENTS.START_GAME, async () => {
      try {
        const { roomId, roomCode } = socket.data;
        if (!roomId) return _err(socket, 'Not in a room');

        const room = await RoomModel.findById(roomId);
        if (!room) return _err(socket, 'Room not found');
        if (room.host_id !== userId) return _err(socket, 'Only the host can start the game');
        if (room.status !== ROOM_STATUS.WAITING) return _err(socket, 'Game already started');

        const playerCount = await RoomModel.getPlayerCount(roomId);
        if (playerCount < MIN_PLAYERS_TO_START) return _err(socket, 'Need at least 1 player');

        await GameService.startGame(io, roomId);
      } catch (err) {
        _err(socket, err.message);
      }
    });

    // ── SUBMIT ANSWER ────────────────────────────────────────────────────────
    socket.on(EVENTS.SUBMIT_ANSWER, async ({ answer }) => {
      try {
        const { roomId } = socket.data;
        if (!roomId) return _err(socket, 'Not in a room');
        await GameService.submitAnswer(roomId, userId, answer);
      } catch (err) {
        _err(socket, err.message);
      }
    });

    // ── MATCHMAKING ──────────────────────────────────────────────────────────
    socket.on(EVENTS.JOIN_MATCHMAKING, ({ difficulty = 'mixed' } = {}) => {
      MatchmakingService.enqueue(
        { userId, username, socketId: socket.id, avatarColor: socket.user.avatar_color },
        difficulty
      );
      const size = MatchmakingService.getQueueSize(difficulty);
      socket.emit(EVENTS.MATCHMAKING_STATUS, { status: 'queued', queueSize: size, difficulty });
    });

    socket.on(EVENTS.LEAVE_MATCHMAKING, () => {
      MatchmakingService.dequeue(userId);
      socket.emit(EVENTS.MATCHMAKING_STATUS, { status: 'left' });
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[Socket] ${username} disconnected`);
      MatchmakingService.dequeue(userId);
      await _leaveRoom(socket, io, userId);
    });
  });
};

// ── Helpers ──────────────────────────────────────────────────────────────────
async function _leaveRoom(socket, io, userId) {
  const { roomId, roomCode } = socket.data || {};
  if (!roomId || !roomCode) return;

  try {
    await RoomModel.removePlayer(roomId, userId);
    socket.leave(roomCode);
    const players = await RoomModel.getPlayers(roomId);
    
    if (players.length === 0) {
      await RoomModel.updateStatus(roomId, ROOM_STATUS.FINISHED);
    } else {
      io.to(roomCode).emit(EVENTS.PLAYER_LEFT, { userId, players });
    }
  } catch (_) {}

  socket.data.roomId = null;
  socket.data.roomCode = null;
}

function _err(socket, message) {
  socket.emit(EVENTS.ERROR, { message });
}

module.exports = { initSocketHandler };
