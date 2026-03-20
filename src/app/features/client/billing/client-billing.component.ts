import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Invoice } from '../../../core/application/services/admin-billing.service';
import { catchError, of } from 'rxjs';
import { INVOICE_REPOSITORY } from '../../../core/domain/ports/invoice.repository.port';

@Component({
  selector: 'app-client-billing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-billing.component.html',
  styleUrl: './client-billing.component.scss'
})
export class ClientBillingComponent implements OnInit {
  loading = true;
  invoices: Invoice[] = [];
  filter: 'all' | 'paid' | 'pending' | 'overdue' = 'all';

  private invoiceRepository = inject(INVOICE_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);

  ngOnInit(): void {
    this.loadBilling();
  }

  loadBilling(): void {
    this.loading = true;
    
    // Get current user's client ID first
    this.clientDashboardService['getCurrentClientId']().subscribe({
      next: (clientId) => {
        if (!clientId) {
          console.warn('[ClientBilling] No clientId found');
          this.loading = false;
          return;
        }

        console.log('[ClientBilling] Loading invoices for clientId:', clientId);
        
        this.invoiceRepository.getByClientId(clientId).pipe(
          catchError((err) => {
            console.error('[ClientBilling] Error loading invoices:', err);
            this.loading = false;
            return of([]);
          })
        ).subscribe((invoices) => {
          console.log('[ClientBilling] Loaded invoices:', invoices);
          this.invoices = invoices;
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('[ClientBilling] Error getting clientId:', err);
        this.loading = false;
      }
    });
  }

  getFilteredInvoices(): Invoice[] {
    if (this.filter === 'all') {
      return this.invoices;
    }
    return this.invoices.filter(i => i.status.toUpperCase() === this.filter.toUpperCase());
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      PAID: 'status--paid',
      PENDING: 'status--pending',
      ACTIVE: 'status--active',
      DRAFT: 'status--draft',
      EXPIRED: 'status--expired',
      CANCELLED: 'status--rejected',
      SUBMITTED: 'status--submitted'
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
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
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

  getTotalPaid(): number {
    return this.invoices
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  getTotalPending(): number {
    return this.invoices
      .filter(i => i.status === 'PENDING')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  getTotalOverdue(): number {
    return this.invoices
      .filter(i => i.overDue)
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  getNextPayment(): { amount: number; dueDate: string; policyName: string } | null {
    const pending = this.invoices
      .filter(i => i.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    if (pending.length > 0) {
      const invoice = pending[0];
      return {
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        policyName: `Invoice ${invoice.invoiceNumber}`
      };
    }
    return null;
  }

  getPaidInvoicesCount(): number {
    return this.invoices.filter(i => i.status === 'PAID').length;
  }
}
