import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PoliciesService, Policy } from '../../../core/application/services/admin-policies.service';
import { AdminStatisticsService, PolicyStats } from '../../../core/application/services/admin-statistics.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.scss'
})
export class PoliciesComponent implements OnInit {
  private policiesService = inject(PoliciesService);
  private adminStatsService = inject(AdminStatisticsService);

  policies: Policy[] = [];
  filteredPolicies: Policy[] = [];
  isLoading = true;
  error: string | null = null;
  searchQuery = '';
  filterType = 'ALL';
  filterStatus = 'ALL';
  viewMode: 'table' | 'cards' = 'table';
  policyStats: PolicyStats | null = null;

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.isLoading = true;
    this.error = null;

    this.policiesService.getAll().pipe(
      catchError((err) => {
        this.error = 'Failed to load policies';
        console.error('Error fetching policies:', err);
        return of([]);
      })
    ).subscribe((data) => {
      this.policies = data;
      this.filteredPolicies = data;

      // Calcule les statistiques réelles
      this.adminStatsService.getPolicyStats(data).subscribe((stats) => {
        this.policyStats = stats;
      });

      this.isLoading = false;
    });
  }

  get stats() {
    if (this.policyStats) {
      return {
        active: this.policyStats.active,
        revenue: this.policyStats.totalPremium,
        expiring: this.policyStats.expiringSoon
      };
    }
    return {
      active: this.policies.filter(p => p.status === 'ACTIVE').length,
      revenue: this.policies.filter(p => p.status === 'ACTIVE').reduce((sum, p) => sum + p.premium, 0),
      expiring: this.policies.filter(p => {
        const daysLeft = (new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysLeft > 0 && daysLeft < 60;
      }).length
    };
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'AUTO': 'fa-car',
      'HOME': 'fa-house',
      'LIFE': 'fa-heart-pulse',
      'HEALTH': 'fa-stethoscope',
      'BUSINESS': 'fa-building'
    };
    return icons[type] || 'fa-file';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'ACTIVE': 'policy-status--active',
      'EXPIRED': 'policy-status--expired',
      'PENDING': 'policy-status--pending',
      'CANCELLED': 'policy-status--cancelled'
    };
    return classes[status] || '';
  }

  getProgress(startDate: string, endDate: string): number {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }

  getDaysLeft(endDate: string): number {
    const daysLeft = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return Math.ceil(daysLeft);
  }

  toLowerCase(value: string): string {
    return value.toLowerCase();
  }
}
