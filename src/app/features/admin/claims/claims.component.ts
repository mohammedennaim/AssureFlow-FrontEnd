import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimsService, Claim } from '../../../core/application/services/admin-claims.service';
import { AdminStatisticsService, ClaimStats } from '../../../core/application/services/admin-statistics.service';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { Router } from '@angular/router';

interface ClaimWithPriority extends Claim {
  priority: 'high' | 'medium' | 'low';
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
  private authService = inject(AuthService);
  private router = inject(Router);

  claims: ClaimWithPriority[] = [];
  isLoading = true;
  error: string | null = null;
  claimStats: ClaimStats | null = null;
  
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

      // Calculate statistics
      this.adminStatsService.getClaimStats(this.claims).subscribe((stats) => {
        this.claimStats = stats;
      });

      this.isLoading = false;
    });
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
}
