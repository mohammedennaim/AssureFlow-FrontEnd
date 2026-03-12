import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, map, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PoliciesService } from './admin-policies.service';
import { ClaimsService } from './admin-claims.service';
import { BillingService, Invoice } from './admin-billing.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { INVOICE_REPOSITORY } from '../../../core/domain/ports/invoice.repository.port';
import { ClientSessionService } from './client-session.service';

export interface ClientDashboardStats {
  totalPolicies: number;
  activePolicies: number;
  pendingClaims: number;
  totalPremium: number;
  nextPaymentAmount: number;
  nextPaymentDate: Date | null;
}

export interface ClientPolicyStats {
  total: number;
  active: number;
  pending: number;
  expired: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalPremium: number;
  averagePremium: number;
  expiringSoon: number;
  myPolicies: Policy[];
}

export interface ClientClaimStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  paid: number;
  byStatus: Record<string, number>;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  myClaims: Claim[];
}

export interface ClientPaymentStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  nextPayment: {
    amount: number;
    dueDate: Date;
    policyName: string;
  } | null;
  recentPayments: Invoice[];
}

@Injectable({ providedIn: 'root' })
export class ClientDashboardService {
  private policyRepository = inject(POLICY_REPOSITORY);
  private claimRepository = inject(CLAIM_REPOSITORY);
  private invoiceRepository = inject(INVOICE_REPOSITORY);
  private clientSessionService = inject(ClientSessionService);

  /**
   * Get current client ID from session service
   */
  private getCurrentClientId(): Observable<string | null> {
    return this.clientSessionService.getCurrentClientId();
  }

  /**
   * Calcule toutes les statistiques pour le dashboard client
   */
  getClientDashboardStats(): Observable<ClientDashboardStats> {
    return this.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) {
          console.warn('[ClientDashboard] No clientId found, returning empty stats');
          console.warn('[ClientDashboard] This usually means: 1) User is not logged in, 2) Client not found for this email, 3) Backend API issue');
          return of({
            totalPolicies: 0,
            activePolicies: 0,
            pendingClaims: 0,
            totalPremium: 0,
            nextPaymentAmount: 0,
            nextPaymentDate: null
          });
        }

        console.log('[ClientDashboard] Fetching stats for clientId:', clientId);

        // Use getByClientId instead of getAll + filter
        return forkJoin({
          policies: this.policyRepository.getByClientId(clientId).pipe(
            catchError((err) => {
              console.error('[ClientDashboard] Error fetching policies:', err);
              console.warn('[ClientDashboard] Check if backend endpoint GET /api/v1/policies/client/{clientId} exists');
              return of([]);
            })
          ),
          claims: this.claimRepository.getByClientId(clientId).pipe(
            catchError((err) => {
              console.error('[ClientDashboard] Error fetching claims:', err);
              console.warn('[ClientDashboard] Check if backend endpoint GET /api/v1/claims/client/{clientId} exists');
              return of([]);
            })
          ),
          invoices: this.invoiceRepository.getByClientId(clientId).pipe(
            catchError((err) => {
              console.error('[ClientDashboard] Error fetching invoices:', err);
              console.warn('[ClientDashboard] Check if backend endpoint GET /api/v1/invoices/client/{clientId} exists');
              return of([]);
            })
          )
        }).pipe(
          map((data) => {
            console.log('[ClientDashboard] Loaded data:', {
              policies: data.policies.length,
              claims: data.claims.length,
              invoices: data.invoices.length
            });
            return this.calculateClientStats(data.policies, data.claims, data.invoices);
          })
        );
      })
    );
  }

  /**
   * Statistiques détaillées pour les polices du client
   */
  getClientPolicyStats(): Observable<ClientPolicyStats> {
    return this.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) {
          return of(this.calculatePolicyStats([]));
        }

        return this.policyRepository.getByClientId(clientId).pipe(
          catchError((err) => {
            console.error('[ClientDashboard] Error fetching policy stats:', err);
            return of([]);
          }),
          map((policies) => {
            console.log('[ClientDashboard] Policy stats loaded:', policies.length);
            return this.calculatePolicyStats(policies);
          })
        );
      })
    );
  }

  /**
   * Statistiques détaillées pour les claims du client
   */
  getClientClaimStats(): Observable<ClientClaimStats> {
    return this.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) {
          return of(this.calculateClaimStats([]));
        }

        return this.claimRepository.getByClientId(clientId).pipe(
          catchError((err) => {
            console.error('[ClientDashboard] Error fetching claim stats:', err);
            return of([]);
          }),
          map((claims) => {
            console.log('[ClientDashboard] Claim stats loaded:', claims.length);
            return this.calculateClaimStats(claims);
          })
        );
      })
    );
  }

  /**
   * Statistiques détaillées pour les paiements du client
   */
  getClientPaymentStats(): Observable<ClientPaymentStats> {
    return this.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) {
          return of(this.calculatePaymentStats([]));
        }

        return this.invoiceRepository.getByClientId(clientId).pipe(
          catchError((err) => {
            console.error('[ClientDashboard] Error fetching payment stats:', err);
            return of([]);
          }),
          map((invoices) => {
            console.log('[ClientDashboard] Payment stats loaded:', invoices.length);
            return this.calculatePaymentStats(invoices);
          })
        );
      })
    );
  }

  private calculateClientStats(
    policies: Policy[],
    claims: Claim[],
    invoices: Invoice[]
  ): ClientDashboardStats {
    const activePolicies = policies.filter(p => p.status === 'ACTIVE').length;
    const pendingClaims = claims.filter(c => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length;
    const totalPremium = policies.reduce((sum, p) => sum + (p.premium || 0), 0);

    // Find next payment
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING');
    const nextPayment = pendingInvoices
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return {
      totalPolicies: policies.length,
      activePolicies,
      pendingClaims,
      totalPremium,
      nextPaymentAmount: nextPayment?.amount || 0,
      nextPaymentDate: nextPayment ? new Date(nextPayment.dueDate) : null
    };
  }

  private calculatePolicyStats(policies: Policy[]): ClientPolicyStats {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalPremium = 0;
    let expiringSoon = 0;

    policies.forEach(policy => {
      byType[policy.type] = (byType[policy.type] || 0) + 1;
      byStatus[policy.status] = (byStatus[policy.status] || 0) + 1;
      totalPremium += policy.premium || 0;

      const endDate = new Date(policy.endDate);
      if (policy.status === 'ACTIVE' && endDate <= thirtyDaysFromNow && endDate >= now) {
        expiringSoon++;
      }
    });

    const active = byStatus['ACTIVE'] || 0;
    const pending = (byStatus['PENDING'] || 0) + (byStatus['DRAFT'] || 0) + (byStatus['SUBMITTED'] || 0);
    const expired = byStatus['EXPIRED'] || 0;

    return {
      total: policies.length,
      active,
      pending,
      expired,
      byType,
      byStatus,
      totalPremium,
      averagePremium: policies.length > 0 ? totalPremium / policies.length : 0,
      expiringSoon,
      myPolicies: policies
    };
  }

  private calculateClaimStats(claims: Claim[]): ClientClaimStats {
    const byStatus: Record<string, number> = {};
    let totalAmount = 0;
    let approvedAmount = 0;
    let pendingAmount = 0;

    claims.forEach(claim => {
      byStatus[claim.status] = (byStatus[claim.status] || 0) + 1;
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

    return {
      total: claims.length,
      pending,
      underReview,
      approved,
      rejected,
      paid,
      byStatus,
      totalAmount,
      approvedAmount,
      pendingAmount,
      myClaims: claims
    };
  }

  private calculatePaymentStats(invoices: Invoice[]): ClientPaymentStats {
    const byStatus: Record<string, number> = {};
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    invoices.forEach(invoice => {
      byStatus[invoice.status] = (byStatus[invoice.status] || 0) + 1;

      if (invoice.status === 'PAID') {
        totalPaid += invoice.amount || 0;
      } else if (invoice.status === 'PENDING') {
        totalPending += invoice.amount || 0;
      } else if (invoice.status === 'OVERDUE') {
        totalOverdue += invoice.amount || 0;
      }
    });

    // Find next payment
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING');
    const nextInvoice = pendingInvoices
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    // Get recent payments
    const recentPayments = invoices
      .filter(i => i.status === 'PAID')
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 5);

    return {
      totalInvoices: invoices.length,
      paidInvoices: byStatus['PAID'] || 0,
      pendingInvoices: byStatus['PENDING'] || 0,
      overdueInvoices: byStatus['OVERDUE'] || 0,
      totalPaid,
      totalPending,
      totalOverdue,
      nextPayment: nextInvoice ? {
        amount: nextInvoice.amount,
        dueDate: new Date(nextInvoice.dueDate),
        policyName: `Invoice ${nextInvoice.invoiceNumber}`
      } : null,
      recentPayments
    };
  }
}
