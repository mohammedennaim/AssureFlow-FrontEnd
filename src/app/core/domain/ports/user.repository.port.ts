import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface IUserRepository {
  getAll(): Observable<User[]>;
  create(data: CreateUserData): Observable<User>;
  update(id: string, data: Partial<User>): Observable<User>;
  delete(id: string): Observable<void>;
}

export const USER_REPOSITORY = new InjectionToken<IUserRepository>('IUserRepository');
