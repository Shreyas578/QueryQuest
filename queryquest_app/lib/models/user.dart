class User {
  final int id;
  final String username;
  final String email;
  final int eloRating;
  final String avatarColor;
  final String avatarUrl;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.eloRating,
    required this.avatarColor,
    required this.avatarUrl,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      username: json['username'] as String,
      email: json['email'] as String,
      eloRating: json['elo_rating'] as int? ?? 1000,
      avatarColor: json['avatar_color'] as String? ?? '#00d4ff',
      avatarUrl: json['avatar_url'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'elo_rating': eloRating,
      'avatar_color': avatarColor,
      'avatar_url': avatarUrl,
    };
  }
}
