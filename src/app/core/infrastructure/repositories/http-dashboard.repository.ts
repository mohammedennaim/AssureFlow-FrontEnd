import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IDashboardRepository } from '../../domain/ports/dashboard.repository.port';
import { DashboardStats } from '../../domain/models/dashboard-stats.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpDashboardRepository implements IDashboardRepository {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    const countFromEndpoint = (path: string) =>
      this.http.get<{ data?: any[] }>(`${this.baseUrl}/${path}`).pipe(
        map((res) => (res.data ?? []).length),
        catchError(() => of(0))
      );

    const getMonthlyRevenue = () =>
      this.http.get<{ data?: { content?: any[] } }>(`${this.baseUrl}/invoices`, {
        params: { page: '0', size: '100' }
      }).pipe(
        map((res) => {
          const invoices = res.data?.content ?? [];
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          return invoices
            .filter((inv: any) => {
              const invDate = new Date(inv.createdAt);
              return inv.status === 'PAID' &&
                     invDate.getMonth() === currentMonth &&
                     invDate.getFullYear() === currentYear;
            })
            .reduce((sum: number, inv: any) => sum + (inv.amount ?? 0), 0);
        }),
        catchError(() => of(0))
      );

    return forkJoin({
      totalUsers: countFromEndpoint('users'),
      totalClients: countFromEndpoint('clients'),
      totalPolicies: countFromEndpoint('policies'),
      totalClaims: countFromEndpoint('claims'),
      totalInvoices: getMonthlyRevenue(),
      totalWorkflows: of(0),
    });
  }
}
