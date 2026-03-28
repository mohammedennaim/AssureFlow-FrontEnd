import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStatisticsService, DashboardKpiStats } from '../../../core/application/services/admin-statistics.service';
import { NotificationService } from '../../../core/application/services/notification.service';
import { ClaimsService } from '../../../core/application/services/admin-claims.service';
import { PoliciesService } from '../../../core/application/services/admin-policies.service';
import { ClientsService } from '../../../core/application/services/admin-clients.service';
import { BillingService } from '../../../core/application/services/admin-billing.service';
import { catchError, of, forkJoin, Subscription } from 'rxjs';
import { Claim } from '../../../core/domain/models/claim.model';
import { Policy } from '../../../core/domain/models/policy.model';
import { Client } from '../../../core/domain/models/client.model';

const DONUT_CHART_RADIUS = 40;
const DONUT_CHART_CIRCUMFERENCE = 2 * Math.PI * DONUT_CHART_RADIUS;

interface KpiStat {
  label: string;
  value: number;
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

interface DonutChartData {
  label: string;
  value: number;
  color: string;
  strokeDasharray: string;
  strokeDashoffset: number;
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
export class DashboardComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  today = new Date();
  private dashboardSubscription?: Subscription;

  kpiStats: KpiStat[] = [];
  recentActivities: Activity[] = [];
  stats: DashboardKpiStats | null = null;
  notificationStats: NotificationStats | null = null;
  policyByType: ChartData[] = [];
  claimsByStatus: ChartData[] = [];
  clientByStatus: ChartData[] = [];
  invoicesByStatus: ChartData[] = [];
  totalInvoicesCount = 0;

  private adminStatsService = inject(AdminStatisticsService);
  private notificationService = inject(NotificationService);
  private claimsService = inject(ClaimsService);
  private policiesService = inject(PoliciesService);
  private clientsService = inject(ClientsService);
  private billingService = inject(BillingService);

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    if (this.dashboardSubscription) {
      this.dashboardSubscription.unsubscribe();
    }
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    // Charger toutes les données en parallèle
    this.dashboardSubscription = forkJoin({
      admin: this.adminStatsService.getDashboardKpiStats().pipe(
        catchError(() => {
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
        catchError(() => {
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
      ),
      claims: this.claimsService.getAll().pipe(
        catchError(() => {
          return of([]);
        })
      ),
      policies: this.policiesService.getAll().pipe(
        catchError(() => {
          return of([]);
        })
      ),
      clients: this.clientsService.getAll().pipe(
        catchError(() => {
          return of([]);
        })
      ),
      invoices: this.billingService.getAllInvoices(0, 1000).pipe(
        catchError(() => {
          return of([]);
        })
      )
    }).subscribe((result) => {
      this.stats = result.admin;
      this.notificationStats = result.notifications;
      this.loadKpiStats(result.admin, result.notifications);
      this.loadPolicyDistribution(result.policies);
      this.loadClaimsByStatus(result.claims);
      this.loadClientByStatus(result.clients);
      this.loadInvoicesByStatus(result.invoices);
      this.loadRecentActivities(result.claims, result.policies, result.clients);
      this.loading = false;
    });
  }

  private loadKpiStats(adminStats: DashboardKpiStats, notificationStats: NotificationStats): void {
    this.kpiStats = [
      {
        label: 'Total Clients',
        value: adminStats.totalClients,
        icon: 'users',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        shadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
      },
      {
        label: 'Active Policies',
        value: adminStats.activePolicies,
        icon: 'shield',
        color: '#06b6d4',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
        shadow: '0 4px 14px rgba(6, 182, 212, 0.4)'
      },
      {
        label: 'Pending Claims',
        value: adminStats.pendingClaims,
        icon: 'clipboard',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        shadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
      },
      {
        label: 'Notifications',
        value: notificationStats.totalNotifications,
        icon: 'bell',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        shadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
      }
    ];
  }

  private loadPolicyDistribution(policies: Policy[]): void {
    const byType: Record<string, number> = {};
    policies.forEach(policy => {
      byType[policy.type] = (byType[policy.type] || 0) + 1;
    });

    const colors = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];
    this.policyByType = this.createDonutChartData(byType, colors);
  }

  private loadClaimsByStatus(claims: Claim[]): void {
    const byStatus: Record<string, number> = {};
    claims.forEach(claim => {
      byStatus[claim.status] = (byStatus[claim.status] || 0) + 1;
    });

    const statusColors: Record<string, string> = {
      'PENDING': '#f59e0b',
      'SUBMITTED': '#fbbf24',
      'UNDER_REVIEW': '#06b6d4',
      'IN_REVIEW': '#06b6d4',
      'APPROVED': '#10b981',
      'PAID': '#059669',
      'REJECTED': '#f43f5e',
      'CLOSED': '#6b7280'
    };
    this.claimsByStatus = this.createDonutChartData(byStatus, statusColors, (status) => status.replace('_', ' '));
  }

  private loadClientByStatus(clients: Client[]): void {
    const byStatus: Record<string, number> = {};
    clients.forEach(client => {
      const status = client.status || 'ACTIVE';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    const statusColors: Record<string, string> = {
      'ACTIVE': '#10b981',
      'INACTIVE': '#6b7280',
      'PROSPECT': '#6366f1',
      'LEAD': '#06b6d4'
    };
    this.clientByStatus = this.createDonutChartData(byStatus, statusColors);
  }

  private loadRecentActivities(claims: Claim[], policies: Policy[], clients: Client[]): void {
    const activities: Activity[] = [];
    const now = new Date();

    // Ajouter les claims récents
    claims
      .filter(c => c.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 3)
      .forEach((claim, index) => {
        const time = this.getTimeAgo(new Date(claim.createdAt!));
        activities.push({
          id: index + 1,
          user: 'System',
          userInitials: 'SY',
          action: 'created a new claim',
          target: claim.claimNumber,
          time,
          type: claim.status === 'APPROVED' ? 'success' : claim.status === 'PENDING' ? 'warning' : 'primary'
        });
      });

    // Ajouter les policies récentes
    policies
      .filter(p => p.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 2)
      .forEach((policy, index) => {
        const time = this.getTimeAgo(new Date(policy.createdAt!));
        activities.push({
          id: claims.length + index + 1,
          user: 'Admin',
          userInitials: 'AD',
          action: 'created policy',
          target: policy.policyNumber,
          time,
          type: policy.status === 'ACTIVE' ? 'success' : 'info'
        });
      });

    // Trier par date et prendre les 5 plus récents
    this.recentActivities = activities
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private loadInvoicesByStatus(invoices: any[]): void {
    const byStatus: Record<string, number> = {};

    invoices.forEach(invoice => {
      byStatus[invoice.status] = (byStatus[invoice.status] || 0) + 1;
    });

    this.totalInvoicesCount = invoices.length;

    const statusColors: Record<string, string> = {
      'PAID': '#10b981',
      'PENDING': '#f59e0b',
      'OVERDUE': '#f43f5e',
      'CANCELLED': '#6b7280',
      'DRAFT': '#6366f1',
      'PARTIALLY_PAID': '#06b6d4'
    };
    this.invoicesByStatus = this.createDonutChartData(byStatus, statusColors);
  }

  /**
   * Create donut chart data from a record of values
   */
  private createDonutChartData(
    data: Record<string, number>,
    colors: string[] | Record<string, string>,
    labelTransform?: (label: string) => string
  ): DonutChartData[] {
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    const result: DonutChartData[] = [];
    let cumulativePercent = 0;
    let index = 0;

    for (const [label, count] of Object.entries(data)) {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const circumference = DONUT_CHART_CIRCUMFERENCE;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePercent * circumference / 100;
      cumulativePercent += percentage;

      const color = Array.isArray(colors)
        ? colors[index % colors.length]
        : colors[label] || '#6366f1';

      result.push({
        label: labelTransform ? labelTransform(label) : label,
        value: Math.round(percentage),
        color,
        strokeDasharray,
        strokeDashoffset
      });
      index++;
    }

    return result;
  }

  getTotalInvoices(): number {
    return this.totalInvoicesCount;
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
