import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class SocketService {
  io.Socket? _socket;
  final StreamController<Map<String, dynamic>> _eventStream = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get stream => _eventStream.stream;

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('qq_token');

    _socket = io.io(ApiConfig.socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'reconnectionAttempts': 5,
      'reconnectionDelay': 1000,
      'auth': {'token': token},
    });

    _socket!.connect();

    _socket!.onConnect((_) {
      print('[Socket] Connected ${_socket!.id}');
    });

    _socket!.onDisconnect((_) {
      print('[Socket] Disconnected');
    });

    _socket!.onConnectError((err) {
      print('[Socket] Error: $err');
    });

    // Game Events
    _listenToEvent('countdown');
    _listenToEvent('question');
    _listenToEvent('timer_tick');
    _listenToEvent('answer_result');
    _listenToEvent('scores_update');
    _listenToEvent('game_over');
    _listenToEvent('matchmaking_status');
    _listenToEvent('player_joined');
    _listenToEvent('room_updated');
    _listenToEvent('ready_status');
    _listenToEvent('error');
    _listenToEvent('active_players');
  }

  void _listenToEvent(String eventName) {
    _socket!.on(eventName, (data) {
      _eventStream.add({'event': eventName, 'data': data});
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }

  void emit(String event, [dynamic data]) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit(event, data);
    }
  }

  bool get connected => _socket?.connected ?? false;
}
