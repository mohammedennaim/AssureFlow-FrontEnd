import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../domain/models/user.model';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/ports/user.repository.port';

@Injectable({ providedIn: 'root' })
export class UpdateUserUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private userRepository: IUserRepository
    ) { }

    execute(id: string, data: Partial<User>): Observable<User> {
        return this.userRepository.update(id, data);
    }
}
