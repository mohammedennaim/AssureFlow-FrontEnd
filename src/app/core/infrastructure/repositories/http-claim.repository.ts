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
        let data: ClaimDto[] = [];

        if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res)) {
          data = res;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.claims && Array.isArray(res.claims)) {
          data = res.claims;
        } else if (res?.items && Array.isArray(res.items)) {
          data = res.items;
        }

        return data.map(this.mapToClaim);
      }),
      catchError(() => of([]))
    );
  }

  getById(id: string): Observable<Claim> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
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
      }),
      catchError(() => of({} as Claim))
    );
  }

  getByPolicyId(policyId: string): Observable<Claim[]> {
    return this.http.get<any>(`${this.apiUrl}/policy/${policyId}`).pipe(
      map((res) => {
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
        let data: ClaimDto[] = [];

        if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res)) {
          data = res;
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
    console.log('[HttpClaimRepository] Creating claim with data:', data);
    
    // Ensure proper formatting for backend
    const payload = {
      policyId: data.policyId,
      clientId: data.clientId,
      incidentDate: data.incidentDate, // Should be in YYYY-MM-DD format
      description: data.description,
      estimatedAmount: data.estimatedAmount,
      submittedBy: data.submittedBy
    };
    
    console.log('[HttpClaimRepository] Sending payload:', payload);
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map((res) => {
        console.log('[HttpClaimRepository] Create response:', res);
        let dto: ClaimDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.claim) {
          dto = res.claim;
        } else {
          dto = res;
        }
        
        const claim = this.mapToClaim(dto as ClaimDto);
        console.log('[HttpClaimRepository] Mapped claim:', claim);
        return claim;
      }),
      catchError((error) => {
        console.error('[HttpClaimRepository] Error creating claim:', error);
        console.error('[HttpClaimRepository] Error status:', error.status);
        console.error('[HttpClaimRepository] Error message:', error.message);
        console.error('[HttpClaimRepository] Error body:', error.error);
        throw error;
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
    return this.http.post<void>(`${this.apiUrl}/${id}/approve`, {}, {
      params: { amount: amount.toString(), approvedBy }
    });
  }

  reject(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/reject`, {}, {
      params: { reason }
    });
  }

  requestInfo(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/request-info`, {});
  }

  markAsPaid(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/mark-as-paid`, {});
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
