class Question {
  final int id;
  final String type; // 'mcq' or 'sql'
  final String difficulty;
  final String topic;
  final String scenario;
  final String questionText;
  final List<String>? options;
  final String? schemaDisplay;
  final int index;
  final int total;
  final int timeLimit;

  Question({
    required this.id,
    required this.type,
    required this.difficulty,
    required this.topic,
    required this.scenario,
    required this.questionText,
    this.options,
    this.schemaDisplay,
    required this.index,
    required this.total,
    required this.timeLimit,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as int,
      type: json['type'] as String,
      difficulty: json['difficulty'] as String,
      topic: json['topic'] as String,
      scenario: json['scenario'] as String,
      questionText: json['question'] as String,
      options: json['options'] != null ? List<String>.from(json['options']) : null,
      schemaDisplay: json['schema_display'] as String?,
      index: json['index'] as int,
      total: json['total'] as int,
      timeLimit: json['timeLimit'] as int,
    );
  }
}

class PlayerScore {
  final int id;
  final String username;
  final String avatarColor;
  final int score;
  final int? eloRating;
  final bool isReady;
  final bool isHost;

  PlayerScore({
    required this.id,
    required this.username,
    required this.avatarColor,
    required this.score,
    this.eloRating,
    this.isReady = false,
    this.isHost = false,
  });

  factory PlayerScore.fromJson(Map<String, dynamic> json) {
    return PlayerScore(
      id: json['id'] as int,
      username: json['username'] as String,
      avatarColor: json['avatar_color'] ?? json['avatarColor'] ?? '#00d4ff',
      score: json['score'] as int? ?? 0,
      eloRating: json['elo_rating'] as int?,
      isReady: json['is_ready'] == true || json['isReady'] == true || json['is_ready'] == 1 || json['isReady'] == 1,
      isHost: json['isHost'] == true || json['isHost'] == 1,
    );
  }
}

class AnswerResult {
  final bool? correct;
  final int? score;
  final String? error;
  final List<dynamic>? resultRows;
  final String? correctAnswer;
  final String? explanation;
  final bool revealed;
  final List<PlayerScore>? scores;

  AnswerResult({
    this.correct,
    this.score,
    this.error,
    this.resultRows,
    this.correctAnswer,
    this.explanation,
    this.revealed = false,
    this.scores,
  });

  factory AnswerResult.fromJson(Map<String, dynamic> json) {
    return AnswerResult(
      correct: json['correct'] as bool?,
      score: json['score'] as int?,
      error: json['error'] as String?,
      resultRows: json['resultRows'] as List<dynamic>?,
      correctAnswer: json['correctAnswer'] as String?,
      explanation: json['explanation'] as String?,
      revealed: json['revealed'] == true,
      scores: json['scores'] != null 
          ? (json['scores'] as List).map((e) => PlayerScore.fromJson(e)).toList() 
          : null,
    );
  }

  AnswerResult copyWith({
    bool? correct,
    int? score,
    String? error,
    List<dynamic>? resultRows,
    String? correctAnswer,
    String? explanation,
    bool? revealed,
    List<PlayerScore>? scores,
  }) {
    return AnswerResult(
      correct: correct ?? this.correct,
      score: score ?? this.score,
      error: error ?? this.error,
      resultRows: resultRows ?? this.resultRows,
      correctAnswer: correctAnswer ?? this.correctAnswer,
      explanation: explanation ?? this.explanation,
      revealed: revealed ?? this.revealed,
      scores: scores ?? this.scores,
    );
  }
}

class GameOverResult {
  final List<dynamic> results;

  GameOverResult({required this.results});

  factory GameOverResult.fromJson(Map<String, dynamic> json) {
    return GameOverResult(
      results: json['results'] as List<dynamic>,
    );
  }
}

class GameState {
  final Question? question;
  final List<PlayerScore> scores;
  final int timeLeft;
  final String phase; // 'lobby', 'room_lobby', 'countdown', 'question', 'result', 'gameover'
  final AnswerResult? answerResult;
  final GameOverResult? gameOver;
  final int countdown;
  final bool answered;
  final String? roomCode;

  GameState({
    this.question,
    this.scores = const [],
    this.timeLeft = 0,
    this.phase = 'lobby',
    this.answerResult,
    this.gameOver,
    this.countdown = 0,
    this.answered = false,
    this.roomCode,
  });

  GameState copyWith({
    Question? question,
    List<PlayerScore>? scores,
    int? timeLeft,
    String? phase,
    AnswerResult? answerResult,
    GameOverResult? gameOver,
    int? countdown,
    bool? answered,
    String? roomCode,
  }) {
    return GameState(
      question: question ?? this.question,
      scores: scores ?? this.scores,
      timeLeft: timeLeft ?? this.timeLeft,
      phase: phase ?? this.phase,
      answerResult: answerResult ?? this.answerResult,
      gameOver: gameOver ?? this.gameOver,
      countdown: countdown ?? this.countdown,
      answered: answered ?? this.answered,
      roomCode: roomCode ?? this.roomCode,
    );
  }
}
