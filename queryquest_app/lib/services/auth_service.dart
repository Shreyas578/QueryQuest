import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final String _apiUrl = '${ApiConfig.baseUrl}/auth';

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('qq_token');
  }

  Future<void> _persist(String token, User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('qq_token', token);
    await prefs.setString('qq_user', jsonEncode(user.toJson()));
  }

  Future<User?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('qq_user');
    if (userStr != null) {
      try {
        return User.fromJson(jsonDecode(userStr));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  Future<User> register(String username, String email, String password) async {
    final response = await http.post(
      Uri.parse('$_apiUrl/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'email': email, 'password': password}),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      final user = User.fromJson(data['user']);
      await _persist(data['token'], user);
      return user;
    } else {
      throw Exception(_parseError(response.body));
    }
  }

  Future<User> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$_apiUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final user = User.fromJson(data['user']);
      await _persist(data['token'], user);
      return user;
    } else {
      throw Exception(_parseError(response.body));
    }
  }

  Future<User> me() async {
    final token = await getToken();
    if (token == null) throw Exception('No token');

    final response = await http.get(
      Uri.parse('$_apiUrl/me'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final user = User.fromJson(data['user']);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('qq_user', jsonEncode(user.toJson()));
      return user;
    } else {
      throw Exception(_parseError(response.body));
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('qq_token');
    await prefs.remove('qq_user');
  }

  String _parseError(String body) {
    try {
      final data = jsonDecode(body);
      return data['error'] ?? data['message'] ?? 'Authentication failed';
    } catch (e) {
      return 'Authentication failed';
    }
  }
}
