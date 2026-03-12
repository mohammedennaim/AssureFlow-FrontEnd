import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { CLIENT_REPOSITORY } from '../../../core/domain/ports/client.repository.port';

@Injectable({ providedIn: 'root' })
export class ClientSessionService {
  private authService = inject(AuthService);
  private clientRepository = inject(CLIENT_REPOSITORY);

  private cachedClientId: string | null = null;
  private cachedEmail: string | null = null;

  getCurrentClientId(): Observable<string | null> {
    if (this.cachedClientId) {
      console.log('[ClientSession] Using cached clientId:', this.cachedClientId);
      return of(this.cachedClientId);
    }

    const user = this.authService.getCurrentUser();
    console.log('[ClientSession] Current user from JWT:', user);

    if (user?.clientId) {
      console.log('[ClientSession] Found clientId in JWT:', user.clientId);
      this.cachedClientId = user.clientId;
      return of(this.cachedClientId);
    }

    const email = user?.id;
    if (!email) {
      console.warn('[ClientSession] No email found for current user');
      return of(null);
    }

    if (this.cachedEmail !== email) {
      this.cachedEmail = email;
      this.cachedClientId = null;
    }

    console.log('[ClientSession] Fetching clientId via /me endpoint');

    return this.clientRepository.getMe().pipe(
      map((client) => {
        console.log('[ClientSession] getMe response:', client);
        if (client && client.id) {
          console.log('[ClientSession] Found clientId:', client.id);
          this.cachedClientId = client.id;
          return this.cachedClientId;
        }
        console.warn('[ClientSession] Client not found via /me - response:', client);
        return null;
      }),
      catchError((err) => {
        console.error('[ClientSession] ERROR fetching client via /me:', err);
        return of(null);
      })
    );
  }

  clearCache(): void {
    this.cachedClientId = null;
    this.cachedEmail = null;
  }
}
