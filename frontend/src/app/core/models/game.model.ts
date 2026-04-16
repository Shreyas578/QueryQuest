export type QuestionType = 'mcq' | 'sql';

export interface Question {
  id: number;
  type: QuestionType;
  difficulty: string;
  topic: string;
  scenario: string;
  question: string;
  options?: string[];         // MCQ only
  schema_display?: string;   // SQL only
  index: number;
  total: number;
  timeLimit: number;
}

export interface PlayerScore {
  id: number;
  username: string;
  avatarColor: string;
  score: number;
  elo_rating?: number;
  is_ready?: boolean;
  isHost?: boolean;
}

export interface AnswerResult {
  correct?: boolean;
  score?: number;
  error?: string | null;
  resultRows?: any[];
  correctAnswer?: string;
  explanation?: string;
  revealed?: boolean;
  scores?: PlayerScore[];
}

export interface GameOverResult {
  results: {
    id: number;
    username: string;
    avatarColor: string;
    score: number;
    rank: number;
  }[];
}

export interface GameState {
  question: Question | null;
  scores: PlayerScore[];
  timeLeft: number;
  phase: 'lobby' | 'room_lobby' | 'countdown' | 'question' | 'result' | 'gameover';
  answerResult: AnswerResult | null;
  gameOver: GameOverResult | null;
  countdown: number;
  answered: boolean;
  roomCode?: string;
}
