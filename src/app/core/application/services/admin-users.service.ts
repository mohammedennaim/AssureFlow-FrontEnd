import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GetUsersUseCase } from '../use-cases/users/get-users.use-case';
import { CreateUserUseCase } from '../use-cases/users/create-user.use-case';
import { UpdateUserUseCase } from '../use-cases/users/update-user.use-case';
import { DeleteUserUseCase } from '../use-cases/users/delete-user.use-case';
import { User } from '../../domain/models/user.model';
import { USER_REPOSITORY } from '../../domain/ports/user.repository.port';

export type { User };

@Injectable({ providedIn: 'root' })
export class UsersService {
  private getUsersUseCase = inject(GetUsersUseCase);
  private createUserUseCase = inject(CreateUserUseCase);
  private updateUserUseCase = inject(UpdateUserUseCase);
  private deleteUserUseCase = inject(DeleteUserUseCase);
  private userRepository = inject(USER_REPOSITORY);

  getUsers(): Observable<User[]> {
    return this.getUsersUseCase.execute();
  }

  getUserById(id: string): Observable<User> {
    return this.userRepository.getById(id);
  }

  createUser(data: { username: string; email: string; password: string; role?: string }): Observable<User> {
    return this.createUserUseCase.execute(data);
  }

  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.updateUserUseCase.execute(id, data);
  }

  deleteUser(id: string): Observable<void> {
    return this.deleteUserUseCase.execute(id);
  }

  assignRole(userId: string, roleId: string): Observable<User> {
    return this.userRepository.assignRole(userId, roleId);
  }

  removeRole(userId: string, roleId: string): Observable<User> {
    return this.userRepository.removeRole(userId, roleId);
  }

  getUserSessions(userId: string): Observable<any[]> {
    return this.userRepository.getUserSessions(userId);
  }

  invalidateUserSessions(userId: string): Observable<void> {
    return this.userRepository.invalidateUserSessions(userId);
  }

  getUserAuditLogs(userId: string): Observable<any[]> {
    return this.userRepository.getUserAuditLogs(userId);
  }
}
