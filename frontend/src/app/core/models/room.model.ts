import { User } from './user.model';

export type RoomStatus = 'waiting' | 'in_progress' | 'finished';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface Room {
  id: number;
  code: string;
  host_id: number;
  host_name?: string;
  status: RoomStatus;
  max_players: number;
  difficulty: Difficulty;
  num_questions: number;
  created_at?: string;
  players?: RoomPlayer[];
  player_count?: number;
}

export interface RoomPlayer {
  id: number;
  username: string;
  elo_rating: number;
  avatar_color: string;
  joined_at?: string;
}

export interface CreateRoomPayload {
  max_players?: number;
  difficulty?: Difficulty;
  num_questions?: number;
}
