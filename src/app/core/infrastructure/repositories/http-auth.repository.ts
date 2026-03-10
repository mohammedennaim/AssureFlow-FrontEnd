import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IAuthRepository } from '../../domain/ports/auth.repository.port';
import { LoginCredentials, RegisterCredentials, AuthToken } from '../../domain/models/auth.model';

@Injectable({ providedIn: 'root' })
export class HttpAuthRepository implements IAuthRepository {
  private readonly baseUrl = 'http://localhost:8080/api/v1/auth';

  constructor(private http: HttpClient) {}

  login(credentials: LoginCredentials): Observable<AuthToken> {
    return this.http.post<{ data?: AuthToken } & AuthToken>(`${this.baseUrl}/login`, credentials).pipe(
      map((res) => (res as { data?: AuthToken }).data ?? (res as AuthToken)),
      catchError(this.handleError)
    );
  }

  register(credentials: RegisterCredentials): Observable<void> {
    return this.http.post<unknown>(`${this.baseUrl}/register`, credentials).pipe(
      map(() => undefined),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = (error.error as { message?: string })?.message || error.message || 'Server error';
    return throwError(() => new Error(message));
  }
}
