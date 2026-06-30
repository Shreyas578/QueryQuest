import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/game_provider.dart';

class LobbyScreen extends StatefulWidget {
  const LobbyScreen({super.key});

  @override
  State<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends State<LobbyScreen> {
  final TextEditingController _roomCodeController = TextEditingController();

  @override
  void dispose() {
    _roomCodeController.dispose();
    super.dispose();
  }
  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<GameProvider>().fetchRooms());
  }

  void _createRoom() {
    String difficulty = 'mixed';
    int numQuestions = 10;
    int maxPlayers = 4;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Create Private Room'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    value: difficulty,
                    decoration: const InputDecoration(labelText: 'Difficulty'),
                    items: ['easy', 'medium', 'hard', 'mixed'].map((d) {
                      return DropdownMenuItem(value: d, child: Text(d.toUpperCase()));
                    }).toList(),
                    onChanged: (v) => setState(() => difficulty = v!),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
                    value: numQuestions,
                    decoration: const InputDecoration(labelText: 'Number of Questions'),
                    items: [5, 10, 15, 20, 25].map((n) {
                      return DropdownMenuItem(value: n, child: Text('$n'));
                    }).toList(),
                    onChanged: (v) => setState(() => numQuestions = v!),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
                    value: maxPlayers,
                    decoration: const InputDecoration(labelText: 'Max Players'),
                    items: List.generate(8, (i) => i + 1).map((n) {
                      return DropdownMenuItem(value: n, child: Text('$n'));
                    }).toList(),
                    onChanged: (v) => setState(() => maxPlayers = v!),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    context.read<GameProvider>().createRoom({
                      'difficulty': difficulty,
                      'num_questions': numQuestions,
                      'max_players': maxPlayers
                    });
                  },
                  child: const Text('Create'),
                ),
              ],
            );
          }
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final game = context.watch<GameProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset('assets/logo.png', width: 32, height: 32),
            const SizedBox(width: 12),
            const Text('QueryQuest Lobby'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => auth.logout(),
          )
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isMobile = constraints.maxWidth < 800;

          if (isMobile) {
            return Column(
              children: [
                // Compact user info for mobile
                Container(
                  color: Theme.of(context).colorScheme.surface,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: _colorFromHex(user?.avatarColor ?? '#00d4ff'),
                        child: Text(user?.username.substring(0, 1).toUpperCase() ?? 'U', style: const TextStyle(fontSize: 20, color: Colors.white)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.username ?? 'Guest', style: Theme.of(context).textTheme.titleMedium),
                            Text('Elo Rating: ${user?.eloRating ?? 1000}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black26,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.people, size: 14, color: Colors.greenAccent),
                            const SizedBox(width: 4),
                            Text('${game.activePlayers} Online', style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Main content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ElevatedButton.icon(
                          icon: game.isMatchmaking 
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.play_arrow),
                          label: Text(game.isMatchmaking ? 'Finding Match...' : 'Join Matchmaking'),
                          onPressed: game.isMatchmaking ? null : () => game.joinMatchmaking(),
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          icon: const Icon(Icons.add),
                          label: const Text('Create Private Room'),
                          onPressed: _createRoom,
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Available Rooms', style: Theme.of(context).textTheme.titleLarge),
                            IconButton(
                              icon: const Icon(Icons.refresh),
                              onPressed: () => game.fetchRooms(),
                            )
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildJoinByCode(game),
                        const SizedBox(height: 12),
                        Expanded(
                          child: _buildRoomList(game),
                        )
                      ],
                    ),
                  ),
                )
              ],
            );
          }

          // Desktop/Tablet layout
          return Row(
            children: [
              // Sidebar with user info
              Container(
                width: 250,
                color: Theme.of(context).colorScheme.surface,
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: _colorFromHex(user?.avatarColor ?? '#00d4ff'),
                      child: Text(user?.username.substring(0, 1).toUpperCase() ?? 'U', style: const TextStyle(fontSize: 32, color: Colors.white)),
                    ),
                    const SizedBox(height: 16),
                    Text(user?.username ?? 'Guest', style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    Text('Elo Rating: ${user?.eloRating ?? 1000}', style: const TextStyle(color: Colors.white70)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black26,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.people, size: 16, color: Colors.greenAccent),
                          const SizedBox(width: 8),
                          Text('${game.activePlayers} Online'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // Main content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 16,
                        runSpacing: 16,
                        children: [
                          ElevatedButton.icon(
                            icon: game.isMatchmaking 
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.play_arrow),
                            label: Text(game.isMatchmaking ? 'Finding Match...' : 'Join Matchmaking'),
                            onPressed: game.isMatchmaking ? null : () => game.joinMatchmaking(),
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                          ),
                          OutlinedButton.icon(
                            icon: const Icon(Icons.add),
                            label: const Text('Create Private Room'),
                            onPressed: _createRoom,
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh),
                            onPressed: () => game.fetchRooms(),
                          )
                        ],
                      ),
                      const SizedBox(height: 32),
                      Text('Available Rooms', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 16),
                      _buildJoinByCode(game),
                      const SizedBox(height: 16),
                      Expanded(
                        child: _buildRoomList(game),
                      )
                    ],
                  ),
                ),
              )
            ],
          );
        },
      ),
    );
  }

  Widget _buildRoomList(GameProvider game) {
    if (game.availableRooms.isEmpty) {
      return const Center(
        child: Text(
          'No rooms available. Create one to play with friends!',
          style: TextStyle(color: Colors.white54),
          textAlign: TextAlign.center,
        ),
      );
    }

    return ListView.builder(
      itemCount: game.availableRooms.length,
      itemBuilder: (context, index) {
        final room = game.availableRooms[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          color: Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            title: Text('Room: ${room.code}', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Host: ${room.hostName}\nDifficulty: ${room.difficulty} • Players: ${room.playerCount}/${room.maxPlayers}'),
            isThreeLine: true,
            trailing: ElevatedButton(
              child: const Text('Join'),
              onPressed: () => game.joinRoom(room.code),
            ),
          ),
        );
      },
    );
  }

  Widget _buildJoinByCode(GameProvider game) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _roomCodeController,
            decoration: InputDecoration(
              labelText: 'Enter Room Code',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              isDense: true,
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
            ),
            textCapitalization: TextCapitalization.characters,
          ),
        ),
        const SizedBox(width: 12),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          ),
          onPressed: () {
            final code = _roomCodeController.text.trim().toUpperCase();
            if (code.isNotEmpty) {
              game.joinRoom(code);
              _roomCodeController.clear();
            }
          },
          child: const Text('Join'),
        ),
      ],
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
