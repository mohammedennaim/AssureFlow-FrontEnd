import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IPolicyRepository, CreatePolicyData } from '../../domain/ports/policy.repository.port';
import { Policy } from '../../domain/models/policy.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpPolicyRepository implements IPolicyRepository {
  private readonly apiUrl = `${environment.apiUrl}/policies`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Policy[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => {
        let data: PolicyDto[] = [];

        if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res)) {
          data = res;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.policies && Array.isArray(res.policies)) {
          data = res.policies;
        } else if (res?.items && Array.isArray(res.items)) {
          data = res.items;
        }

        return data.map(this.mapToPolicy);
      }),
      catchError(() => of([]))
    );
  }

  getById(id: string): Observable<Policy> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        let dto: PolicyDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.policy) {
          dto = res.policy;
        } else {
          dto = res;
        }
        
        return this.mapToPolicy(dto as PolicyDto);
      }),
      catchError(() => of({} as Policy))
    );
  }

  getByClientId(clientId: string): Observable<Policy[]> {
    const url = `${this.apiUrl}/client/${clientId}`;
    console.log('[HttpPolicyRepository] Fetching policies from:', url);
    console.log('[HttpPolicyRepository] ClientId:', clientId);
    
    return this.http.get<any>(url).pipe(
      map((res) => {
        console.log('[HttpPolicyRepository] Raw response:', res);
        console.log('[HttpPolicyRepository] Response type:', typeof res);
        console.log('[HttpPolicyRepository] Is array?', Array.isArray(res));
        
        let data: PolicyDto[] = [];

        if (res?.data && Array.isArray(res.data)) {
          console.log('[HttpPolicyRepository] Using res.data, length:', res.data.length);
          data = res.data;
        } else if (Array.isArray(res)) {
          console.log('[HttpPolicyRepository] Using res directly, length:', res.length);
          data = res;
        } else if (res?.content && Array.isArray(res.content)) {
          console.log('[HttpPolicyRepository] Using res.content, length:', res.content.length);
          data = res.content;
        } else if (res?.policies && Array.isArray(res.policies)) {
          console.log('[HttpPolicyRepository] Using res.policies, length:', res.policies.length);
          data = res.policies;
        } else {
          console.warn('[HttpPolicyRepository] Could not find policies array in response');
        }

        console.log('[HttpPolicyRepository] Data to map:', data);
        const policies = data.map(this.mapToPolicy);
        console.log('[HttpPolicyRepository] Mapped policies:', policies);
        return policies;
      }),
      catchError((error) => {
        console.error('[HttpPolicyRepository] Error fetching policies for client ' + clientId + ':', error);
        console.error('[HttpPolicyRepository] Error status:', error.status);
        console.error('[HttpPolicyRepository] Error message:', error.message);
        return of([]);
      })
    );
  }

  create(data: CreatePolicyData): Observable<Policy> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        let dto: PolicyDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.policy) {
          dto = res.policy;
        } else {
          dto = res;
        }
        
        return this.mapToPolicy(dto as PolicyDto);
      }),
      catchError((err) => {
        throw err;
      })
    );
  }

  update(id: string, data: Partial<Policy>): Observable<Policy> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data).pipe(
      map((res) => {
        let dto: PolicyDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.policy) {
          dto = res.policy;
        } else {
          dto = res;
        }
        
        return this.mapToPolicy(dto as PolicyDto);
      })
    );
  }

  submit(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/submit`, {});
  }

  approve(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/reject`, null, {
      params: { reason }
    });
  }

  cancel(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/cancel`, null, {
      params: { reason }
    }).pipe(
      catchError((err) => {
        throw err;
      })
    );
  }

  expire(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/expire`, null, {
      params: { reason }
    }).pipe(
      catchError((err) => {
        throw err;
      })
    );
  }

  renew(id: string): Observable<Policy> {
    return this.http.post<any>(`${this.apiUrl}/${id}/renew`, {}).pipe(
      map((res) => {
        let dto: PolicyDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.policy) {
          dto = res.policy;
        } else {
          dto = res;
        }
        
        return this.mapToPolicy(dto as PolicyDto);
      })
    );
  }

  private mapToPolicy(dto: PolicyDto): Policy {
    return {
      id: dto.id,
      policyNumber: dto.policyNumber,
      clientId: dto.clientId,
      clientName: dto.clientName || 'Unknown Client',
      type: dto.type,
      status: dto.status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      premium: dto.premiumAmount || dto.premium || 0,
      coverageAmount: dto.coverageAmount,
      createdAt: dto.createdAt,
    };
  }
}

interface PolicyDto {
  id: string;
  policyNumber: string;
  clientId: string;
  clientName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  premium?: number;
  premiumAmount?: number;
  coverageAmount?: number;
  createdAt: string;
}
