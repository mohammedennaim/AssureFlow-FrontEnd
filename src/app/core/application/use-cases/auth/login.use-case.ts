import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IAuthRepository, AUTH_REPOSITORY } from '../../../domain/ports/auth.repository.port';
import { LoginCredentials, AuthToken } from '../../../domain/models/auth.model';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private authRepository: IAuthRepository) { }

  execute(credentials: LoginCredentials): Observable<AuthToken> {
    return this.authRepository.login(credentials).pipe(
      tap((token) => {
        if (token?.token) {
          localStorage.setItem('assureflow_token', token.token);
        }
      })
    );
  }
}
