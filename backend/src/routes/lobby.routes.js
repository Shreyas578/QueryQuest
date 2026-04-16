const express = require('express');
const router = express.Router();
const LobbyController = require('../controllers/lobby.controller');
const { authenticate } = require('../middleware/auth');

router.get('/rooms', authenticate, LobbyController.listRooms);
router.post('/rooms', authenticate, LobbyController.createRoom);
router.post('/rooms/join', authenticate, LobbyController.joinRoom);
router.get('/rooms/:code', authenticate, LobbyController.getRoom);
router.get('/leaderboard', LobbyController.globalLeaderboard);

module.exports = router;
