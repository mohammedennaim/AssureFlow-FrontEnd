import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Client } from '../models/client.model';

export interface CreateClientData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  cin?: string;
}

export interface IClientRepository {
  getAll(page?: number, size?: number): Observable<Client[]>;
  getById(id: string): Observable<Client>;
  getByEmail(email: string): Observable<Client>;
  getByCin(cin: string): Observable<Client>;
  getMe(): Observable<Client>;
  updateMe(data: Partial<Client>): Observable<Client>;
  create(data: CreateClientData): Observable<Client>;
  update(id: string, data: Partial<Client>): Observable<Client>;
  delete(id: string): Observable<void>;
  activate(id: string): Observable<void>;
  deactivate(id: string): Observable<void>;
}

export const CLIENT_REPOSITORY = new InjectionToken<IClientRepository>('IClientRepository');
