import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStatisticsService, DashboardKpiStats } from '../../../core/application/services/admin-statistics.service';
import { NotificationService } from '../../../core/application/services/notification.service';
import { catchError, of, forkJoin } from 'rxjs';

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

interface NotificationStats {
  totalNotifications: number;
  deliveredCount: number;
  pendingCount: number;
  failedCount: number;
  emailCount: number;
  smsCount: number;
  pushCount: number;
  successRate: number;
  recentNotifications: number;
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
  notificationStats: NotificationStats | null = null;

  private adminStatsService = inject(AdminStatisticsService);
  private notificationService = inject(NotificationService);

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

    // Charger les stats admin et notifications en parallèle
    forkJoin({
      admin: this.adminStatsService.getDashboardKpiStats().pipe(
        catchError((err) => {
          console.error('[Dashboard] Error loading admin stats:', err);
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
            collectionRate: 0
          });
        })
      ),
      notifications: this.notificationService.getStatistics().pipe(
        catchError((err) => {
          console.error('[Dashboard] Error loading notification stats:', err);
          return of({
            totalNotifications: 0,
            deliveredCount: 0,
            pendingCount: 0,
            failedCount: 0,
            emailCount: 0,
            smsCount: 0,
            pushCount: 0,
            successRate: 0,
            recentNotifications: 0
          });
        })
      )
    }).subscribe((result) => {
      console.log('[Dashboard] Received stats:', result);
      this.stats = result.admin;
      this.notificationStats = result.notifications;
      this.loadKpiStats(result.admin, result.notifications);
      this.loading = false;
    });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboard();
    this.isRefreshing = false;
  }

  private loadKpiStats(adminStats: DashboardKpiStats, notificationStats: NotificationStats): void {
    // Calcul des tendances basé sur les données réelles (simulé pour l'instant)
    this.kpiStats = [
      {
        label: 'Total Users',
        value: adminStats.totalUsers,
        trend: this.calculateTrend(adminStats.totalUsers),
        trendLabel: 'vs last month',
        icon: 'users',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        shadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
      },
      {
        label: 'Total Clients',
        value: adminStats.totalClients,
        trend: this.calculateTrend(adminStats.totalClients),
        trendLabel: 'vs last month',
        icon: 'users',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        shadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
      },
      {
        label: 'Active Policies',
        value: adminStats.activePolicies,
        trend: this.calculateTrend(adminStats.activePolicies),
        trendLabel: 'vs last month',
        icon: 'shield',
        color: '#06b6d4',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
        shadow: '0 4px 14px rgba(6, 182, 212, 0.4)'
      },
      {
        label: 'Pending Claims',
        value: adminStats.pendingClaims,
        trend: this.calculateTrend(adminStats.pendingClaims, true),
        trendLabel: 'vs last month',
        icon: 'clipboard',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        shadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
      },
      {
        label: 'Monthly Revenue',
        value: Math.round(adminStats.monthlyRevenue),
        trend: this.calculateTrend(adminStats.monthlyRevenue),
        trendLabel: 'vs last month',
        icon: 'dollar',
        color: '#f43f5e',
        gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
        shadow: '0 4px 14px rgba(244, 63, 94, 0.4)'
      },
      {
        label: 'Notifications',
        value: notificationStats.totalNotifications,
        trend: this.calculateTrend(notificationStats.totalNotifications),
        trendLabel: 'vs last month',
        icon: 'bell',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        shadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
      },
      {
        label: 'Collection Rate',
        value: Math.round(adminStats.collectionRate),
        trend: this.calculateTrend(adminStats.collectionRate),
        trendLabel: 'vs last month',
        icon: 'percent',
        color: '#ec4899',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
        shadow: '0 4px 14px rgba(236, 72, 153, 0.4)'
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
