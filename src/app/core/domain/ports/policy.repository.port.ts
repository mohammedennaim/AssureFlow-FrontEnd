import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Policy } from '../models/policy.model';

export interface CreatePolicyData {
  clientId: string;
  type: string;
  startDate: string;
  endDate: string;
  premium: number;
}

export interface IPolicyRepository {
  getAll(): Observable<Policy[]>;
  getById(id: string): Observable<Policy>;
  getByClientId(clientId: string): Observable<Policy[]>;
  create(data: CreatePolicyData): Observable<Policy>;
  update(id: string, data: Partial<Policy>): Observable<Policy>;
  delete(id: string): Observable<void>;
  submit(id: string): Observable<void>;
  approve(id: string): Observable<void>;
  reject(id: string, reason: string): Observable<void>;
  cancel(id: string, reason: string): Observable<void>;
}

export const POLICY_REPOSITORY = new InjectionToken<IPolicyRepository>('IPolicyRepository');
