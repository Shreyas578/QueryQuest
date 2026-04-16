export interface User {
  id: number;
  username: string;
  email: string;
  elo_rating: number;
  avatar_color: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
