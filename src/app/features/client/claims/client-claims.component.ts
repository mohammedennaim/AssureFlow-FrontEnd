import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Claim } from '../../../core/domain/models/claim.model';
import { catchError, of } from 'rxjs';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';

@Component({
  selector: 'app-client-claims',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-claims.component.html',
  styleUrl: './client-claims.component.scss'
})
export class ClientClaimsComponent implements OnInit {
  loading = true;
  claims: Claim[] = [];
  filter: 'all' | 'pending' | 'processing' | 'approved' | 'rejected' = 'all';

  private claimRepository = inject(CLAIM_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims(): void {
    this.loading = true;
    
    // Get current user's client ID first
    this.clientDashboardService['getCurrentClientId']().subscribe({
      next: (clientId) => {
        if (!clientId) {
          console.warn('[ClientClaims] No clientId found');
          this.loading = false;
          return;
        }

        console.log('[ClientClaims] Loading claims for clientId:', clientId);
        
        this.claimRepository.getByClientId(clientId).pipe(
          catchError((err) => {
            console.error('[ClientClaims] Error loading claims:', err);
            this.loading = false;
            return of([]);
          })
        ).subscribe((claims) => {
          console.log('[ClientClaims] Loaded claims:', claims);
          this.claims = claims;
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('[ClientClaims] Error getting clientId:', err);
        this.loading = false;
      }
    });
  }

  getFilteredClaims(): Claim[] {
    if (this.filter === 'all') {
      return this.claims;
    }

    const filterMap: Record<string, string[]> = {
      pending: ['PENDING', 'SUBMITTED'],
      processing: ['UNDER_REVIEW', 'IN_REVIEW'],
      approved: ['APPROVED', 'PAID'],
      rejected: ['REJECTED']
    };

    const statuses = filterMap[this.filter] || [];
    return this.claims.filter(c => statuses.includes(c.status.toUpperCase()));
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0 });
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

  getTotalApprovedAmount(): number {
    return this.claims
      .filter(c => ['APPROVED', 'PAID'].includes(c.status.toUpperCase()))
      .reduce((sum, c) => sum + (c.amount || 0), 0);
  }

  getPendingClaimsCount(): number {
    return this.claims.filter(c => ['PENDING', 'SUBMITTED'].includes(c.status.toUpperCase())).length;
  }

  getApprovedClaimsCount(): number {
    return this.claims.filter(c => ['APPROVED', 'PAID'].includes(c.status.toUpperCase())).length;
  }
}
