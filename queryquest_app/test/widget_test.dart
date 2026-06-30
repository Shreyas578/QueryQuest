// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:queryquest_app/main.dart';
import 'package:queryquest_app/providers/auth_provider.dart';
import 'package:queryquest_app/providers/game_provider.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => GameProvider()),
        ],
        child: const QueryQuestApp(),
      ),
    );

    // Verify that the app builds (will likely show splash or auth screen)
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
