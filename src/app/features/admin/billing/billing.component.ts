import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService, Invoice } from '../../../core/application/services/admin-billing.service';
import { AdminStatisticsService, BillingStats } from '../../../core/application/services/admin-statistics.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent implements OnInit {
  private billingService = inject(BillingService);
  private adminStatsService = inject(AdminStatisticsService);

  invoices: Invoice[] = [];
  isLoading = true;
  error: string | null = null;
  billingStats: BillingStats | null = null;

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading = true;
    this.error = null;

    this.billingService.getAll().pipe(
      catchError((err) => {
        this.error = 'Failed to load invoices';
        console.error('Error fetching invoices:', err);
        return of([]);
      })
    ).subscribe((data) => {
      this.invoices = data;

      // Calcule les statistiques réelles
      this.adminStatsService.getBillingStats().subscribe((stats) => {
        this.billingStats = stats;
      });

      this.isLoading = false;
    });
  }

  get stats() {
    if (this.billingStats) {
      return {
        total: this.billingStats.paidRevenue,
        pending: this.billingStats.pendingRevenue,
        overdue: this.billingStats.overdueRevenue,
        collectionRate: this.billingStats.collectionRate.toFixed(1)
      };
    }

    const total = this.invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
    const pending = this.invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0);
    const overdue = this.invoices.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0);
    const totalAmount = this.invoices.reduce((sum, i) => sum + i.amount, 0);
    const collectionRate = totalAmount > 0 ? (total / totalAmount) * 100 : 0;

    return {
      total,
      pending,
      overdue,
      collectionRate: collectionRate.toFixed(1)
    };
  }

  toLowerCase(value: string): string {
    return value.toLowerCase();
  }

  trackByInvoiceId(index: number, invoice: Invoice): string {
    return invoice.id;
  }
}
