import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  
  User? _user;
  bool _isLoading = false;
  bool _isInitializing = true;
  String? _error;

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  bool get isInitializing => _isInitializing;
  String? get error => _error;

  Future<void> checkAuth() async {
    _isInitializing = true;
    notifyListeners();
    try {
      _user = await _authService.getSavedUser();
      // Optionally re-fetch me() to verify token validity, but we'll stick to saved for fast boot
      if (_user != null) {
        try {
          _user = await _authService.me().timeout(const Duration(seconds: 10));
        } catch (e) {
          _user = null; // Token expired or timeout
          await _authService.logout();
        }
      }
    } catch (e) {
      _user = null;
    }
    _isInitializing = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _user = await _authService.login(email, password).timeout(const Duration(seconds: 90));
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(String username, String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _user = await _authService.register(username, email, password).timeout(const Duration(seconds: 90));
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }
}
