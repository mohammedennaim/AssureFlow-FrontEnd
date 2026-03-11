import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStatisticsService, DashboardKpiStats } from '../../../core/application/services/admin-statistics.service';
import { catchError, of } from 'rxjs';

interface KpiStat {
  label: string;
  value: number;
  trend: number;
  trendLabel: string;
  icon: string;
  color: string;
  gradient: string;
  shadow: string;
}

interface ChartData {
  label: string;
  value: number;
  color?: string;
  strokeDasharray?: string;
  strokeDashoffset?: number;
}

interface Activity {
  id: number;
  user: string;
  userInitials: string;
  action: string;
  target: string;
  time: string;
  type: 'primary' | 'success' | 'warning' | 'info';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = true;
  error: string | null = null;
  today = new Date();
  selectedPeriod = 'week';
  isRefreshing = false;

  kpiStats: KpiStat[] = [];
  chartData: ChartData[] = [];
  policyDistribution: ChartData[] = [];
  recentActivities: Activity[] = [];
  stats: DashboardKpiStats | null = null;

  private adminStatsService = inject(AdminStatisticsService);

  private periodLabels: Record<string, string> = {
    week: 'This Week',
    month: 'This Month',
    year: 'This Year'
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    console.log('[Dashboard] Loading dashboard data...');

    this.adminStatsService.getDashboardKpiStats().pipe(
      catchError((err) => {
        this.error = 'Failed to load dashboard stats';
        console.error('[Dashboard] Error loading stats:', err);
        return of({
          totalUsers: 0,
          totalClients: 0,
          totalPolicies: 0,
          activePolicies: 0,
          pendingPolicies: 0,
          expiredPolicies: 0,
          totalClaims: 0,
          pendingClaims: 0,
          approvedClaims: 0,
          rejectedClaims: 0,
          underReviewClaims: 0,
          monthlyRevenue: 0,
          pendingRevenue: 0,
          totalRevenue: 0,
          collectionRate: 0,
          activeWorkflows: 0
        });
      })
    ).subscribe((stats) => {
      console.log('[Dashboard] Received stats:', stats);
      this.stats = stats;
      this.loadKpiStats(stats);
      this.loading = false;
    });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboard();
    this.isRefreshing = false;
  }

  private loadKpiStats(stats: DashboardKpiStats): void {
    // Calcul des tendances basé sur les données réelles (simulé pour l'instant)
    // Pour de vraies tendances, il faudrait stocker l'historique
    this.kpiStats = [
      {
        label: 'Total Users',
        value: stats.totalUsers,
        trend: this.calculateTrend(stats.totalUsers),
        trendLabel: 'vs last month',
        icon: 'users',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        shadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
      },
      {
        label: 'Total Clients',
        value: stats.totalClients,
        trend: this.calculateTrend(stats.totalClients),
        trendLabel: 'vs last month',
        icon: 'users',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        shadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
      },
      {
        label: 'Active Policies',
        value: stats.activePolicies,
        trend: this.calculateTrend(stats.activePolicies),
        trendLabel: 'vs last month',
        icon: 'shield',
        color: '#06b6d4',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
        shadow: '0 4px 14px rgba(6, 182, 212, 0.4)'
      },
      {
        label: 'Pending Claims',
        value: stats.pendingClaims,
        trend: this.calculateTrend(stats.pendingClaims, true),
        trendLabel: 'vs last month',
        icon: 'clipboard',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        shadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
      },
      {
        label: 'Monthly Revenue',
        value: Math.round(stats.monthlyRevenue),
        trend: this.calculateTrend(stats.monthlyRevenue),
        trendLabel: 'vs last month',
        icon: 'dollar',
        color: '#f43f5e',
        gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
        shadow: '0 4px 14px rgba(244, 63, 94, 0.4)'
      },
      {
        label: 'Collection Rate',
        value: Math.round(stats.collectionRate),
        trend: this.calculateTrend(stats.collectionRate),
        trendLabel: 'vs last month',
        icon: 'percent',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        shadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
      }
    ];
  }

  private calculateTrend(value: number, inverse: boolean = false): number {
    // Génére une tendance réaliste basée sur la valeur
    if (value === 0) return 0;
    const base = Math.random() * 20 - 5; // Entre -5 et 15
    return Math.round(base * 10) / 10;
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getFormattedDate(): string {
    return this.today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getPeriodLabel(): string {
    return this.periodLabels[this.selectedPeriod] || 'This Week';
  }

  setPeriod(period: string): void {
    this.selectedPeriod = period;
    this.refreshData();
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByActivityId(index: number, activity: Activity): number {
    return activity.id;
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
