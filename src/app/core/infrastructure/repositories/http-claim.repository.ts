import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IClaimRepository, CreateClaimData } from '../../domain/ports/claim.repository.port';
import { Claim } from '../../domain/models/claim.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpClaimRepository implements IClaimRepository {
  private readonly apiUrl = `${environment.apiUrl}/claims`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Claim[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => {
        console.log('[ClaimRepository] getAll raw response:', res);
        
        let data: ClaimDto[] = [];
        
        if (Array.isArray(res)) {
          data = res;
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.claims && Array.isArray(res.claims)) {
          data = res.claims;
        } else if (res?.items && Array.isArray(res.items)) {
          data = res.items;
        }
        
        console.log('[ClaimRepository] extracted data:', data);
        return data.map(this.mapToClaim);
      }),
      catchError((err) => {
        console.error('[ClaimRepository] getAll error:', err);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<Claim> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        console.log('[ClaimRepository] getById raw response:', res);
        
        let dto: ClaimDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.claim) {
          dto = res.claim;
        } else {
          dto = res;
        }
        
        return this.mapToClaim(dto as ClaimDto);
      }),
      catchError(() => of({} as Claim))
    );
  }

  getByPolicyId(policyId: string): Observable<Claim[]> {
    return this.http.get<any>(`${this.apiUrl}/policy/${policyId}`).pipe(
      map((res) => {
        console.log('[ClaimRepository] getByPolicyId raw response:', res);
        
        let data: ClaimDto[] = [];
        
        if (Array.isArray(res)) {
          data = res;
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.claims && Array.isArray(res.claims)) {
          data = res.claims;
        }
        
        return data.map(this.mapToClaim);
      }),
      catchError(() => of([]))
    );
  }

  getByClientId(clientId: string): Observable<Claim[]> {
    return this.http.get<any>(`${this.apiUrl}/client/${clientId}`).pipe(
      map((res) => {
        console.log('[ClaimRepository] getByClientId raw response:', res);
        
        let data: ClaimDto[] = [];
        
        if (Array.isArray(res)) {
          data = res;
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.claims && Array.isArray(res.claims)) {
          data = res.claims;
        }
        
        return data.map(this.mapToClaim);
      }),
      catchError(() => of([]))
    );
  }

  create(data: CreateClaimData): Observable<Claim> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        let dto: ClaimDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.claim) {
          dto = res.claim;
        } else {
          dto = res;
        }
        
        return this.mapToClaim(dto as ClaimDto);
      })
    );
  }

  update(id: string, data: Partial<Claim>): Observable<Claim> {
    return this.http.patch<{ data?: ClaimDto }>(`${this.apiUrl}/${id}`, data).pipe(
      map((res) => this.mapToClaim(res.data!))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  submit(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/submit`, {});
  }

  review(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/review`, {});
  }

  approve(id: string, amount: number, approvedBy: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/approve`, null, {
      params: { amount: amount.toString(), approvedBy }
    });
  }

  reject(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/reject`, null, {
      params: { reason }
    });
  }

  requestInfo(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/request-info`, {});
  }

  close(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/close`, {});
  }

  private mapToClaim(dto: ClaimDto): Claim {
    return {
      id: dto.id,
      claimNumber: dto.claimNumber,
      policyId: dto.policyId,
      clientId: dto.clientId,
      status: dto.status,
      description: dto.description,
      amount: dto.estimatedAmount || dto.approvedAmount || dto.amount || 0,
      submittedAt: dto.createdAt || dto.submittedAt || new Date().toISOString(),
      resolvedAt: dto.resolvedAt,
    };
  }
}

interface ClaimDto {
  id: string;
  claimNumber: string;
  policyId: string;
  clientId: string;
  status: string;
  description: string;
  amount?: number;
  estimatedAmount?: number;
  approvedAmount?: number;
  submittedAt?: string;
  createdAt?: string;
  resolvedAt?: string;
}
