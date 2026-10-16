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
      map((res) => this.extractList(res).map(this.mapToPolicy)),
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

    return this.http.get<any>(url).pipe(
      map((res) => this.extractList(res).map(this.mapToPolicy)),
      catchError(() => of([]))
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

  private extractList(res: unknown): PolicyDto[] {
    if (Array.isArray(res)) return res;
    const body = res as Record<string, unknown> | null;
    if (!body) return [];
    if (Array.isArray(body['data'])) return body['data'] as PolicyDto[];
    const nested = body['data'] as Record<string, unknown> | undefined;
    if (nested && Array.isArray(nested['content'])) return nested['content'] as PolicyDto[];
    if (Array.isArray(body['content'])) return body['content'] as PolicyDto[];
    if (Array.isArray(body['policies'])) return body['policies'] as PolicyDto[];
    if (Array.isArray(body['items'])) return body['items'] as PolicyDto[];
    return [];
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
