import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ClientDashboardService } from '../../../../core/application/services/client-dashboard.service';
import { Policy } from '../../../../core/domain/models/policy.model';
import { catchError, of } from 'rxjs';
import { POLICY_REPOSITORY } from '../../../../core/domain/ports/policy.repository.port';

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './policy-detail.component.html',
  styleUrl: './policy-detail.component.scss'
})
export class PolicyDetailComponent implements OnInit {
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
          catchError((err) => {
            console.error('[PolicyDetail] Error loading policy:', err);
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
      error: (err) => {
        console.error('[PolicyDetail] Error getting clientId:', err);
        this.router.navigate(['/client/policies']);
      }
    });
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'status--active',
      PENDING: 'status--pending',
      DRAFT: 'status--pending',
      SUBMITTED: 'status--pending',
      EXPIRED: 'status--expired',
      CANCELLED: 'status--rejected'
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

  getPolicyIcon(type: string): string {
    const icons: Record<string, string> = {
      AUTO: 'car',
      HOME: 'home',
      LIFE: 'heart',
      HEALTH: 'health',
      BUSINESS: 'building'
    };
    return icons[type.toUpperCase()] || 'shield';
  }

  getAvatarColor(type: string): string {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
    ];
    const index = (type?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  }

  goBack(): void {
    this.router.navigate(['/client/policies']);
  }
}
