import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'providers/auth_provider.dart';
import 'providers/game_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/lobby_screen.dart';
import 'screens/room_screen.dart';
import 'screens/game_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => GameProvider()),
      ],
      child: const QueryQuestApp(),
    ),
  );
}

class QueryQuestApp extends StatelessWidget {
  const QueryQuestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QueryQuest',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Tailwind slate-900
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3B82F6), // Tailwind blue-500
          secondary: Color(0xFF8B5CF6), // Tailwind violet-500
          surface: Color(0xFF1E293B), // Tailwind slate-800
        ),
        textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme).apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
      home: const MainWrapper(),
    );
  }
}

class MainWrapper extends StatefulWidget {
  const MainWrapper({super.key});

  @override
  State<MainWrapper> createState() => _MainWrapperState();
}

class _MainWrapperState extends State<MainWrapper> {
  bool _socketInitialized = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      context.read<AuthProvider>().checkAuth();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<AuthProvider, GameProvider>(
      builder: (context, auth, game, _) {
        if (auth.isInitializing) {
          return const SplashScreen();
        }

        if (!auth.isAuthenticated) {
          if (_socketInitialized) {
            game.disconnectSocket();
            _socketInitialized = false;
          }
          return const AuthScreen();
        }

        if (!_socketInitialized) {
          game.initSocket(auth);
          _socketInitialized = true;
        }

        switch (game.gameState.phase) {
          case 'lobby':
            return const LobbyScreen();
          case 'room_lobby':
            return const RoomScreen();
          case 'countdown':
          case 'question':
          case 'result':
          case 'gameover':
            return const GameScreen();
          default:
            return const LobbyScreen();
        }
      },
    );
  }
}
