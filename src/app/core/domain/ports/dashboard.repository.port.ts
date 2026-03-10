import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardStats } from '../models/dashboard-stats.model';

export interface IDashboardRepository {
  getStats(): Observable<DashboardStats>;
}

export const DASHBOARD_REPOSITORY = new InjectionToken<IDashboardRepository>('IDashboardRepository');
