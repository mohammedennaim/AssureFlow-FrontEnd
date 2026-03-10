import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GetDashboardStatsUseCase } from '../../../../core/application/use-cases/dashboard/get-dashboard-stats.use-case';
import { DashboardStats } from '../../../../core/domain/models/dashboard-stats.model';

export type { DashboardStats };

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  constructor(private getDashboardStatsUseCase: GetDashboardStatsUseCase) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.getDashboardStatsUseCase.execute();
  }
}
