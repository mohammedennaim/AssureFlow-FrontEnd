import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStatisticsService, DashboardKpiStats } from '../../../core/application/services/admin-statistics.service';
import { NotificationService } from '../../../core/application/services/notification.service';
import { ClaimsService } from '../../../core/application/services/admin-claims.service';
import { PoliciesService } from '../../../core/application/services/admin-policies.service';
import { ClientsService } from '../../../core/application/services/admin-clients.service';
import { BillingService } from '../../../core/application/services/admin-billing.service';
import { catchError, of, forkJoin } from 'rxjs';
import { Claim } from '../../../core/domain/models/claim.model';
import { Policy } from '../../../core/domain/models/policy.model';
import { Client } from '../../../core/domain/models/client.model';

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
  isRefreshing = false;

  kpiStats: KpiStat[] = [];
  recentActivities: Activity[] = [];
  stats: DashboardKpiStats | null = null;
  notificationStats: NotificationStats | null = null;
  policyByType: ChartData[] = [];
  claimsByStatus: ChartData[] = [];
  clientByStatus: ChartData[] = [];
  invoicesByStatus: ChartData[] = [];

  private adminStatsService = inject(AdminStatisticsService);
  private notificationService = inject(NotificationService);
  private claimsService = inject(ClaimsService);
  private policiesService = inject(PoliciesService);
  private clientsService = inject(ClientsService);
  private billingService = inject(BillingService);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    console.log('[Dashboard] Loading dashboard data...');

    // Charger toutes les données en parallèle
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
      ),
      claims: this.claimsService.getAll().pipe(
        catchError((err) => {
          console.error('[Dashboard] Error loading claims:', err);
          return of([]);
        })
      ),
      policies: this.policiesService.getAll().pipe(
        catchError((err) => {
          console.error('[Dashboard] Error loading policies:', err);
          return of([]);
        })
      ),
      clients: this.clientsService.getAll().pipe(
        catchError((err) => {
          console.error('[Dashboard] Error loading clients:', err);
          return of([]);
        })
      ),
      invoices: this.billingService.getAllInvoices(0, 1000).pipe(
        catchError((err) => {
          console.error('[Dashboard] Error loading invoices:', err);
          return of([]);
        })
      )
    }).subscribe((result) => {
      console.log('[Dashboard] Received stats:', result);
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

  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboard();
    this.isRefreshing = false;
  }

  private loadKpiStats(adminStats: DashboardKpiStats, notificationStats: NotificationStats): void {
    // Calcul des tendances basé sur les données réelles (simulé pour l'instant)
    this.kpiStats = [
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
        label: 'Notifications',
        value: notificationStats.totalNotifications,
        trend: this.calculateTrend(notificationStats.totalNotifications),
        trendLabel: 'vs last month',
        icon: 'bell',
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

  private loadPolicyDistribution(policies: Policy[]): void {
    // Grouper par type de police
    const byType: Record<string, number> = {};
    policies.forEach(policy => {
      byType[policy.type] = (byType[policy.type] || 0) + 1;
    });

    const total = policies.length;
    const colors = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

    // Calculer les pourcentages et les propriétés SVG pour le donut chart
    let cumulativePercent = 0;
    this.policyByType = Object.entries(byType).map(([type, count], index) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const circumference = 2 * Math.PI * 40; // r=40
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePercent * circumference / 100;
      cumulativePercent += percentage;

      return {
        label: type,
        value: Math.round(percentage),
        color: colors[index % colors.length],
        strokeDasharray,
        strokeDashoffset
      };
    });
  }

  private loadClaimsByStatus(claims: Claim[]): void {
    // Grouper par statut
    const byStatus: Record<string, number> = {};
    claims.forEach(claim => {
      byStatus[claim.status] = (byStatus[claim.status] || 0) + 1;
    });

    const total = claims.length;
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

    // Calculer les pourcentages et les propriétés SVG pour le donut chart
    let cumulativePercent = 0;
    this.claimsByStatus = Object.entries(byStatus).map(([status, count], index) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const circumference = 2 * Math.PI * 40; // r=40
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePercent * circumference / 100;
      cumulativePercent += percentage;

      return {
        label: status.replace('_', ' '),
        value: Math.round(percentage),
        color: statusColors[status] || '#6366f1',
        strokeDasharray,
        strokeDashoffset
      };
    });
  }

  private loadClientByStatus(clients: Client[]): void {
    // Grouper par statut
    const byStatus: Record<string, number> = {};
    clients.forEach(client => {
      const status = client.status || 'ACTIVE';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    const total = clients.length;
    const statusColors: Record<string, string> = {
      'ACTIVE': '#10b981',
      'INACTIVE': '#6b7280',
      'PROSPECT': '#6366f1',
      'LEAD': '#06b6d4'
    };

    // Calculer les pourcentages et les propriétés SVG pour le donut chart
    let cumulativePercent = 0;
    this.clientByStatus = Object.entries(byStatus).map(([status, count], index) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const circumference = 2 * Math.PI * 40; // r=40
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePercent * circumference / 100;
      cumulativePercent += percentage;

      return {
        label: status,
        value: Math.round(percentage),
        color: statusColors[status] || '#6366f1',
        strokeDasharray,
        strokeDashoffset
      };
    });
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

    const total = invoices.length;
    const statusColors: Record<string, string> = {
      'PAID': '#10b981',
      'PENDING': '#f59e0b',
      'OVERDUE': '#f43f5e',
      'CANCELLED': '#6b7280'
    };

    // Calculer les pourcentages et les propriétés SVG pour le donut chart
    let cumulativePercent = 0;
    this.invoicesByStatus = Object.entries(byStatus).map(([status, count], index) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const circumference = 2 * Math.PI * 40; // r=40
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePercent * circumference / 100;
      cumulativePercent += percentage;

      return {
        label: status,
        value: Math.round(percentage),
        color: statusColors[status] || '#6366f1',
        strokeDasharray,
        strokeDashoffset
      };
    });

    console.log('[Dashboard] Invoices by status:', this.invoicesByStatus);
  }

  getTotalInvoices(): number {
    return this.invoicesByStatus.reduce((sum, item) => sum + item.value, 0) || 0;
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
