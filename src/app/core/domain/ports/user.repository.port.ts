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
  getById(id: string): Observable<User>;
  create(data: CreateUserData): Observable<User>;
  update(id: string, data: Partial<User>): Observable<User>;
  delete(id: string): Observable<void>;
  assignRole(userId: string, roleId: string): Observable<User>;
  removeRole(userId: string, roleId: string): Observable<User>;
  getUserSessions(userId: string): Observable<any[]>;
  invalidateUserSessions(userId: string): Observable<void>;
  getUserAuditLogs(userId: string): Observable<any[]>;
}

export const USER_REPOSITORY = new InjectionToken<IUserRepository>('IUserRepository');

