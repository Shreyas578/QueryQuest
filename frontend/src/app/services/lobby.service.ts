import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Room, CreateRoomPayload } from '../core/models/room.model';

@Injectable({ providedIn: 'root' })
export class LobbyService {
  private readonly API = `${environment.apiUrl}/lobby`;

  constructor(private http: HttpClient) {}

  getRooms(): Observable<{ rooms: Room[] }> {
    return this.http.get<{ rooms: Room[] }>(`${this.API}/rooms`);
  }

  createRoom(payload: CreateRoomPayload): Observable<{ room: Room }> {
    return this.http.post<{ room: Room }>(`${this.API}/rooms`, payload);
  }

  joinRoom(code: string): Observable<{ room: Room }> {
    return this.http.post<{ room: Room }>(`${this.API}/rooms/join`, { code });
  }

  getRoom(code: string): Observable<{ room: Room }> {
    return this.http.get<{ room: Room }>(`${this.API}/rooms/${code}`);
  }

  getLeaderboard(): Observable<{ leaderboard: any[] }> {
    return this.http.get<{ leaderboard: any[] }>(`${this.API}/leaderboard`);
  }
}
