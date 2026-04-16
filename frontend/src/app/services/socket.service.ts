import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket!: Socket;
  private destroy$ = new Subject<void>();

  constructor(private auth: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.socketUrl, {
      auth: { token: this.auth.token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => console.log('[Socket] Connected', this.socket.id));
    this.socket.on('disconnect', () => console.log('[Socket] Disconnected'));
    this.socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on<T = any>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      this.socket?.on(event, (data: T) => observer.next(data));
      return () => this.socket?.off(event);
    });
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
