import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { USER_REPOSITORY } from '../../../domain/ports/user.repository.port';
import { User } from '../../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class GetUsersUseCase {
  private userRepository = inject(USER_REPOSITORY);

  execute(): Observable<User[]> {
    return this.userRepository.getAll();
  }
}
