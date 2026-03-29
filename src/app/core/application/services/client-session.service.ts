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
    console.log('[ClientSession] getCurrentClientId called');
    console.log('[ClientSession] Cached clientId:', this.cachedClientId);
    
    if (this.cachedClientId) {
      console.log('[ClientSession] Returning cached clientId:', this.cachedClientId);
      return of(this.cachedClientId);
    }

    const user = this.authService.getCurrentUser();
    console.log('[ClientSession] Current user:', user);

    if (user?.clientId) {
      this.cachedClientId = user.clientId;
      console.log('[ClientSession] Using user.clientId:', this.cachedClientId);
      return of(this.cachedClientId);
    }

    const email = user?.id;
    console.log('[ClientSession] User email:', email);
    
    if (!email) {
      console.warn('[ClientSession] No email found, returning null');
      return of(null);
    }

    if (this.cachedEmail !== email) {
      console.log('[ClientSession] Email changed, clearing cache');
      this.cachedEmail = email;
      this.cachedClientId = null;
    }

    console.log('[ClientSession] Fetching client from API...');
    return this.clientRepository.getMe().pipe(
      map((client) => {
        console.log('[ClientSession] Received client from API:', client);
        if (client && client.id) {
          this.cachedClientId = client.id;
          console.log('[ClientSession] Cached new clientId:', this.cachedClientId);
          return this.cachedClientId;
        }
        console.warn('[ClientSession] No client.id in response');
        return null;
      }),
      catchError((err) => {
        console.error('[ClientSession] Error fetching client:', err);
        return of(null);
      })
    );
  }

  clearCache(): void {
    this.cachedClientId = null;
    this.cachedEmail = null;
  }
}
