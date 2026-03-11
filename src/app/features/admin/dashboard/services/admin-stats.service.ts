import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminStatisticsService, DashboardKpiStats } from '../../../../core/application/services/admin-statistics.service';

export type { DashboardKpiStats as DashboardStats };

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  private adminStatisticsService = inject(AdminStatisticsService);

  getDashboardStats(): Observable<DashboardKpiStats> {
    return this.adminStatisticsService.getDashboardKpiStats();
  }
}
