import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import { GameState, Question, AnswerResult, PlayerScore, GameOverResult } from '../core/models/game.model';

const EVENTS = {
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  START_GAME: 'start_game',
  SUBMIT_ANSWER: 'submit_answer',
  ROOM_UPDATED: 'room_updated',
  GAME_STARTED: 'game_started',
  QUESTION: 'question',
  ANSWER_RESULT: 'answer_result',
  SCORES_UPDATE: 'scores_update',
  GAME_OVER: 'game_over',
  COUNTDOWN: 'countdown',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  ERROR: 'error',
  JOIN_MATCHMAKING: 'join_matchmaking',
  LEAVE_MATCHMAKING: 'leave_matchmaking',
  MATCHMAKING_STATUS: 'matchmaking_status',
};

const INITIAL_STATE: GameState = {
  question: null,
  scores: [],
  timeLeft: 60,
  phase: 'lobby',
  answerResult: null,
  gameOver: null,
  countdown: 0,
  answered: false,
};

@Injectable({ providedIn: 'root' })
export class GameService {
  private _state$ = new BehaviorSubject<GameState>({ ...INITIAL_STATE });
  state$ = this._state$.asObservable();

  private _roomPlayers$ = new BehaviorSubject<any[]>([]);
  roomPlayers$ = this._roomPlayers$.asObservable();

  private _matchmaking$ = new BehaviorSubject<any>(null);
  matchmaking$ = this._matchmaking$.asObservable();

  private _error$ = new BehaviorSubject<string | null>(null);
  error$ = this._error$.asObservable();

  private subs: Subscription[] = [];
  private timerHandle: any = null;

  constructor(private socket: SocketService) {}

  get state(): GameState { return this._state$.value; }

  // ── Room ──────────────────────────────────────────────────────────────────
  joinRoom(code: string): void {
    this.socket.emit(EVENTS.JOIN_ROOM, { code });
    this._subscribe();
  }

  leaveRoom(): void {
    this.socket.emit(EVENTS.LEAVE_ROOM);
    this._unsubscribe();
    this._state$.next({ ...INITIAL_STATE });
  }

  startGame(): void {
    this.socket.emit(EVENTS.START_GAME);
  }

  submitAnswer(answer: string): void {
    if (this.state.answered) return;
    this._patch({ answered: true });
    this.socket.emit(EVENTS.SUBMIT_ANSWER, { answer });
  }

  // ── Matchmaking ───────────────────────────────────────────────────────────
  joinMatchmaking(difficulty: string = 'mixed'): void {
    this.socket.emit(EVENTS.JOIN_MATCHMAKING, { difficulty });
  }

  leaveMatchmaking(): void {
    this.socket.emit(EVENTS.LEAVE_MATCHMAKING);
  }

  reset(): void {
    this._unsubscribe();
    this._state$.next({ ...INITIAL_STATE });
    this._roomPlayers$.next([]);
    this._error$.next(null);
  }

  // ── Private ───────────────────────────────────────────────────────────────
  private _subscribe(): void {
    this._unsubscribe();

    this.subs = [
      this.socket.on(EVENTS.PLAYER_JOINED).subscribe(({ players }) => {
        this._roomPlayers$.next(players);
      }),
      this.socket.on(EVENTS.PLAYER_LEFT).subscribe(({ players }) => {
        this._roomPlayers$.next(players);
      }),
      this.socket.on(EVENTS.COUNTDOWN).subscribe(({ seconds }) => {
        this._patch({ phase: 'countdown', countdown: seconds });
      }),
      this.socket.on<Question>(EVENTS.QUESTION).subscribe(q => {
        this._stopTimer();
        this._patch({ phase: 'question', question: q, timeLeft: q.timeLimit, answerResult: null, answered: false });
        this._startTimer(q.timeLimit);
      }),
      this.socket.on<AnswerResult>(EVENTS.ANSWER_RESULT).subscribe(res => {
        this._stopTimer();
        if (res.scores) this._patch({ scores: res.scores });
        if (!res.revealed) {
          this._patch({ answerResult: res, phase: 'result' });
        } else {
          this._patch({ answerResult: res, phase: 'result', scores: res.scores ?? this.state.scores });
        }
      }),
      this.socket.on<PlayerScore[]>(EVENTS.SCORES_UPDATE).subscribe(scores => {
        this._patch({ scores });
      }),
      this.socket.on<GameOverResult>(EVENTS.GAME_OVER).subscribe(data => {
        this._stopTimer();
        this._patch({ phase: 'gameover', gameOver: data });
      }),
      this.socket.on<any>(EVENTS.MATCHMAKING_STATUS).subscribe(data => {
        this._matchmaking$.next(data);
      }),
      this.socket.on<{ message: string }>(EVENTS.ERROR).subscribe(({ message }) => {
        this._error$.next(message);
        setTimeout(() => this._error$.next(null), 4000);
      }),
    ];
  }

  private _unsubscribe(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this._stopTimer();
  }

  private _patch(partial: Partial<GameState>): void {
    this._state$.next({ ...this._state$.value, ...partial });
  }

  private _startTimer(seconds: number): void {
    let t = seconds;
    this.timerHandle = setInterval(() => {
      t--;
      this._patch({ timeLeft: Math.max(0, t) });
      if (t <= 0) this._stopTimer();
    }, 1000);
  }

  private _stopTimer(): void {
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = null; }
  }
}
