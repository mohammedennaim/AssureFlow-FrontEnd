import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Invoice } from '../../../core/application/services/admin-billing.service';
import { catchError, of } from 'rxjs';
import { INVOICE_REPOSITORY } from '../../../core/domain/ports/invoice.repository.port';
import { AvatarColorPipe } from '../../../shared/pipes/avatar-color.pipe';
import { StatusClassPipe } from '../../../shared/pipes/status-class.pipe';
import { FormatCurrencyPipe } from '../../../shared/pipes/format-currency.pipe';

@Component({
  selector: 'app-client-billing',
  standalone: true,
  imports: [CommonModule, AvatarColorPipe, StatusClassPipe, FormatCurrencyPipe],
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
    this.clientDashboardService['getCurrentClientId']().subscribe({
      next: (clientId) => {
        if (!clientId) { this.loading = false; return; }
        this.invoiceRepository.getByClientId(clientId).pipe(
          catchError(() => { this.loading = false; return of([]); })
        ).subscribe((invoices) => { this.invoices = invoices; this.loading = false; });
      },
      error: () => { this.loading = false; }
    });
  }

  getFilteredInvoices(): Invoice[] {
    if (this.filter === 'all') return this.invoices;
    return this.invoices.filter(i => i.status.toUpperCase() === this.filter.toUpperCase());
  }

  formatDate(dateString: string | Date): string {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getTotalPaid(): number {
    return this.invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  getTotalPending(): number {
    return this.invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  getTotalOverdue(): number {
    return this.invoices.filter(i => i.overDue).reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  getNextPayment(): { amount: number; dueDate: string; policyName: string } | null {
    const pending = this.invoices
      .filter(i => i.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (pending.length === 0) return null;
    return { amount: pending[0].amount, dueDate: pending[0].dueDate, policyName: `Invoice ${pending[0].invoiceNumber}` };
  }

  getPaidInvoicesCount(): number {
    return this.invoices.filter(i => i.status === 'PAID').length;
  }
}
