import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Policy } from '../../../core/domain/models/policy.model';
import { catchError, of } from 'rxjs';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';

@Component({
  selector: 'app-client-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './client-policies.component.html',
  styleUrl: './client-policies.component.scss'
})
export class ClientPoliciesComponent implements OnInit {
  loading = true;
  policies: Policy[] = [];
  filter: 'all' | 'active' | 'pending' | 'expired' = 'all';
  searchQuery = '';

  private policyRepository = inject(POLICY_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.loading = true;
    
    // Get current user's client ID first
    this.clientDashboardService['getCurrentClientId']().subscribe({
      next: (clientId) => {
        if (!clientId) {
          console.warn('[ClientPolicies] No clientId found');
          this.loading = false;
          return;
        }

        console.log('[ClientPolicies] Loading policies for clientId:', clientId);
        
        this.policyRepository.getByClientId(clientId).pipe(
          catchError((err) => {
            console.error('[ClientPolicies] Error loading policies:', err);
            this.loading = false;
            return of([]);
          })
        ).subscribe((policies) => {
          console.log('[ClientPolicies] Loaded policies:', policies);
          this.policies = policies;
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('[ClientPolicies] Error getting clientId:', err);
        this.loading = false;
      }
    });
  }

  getFilteredPolicies(): Policy[] {
    let filtered = this.policies;

    if (this.filter !== 'all') {
      const filterMap: Record<string, string[]> = {
        active: ['ACTIVE'],
        pending: ['PENDING', 'DRAFT', 'SUBMITTED'],
        expired: ['EXPIRED']
      };
      const statuses = filterMap[this.filter] || [];
      filtered = filtered.filter(p => statuses.includes(p.status.toUpperCase()));
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.policyNumber?.toLowerCase().includes(query) ||
        p.type?.toLowerCase().includes(query)
      );
    }

    return filtered;
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
    return new Date(dateString).toLocaleDateString('en-US', {
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

  getTotalPremium(): number {
    return this.policies.reduce((sum, p) => sum + (p.premium || 0), 0);
  }

  getActivePoliciesCount(): number {
    return this.policies.filter(p => p.status === 'ACTIVE').length;
  }

  getPendingPoliciesCount(): number {
    return this.policies.filter(p => ['PENDING', 'DRAFT', 'SUBMITTED'].includes(p.status)).length;
  }
}
