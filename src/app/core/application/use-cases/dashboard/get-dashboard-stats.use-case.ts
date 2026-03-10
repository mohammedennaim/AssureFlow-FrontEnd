import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DASHBOARD_REPOSITORY } from '../../../domain/ports/dashboard.repository.port';
import { DashboardStats } from '../../../domain/models/dashboard-stats.model';

@Injectable({ providedIn: 'root' })
export class GetDashboardStatsUseCase {
  private dashboardRepository = inject(DASHBOARD_REPOSITORY);

  execute(): Observable<DashboardStats> {
    return this.dashboardRepository.getStats();
  }
}
