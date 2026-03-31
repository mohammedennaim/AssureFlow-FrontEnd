import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ClientDashboardService } from '../../../../core/application/services/client-dashboard.service';
import { Claim } from '../../../../core/domain/models/claim.model';
import { Policy } from '../../../../core/domain/models/policy.model';
import { catchError, of } from 'rxjs';
import { CLAIM_REPOSITORY } from '../../../../core/domain/ports/claim.repository.port';
import { POLICY_REPOSITORY } from '../../../../core/domain/ports/policy.repository.port';
import { ClaimStepsTrackerComponent } from '../../../../shared/components/claim-steps-tracker/claim-steps-tracker.component';

@Component({
  selector: 'app-claim-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, ClaimStepsTrackerComponent],
  templateUrl: './claim-detail.component.html',
  styleUrl: './claim-detail.component.scss'
})
export class ClaimDetailComponent implements OnInit {
  loading = true;
  claim: Claim | null = null;
  policy: Policy | null = null;
  claimId: string | null = null;

  private claimRepository = inject(CLAIM_REPOSITORY);
  private policyRepository = inject(POLICY_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.claimId = this.route.snapshot.paramMap.get('id');
    if (!this.claimId) {
      this.router.navigate(['/client/claims']);
      return;
    }
    this.loadClaim();
  }

  loadClaim(): void {
    this.loading = true;

    this.clientDashboardService.getCurrentClientId().subscribe({
      next: (clientId) => {
        if (!clientId || !this.claimId) {
          this.router.navigate(['/client/claims']);
          return;
        }

        this.claimRepository.getById(this.claimId).pipe(
          catchError((err) => {
            console.error('[ClaimDetail] Error loading claim:', err);
            this.router.navigate(['/client/claims']);
            return of(null);
          })
        ).subscribe((claim) => {
          if (claim && claim.clientId === clientId) {
            this.claim = claim;
            // Load policy details if policyId exists
            if (claim.policyId) {
              this.loadPolicy(claim.policyId);
            }
          } else {
            this.router.navigate(['/client/claims']);
          }
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('[ClaimDetail] Error getting clientId:', err);
        this.router.navigate(['/client/claims']);
      }
    });
  }

  loadPolicy(policyId: string): void {
    this.policyRepository.getById(policyId).pipe(
      catchError((err) => {
        console.error('[ClaimDetail] Error loading policy:', err);
        return of(null);
      })
    ).subscribe((policy) => {
      this.policy = policy;
    });
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'status--pending',
      SUBMITTED: 'status--pending',
      UNDER_REVIEW: 'status--processing',
      IN_REVIEW: 'status--processing',
      APPROVED: 'status--approved',
      PAID: 'status--approved',
      REJECTED: 'status--rejected',
      CLOSED: 'status--rejected'
    };
    return statusMap[status.toUpperCase()] || '';
  }

  formatDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0 });
  }

  getAvatarColor(id: string): string {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
    ];
    const index = (id?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  }

  goBack(): void {
    this.router.navigate(['/client/claims']);
  }
}
