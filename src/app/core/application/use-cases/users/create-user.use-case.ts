import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUserData, USER_REPOSITORY } from '../../../domain/ports/user.repository.port';
import { User } from '../../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class CreateUserUseCase {
  private userRepository = inject(USER_REPOSITORY);

  execute(data: CreateUserData): Observable<User> {
    return this.userRepository.create(data);
  }
}
