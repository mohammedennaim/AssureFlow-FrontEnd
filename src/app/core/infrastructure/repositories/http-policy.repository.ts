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
        console.log('[PolicyRepository] getAll raw response:', res);

        let data: PolicyDto[] = [];

        // Handle BaseResponse wrapper
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

        console.log('[PolicyRepository] extracted data:', data);
        return data.map(this.mapToPolicy);
      }),
      catchError((err) => {
        console.error('[PolicyRepository] getAll error:', err);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<Policy> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        console.log('[PolicyRepository] getById raw response:', res);
        
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
    return this.http.get<any>(`${this.apiUrl}/client/${clientId}`).pipe(
      map((res) => {
        console.log('[PolicyRepository] getByClientId raw response:', res);

        let data: PolicyDto[] = [];

        // Handle BaseResponse wrapper
        if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res)) {
          data = res;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.policies && Array.isArray(res.policies)) {
          data = res.policies;
        }

        console.log('[PolicyRepository] getByClientId extracted data:', data);
        return data.map(this.mapToPolicy);
      }),
      catchError((err) => {
        console.error('[PolicyRepository] getByClientId error:', err);
        return of([]);
      })
    );
  }

  create(data: CreatePolicyData): Observable<Policy> {
    console.log('[PolicyRepository] Creating policy with data:', data);
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        console.log('[PolicyRepository] Create response:', res);
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
        console.error('[PolicyRepository] Create error:', err);
        throw err; // Re-throw to let component handle it
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

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
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
    });
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
