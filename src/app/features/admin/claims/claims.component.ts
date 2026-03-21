import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimsService, Claim } from '../../../core/application/services/admin-claims.service';
import { AdminStatisticsService, ClaimStats } from '../../../core/application/services/admin-statistics.service';
import { ClientsService, Client } from '../../../core/application/services/admin-clients.service';
import { PoliciesService, Policy } from '../../../core/application/services/admin-policies.service';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of, forkJoin } from 'rxjs';
import { Router } from '@angular/router';

interface ClaimWithPriority extends Claim {
  priority: 'high' | 'medium' | 'low';
  clientName?: string;
  policyNumber?: string;
}

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './claims.component.html',
  styleUrl: './claims.component.scss'
})
export class ClaimsComponent implements OnInit {
  private claimsService = inject(ClaimsService);
  private adminStatsService = inject(AdminStatisticsService);
  private clientsService = inject(ClientsService);
  private policiesService = inject(PoliciesService);
  private authService = inject(AuthService);
  private router = inject(Router);

  claims: ClaimWithPriority[] = [];
  isLoading = true;
  error: string | null = null;
  claimStats: ClaimStats | null = null;
  
  // Cache for clients and policies
  private clientsCache = new Map<string, Client>();
  private policiesCache = new Map<string, Policy>();
  
  // Modal states
  showApproveModal = false;
  showRejectModal = false;
  showViewModal = false;
  selectedClaim: ClaimWithPriority | null = null;
  
  // Approve form
  approveAmount: number = 0;
  
  // Reject form
  rejectReason: string = '';

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims(): void {
    this.isLoading = true;
    this.error = null;

    this.claimsService.getAll().pipe(
      catchError((err) => {
        this.error = 'Failed to load claims';
        console.error('Error fetching claims:', err);
        return of([]);
      })
    ).subscribe((data) => {
      this.claims = data.map(claim => ({
        ...claim,
        priority: this.getPriority(claim.status, claim.estimatedAmount || claim.approvedAmount || 0)
      }));

      // Load client and policy information
      this.enrichClaimsWithDetails();

      // Calculate statistics
      this.adminStatsService.getClaimStats(this.claims).subscribe((stats) => {
        this.claimStats = stats;
      });

      this.isLoading = false;
    });
  }

  private enrichClaimsWithDetails(): void {
    // Get unique client and policy IDs
    const clientIds = [...new Set(this.claims.map(c => c.clientId).filter(id => id))];
    const policyIds = [...new Set(this.claims.map(c => c.policyId).filter(id => id))];

    // Load clients
    const clientRequests = clientIds.map(id => 
      this.clientsService.getById(id).pipe(
        catchError(() => of(null))
      )
    );

    // Load policies
    const policyRequests = policyIds.map(id => 
      this.policiesService.getById(id).pipe(
        catchError(() => of(null))
      )
    );

    // Execute all requests
    forkJoin([
      forkJoin(clientRequests.length > 0 ? clientRequests : [of(null)]),
      forkJoin(policyRequests.length > 0 ? policyRequests : [of(null)])
    ]).subscribe(([clients, policies]) => {
      // Build cache
      clients.forEach((client, index) => {
        if (client) {
          this.clientsCache.set(clientIds[index], client);
        }
      });

      policies.forEach((policy, index) => {
        if (policy) {
          this.policiesCache.set(policyIds[index], policy);
        }
      });

      // Enrich claims with names
      this.claims = this.claims.map(claim => ({
        ...claim,
        clientName: this.getClientName(claim.clientId),
        policyNumber: this.getPolicyNumber(claim.policyId)
      }));
    });
  }

  private getClientName(clientId: string): string {
    const client = this.clientsCache.get(clientId);
    if (client) {
      return `${client.firstName} ${client.lastName}`;
    }
    return 'Unknown Client';
  }

  private getPolicyNumber(policyId: string): string {
    const policy = this.policiesCache.get(policyId);
    if (policy && policy.policyNumber) {
      return policy.policyNumber;
    }
    return (policyId?.slice(0, 8)?.toUpperCase() || 'N/A') + '...';
  }

  private getPriority(status: string, amount: number): 'high' | 'medium' | 'low' {
    if (amount > 5000) return 'high';
    if (amount > 1000) return 'medium';
    return 'low';
  }

  get stats() {
    if (this.claimStats) {
      return {
        pending: this.claimStats.pending,
        inReview: this.claimStats.underReview,
        approved: this.claimStats.approved,
        rejected: this.claimStats.rejected
      };
    }
    return {
      pending: this.claims.filter(c => ['PENDING', 'SUBMITTED'].includes(c.status)).length,
      inReview: this.claims.filter(c => c.status === 'UNDER_REVIEW').length,
      approved: this.claims.filter(c => ['APPROVED', 'PAID'].includes(c.status)).length,
      rejected: this.claims.filter(c => c.status === 'REJECTED').length
    };
  }

  // Modal actions
  openViewModal(claim: ClaimWithPriority): void {
    this.selectedClaim = claim;
    this.showViewModal = true;
  }

  openApproveModal(claim: ClaimWithPriority): void {
    this.selectedClaim = claim;
    this.approveAmount = claim.estimatedAmount || claim.amount || 0;
    this.showApproveModal = true;
  }

  openRejectModal(claim: ClaimWithPriority): void {
    this.selectedClaim = claim;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeModals(): void {
    this.showApproveModal = false;
    this.showRejectModal = false;
    this.showViewModal = false;
    this.selectedClaim = null;
  }

  // Claim actions
  approveClaim(): void {
    if (!this.selectedClaim) return;
    
    // Vérification silencieuse du statut
    if (this.selectedClaim.status !== 'UNDER_REVIEW') {
      this.closeModals();
      this.loadClaims();
      return;
    }
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.closeModals();
      return;
    }
    
    const approvedBy = this.isValidUUID(currentUser.id) 
      ? currentUser.id 
      : this.generateUUID();
    
    this.claimsService.approve(
      this.selectedClaim.id,
      this.approveAmount,
      approvedBy
    ).subscribe({
      next: () => {
        this.closeModals();
        this.loadClaims();
      },
      error: () => {
        this.closeModals();
        this.loadClaims();
      }
    });
  }

  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  rejectClaim(): void {
    if (!this.selectedClaim || !this.rejectReason.trim()) {
      this.closeModals();
      return;
    }
    
    // Vérification silencieuse du statut
    if (this.selectedClaim.status !== 'UNDER_REVIEW') {
      this.closeModals();
      this.loadClaims();
      return;
    }
    
    this.claimsService.reject(
      this.selectedClaim.id,
      this.rejectReason
    ).subscribe({
      next: () => {
        this.closeModals();
        this.loadClaims();
      },
      error: () => {
        this.closeModals();
        this.loadClaims();
      }
    });
  }

  reviewClaim(claimId: string): void {
    const claim = this.claims.find(c => c.id === claimId);
    
    // Vérification silencieuse du statut
    if (claim && claim.status !== 'SUBMITTED' && claim.status !== 'PENDING') {
      this.loadClaims();
      return;
    }
    
    this.claimsService.review(claimId).subscribe({
      next: () => {
        this.loadClaims();
      },
      error: () => {
        this.loadClaims();
      }
    });
  }

  requestInfo(claimId: string): void {
    this.claimsService.requestInfo(claimId).subscribe({
      next: () => {
        this.loadClaims();
      },
      error: () => {
        this.loadClaims();
      }
    });
  }

  markAsPaid(claimId: string): void {
    const claim = this.claims.find(c => c.id === claimId);
    
    // Vérification silencieuse du statut
    if (claim && claim.status !== 'APPROVED' && claim.status !== 'PAYOUT_INITIATED') {
      this.loadClaims();
      return;
    }
    
    this.claimsService.markAsPaid(claimId).subscribe({
      next: () => {
        this.loadClaims();
      },
      error: () => {
        this.loadClaims();
      }
    });
  }

  closeClaim(claimId: string): void {
    const claim = this.claims.find(c => c.id === claimId);
    
    // Vérification silencieuse du statut
    if (claim && claim.status !== 'PAID' && claim.status !== 'REJECTED' && claim.status !== 'REFUNDED') {
      this.loadClaims();
      return;
    }
    
    this.claimsService.close(claimId).subscribe({
      next: () => {
        this.loadClaims();
      },
      error: () => {
        this.loadClaims();
      }
    });
  }

  deleteClaim(claimId: string): void {
    if (!confirm('Are you sure you want to delete this claim? This action cannot be undone.')) return;
    
    this.claimsService.delete(claimId).subscribe({
      next: () => {
        this.loadClaims();
      },
      error: () => {
        this.loadClaims();
      }
    });
  }

  getSubmittedClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => ['PENDING', 'SUBMITTED'].includes(c.status));
  }

  getInReviewClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => c.status === 'UNDER_REVIEW');
  }

  getApprovedClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => ['APPROVED', 'PAID', 'PAYOUT_INITIATED'].includes(c.status));
  }

  getRejectedClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => c.status === 'REJECTED');
  }

  getClosedClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => c.status === 'CLOSED');
  }

  trackByClaimId(index: number, claim: Claim): string {
    return claim.id;
  }

  getAmount(claim: Claim): number {
    return claim.approvedAmount || claim.estimatedAmount || claim.amount || 0;
  }

  getStatusClass(status: string): string {
    return 'status-badge--' + status.toLowerCase().replace('_', '-');
  }

  // Status tracker methods
  isStepCompleted(step: string): boolean {
    if (!this.selectedClaim) return false;
    
    const statusOrder = ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAYOUT_INITIATED', 'PAID', 'CLOSED'];
    const currentIndex = statusOrder.indexOf(this.selectedClaim.status);
    const stepIndex = statusOrder.indexOf(step);
    
    // Special case: PENDING and SUBMITTED are equivalent
    if (step === 'SUBMITTED' && (this.selectedClaim.status === 'PENDING' || this.selectedClaim.status === 'SUBMITTED')) {
      return true;
    }
    
    return currentIndex > stepIndex;
  }

  isStepActive(step: string): boolean {
    if (!this.selectedClaim) return false;
    
    // Special case: PENDING and SUBMITTED are equivalent
    if (step === 'SUBMITTED' && (this.selectedClaim.status === 'PENDING' || this.selectedClaim.status === 'SUBMITTED')) {
      return true;
    }
    
    return this.selectedClaim.status === step;
  }

  getStepDate(step: string): string {
    if (!this.selectedClaim) return 'Pending';
    
    // For now, we'll show dates based on the current status
    // In a real app, you'd have timestamps for each status change
    if (this.isStepCompleted(step)) {
      if (step === 'SUBMITTED') {
        return this.formatDate(this.selectedClaim.createdAt || this.selectedClaim.submittedAt);
      }
      // For other completed steps, you'd need actual timestamps from the backend
      return 'Completed';
    } else if (this.isStepActive(step)) {
      return this.formatDate(this.selectedClaim.createdAt || this.selectedClaim.submittedAt);
    }
    
    return 'Pending';
  }

  private formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
