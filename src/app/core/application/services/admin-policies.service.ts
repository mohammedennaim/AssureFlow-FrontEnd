import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { POLICY_REPOSITORY, IPolicyRepository, CreatePolicyData } from '../../domain/ports/policy.repository.port';
import { Policy } from '../../domain/models/policy.model';

export type { Policy };

@Injectable({ providedIn: 'root' })
export class PoliciesService {
  private policyRepository = inject(POLICY_REPOSITORY);

  getAll(): Observable<Policy[]> {
    return this.policyRepository.getAll();
  }

  getById(id: string): Observable<Policy> {
    return this.policyRepository.getById(id);
  }

  getByClientId(clientId: string): Observable<Policy[]> {
    return this.policyRepository.getByClientId(clientId);
  }

  create(data: CreatePolicyData): Observable<Policy> {
    return this.policyRepository.create(data);
  }

  update(id: string, data: Partial<Policy>): Observable<Policy> {
    return this.policyRepository.update(id, data);
  }

  delete(id: string): Observable<void> {
    return this.policyRepository.delete(id);
  }

  submit(id: string): Observable<void> {
    return this.policyRepository.submit(id);
  }

  approve(id: string): Observable<void> {
    return this.policyRepository.approve(id);
  }

  reject(id: string, reason: string): Observable<void> {
    return this.policyRepository.reject(id, reason);
  }

  cancel(id: string, reason: string): Observable<void> {
    return this.policyRepository.cancel(id, reason);
  }
}
