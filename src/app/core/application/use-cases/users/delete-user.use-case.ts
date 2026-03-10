import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { USER_REPOSITORY } from '../../../domain/ports/user.repository.port';

@Injectable({ providedIn: 'root' })
export class DeleteUserUseCase {
  private userRepository = inject(USER_REPOSITORY);

  execute(id: string): Observable<void> {
    return this.userRepository.delete(id);
  }
}
