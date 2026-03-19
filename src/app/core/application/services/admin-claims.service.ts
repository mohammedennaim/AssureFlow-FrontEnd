import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CLAIM_REPOSITORY, IClaimRepository, CreateClaimData } from '../../domain/ports/claim.repository.port';
import { Claim } from '../../domain/models/claim.model';

export type { Claim };

@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private claimRepository = inject(CLAIM_REPOSITORY);

  getAll(): Observable<Claim[]> {
    return this.claimRepository.getAll();
  }

  getById(id: string): Observable<Claim> {
    return this.claimRepository.getById(id);
  }

  getByPolicyId(policyId: string): Observable<Claim[]> {
    return this.claimRepository.getByPolicyId(policyId);
  }

  getByClientId(clientId: string): Observable<Claim[]> {
    return this.claimRepository.getByClientId(clientId);
  }

  create(data: CreateClaimData): Observable<Claim> {
    return this.claimRepository.create(data);
  }

  update(id: string, data: Partial<Claim>): Observable<Claim> {
    return this.claimRepository.update(id, data);
  }

  delete(id: string): Observable<void> {
    return this.claimRepository.delete(id);
  }

  submit(id: string): Observable<void> {
    return this.claimRepository.submit(id);
  }

  review(id: string): Observable<void> {
    return this.claimRepository.review(id);
  }

  approve(id: string, amount: number, approvedBy: string): Observable<void> {
    return this.claimRepository.approve(id, amount, approvedBy);
  }

  reject(id: string, reason: string): Observable<void> {
    return this.claimRepository.reject(id, reason);
  }

  requestInfo(id: string): Observable<void> {
    return this.claimRepository.requestInfo(id);
  }

  markAsPaid(id: string): Observable<void> {
    return this.claimRepository.markAsPaid(id);
  }

  close(id: string): Observable<void> {
    return this.claimRepository.close(id);
  }
}
