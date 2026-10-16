import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, of } from 'rxjs';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Policy } from '../../../core/domain/models/policy.model';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import {
  daysUntil,
  formatDateFr,
  formatMad,
  policyTypeMeta,
  PolicyTypeMeta,
  statusMeta,
  StatusMeta
} from '../../../shared/utils/client-ui';

type PolicyFilter = 'all' | 'active' | 'pending' | 'ended';

const FILTER_STATUSES: Record<Exclude<PolicyFilter, 'all'>, string[]> = {
  active: ['ACTIVE', 'RENEWED'],
  pending: ['PENDING', 'DRAFT', 'SUBMITTED'],
  ended: ['EXPIRED', 'CANCELLED', 'CANCELED', 'TERMINATED', 'SUSPENDED', 'INACTIVE', 'REJECTED']
};

@Component({
  selector: 'app-client-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './client-policies.component.html',
  styleUrl: './client-policies.component.scss'
})
export class ClientPoliciesComponent implements OnInit {
  readonly icons = AF_ICONS;
  readonly filters: { key: PolicyFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'active', label: 'Actifs' },
    { key: 'pending', label: 'En attente' },
    { key: 'ended', label: 'Terminés' }
  ];

  loading = true;
  policies: Policy[] = [];
  filter: PolicyFilter = 'all';
  searchQuery = '';

  private policyRepository = inject(POLICY_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.loading = true;
    this.clientDashboardService.getCurrentClientId().subscribe({
      next: (clientId) => {
        if (!clientId) { this.loading = false; return; }
        this.policyRepository.getByClientId(clientId).pipe(
          catchError(() => of([] as Policy[]))
        ).subscribe((policies) => { this.policies = policies; this.loading = false; });
      },
      error: () => { this.loading = false; }
    });
  }

  get filteredPolicies(): Policy[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.policies.filter(p => {
      if (!this.matches(p, this.filter)) return false;
      if (!query) return true;
      return (p.policyNumber || '').toLowerCase().includes(query)
        || (p.type || '').toLowerCase().includes(query)
        || this.type(p).label.toLowerCase().includes(query);
    });
  }

  count(filter: PolicyFilter): number {
    return this.policies.filter(p => this.matches(p, filter)).length;
  }

  get activeCount(): number {
    return this.count('active');
  }

  get annualPremium(): string {
    const source = this.activeCount ? this.policies.filter(p => this.matches(p, 'active')) : this.policies;
    return formatMad(source.reduce((sum, p) => sum + (p.premium || 0), 0));
  }

  get nextDue(): { policy: Policy; days: number } | null {
    let next: { policy: Policy; days: number } | null = null;
    for (const policy of this.policies) {
      if (!this.matches(policy, 'active')) continue;
      const days = daysUntil(policy.endDate);
      if (days === null || days < 0) continue;
      if (!next || days < next.days) next = { policy, days };
    }
    return next;
  }

  status(policy: Policy): StatusMeta {
    return statusMeta(policy.status);
  }

  type(policy: Policy): PolicyTypeMeta {
    return policyTypeMeta(policy.type);
  }

  remaining(policy: Policy): number | null {
    return daysUntil(policy.endDate);
  }

  inDays(days: number): string {
    if (days === 0) return 'aujourd’hui';
    if (days === 1) return 'demain';
    return `dans ${days} jours`;
  }

  amount(value: number | null | undefined): string {
    return formatMad(value);
  }

  date(value: string | Date | null | undefined): string {
    return formatDateFr(value);
  }

  resetFilters(): void {
    this.filter = 'all';
    this.searchQuery = '';
  }

  private matches(policy: Policy, filter: PolicyFilter): boolean {
    if (filter === 'all') return true;
    return FILTER_STATUSES[filter].includes((policy.status || '').toUpperCase());
  }
}
