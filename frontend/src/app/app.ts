import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket.service';
import { LobbyService } from './services/lobby.service';
import { GameState, Question, PlayerScore, AnswerResult, GameOverResult } from './core/models/game.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: false
})
export class App implements OnInit, OnDestroy {
  // ── State ──────────────────────────────────────────────────────────────────
  gameState = signal<GameState>({
    question: null,
    scores: [],
    timeLeft: 0,
    phase: 'lobby',
    answerResult: null,
    gameOver: null,
    countdown: 0,
    answered: false,
    roomCode: undefined
  });

  allReady = computed(() => {
    const players = this.gameState().scores;
    return players.length >= 2 && players.every(p => p.is_ready);
  });

  isHost = computed(() => {
    return this.gameState().scores.find(p => p.id === this.auth.user?.id)?.isHost || false;
  });

  authPhase = signal<'login' | 'register'>('login');
  availableRooms = signal<any[]>([]);
  showCreateModal = signal(false);
  showJoinModal = signal(false);
  
  // ── Form Inputs ────────────────────────────────────────────────────────────
  authForm = { email: '', password: '', username: '' };
  lobbyCode = '';
  manualCode = '';
  sqlAnswer = '';
  isMatchmaking = signal(false);
  isReady = signal(false);
  isAnalyzing = signal(false);
  activePlayers = signal<number>(0);
  
  roomConfig = {
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
    num_questions: 25
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    public socket: SocketService,
    private lobbyService: LobbyService
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn) {
      this.initSocket();
      this.refreshRooms();
    }
    
    // Periodically refresh rooms in lobby
    setInterval(() => {
      if (this.gameState().phase === 'lobby' && this.auth.isLoggedIn) {
        this.refreshRooms();
      }
    }, 5000);
    
    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) this.initSocket();
      else this.socket.disconnect();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Auth Actions ───────────────────────────────────────────────────────────
  onAuthSubmit(): void {
    const { email, password, username } = this.authForm;
    const action = this.authPhase() === 'login' 
      ? this.auth.login(email, password)
      : this.auth.register(username, email, password);

    action.subscribe({
      next: () => this.initSocket(),
      error: (err) => alert(err.error?.error || err.error?.message || 'Auth failed')
    });
  }

  logout(): void {
    this.auth.logout();
    this.gameState.update(s => ({ ...s, phase: 'lobby' }));
  }

  // ── Socket Logic ───────────────────────────────────────────────────────────
  private initSocket(): void {
    this.socket.connect();
    
    // Listen for Game Events
    this.socket.on('countdown').subscribe(({ seconds }) => {
      this.gameState.update(s => ({ ...s, phase: 'countdown', countdown: seconds }));
    });

    this.socket.on('question').subscribe((q: Question) => {
      this.gameState.update(s => ({ 
        ...s, 
        phase: 'question', 
        question: q, 
        timeLeft: q.timeLimit,
        answerResult: null,
        answered: false 
      }));
      this.sqlAnswer = '';
    });

    this.socket.on('timer_tick').subscribe(({ seconds }) => {
      this.gameState.update(s => ({ ...s, timeLeft: seconds }));
    });

    this.socket.on('answer_result').subscribe((res: any) => {
      this.gameState.update(s => {
        // Extract my personal result from the global map if it exists
        const myId = this.auth.user?.id;
        const myResult = res.playerResults && myId ? res.playerResults[myId] : null;

        const nextResult = {
          ...s.answerResult,
          ...res,
          ...myResult,
          // Critically preserve 'correct' and 'revealed' flags regardless of message order
          correct: myResult?.correct ?? res.correct ?? s.answerResult?.correct,
          revealed: res.revealed || s.answerResult?.revealed || false
        };
        
        let nextPhase = s.phase;
        if (nextResult.revealed) {
          nextPhase = 'result';
          this.isAnalyzing.set(false);
        }

        return { 
          ...s, 
          phase: nextPhase, 
          answerResult: nextResult,
          scores: res.scores || s.scores
        };
      });
    });

    this.socket.on('scores_update').subscribe((scores: PlayerScore[]) => {
      this.gameState.update(s => ({ ...s, scores }));
    });

    this.socket.on('game_over').subscribe((res: GameOverResult) => {
      this.gameState.update(s => ({ ...s, phase: 'gameover', gameOver: res }));
    });

    this.socket.on('matchmaking_status').subscribe(({ status, room }) => {
      if (status === 'queued') this.isMatchmaking.set(true);
      else if (status === 'left') this.isMatchmaking.set(false);
      else if (status === 'matched') {
        this.isMatchmaking.set(false);
        this.gameState.update(s => ({ ...s, roomCode: room.code }));
        this.socket.emit('join_room', { code: room.code });
      }
    });

    this.socket.on('player_joined').subscribe(({ players }) => {
      this.gameState.update(s => ({ ...s, phase: 'room_lobby', scores: players }));
      this.updateIsReady(players);
    });

    this.socket.on('room_updated').subscribe(({ players }) => {
      this.gameState.update(s => ({ ...s, scores: players }));
      this.updateIsReady(players);
    });

    this.socket.on('ready_status').subscribe(({ userId, isReady, players }) => {
      this.gameState.update(s => ({ ...s, scores: players }));
      this.updateIsReady(players);
    });
    
    this.socket.on('error').subscribe(({ message }) => alert(message));

    this.socket.on('active_players').subscribe((count: number) => {
      this.activePlayers.set(count);
    });
  }

  private updateIsReady(players: PlayerScore[]): void {
    const me = players.find(p => p.id === this.auth.user?.id);
    if (me) {
      this.isReady.set(!!me.is_ready);
    }
  }

  // ── Game Actions ───────────────────────────────────────────────────────────
  joinMatchmaking(): void {
    this.socket.emit('join_matchmaking', { difficulty: 'mixed' });
  }

  refreshRooms(): void {
    this.lobbyService.getRooms().subscribe({
      next: ({ rooms }) => this.availableRooms.set(rooms),
      error: () => {}
    });
  }

  joinRoom(code: string): void {
    this.gameState.update(s => ({ ...s, roomCode: code }));
    this.socket.emit('join_room', { code });
  }

  createRoom(): void {
    this.lobbyService.createRoom({
      max_players: 4,
      ...this.roomConfig
    }).subscribe({
      next: ({ room }) => {
        this.showCreateModal.set(false);
        this.gameState.update(s => ({ ...s, roomCode: room.code }));
        this.socket.emit('join_room', { code: room.code });
      },
      error: (err) => alert(err.error?.error || 'Failed to create room')
    });
  }

  submitAnswer(answer: string): void {
    if (this.gameState().answered || this.isAnalyzing()) return;
    this.isAnalyzing.set(true);
    this.socket.emit('submit_answer', { answer });
    this.gameState.update(s => ({ ...s, answered: true }));
    // We don't wait for answer_result anymore to stop analysis
    // because results are delayed.
    setTimeout(() => this.isAnalyzing.set(false), 500); 
  }

  toggleReady(): void {
    const newState = !this.isReady();
    this.socket.emit('toggle_ready', { isReady: newState });
    this.isReady.set(newState);
  }

  startGame(): void {
    this.socket.emit('start_game');
  }

  selectMCQ(option: string): void {
    this.submitAnswer(option);
  }

  getPlayerRank(elo: number | undefined | null): string {
    if (!elo && elo !== 0) return 'Unranked';
    if (elo < 900) return 'Bronze V';
    if (elo < 1000) return 'Bronze IV';
    if (elo < 1100) return 'Bronze III';
    if (elo < 1200) return 'Bronze II';
    if (elo < 1300) return 'Bronze I';
    if (elo < 1500) return 'Silver';
    if (elo < 1700) return 'Gold';
    if (elo < 1900) return 'Platinum';
    if (elo < 2100) return 'Diamond';
    if (elo < 2300) return 'Elite';
    if (elo < 2500) return 'Master';
    return 'Conquerer';
  }
}
