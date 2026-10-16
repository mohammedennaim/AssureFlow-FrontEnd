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
      map((res) => this.extractList(res).map(this.mapToClaim)),
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
      map((res) => this.extractList(res).map(this.mapToClaim)),
      catchError(() => of([]))
    );
  }

  getByClientId(clientId: string): Observable<Claim[]> {
    return this.http.get<any>(`${this.apiUrl}/client/${clientId}`).pipe(
      map((res) => this.extractList(res).map(this.mapToClaim)),
      catchError(() => of([]))
    );
  }

  create(data: CreateClaimData): Observable<Claim> {
    const payload = {
      policyId: data.policyId,
      clientId: data.clientId,
      incidentDate: data.incidentDate,
      description: data.description,
      estimatedAmount: data.estimatedAmount,
      submittedBy: data.submittedBy
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
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
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data).pipe(
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

  delete(id: string): Observable<void> {
    // Soft-delete from admin perspective (archive + close) while keeping client visibility
    return this.http.post<void>(`${this.apiUrl}/${id}/archive`, {});
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

  private extractList(res: unknown): ClaimDto[] {
    if (Array.isArray(res)) return res;
    const body = res as Record<string, unknown> | null;
    if (!body) return [];
    if (Array.isArray(body['data'])) return body['data'] as ClaimDto[];
    const nested = body['data'] as Record<string, unknown> | undefined;
    if (nested && Array.isArray(nested['content'])) return nested['content'] as ClaimDto[];
    if (Array.isArray(body['content'])) return body['content'] as ClaimDto[];
    if (Array.isArray(body['claims'])) return body['claims'] as ClaimDto[];
    if (Array.isArray(body['items'])) return body['items'] as ClaimDto[];
    return [];
  }

  private mapToClaim(dto: ClaimDto): Claim {
    return {
      id: dto.id,
      claimNumber: dto.claimNumber,
      policyId: dto.policyId,
      clientId: dto.clientId,
      status: dto.status,
      incidentDate: dto.incidentDate,
      description: dto.description,
      amount: dto.estimatedAmount || dto.approvedAmount || dto.amount || 0,
      submittedAt: dto.createdAt || dto.submittedAt || new Date().toISOString(),
      resolvedAt: dto.resolvedAt,
      createdAt: dto.createdAt || dto.submittedAt,
    };
  }
}

interface ClaimDto {
  id: string;
  claimNumber: string;
  policyId: string;
  clientId: string;
  status: string;
  incidentDate?: string;
  description: string;
  amount?: number;
  estimatedAmount?: number;
  approvedAmount?: number;
  submittedAt?: string;
  createdAt?: string;
  resolvedAt?: string;
}
