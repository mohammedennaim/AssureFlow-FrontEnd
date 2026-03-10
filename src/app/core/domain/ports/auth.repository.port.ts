import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginCredentials, RegisterCredentials, AuthToken } from '../models/auth.model';

export interface IAuthRepository {
  login(credentials: LoginCredentials): Observable<AuthToken>;
  register(credentials: RegisterCredentials): Observable<void>;
}

export const AUTH_REPOSITORY = new InjectionToken<IAuthRepository>('IAuthRepository');
