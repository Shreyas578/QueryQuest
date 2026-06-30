import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/room.dart';
import 'api_service.dart';

class LobbyService {
  final String _apiUrl = '${ApiConfig.baseUrl}/lobby';

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('qq_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<List<Room>> getRooms() async {
    final response = await http.get(
      Uri.parse('$_apiUrl/rooms'),
      headers: await _getHeaders(),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['rooms'] as List).map((r) => Room.fromJson(r)).toList();
    } else {
      throw Exception('Failed to load rooms');
    }
  }

  Future<Room> createRoom(Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse('$_apiUrl/rooms'),
      headers: await _getHeaders(),
      body: jsonEncode(payload),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return Room.fromJson(data['room']);
    } else {
      throw Exception('Failed to create room');
    }
  }

  Future<Room> joinRoom(String code) async {
    final response = await http.post(
      Uri.parse('$_apiUrl/rooms/join'),
      headers: await _getHeaders(),
      body: jsonEncode({'code': code}),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return Room.fromJson(data['room']);
    } else {
      throw Exception('Failed to join room');
    }
  }

  Future<List<dynamic>> getLeaderboard() async {
    final response = await http.get(
      Uri.parse('$_apiUrl/leaderboard'),
      headers: await _getHeaders(),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['leaderboard'] as List<dynamic>;
    } else {
      throw Exception('Failed to load leaderboard');
    }
  }
}
