import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AUTH_REPOSITORY } from '../../../domain/ports/auth.repository.port';
import { RegisterCredentials } from '../../../domain/models/auth.model';

@Injectable({ providedIn: 'root' })
export class RegisterUseCase {
  private authRepository = inject(AUTH_REPOSITORY);

  execute(credentials: RegisterCredentials): Observable<void> {
    return this.authRepository.register(credentials);
  }
}
