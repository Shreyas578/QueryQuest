class Room {
  final int id;
  final String code;
  final int hostId;
  final String hostName;
  final String status;
  final int maxPlayers;
  final String difficulty;
  final int numQuestions;
  final int playerCount;

  Room({
    required this.id,
    required this.code,
    required this.hostId,
    required this.hostName,
    required this.status,
    required this.maxPlayers,
    required this.difficulty,
    required this.numQuestions,
    required this.playerCount,
  });

  factory Room.fromJson(Map<String, dynamic> json) {
    return Room(
      id: json['id'] as int,
      code: json['code'] as String,
      hostId: json['host_id'] as int,
      hostName: json['host_name'] as String? ?? '',
      status: json['status'] as String,
      maxPlayers: json['max_players'] as int,
      difficulty: json['difficulty'] as String,
      numQuestions: json['num_questions'] as int,
      playerCount: json['player_count'] != null 
          ? int.parse(json['player_count'].toString()) 
          : 0,
    );
  }
}
