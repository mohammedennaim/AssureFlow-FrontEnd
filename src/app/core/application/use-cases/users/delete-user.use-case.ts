import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/ports/user.repository.port';

@Injectable({ providedIn: 'root' })
export class DeleteUserUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private userRepository: IUserRepository
    ) { }

    execute(id: string): Observable<void> {
        return this.userRepository.delete(id);
    }
}
