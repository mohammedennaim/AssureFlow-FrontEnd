import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IDashboardRepository, DASHBOARD_REPOSITORY } from '../../../domain/ports/dashboard.repository.port';
import { DashboardStats } from '../../../domain/models/dashboard-stats.model';

@Injectable({ providedIn: 'root' })
export class GetDashboardStatsUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private dashboardRepository: IDashboardRepository) { }

  execute(): Observable<DashboardStats> {
    return this.dashboardRepository.getStats();
  }
}
