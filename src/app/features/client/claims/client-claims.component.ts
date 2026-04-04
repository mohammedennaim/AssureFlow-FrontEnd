import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Claim } from '../../../core/domain/models/claim.model';
import { catchError, of } from 'rxjs';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { AvatarColorPipe } from '../../../shared/pipes/avatar-color.pipe';
import { StatusClassPipe } from '../../../shared/pipes/status-class.pipe';
import { FormatCurrencyPipe } from '../../../shared/pipes/format-currency.pipe';

@Component({
  selector: 'app-client-claims',
  standalone: true,
  imports: [CommonModule, RouterLink, AvatarColorPipe, StatusClassPipe, FormatCurrencyPipe],
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
    this.clientDashboardService['getCurrentClientId']().subscribe({
      next: (clientId) => {
        if (!clientId) { this.loading = false; return; }
        this.claimRepository.getByClientId(clientId).pipe(
          catchError(() => { this.loading = false; return of([]); })
        ).subscribe((claims) => { this.claims = claims; this.loading = false; });
      },
      error: () => { this.loading = false; }
    });
  }

  getFilteredClaims(): Claim[] {
    if (this.filter === 'all') return this.claims;
    const filterMap: Record<string, string[]> = {
      pending: ['PENDING', 'SUBMITTED'],
      processing: ['UNDER_REVIEW', 'IN_REVIEW'],
      approved: ['APPROVED', 'PAID'],
      rejected: ['REJECTED']
    };
    return this.claims.filter(c => (filterMap[this.filter] || []).includes(c.status.toUpperCase()));
  }

  isStatusPast(status: string, targetStatus: string): boolean {
    const order = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'];
    return order.indexOf(status.toUpperCase()) > order.indexOf(targetStatus);
  }

  isRejectedStatus(status: string): boolean {
    return ['REJECTED', 'CLOSED', 'INFO_REQUESTED'].includes(status.toUpperCase());
  }

  formatDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getTotalApprovedAmount(): number {
    return this.claims.filter(c => ['APPROVED', 'PAID'].includes(c.status.toUpperCase()))
      .reduce((sum, c) => sum + (c.amount || 0), 0);
  }

  getPendingClaimsCount(): number {
    return this.claims.filter(c => ['PENDING', 'SUBMITTED'].includes(c.status.toUpperCase())).length;
  }

  getApprovedClaimsCount(): number {
    return this.claims.filter(c => ['APPROVED', 'PAID'].includes(c.status.toUpperCase())).length;
  }
}
