import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/ports/user.repository.port';
import { User } from '../../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class GetUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private userRepository: IUserRepository) { }

  execute(): Observable<User[]> {
    return this.userRepository.getAll();
  }
}
