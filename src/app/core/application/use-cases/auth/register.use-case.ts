import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IAuthRepository, AUTH_REPOSITORY } from '../../../domain/ports/auth.repository.port';
import { RegisterCredentials } from '../../../domain/models/auth.model';

@Injectable({ providedIn: 'root' })
export class RegisterUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private authRepository: IAuthRepository) { }

  execute(credentials: RegisterCredentials): Observable<void> {
    return this.authRepository.register(credentials);
  }
}
