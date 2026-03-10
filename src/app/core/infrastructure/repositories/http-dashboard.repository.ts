import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { IDashboardRepository } from '../../domain/ports/dashboard.repository.port';
import { DashboardStats } from '../../domain/models/dashboard-stats.model';

@Injectable({ providedIn: 'root' })
export class HttpDashboardRepository implements IDashboardRepository {
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    const count = (path: string) =>
      this.http.get<{ data?: { totalElements?: number } }>(`${this.baseUrl}/${path}?page=0&size=1`).pipe(
        map((res) => res.data?.totalElements ?? 0)
      );

    return forkJoin({
      totalUsers: count('users'),
      totalClients: count('clients'),
      totalPolicies: count('policies'),
      totalClaims: count('claims'),
      totalInvoices: count('billing/invoices'),
      totalWorkflows: count('workflows'),
    });
  }
}
