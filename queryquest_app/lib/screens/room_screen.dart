import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/game_provider.dart';

class RoomScreen extends StatelessWidget {
  const RoomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameProvider>();
    final auth = context.watch<AuthProvider>();
    
    final amIHost = game.isHost(auth.user?.id);

    return Scaffold(
      appBar: AppBar(
        title: Text('Room: ${game.gameState.roomCode ?? ''}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => game.returnToLobby(),
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 800),
          child: Column(
            children: [
              const SizedBox(height: 32),
              Text(
                'Waiting for players...',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 32),
              Expanded(
                child: ListView.builder(
                  itemCount: game.gameState.scores.length,
                  itemBuilder: (context, index) {
                    final player = game.gameState.scores[index];
                    return Card(
                      color: Theme.of(context).colorScheme.surface,
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _colorFromHex(player.avatarColor),
                          child: Text(player.username.substring(0, 1).toUpperCase(), style: const TextStyle(color: Colors.white)),
                        ),
                        title: Text(player.username + (player.isHost ? ' (Host)' : '')),
                        subtitle: Text('Elo: ${player.eloRating ?? 'Unranked'}'),
                        trailing: Icon(
                          player.isReady ? Icons.check_circle : Icons.hourglass_empty,
                          color: player.isReady ? Colors.green : Colors.grey,
                        ),
                      ),
                    );
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 16,
                  runSpacing: 16,
                  children: [
                    ElevatedButton.icon(
                      icon: Icon(game.isReady ? Icons.close : Icons.check),
                      label: Text(game.isReady ? 'Cancel Ready' : 'Ready Up'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: game.isReady ? Colors.red : Colors.green,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      ),
                      onPressed: () => game.toggleReady(),
                    ),
                    if (amIHost)
                      ElevatedButton.icon(
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Start Game'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        ),
                        onPressed: game.allReady ? () => game.startGame() : null,
                      ),
                  ],
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Color _colorFromHex(String hexColor) {
    hexColor = hexColor.replaceAll('#', '');
    if (hexColor.length == 6) {
      hexColor = 'FF$hexColor';
    }
    return Color(int.parse(hexColor, radix: 16));
  }
}
