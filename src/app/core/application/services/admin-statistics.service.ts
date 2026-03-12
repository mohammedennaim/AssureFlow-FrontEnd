import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PoliciesService } from './admin-policies.service';
import { ClaimsService } from './admin-claims.service';
import { ClientsService } from './admin-clients.service';
import { BillingService, Invoice } from './admin-billing.service';
import { UsersService } from './admin-users.service';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';
import { Client } from '../../../core/domain/models/client.model';
import { User } from '../../../core/domain/models/user.model';

export interface DashboardKpiStats {
  totalUsers: number;
  totalClients: number;
  totalPolicies: number;
  activePolicies: number;
  pendingPolicies: number;
  expiredPolicies: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  underReviewClaims: number;
  monthlyRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
  collectionRate: number;
  activeWorkflows: number;
}

export interface PolicyStats {
  total: number;
  active: number;
  pending: number;
  expired: number;
  cancelled: number;
  submitted: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalPremium: number;
  averagePremium: number;
  expiringSoon: number;
  renewalRate: number;
}

export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  withPolicies: number;
  withoutPolicies: number;
  prospects: number;
  newThisMonth: number;
  newThisWeek: number;
  byStatus: Record<string, number>;
  averagePoliciesPerClient: number;
  topClients: Array<{ id: string; name: string; policiesCount: number; revenue: number }>;
}

export interface ClaimStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  paid: number;
  closed: number;
  byStatus: Record<string, number>;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  averageClaimAmount: number;
  approvalRate: number;
  averageProcessingDays: number;
}

export interface BillingStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  cancelledInvoices: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  collectionRate: number;
  averageInvoiceAmount: number;
  byStatus: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class AdminStatisticsService {
  private policiesService = inject(PoliciesService);
  private claimsService = inject(ClaimsService);
  private clientsService = inject(ClientsService);
  private billingService = inject(BillingService);
  private usersService = inject(UsersService);

  /**
   * Calcule toutes les statistiques KPI pour le dashboard
   */
  getDashboardKpiStats(): Observable<DashboardKpiStats> {
    console.log('[AdminStatistics] Fetching dashboard stats...');
    
    return forkJoin({
      policies: this.policiesService.getAll().pipe(
        catchError((err) => {
          console.error('[AdminStatistics] Error fetching policies:', err);
          return of([]);
        })
      ),
      claims: this.claimsService.getAll().pipe(
        catchError((err) => {
          console.error('[AdminStatistics] Error fetching claims:', err);
          return of([]);
        })
      ),
      clients: this.clientsService.getAll().pipe(
        catchError((err) => {
          console.error('[AdminStatistics] Error fetching clients:', err);
          return of([]);
        })
      ),
      invoices: this.getAllInvoices().pipe(
        catchError((err) => {
          console.error('[AdminStatistics] Error fetching invoices:', err);
          return of([]);
        })
      ),
      users: this.usersService.getUsers().pipe(
        catchError((err) => {
          console.error('[AdminStatistics] Error fetching users:', err);
          return of([]);
        })
      )
    }).pipe(
      map((data) => {
        console.log('[AdminStatistics] All data fetched:', {
          policies: data.policies.length,
          claims: data.claims.length,
          clients: data.clients.length,
          invoices: data.invoices.length,
          users: data.users.length
        });
        return this.calculateKpiStats(data);
      })
    );
  }

  /**
   * Statistiques détaillées pour les polices
   */
  getPolicyStats(policies?: Policy[]): Observable<PolicyStats> {
    const source = policies ? of(policies) : this.policiesService.getAll().pipe(catchError(() => of([])));
    return source.pipe(
      map((policies) => this.calculatePolicyStats(policies))
    );
  }

  /**
   * Statistiques détaillées pour les clients
   */
  getClientStats(clients?: Client[], policies?: Policy[]): Observable<ClientStats> {
    return forkJoin({
      clients: clients ? of(clients) : this.clientsService.getAll().pipe(catchError(() => of([]))),
      policies: policies ? of(policies) : this.policiesService.getAll().pipe(catchError(() => of([])))
    }).pipe(
      map((data) => this.calculateClientStats(data.clients, data.policies))
    );
  }

  /**
   * Statistiques détaillées pour les claims
   */
  getClaimStats(claims?: Claim[]): Observable<ClaimStats> {
    const source = claims ? of(claims) : this.claimsService.getAll().pipe(catchError(() => of([])));
    return source.pipe(
      map((claims) => this.calculateClaimStats(claims))
    );
  }

  /**
   * Statistiques détaillées pour la facturation
   */
  getBillingStats(): Observable<BillingStats> {
    return this.getAllInvoices().pipe(
      catchError(() => of([])),
      map((invoices) => this.calculateBillingStats(invoices))
    );
  }

  private getAllInvoices(): Observable<Invoice[]> {
    return this.billingService.getAll(0, 1000).pipe(catchError(() => of([])));
  }

  private calculateKpiStats(data: {
    policies: Policy[];
    claims: Claim[];
    clients: Client[];
    invoices: Invoice[];
    users: User[];
  }): DashboardKpiStats {
    console.log('[AdminStatistics] Calculating KPI stats with data:', {
      policies: data.policies.length,
      claims: data.claims.length,
      clients: data.clients.length,
      invoices: data.invoices.length,
      users: data.users.length
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Policy stats
    const activePolicies = data.policies.filter(p => p.status === 'ACTIVE').length;
    const pendingPolicies = data.policies.filter(p => ['PENDING', 'DRAFT', 'SUBMITTED'].includes(p.status)).length;
    const expiredPolicies = data.policies.filter(p => p.status === 'EXPIRED').length;

    // Claim stats
    const pendingClaims = data.claims.filter(c => ['PENDING', 'SUBMITTED'].includes(c.status)).length;
    const approvedClaims = data.claims.filter(c => ['APPROVED', 'PAID'].includes(c.status)).length;
    const rejectedClaims = data.claims.filter(c => c.status === 'REJECTED').length;
    const underReviewClaims = data.claims.filter(c => ['UNDER_REVIEW', 'IN_REVIEW'].includes(c.status)).length;

    // Revenue stats
    const paidInvoicesThisMonth = data.invoices.filter(inv => {
      const invDate = new Date(inv.createdAt!);
      return inv.status === 'PAID' &&
             invDate.getMonth() === currentMonth &&
             invDate.getFullYear() === currentYear;
    });
    const monthlyRevenue = paidInvoicesThisMonth.reduce((sum, inv) => sum + inv.amount, 0);

    const pendingInvoices = data.invoices.filter(inv => inv.status === 'PENDING');
    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const totalRevenue = data.invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const collectionRate = totalRevenue > 0 
      ? (totalRevenue / (totalRevenue + pendingRevenue)) * 100 
      : 0;

    return {
      totalUsers: data.users.length,
      totalClients: data.clients.length,
      totalPolicies: data.policies.length,
      activePolicies,
      pendingPolicies,
      expiredPolicies,
      totalClaims: data.claims.length,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      underReviewClaims,
      monthlyRevenue,
      pendingRevenue,
      totalRevenue,
      collectionRate,
      activeWorkflows: 0 // À implémenter quand le workflow service sera disponible
    };
  }

  private calculatePolicyStats(policies: Policy[]): PolicyStats {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalPremium = 0;
    let expiringSoon = 0;

    policies.forEach(policy => {
      // By type
      byType[policy.type] = (byType[policy.type] || 0) + 1;

      // By status
      byStatus[policy.status] = (byStatus[policy.status] || 0) + 1;

      // Total premium
      totalPremium += policy.premium || 0;

      // Expiring soon (within 30 days)
      const endDate = new Date(policy.endDate);
      if (policy.status === 'ACTIVE' && endDate <= thirtyDaysFromNow && endDate >= now) {
        expiringSoon++;
      }
    });

    const active = byStatus['ACTIVE'] || 0;
    const pending = (byStatus['PENDING'] || 0) + (byStatus['DRAFT'] || 0) + (byStatus['SUBMITTED'] || 0);
    const expired = byStatus['EXPIRED'] || 0;
    const cancelled = byStatus['CANCELLED'] || 0;
    const submitted = byStatus['SUBMITTED'] || 0;

    return {
      total: policies.length,
      active,
      pending,
      expired,
      cancelled,
      submitted,
      byType,
      byStatus,
      totalPremium,
      averagePremium: policies.length > 0 ? totalPremium / policies.length : 0,
      expiringSoon,
      renewalRate: policies.length > 0 ? (expired / policies.length) * 100 : 0
    };
  }

  private calculateClientStats(clients: Client[], policies: Policy[]): ClientStats {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byStatus: Record<string, number> = {};
    let withPolicies = 0;
    let newThisMonth = 0;
    let newThisWeek = 0;

    // Count policies per client
    const policiesCountByClient: Record<string, number> = {};
    policies.forEach(policy => {
      policiesCountByClient[policy.clientId] = (policiesCountByClient[policy.clientId] || 0) + 1;
    });

    clients.forEach(client => {
      // By status
      const status = client.status || 'ACTIVE';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // With policies
      if (policiesCountByClient[client.id] > 0) {
        withPolicies++;
      }

      // New this month
      const createdAt = new Date(client.createdAt!);
      if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
        newThisMonth++;
      }

      // New this week
      if (createdAt >= weekAgo) {
        newThisWeek++;
      }
    });

    const active = byStatus['ACTIVE'] || 0;
    const inactive = byStatus['INACTIVE'] || 0;
    const prospects = byStatus['PROSPECT'] || clients.length - active - inactive;

    // Top clients by revenue
    const topClients = clients
      .map(client => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        policiesCount: policiesCountByClient[client.id] || 0,
        revenue: policies
          .filter(p => p.clientId === client.id)
          .reduce((sum, p) => sum + (p.premium || 0), 0)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      total: clients.length,
      active,
      inactive,
      withPolicies,
      withoutPolicies: clients.length - withPolicies,
      prospects,
      newThisMonth,
      newThisWeek,
      byStatus,
      averagePoliciesPerClient: clients.length > 0 ? policies.length / clients.length : 0,
      topClients
    };
  }

  private calculateClaimStats(claims: Claim[]): ClaimStats {
    const byStatus: Record<string, number> = {};
    let totalAmount = 0;
    let approvedAmount = 0;
    let pendingAmount = 0;

    claims.forEach(claim => {
      // By status
      byStatus[claim.status] = (byStatus[claim.status] || 0) + 1;

      // Amounts
      totalAmount += claim.amount || 0;
      
      if (['APPROVED', 'PAID'].includes(claim.status)) {
        approvedAmount += claim.amount || 0;
      } else if (['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(claim.status)) {
        pendingAmount += claim.amount || 0;
      }
    });

    const pending = (byStatus['PENDING'] || 0) + (byStatus['SUBMITTED'] || 0);
    const underReview = byStatus['UNDER_REVIEW'] || 0;
    const approved = (byStatus['APPROVED'] || 0) + (byStatus['PAID'] || 0);
    const rejected = byStatus['REJECTED'] || 0;
    const paid = byStatus['PAID'] || 0;
    const closed = byStatus['CLOSED'] || 0;

    const approvalRate = (pending + approved + rejected) > 0 
      ? (approved / (pending + approved + rejected)) * 100 
      : 0;

    return {
      total: claims.length,
      pending,
      underReview,
      approved,
      rejected,
      paid,
      closed,
      byStatus,
      totalAmount,
      approvedAmount,
      pendingAmount,
      averageClaimAmount: claims.length > 0 ? totalAmount / claims.length : 0,
      approvalRate,
      averageProcessingDays: 0 // Nécessite des dates de résolution
    };
  }

  private calculateBillingStats(invoices: Invoice[]): BillingStats {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byStatus: Record<string, number> = {};
    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;
    let overdueRevenue = 0;
    let monthlyRevenue = 0;
    let weeklyRevenue = 0;

    invoices.forEach(invoice => {
      // By status
      byStatus[invoice.status] = (byStatus[invoice.status] || 0) + 1;

      const amount = invoice.amount || 0;

      // Revenue by status
      if (invoice.status === 'PAID') {
        paidRevenue += amount;
        totalRevenue += amount;

        // Monthly revenue
        const invDate = new Date(invoice.createdAt!);
        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
          monthlyRevenue += amount;
        }

        // Weekly revenue
        if (new Date(invoice.createdAt!) >= weekAgo) {
          weeklyRevenue += amount;
        }
      } else if (invoice.status === 'PENDING') {
        pendingRevenue += amount;
      } else if (invoice.status === 'OVERDUE') {
        overdueRevenue += amount;
      }
    });

    const paidInvoices = byStatus['PAID'] || 0;
    const pendingInvoices = byStatus['PENDING'] || 0;
    const overdueInvoices = byStatus['OVERDUE'] || 0;
    const cancelledInvoices = byStatus['CANCELLED'] || 0;

    const totalInvoicesAmount = paidRevenue + pendingRevenue + overdueRevenue;
    const collectionRate = totalInvoicesAmount > 0 
      ? (paidRevenue / totalInvoicesAmount) * 100 
      : 0;

    return {
      totalInvoices: invoices.length,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      cancelledInvoices,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      overdueRevenue,
      monthlyRevenue,
      weeklyRevenue,
      collectionRate,
      averageInvoiceAmount: invoices.length > 0 ? totalRevenue / invoices.length : 0,
      byStatus
    };
  }
}
