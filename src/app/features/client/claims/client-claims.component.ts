import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, of } from 'rxjs';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Claim } from '../../../core/domain/models/claim.model';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import { formatDateFr, formatMad, statusMeta, StatusMeta } from '../../../shared/utils/client-ui';

type ClaimFilter = 'all' | 'pending' | 'processing' | 'approved' | 'rejected';

const FILTER_STATUSES: Record<Exclude<ClaimFilter, 'all'>, string[]> = {
  pending: ['PENDING', 'SUBMITTED'],
  processing: ['UNDER_REVIEW', 'IN_REVIEW', 'PROCESSING', 'INFO_REQUESTED'],
  approved: ['APPROVED', 'PAID'],
  rejected: ['REJECTED', 'DENIED', 'CLOSED']
};

const STEP_ORDER = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'];

@Component({
  selector: 'app-client-claims',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './client-claims.component.html',
  styleUrl: './client-claims.component.scss'
})
export class ClientClaimsComponent implements OnInit {
  readonly icons = AF_ICONS;
  readonly steps = ['Déclaré', 'Analyse', 'Décision', 'Indemnisé'];
  readonly filters: { key: ClaimFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'Déclarés' },
    { key: 'processing', label: 'En cours' },
    { key: 'approved', label: 'Acceptés' },
    { key: 'rejected', label: 'Refusés' }
  ];

  loading = true;
  claims: Claim[] = [];
  filter: ClaimFilter = 'all';

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
          catchError(() => of([] as Claim[]))
        ).subscribe((claims) => { this.claims = claims; this.loading = false; });
      },
      error: () => { this.loading = false; }
    });
  }

  get filteredClaims(): Claim[] {
    return this.filter === 'all' ? this.claims : this.claims.filter(c => this.matches(c, this.filter));
  }

  count(filter: ClaimFilter): number {
    return filter === 'all' ? this.claims.length : this.claims.filter(c => this.matches(c, filter)).length;
  }

  get inProgressCount(): number {
    return this.count('pending') + this.count('processing');
  }

  get approvedTotal(): string {
    const total = this.claims
      .filter(c => this.matches(c, 'approved'))
      .reduce((sum, c) => sum + (c.approvedAmount || c.amount || c.estimatedAmount || 0), 0);
    return formatMad(total);
  }

  status(claim: Claim): StatusMeta {
    return statusMeta(claim.status);
  }

  stepState(claim: Claim, index: number): 'is-done' | 'is-current' | 'is-failed' | '' {
    const status = (claim.status || '').toUpperCase();
    if (FILTER_STATUSES.rejected.includes(status)) {
      return index === 0 ? 'is-done' : index === 2 ? 'is-failed' : index === 1 ? 'is-done' : '';
    }
    const normalized = ['IN_REVIEW', 'PROCESSING', 'INFO_REQUESTED'].includes(status) ? 'UNDER_REVIEW'
      : status === 'PENDING' ? 'SUBMITTED' : status;
    const current = Math.max(0, STEP_ORDER.indexOf(normalized));
    if (index < current) return 'is-done';
    if (index === current) return current === STEP_ORDER.length - 1 ? 'is-done' : 'is-current';
    return '';
  }

  amount(value: number | null | undefined): string {
    return formatMad(value);
  }

  date(value: string | Date | null | undefined): string {
    return formatDateFr(value);
  }

  private matches(claim: Claim, filter: ClaimFilter): boolean {
    if (filter === 'all') return true;
    return FILTER_STATUSES[filter].includes((claim.status || '').toUpperCase());
  }
}
