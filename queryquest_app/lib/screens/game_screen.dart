import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';

class GameScreen extends StatelessWidget {
  const GameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameProvider>();
    final phase = game.gameState.phase;

    return Scaffold(
      appBar: AppBar(
        title: const Text('QueryQuest Match'),
        automaticallyImplyLeading: false,
        actions: [
          if (phase != 'countdown' && phase != 'gameover')
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Center(
                child: Text(
                  'Time: ${game.gameState.timeLeft}s',
                  style: TextStyle(
                    fontSize: 20, 
                    fontWeight: FontWeight.bold,
                    color: game.gameState.timeLeft <= 5 ? Colors.red : Colors.white
                  ),
                ),
              ),
            )
        ],
      ),
      body: _buildBody(context, game),
    );
  }

  Widget _buildBody(BuildContext context, GameProvider game) {
    switch (game.gameState.phase) {
      case 'countdown':
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Get Ready!', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              Text(
                '${game.gameState.countdown}',
                style: const TextStyle(fontSize: 72, fontWeight: FontWeight.bold, color: Colors.blueAccent),
              ),
            ],
          ),
        );
      case 'question':
      case 'result':
        return _buildQuestionView(context, game);
      case 'gameover':
        return _buildGameOverView(context, game);
      default:
        return const Center(child: CircularProgressIndicator());
    }
  }

  Widget _buildQuestionView(BuildContext context, GameProvider game) {
    final q = game.gameState.question;
    if (q == null) return const SizedBox();

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 800;

        if (isMobile) {
          return SingleChildScrollView(
            child: Column(
              children: [
                // Top Mini-Leaderboard for mobile
                Container(
                  height: 60,
                  color: Colors.black26,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: game.gameState.scores.length,
                    itemBuilder: (context, index) {
                      final player = game.gameState.scores[index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8),
                        child: Chip(
                          avatar: CircleAvatar(
                            backgroundColor: _colorFromHex(player.avatarColor),
                            child: Text(player.username.substring(0,1).toUpperCase(), style: const TextStyle(fontSize: 12, color: Colors.white)),
                          ),
                          label: Text('${player.username}: ${player.score} pts'),
                        ),
                      );
                    },
                  ),
                ),
                // Main Question Area
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Q${q.index + 1}/${q.total}', style: Theme.of(context).textTheme.titleMedium),
                          Chip(label: Text(q.difficulty.toUpperCase()), backgroundColor: _getDifficultyColor(q.difficulty)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Card(
                        color: Theme.of(context).colorScheme.surface,
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Text(q.questionText, style: Theme.of(context).textTheme.titleLarge),
                        ),
                      ),
                      const SizedBox(height: 24),
                      if (q.type == 'mcq' && q.options != null)
                        ...q.options!.map((opt) => Padding(
                          padding: const EdgeInsets.only(bottom: 12.0),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.all(16),
                              backgroundColor: _getOptionColor(context, game, opt),
                              alignment: Alignment.centerLeft,
                            ),
                            onPressed: game.gameState.answered || game.isAnalyzing || game.gameState.phase == 'result'
                                ? null
                                : () => game.submitAnswer(opt),
                            child: Text(opt, style: const TextStyle(fontSize: 16)),
                          ),
                        )).toList()
                      else if (q.type == 'sql')
                        SqlInputWidget(game: game),
                        
                      if (game.gameState.phase == 'result' && game.gameState.answerResult != null)
                        _buildResultCard(context, game.gameState.answerResult!)
                    ],
                  ),
                ),
              ],
            ),
          );
        }

        // Desktop layout
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Main Question Area
            Expanded(
              flex: 3,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Question ${q.index + 1} of ${q.total}', style: Theme.of(context).textTheme.titleLarge),
                        Chip(label: Text(q.difficulty.toUpperCase()), backgroundColor: _getDifficultyColor(q.difficulty)),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Card(
                      color: Theme.of(context).colorScheme.surface,
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Text(q.questionText, style: Theme.of(context).textTheme.headlineSmall),
                      ),
                    ),
                    const SizedBox(height: 32),
                    if (q.type == 'mcq' && q.options != null)
                      ...q.options!.map((opt) => Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.all(20),
                            backgroundColor: _getOptionColor(context, game, opt),
                            alignment: Alignment.centerLeft,
                          ),
                          onPressed: game.gameState.answered || game.isAnalyzing || game.gameState.phase == 'result'
                              ? null
                              : () => game.submitAnswer(opt),
                          child: Text(opt, style: const TextStyle(fontSize: 18)),
                        ),
                      )).toList()
                    else if (q.type == 'sql')
                      SqlInputWidget(game: game),
                      
                    if (game.gameState.phase == 'result' && game.gameState.answerResult != null)
                      _buildResultCard(context, game.gameState.answerResult!)
                  ],
                ),
              ),
            ),
            // Leaderboard Sidebar
            Container(
              width: 300,
              color: Theme.of(context).colorScheme.surface,
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    width: double.infinity,
                    color: Colors.black26,
                    child: const Text('Leaderboard', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: game.gameState.scores.length,
                      itemBuilder: (context, index) {
                        final player = game.gameState.scores[index];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _colorFromHex(player.avatarColor),
                            child: Text(player.username.substring(0,1).toUpperCase(), style: const TextStyle(color: Colors.white)),
                          ),
                          title: Text(player.username),
                          trailing: Text('${player.score} pts', style: const TextStyle(fontWeight: FontWeight.bold)),
                        );
                      },
                    ),
                  )
                ],
              ),
            )
          ],
        );
      },
    );
  }

  Widget _buildResultCard(BuildContext context, dynamic result) {
    return Card(
      color: result.correct == true ? Colors.green.shade900 : Colors.red.shade900,
      margin: const EdgeInsets.only(top: 24),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              result.correct == true ? 'Correct! +${result.score}' : 'Incorrect',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            if (result.explanation != null) ...[
              const SizedBox(height: 16),
              Text(result.explanation!, style: const TextStyle(color: Colors.white)),
            ],
            if (result.correctAnswer != null) ...[
              const SizedBox(height: 16),
              const Text('Correct Answer:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
              Text(result.correctAnswer!, style: const TextStyle(color: Colors.white)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildGameOverView(BuildContext context, GameProvider game) {
    final results = game.gameState.gameOver?.results ?? [];
    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 600),
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Game Over!', style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold)),
            const SizedBox(height: 32),
            ...results.map((r) => Card(
              color: r['rank'] == 1 ? Colors.amber.shade800 : Theme.of(context).colorScheme.surface,
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _colorFromHex(r['avatarColor'] ?? '#000000'),
                  child: Text('#${r['rank']}'),
                ),
                title: Text(r['username']),
                trailing: Text('${r['score']} pts', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ),
            )),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => game.returnToLobby(),
              child: const Text('Return to Lobby'),
            )
          ],
        ),
      ),
    );
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty.toLowerCase()) {
      case 'easy': return Colors.green;
      case 'medium': return Colors.orange;
      case 'hard': return Colors.red;
      default: return Colors.blue;
    }
  }

  Color? _getOptionColor(BuildContext context, GameProvider game, String opt) {
    if (game.gameState.phase != 'result') return null;
    final res = game.gameState.answerResult;
    if (res?.correctAnswer == opt) return Colors.green.shade700;
    // We don't track which wrong answer they clicked specifically in state easily here without adding more state,
    // but correct one being green is good enough.
    return Colors.grey.shade800;
  }

  Color _colorFromHex(String hexColor) {
    hexColor = hexColor.replaceAll('#', '');
    if (hexColor.length == 6) hexColor = 'FF$hexColor';
    return Color(int.parse(hexColor, radix: 16));
  }
}

class SqlInputWidget extends StatefulWidget {
  final GameProvider game;
  const SqlInputWidget({super.key, required this.game});

  @override
  State<SqlInputWidget> createState() => _SqlInputWidgetState();
}

class _SqlInputWidgetState extends State<SqlInputWidget> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.game.gameState.question?.schemaDisplay != null)
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.black45,
            child: Text(widget.game.gameState.question!.schemaDisplay!, style: const TextStyle(fontFamily: 'monospace')),
          ),
        const SizedBox(height: 16),
        TextField(
          controller: _controller,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: 'SELECT * FROM...',
            border: OutlineInputBorder(),
            filled: true,
          ),
          enabled: !widget.game.gameState.answered && widget.game.gameState.phase != 'result',
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: widget.game.gameState.answered || widget.game.isAnalyzing || widget.game.gameState.phase == 'result'
              ? null
              : () => widget.game.submitAnswer(_controller.text),
          child: const Text('Run Query'),
        )
      ],
    );
  }
}
