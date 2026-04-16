const RoomModel = require('../models/room.model');
const UserModel = require('../models/user.model');
const { ROOM_STATUS, MAX_PLAYERS_LIMIT, ROOM_CODE_LENGTH } = require('../config/constants');
const { v4: uuidv4 } = require('uuid');

const _generateCode = () =>
  uuidv4().replace(/-/g, '').substring(0, ROOM_CODE_LENGTH).toUpperCase();

const LobbyController = {
  // GET /api/lobby/rooms  — list open rooms
  async listRooms(req, res) {
    try {
      const rooms = await RoomModel.getWaitingRooms();
      res.json({ rooms });
    } catch (err) {
      console.error('[LobbyController.listRooms]', err);
      res.status(500).json({ error: 'Could not fetch rooms' });
    }
  },

  // POST /api/lobby/rooms  — create a new room
  async createRoom(req, res) {
    const { max_players = 4, difficulty = 'mixed', num_questions = 10 } = req.body;
    const host_id = req.user.id;

    if (max_players < 1 || max_players > MAX_PLAYERS_LIMIT)
      return res.status(400).json({ error: `max_players must be between 1 and ${MAX_PLAYERS_LIMIT}` });

    if (!['easy', 'medium', 'hard', 'mixed'].includes(difficulty))
      return res.status(400).json({ error: 'Invalid difficulty' });

    try {
      let code, exists;
      do {
        code = _generateCode();
        exists = await RoomModel.findByCode(code);
      } while (exists);

      const roomId = await RoomModel.create({ code, host_id, max_players, difficulty, num_questions });
      await RoomModel.addPlayer(roomId, host_id);

      const room = await RoomModel.findById(roomId);
      const players = await RoomModel.getPlayers(roomId);

      res.status(201).json({ room: { ...room, players } });
    } catch (err) {
      console.error('[LobbyController.createRoom]', err);
      res.status(500).json({ error: 'Could not create room' });
    }
  },

  // POST /api/lobby/rooms/join  — join by code
  async joinRoom(req, res) {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) return res.status(400).json({ error: 'Room code is required' });

    try {
      const room = await RoomModel.findByCode(code.toUpperCase());
      if (!room) return res.status(404).json({ error: 'Room not found' });

      if (room.status !== ROOM_STATUS.WAITING)
        return res.status(400).json({ error: 'This room has already started or finished' });

      const count = await RoomModel.getPlayerCount(room.id);
      if (count >= room.max_players)
        return res.status(400).json({ error: 'Room is full' });

      await RoomModel.addPlayer(room.id, userId);
      const players = await RoomModel.getPlayers(room.id);

      res.json({ room: { ...room, players } });
    } catch (err) {
      console.error('[LobbyController.joinRoom]', err);
      res.status(500).json({ error: 'Could not join room' });
    }
  },

  // GET /api/lobby/rooms/:code  — get room details
  async getRoom(req, res) {
    try {
      const room = await RoomModel.findByCode(req.params.code.toUpperCase());
      if (!room) return res.status(404).json({ error: 'Room not found' });

      const players = await RoomModel.getPlayers(room.id);
      res.json({ room: { ...room, players } });
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch room' });
    }
  },

  // GET /api/lobby/leaderboard
  async globalLeaderboard(req, res) {
    try {
      const users = await UserModel.getLeaderboard(50);
      res.json({ leaderboard: users });
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch leaderboard' });
    }
  },
};

module.exports = LobbyController;
