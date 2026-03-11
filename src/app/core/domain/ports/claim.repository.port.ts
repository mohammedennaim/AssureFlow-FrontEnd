import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Claim } from '../models/claim.model';

export interface CreateClaimData {
  policyId: string;
  description: string;
  amount: number;
}

export interface IClaimRepository {
  getAll(): Observable<Claim[]>;
  getById(id: string): Observable<Claim>;
  getByPolicyId(policyId: string): Observable<Claim[]>;
  getByClientId(clientId: string): Observable<Claim[]>;
  create(data: CreateClaimData): Observable<Claim>;
  update(id: string, data: Partial<Claim>): Observable<Claim>;
  delete(id: string): Observable<void>;
  submit(id: string): Observable<void>;
  review(id: string): Observable<void>;
  approve(id: string, amount: number, approvedBy: string): Observable<void>;
  reject(id: string, reason: string): Observable<void>;
  requestInfo(id: string): Observable<void>;
  close(id: string): Observable<void>;
}

export const CLAIM_REPOSITORY = new InjectionToken<IClaimRepository>('IClaimRepository');
