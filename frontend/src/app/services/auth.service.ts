import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, AuthResponse } from '../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private _user$ = new BehaviorSubject<User | null>(this._loadUser());

  user$ = this._user$.asObservable();

  constructor(private http: HttpClient) {}

  get user(): User | null { return this._user$.value; }
  get token(): string | null { return localStorage.getItem('qq_token'); }
  get isLoggedIn(): boolean { return !!this.token && !!this.user; }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, { username, email, password })
      .pipe(tap(res => this._persist(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, { email, password })
      .pipe(tap(res => this._persist(res)));
  }

  me(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API}/me`)
      .pipe(tap(res => this._user$.next(res.user)));
  }

  logout(): void {
    localStorage.removeItem('qq_token');
    localStorage.removeItem('qq_user');
    this._user$.next(null);
  }

  private _persist(res: AuthResponse): void {
    localStorage.setItem('qq_token', res.token);
    localStorage.setItem('qq_user', JSON.stringify(res.user));
    this._user$.next(res.user);
  }

  private _loadUser(): User | null {
    const raw = localStorage.getItem('qq_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
