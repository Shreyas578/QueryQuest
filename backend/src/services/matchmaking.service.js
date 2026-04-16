const { MATCHMAKING_TIMEOUT, MATCHMAKING_INTERVAL, ROOM_STATUS, EVENTS } = require('../config/constants');
const RoomModel = require('../models/room.model');
const { v4: uuidv4 } = require('uuid');

/**
 * MatchmakingService — manages a per-difficulty queue.
 * When >= 2 players queue for the same difficulty, they are matched into a room.
 * If a player waits > MATCHMAKING_TIMEOUT seconds, a solo room is created for them.
 */
const queue = new Map(); // difficulty → [{ userId, username, avatarColor, socketId, queuedAt }]
let _io = null;
let _interval = null;

const MatchmakingService = {
  init(io) {
    _io = io;
    if (_interval) clearInterval(_interval);
    _interval = setInterval(_processQueue, MATCHMAKING_INTERVAL);
    console.log('🎯 MatchmakingService started');
  },

  enqueue(player, difficulty = 'mixed') {
    if (!queue.has(difficulty)) queue.set(difficulty, []);
    const existing = queue.get(difficulty).find(p => p.userId === player.userId);
    if (existing) return; // already queued
    queue.get(difficulty).push({ ...player, difficulty, queuedAt: Date.now() });
    console.log(`[Matchmaking] ${player.username} queued for ${difficulty}`);
  },

  dequeue(userId) {
    for (const [diff, players] of queue) {
      const idx = players.findIndex(p => p.userId === userId);
      if (idx !== -1) {
        players.splice(idx, 1);
        console.log(`[Matchmaking] userId ${userId} removed from ${diff} queue`);
        break;
      }
    }
  },

  getQueueSize(difficulty) {
    return (queue.get(difficulty) || []).length;
  },
};

async function _processQueue() {
  for (const [difficulty, players] of queue) {
    if (players.length === 0) continue;

    // Match groups of 2–4 players
    while (players.length >= 2) {
      const group = players.splice(0, 4); // up to 4
      await _createMatchedRoom(group, difficulty);
    }

    // Timeout solo players
    const now = Date.now();
    const soloReady = players.filter(p => now - p.queuedAt > MATCHMAKING_TIMEOUT * 1000);
    for (const player of soloReady) {
      const idx = players.indexOf(player);
      players.splice(idx, 1);
      await _createMatchedRoom([player], difficulty);
    }
  }
}

async function _createMatchedRoom(group, difficulty) {
  try {
    const host = group[0];
    const code = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
    const roomId = await RoomModel.create({
      code,
      host_id: host.userId,
      max_players: 4,
      difficulty,
      num_questions: 10,
    });

    for (const player of group) {
      await RoomModel.addPlayer(roomId, player.userId);
    }

    const players = await RoomModel.getPlayers(roomId);
    const room = await RoomModel.findById(roomId);

    // Notify each matched player
    for (const player of group) {
      if (_io && player.socketId) {
        _io.to(player.socketId).emit(EVENTS.MATCHMAKING_STATUS, {
          status: 'matched',
          room: { ...room, players },
        });
      }
    }

    console.log(`[Matchmaking] Room ${code} created for [${group.map(p => p.username).join(', ')}]`);
  } catch (err) {
    console.error('[Matchmaking] Failed to create room:', err.message);
  }
}

module.exports = MatchmakingService;
