import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClaimsService, Claim } from '../../../core/application/services/admin-claims.service';
import { AdminStatisticsService, ClaimStats } from '../../../core/application/services/admin-statistics.service';
import { catchError, of } from 'rxjs';

interface ClaimWithPriority extends Claim {
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './claims.component.html',
  styleUrl: './claims.component.scss'
})
export class ClaimsComponent implements OnInit {
  private claimsService = inject(ClaimsService);
  private adminStatsService = inject(AdminStatisticsService);

  claims: ClaimWithPriority[] = [];
  isLoading = true;
  error: string | null = null;
  claimStats: ClaimStats | null = null;

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
        priority: this.getPriority(claim.status, claim.amount)
      }));

      // Calcule les statistiques réelles
      this.adminStatsService.getClaimStats(data).subscribe((stats) => {
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
      pending: this.claims.filter(c => c.status === 'PENDING').length,
      inReview: this.claims.filter(c => c.status === 'UNDER_REVIEW').length,
      approved: this.claims.filter(c => c.status === 'APPROVED').length,
      rejected: this.claims.filter(c => c.status === 'REJECTED').length
    };
  }

  getSubmittedClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => c.status === 'PENDING' || c.status === 'SUBMITTED');
  }

  getInReviewClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'IN_REVIEW');
  }

  getApprovedClaims(): ClaimWithPriority[] {
    return this.claims.filter(c => c.status === 'APPROVED' || c.status === 'PAID');
  }

  trackByClaimId(index: number, claim: Claim): string {
    return claim.id;
  }
}
