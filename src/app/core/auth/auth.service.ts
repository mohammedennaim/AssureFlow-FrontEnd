import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface TokenResponse {
  token: string;
  user: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = 'http://localhost:8080/api/v1/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<TokenResponse> {
    const payload: LoginPayload = { email, password };
    return this.http.post<any>(`${this.base}/login`, payload).pipe(
      map((res: any) => res?.data ?? res),
      tap((res: TokenResponse) => {
        const token = res?.token;
        if (token) {
          localStorage.setItem('assureflow_token', token);
        }
      }),
      catchError(this.handleError)
    );
  }

  register(username: string, email: string, password: string) {
    const payload: RegisterPayload = { username, email, password };
    return this.http.post<any>(`${this.base}/register`, payload).pipe(
      catchError(this.handleError)
    );
  }

  logout() {
    localStorage.removeItem('assureflow_token');
  }

  getToken(): string | null {
    return localStorage.getItem('assureflow_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  getUserRole(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // Decode the payload part of the JWT (the second part)
      const payloadBase64 = token.split('.')[1];
      // Atob decodes base64 strings
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      
      // The role could be under 'role', 'roles', or 'authorities'
      // Adjust this based on your backend JWT structure
      const role = payload.role || payload.roles || (payload.authorities && payload.authorities[0]?.authority);
      
      if (Array.isArray(role)) {
          return role[0];
      }
      return role;
    } catch (error) {
      console.error('Error decoding JWT token', error);
      return null;
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || error.message || 'Server error';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
