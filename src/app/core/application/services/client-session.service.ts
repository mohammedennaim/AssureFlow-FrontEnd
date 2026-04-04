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
      return of(this.cachedClientId);
    }

    const user = this.authService.getCurrentUser();

    if (user?.clientId) {
      this.cachedClientId = user.clientId;
      return of(this.cachedClientId);
    }

    const email = user?.id;

    if (!email) {
      return of(null);
    }

    if (this.cachedEmail !== email) {
      this.cachedEmail = email;
      this.cachedClientId = null;
    }

    return this.clientRepository.getMe().pipe(
      map((client) => {
        if (client && client.id) {
          this.cachedClientId = client.id;
          return this.cachedClientId;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  clearCache(): void {
    this.cachedClientId = null;
    this.cachedEmail = null;
  }
}
