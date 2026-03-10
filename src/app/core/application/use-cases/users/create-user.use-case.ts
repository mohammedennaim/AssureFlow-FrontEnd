import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IUserRepository, CreateUserData, USER_REPOSITORY } from '../../../domain/ports/user.repository.port';
import { User } from '../../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class CreateUserUseCase {
    constructor(@Inject(USER_REPOSITORY) private userRepository: IUserRepository) { }

    execute(data: CreateUserData): Observable<User> {
        return this.userRepository.create(data);
    }
}
