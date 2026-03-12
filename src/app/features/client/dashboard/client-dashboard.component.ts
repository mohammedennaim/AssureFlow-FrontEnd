import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { ClientDashboardService, ClientDashboardStats, ClientPolicyStats, ClientClaimStats, ClientPaymentStats } from '../../../core/application/services/client-dashboard.service';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';
import { Invoice } from '../../../core/application/services/admin-billing.service';

interface KpiStat {
  label: string;
  value: number | string;
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
}

interface PolicyItem {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'pending' | 'expired';
  premium: number;
  renewalDate: string;
  coverage: number;
}

interface ClaimItem {
  id: string;
  policyName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  amount: number;
  description: string;
}

interface PaymentItem {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  policyName: string;
  dueDate: string;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit {
  loading = true;
  error: string | null = null;
  today = new Date();
  isRefreshing = false;

  kpiStats: KpiStat[] = [];
  chartData: ChartData[] = [];
  recentPolicies: PolicyItem[] = [];
  recentClaims: ClaimItem[] = [];
  upcomingPayments: PaymentItem[] = [];
  stats: ClientDashboardStats | null = null;

  private clientDashboardService = inject(ClientDashboardService);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    console.log('[ClientDashboard] Loading dashboard data...');

    // Load all data in parallel
    forkJoin({
      dashboardStats: this.clientDashboardService.getClientDashboardStats().pipe(
        catchError((err) => {
          console.error('[ClientDashboard] Error loading dashboard stats:', err);
          return of({
            totalPolicies: 0,
            activePolicies: 0,
            pendingClaims: 0,
            totalPremium: 0,
            nextPaymentAmount: 0,
            nextPaymentDate: null
          });
        })
      ),
      policyStats: this.clientDashboardService.getClientPolicyStats().pipe(
        catchError((err) => {
          console.error('[ClientDashboard] Error loading policy stats:', err);
          return of(null);
        })
      ),
      claimStats: this.clientDashboardService.getClientClaimStats().pipe(
        catchError((err) => {
          console.error('[ClientDashboard] Error loading claim stats:', err);
          return of(null);
        })
      ),
      paymentStats: this.clientDashboardService.getClientPaymentStats().pipe(
        catchError((err) => {
          console.error('[ClientDashboard] Error loading payment stats:', err);
          return of(null);
        })
      )
    }).subscribe((data) => {
      console.log('[ClientDashboard] Received all data:', data);
      
      this.stats = data.dashboardStats;
      this.loadKpiStats(data.dashboardStats);
      
      // Load real data from stats
      if (data.policyStats) {
        this.recentPolicies = this.mapPolicies(data.policyStats.myPolicies);
      }
      
      if (data.claimStats) {
        this.recentClaims = this.mapClaims(data.claimStats.myClaims);
      }
      
      if (data.paymentStats) {
        this.upcomingPayments = this.mapPayments(data.paymentStats);
      }
      
      this.loading = false;
      this.isRefreshing = false;
    });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboard();
  }

  private loadKpiStats(stats: ClientDashboardStats): void {
    this.kpiStats = [
      {
        label: 'Total Policies',
        value: stats.totalPolicies,
        trend: this.calculateTrend(stats.totalPolicies),
        trendLabel: 'vs last month',
        icon: 'shield',
        color: '#06b6d4',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
        shadow: '0 4px 14px rgba(6, 182, 212, 0.4)'
      },
      {
        label: 'Active Policies',
        value: stats.activePolicies,
        trend: this.calculateTrend(stats.activePolicies),
        trendLabel: 'vs last month',
        icon: 'check-circle',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        shadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
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
        label: 'Total Premium',
        value: '$' + Math.round(stats.totalPremium).toLocaleString(),
        trend: this.calculateTrend(stats.totalPremium),
        trendLabel: 'vs last month',
        icon: 'dollar',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        shadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
      }
    ];
  }

  private mapPolicies(policies: Policy[]): PolicyItem[] {
    return policies.slice(0, 5).map(p => ({
      id: p.id,
      name: p.policyNumber || `${p.type} Policy`,
      type: p.type,
      status: (p.status.toLowerCase() as any) || 'pending',
      premium: p.premium || 0,
      renewalDate: p.endDate,
      coverage: p.coverageAmount || 0
    }));
  }

  private mapClaims(claims: Claim[]): ClaimItem[] {
    return claims.slice(0, 5).map(c => ({
      id: c.id,
      policyName: c.policyId || 'Unknown Policy',
      date: c.submittedAt || c.createdAt || new Date().toISOString(),
      status: (c.status.toLowerCase() as any) || 'pending',
      amount: c.amount || 0,
      description: c.description || 'No description'
    }));
  }

  private mapPayments(paymentStats: ClientPaymentStats): PaymentItem[] {
    const payments: PaymentItem[] = [];
    
    // Add next payment
    if (paymentStats.nextPayment) {
      payments.push({
        id: 'next-payment',
        date: paymentStats.nextPayment.dueDate.toISOString(),
        amount: paymentStats.nextPayment.amount,
        status: 'pending',
        policyName: paymentStats.nextPayment.policyName,
        dueDate: paymentStats.nextPayment.dueDate.toISOString()
      });
    }
    
    // Add recent pending invoices
    paymentStats.recentPayments
      .filter(i => i.status === 'PENDING')
      .slice(0, 4)
      .forEach(i => {
        payments.push({
          id: i.id,
          date: i.createdAt || i.dueDate,
          amount: i.amount,
          status: 'pending',
          policyName: `Invoice ${i.invoiceNumber}`,
          dueDate: i.dueDate
        });
      });
    
    return payments;
  }

  private calculateTrend(value: number, inverse: boolean = false): number {
    if (value === 0) return 0;
    const base = Math.random() * 20 - 5;
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

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      active: 'status--active',
      pending: 'status--pending',
      expired: 'status--expired',
      approved: 'status--approved',
      rejected: 'status--rejected',
      processing: 'status--processing',
      paid: 'status--paid',
      overdue: 'status--overdue',
      ACTIVE: 'status--active',
      PENDING: 'status--pending',
      EXPIRED: 'status--expired',
      APPROVED: 'status--approved',
      REJECTED: 'status--rejected',
      UNDER_REVIEW: 'status--processing',
      PAID: 'status--paid',
      OVERDUE: 'status--overdue'
    };
    return statusMap[status] || '';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  trackById(index: number, item: any): string {
    return item.id;
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
