import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginUseCase } from '../application/use-cases/auth/login.use-case';
import { RegisterUseCase } from '../application/use-cases/auth/register.use-case';
import { AuthToken } from '../domain/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loginUseCase = inject(LoginUseCase);
  private registerUseCase = inject(RegisterUseCase);

  login(email: string, password: string): Observable<AuthToken> {
    return this.loginUseCase.execute({ email, password });
  }

  register(username: string, email: string, password: string): Observable<void> {
    return this.registerUseCase.execute({ username, email, password });
  }

  logout(): void {
    localStorage.removeItem('assureflow_token');
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('assureflow_token');
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  getUserRole(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64)) as {
        role?: string | string[];
        roles?: string | string[];
        authorities?: { authority: string }[];
        clientId?: string;
        id?: string;
      };
      const role = payload.role ?? payload.roles ?? payload.authorities?.[0]?.authority;
      return Array.isArray(role) ? role[0] : (role ?? null);
    } catch {
      return null;
    }
  }

  getCurrentUser(): { id: string; clientId?: string; role?: string } | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64)) as {
        sub?: string;
        id?: string;
        clientId?: string;
        role?: string;
        roles?: string | string[];
        authorities?: { authority: string }[];
      };
      const role = payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : payload.roles) || '';
      return {
        id: payload.sub || payload.id || '',  // JWT uses 'sub' (subject) for the email
        clientId: payload.clientId,
        role
      };
    } catch {
      return null;
    }
  }
}
