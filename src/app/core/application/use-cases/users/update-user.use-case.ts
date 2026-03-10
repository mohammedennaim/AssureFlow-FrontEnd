import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../domain/models/user.model';
import { USER_REPOSITORY } from '../../../domain/ports/user.repository.port';

@Injectable({ providedIn: 'root' })
export class UpdateUserUseCase {
  private userRepository = inject(USER_REPOSITORY);

  execute(id: string, data: Partial<User>): Observable<User> {
    return this.userRepository.update(id, data);
  }
}
