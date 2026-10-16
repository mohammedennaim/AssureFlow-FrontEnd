import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, of } from 'rxjs';
import { ClientDashboardService } from '../../../../core/application/services/client-dashboard.service';
import { Policy } from '../../../../core/domain/models/policy.model';
import { POLICY_REPOSITORY } from '../../../../core/domain/ports/policy.repository.port';
import { AF_ICONS } from '../../../../shared/icons/af-icons';
import {
  daysUntil,
  formatDateFr,
  formatMad,
  policyTypeMeta,
  PolicyTypeMeta,
  statusMeta,
  StatusMeta
} from '../../../../shared/utils/client-ui';

const ACTIVE_STATUSES = ['ACTIVE', 'RENEWED'];

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './policy-detail.component.html',
  styleUrl: './policy-detail.component.scss'
})
export class PolicyDetailComponent implements OnInit {
  readonly icons = AF_ICONS;

  loading = true;
  policy: Policy | null = null;
  policyId: string | null = null;

  private policyRepository = inject(POLICY_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.policyId = this.route.snapshot.paramMap.get('id');
    if (!this.policyId) {
      this.router.navigate(['/client/policies']);
      return;
    }
    this.loadPolicy();
  }

  loadPolicy(): void {
    this.loading = true;

    this.clientDashboardService.getCurrentClientId().subscribe({
      next: (clientId) => {
        if (!clientId || !this.policyId) {
          this.router.navigate(['/client/policies']);
          return;
        }

        this.policyRepository.getById(this.policyId).pipe(
          catchError(() => {
            this.router.navigate(['/client/policies']);
            return of(null);
          })
        ).subscribe((policy) => {
          if (policy && policy.clientId === clientId) {
            this.policy = policy;
          } else {
            this.router.navigate(['/client/policies']);
          }
          this.loading = false;
        });
      },
      error: () => {
        this.router.navigate(['/client/policies']);
      }
    });
  }

  get status(): StatusMeta {
    return statusMeta(this.policy?.status);
  }

  get type(): PolicyTypeMeta {
    return policyTypeMeta(this.policy?.type);
  }

  get isActive(): boolean {
    return ACTIVE_STATUSES.includes((this.policy?.status || '').toUpperCase());
  }

  get daysLeft(): number | null {
    return daysUntil(this.policy?.endDate);
  }

  get totalDays(): number | null {
    const start = daysUntil(this.policy?.startDate);
    const end = this.daysLeft;
    if (start === null || end === null || end <= start) return null;
    return end - start;
  }

  get progress(): number {
    const total = this.totalDays;
    const end = this.daysLeft;
    if (total === null || end === null) return 0;
    const elapsed = total - end;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  get validityLabel(): string {
    const days = this.daysLeft;
    if (days === null) return 'Dates de validité non renseignées';
    if (days < 0) return `Échu depuis ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
    const startsIn = daysUntil(this.policy?.startDate);
    if (startsIn !== null && startsIn > 0) return `Démarre dans ${startsIn} jour${startsIn > 1 ? 's' : ''}`;
    if (days === 0) return 'Échéance aujourd’hui';
    return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`;
  }

  get validityTone(): 'success' | 'warning' | 'neutral' {
    const days = this.daysLeft;
    if (days === null || days < 0 || !this.isActive) return 'neutral';
    return days <= 30 ? 'warning' : 'success';
  }

  amount(value: number | null | undefined): string {
    return formatMad(value);
  }

  date(value: string | Date | null | undefined): string {
    return formatDateFr(value);
  }
}
