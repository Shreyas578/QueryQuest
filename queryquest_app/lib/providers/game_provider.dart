import 'package:flutter/foundation.dart';
import '../models/game_state.dart';
import '../models/room.dart';
import '../services/socket_service.dart';
import '../services/lobby_service.dart';
import '../providers/auth_provider.dart';

class GameProvider with ChangeNotifier {
  final SocketService _socketService = SocketService();
  final LobbyService _lobbyService = LobbyService();
  
  GameState _gameState = GameState();
  List<Room> _availableRooms = [];
  bool _isMatchmaking = false;
  bool _isAnalyzing = false;
  bool _isReady = false;
  int _activePlayers = 0;

  GameState get gameState => _gameState;
  List<Room> get availableRooms => _availableRooms;
  bool get isMatchmaking => _isMatchmaking;
  bool get isAnalyzing => _isAnalyzing;
  bool get isReady => _isReady;
  int get activePlayers => _activePlayers;

  bool get allReady {
    final players = _gameState.scores;
    return players.length >= 2 && players.every((p) => p.isReady);
  }

  bool isHost(int? userId) {
    if (userId == null) return false;
    try {
      return _gameState.scores.firstWhere((p) => p.id == userId).isHost;
    } catch (e) {
      return false;
    }
  }

  void initSocket(AuthProvider authProvider) {
    _socketService.connect();
    _socketService.stream.listen((eventData) {
      _handleSocketEvent(eventData['event'], eventData['data'], authProvider.user?.id);
    });
  }

  void disconnectSocket() {
    _socketService.disconnect();
  }

  void _handleSocketEvent(String event, dynamic data, int? userId) {
    switch (event) {
      case 'countdown':
        _gameState = _gameState.copyWith(phase: 'countdown', countdown: data['seconds']);
        break;
      case 'question':
        _gameState = _gameState.copyWith(
          phase: 'question',
          question: Question.fromJson(data),
          timeLeft: data['timeLimit'],
          answerResult: null, // clear previous
          answered: false,
        );
        break;
      case 'timer_tick':
        _gameState = _gameState.copyWith(timeLeft: data['seconds']);
        break;
      case 'answer_result':
        // Handle personal vs global result
        final myResult = (data['playerResults'] != null && userId != null) 
            ? data['playerResults'][userId.toString()] 
            : null;
        
        bool nextRevealed = data['revealed'] ?? _gameState.answerResult?.revealed ?? false;
        
        final nextResult = AnswerResult(
          correct: myResult?['correct'] ?? data['correct'] ?? _gameState.answerResult?.correct,
          score: myResult?['score'] ?? data['score'] ?? _gameState.answerResult?.score,
          error: myResult?['error'] ?? data['error'] ?? _gameState.answerResult?.error,
          resultRows: myResult?['resultRows'] ?? data['resultRows'] ?? _gameState.answerResult?.resultRows,
          correctAnswer: data['correctAnswer'] ?? _gameState.answerResult?.correctAnswer,
          explanation: data['explanation'] ?? _gameState.answerResult?.explanation,
          revealed: nextRevealed,
          scores: data['scores'] != null 
              ? (data['scores'] as List).map((e) => PlayerScore.fromJson(e)).toList() 
              : _gameState.answerResult?.scores,
        );
        
        String nextPhase = _gameState.phase;
        if (nextRevealed) {
          nextPhase = 'result';
          _isAnalyzing = false;
        }

        _gameState = _gameState.copyWith(
          phase: nextPhase,
          answerResult: nextResult,
          scores: nextResult.scores ?? _gameState.scores,
        );
        break;
      case 'scores_update':
        final scores = (data as List).map((e) => PlayerScore.fromJson(e)).toList();
        _gameState = _gameState.copyWith(scores: scores);
        break;
      case 'game_over':
        _gameState = _gameState.copyWith(
          phase: 'gameover', 
          gameOver: GameOverResult.fromJson(data),
        );
        break;
      case 'matchmaking_status':
        final status = data['status'];
        if (status == 'queued') {
          _isMatchmaking = true;
        } else if (status == 'left') {
          _isMatchmaking = false;
        } else if (status == 'matched') {
          _isMatchmaking = false;
          final roomData = data['room'];
          _gameState = _gameState.copyWith(roomCode: roomData['code']);
          _socketService.emit('join_room', {'code': roomData['code']});
        }
        break;
      case 'player_joined':
      case 'room_updated':
        final players = (data['players'] as List).map((e) => PlayerScore.fromJson(e)).toList();
        _gameState = _gameState.copyWith(
          phase: 'room_lobby', 
          scores: players,
        );
        _updateIsReady(players, userId);
        break;
      case 'ready_status':
        final players = (data['players'] as List).map((e) => PlayerScore.fromJson(e)).toList();
        _gameState = _gameState.copyWith(scores: players);
        _updateIsReady(players, userId);
        break;
      case 'error':
        // Show error...
        print("Socket Error: ${data['message']}");
        break;
      case 'active_players':
        _activePlayers = data as int;
        break;
    }
    notifyListeners();
  }

  void _updateIsReady(List<PlayerScore> players, int? userId) {
    if (userId == null) return;
    try {
      final me = players.firstWhere((p) => p.id == userId);
      _isReady = me.isReady;
    } catch (e) {
      _isReady = false;
    }
  }

  Future<void> fetchRooms() async {
    try {
      _availableRooms = await _lobbyService.getRooms();
      notifyListeners();
    } catch (e) {
      print('Failed to fetch rooms');
    }
  }

  void joinMatchmaking() {
    _socketService.emit('join_matchmaking', {'difficulty': 'mixed'});
  }

  void joinRoom(String code) {
    _gameState = _gameState.copyWith(roomCode: code);
    _socketService.emit('join_room', {'code': code});
  }

  Future<bool> createRoom(Map<String, dynamic> config) async {
    try {
      final room = await _lobbyService.createRoom(config);
      _gameState = _gameState.copyWith(roomCode: room.code);
      _socketService.emit('join_room', {'code': room.code});
      return true;
    } catch (e) {
      return false;
    }
  }

  void submitAnswer(String answer) {
    if (_gameState.answered || _isAnalyzing) return;
    _isAnalyzing = true;
    _gameState = _gameState.copyWith(answered: true);
    _socketService.emit('submit_answer', {'answer': answer});
    notifyListeners();
    
    // Fallback stop analyzing
    Future.delayed(const Duration(milliseconds: 500), () {
      _isAnalyzing = false;
      notifyListeners();
    });
  }

  void toggleReady() {
    final newState = !_isReady;
    _socketService.emit('toggle_ready', {'isReady': newState});
    _isReady = newState;
    notifyListeners();
  }

  void startGame() {
    _socketService.emit('start_game');
  }

  void returnToLobby() {
    _gameState = _gameState.copyWith(phase: 'lobby');
    notifyListeners();
  }
}
