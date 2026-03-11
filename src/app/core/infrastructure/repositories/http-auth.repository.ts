import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IAuthRepository } from '../../domain/ports/auth.repository.port';
import { LoginCredentials, RegisterCredentials, AuthToken } from '../../domain/models/auth.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpAuthRepository implements IAuthRepository {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(credentials: LoginCredentials): Observable<AuthToken> {
    return this.http.post<{ data?: { token?: string } }>(`${this.baseUrl}/login`, credentials).pipe(
      map((res) => {
        const token = res.data?.token ?? '';
        return { token };
      }),
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
