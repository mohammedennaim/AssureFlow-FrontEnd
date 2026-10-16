import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, of } from 'rxjs';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Invoice } from '../../../core/application/services/admin-billing.service';
import { INVOICE_REPOSITORY } from '../../../core/domain/ports/invoice.repository.port';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import { daysUntil, formatDateFr, formatMad, statusMeta, StatusMeta } from '../../../shared/utils/client-ui';

type InvoiceFilter = 'all' | 'due' | 'overdue' | 'paid';

const SETTLED_STATUSES = ['PAID', 'CANCELLED', 'EXPIRED'];

@Component({
  selector: 'app-client-billing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './client-billing.component.html',
  styleUrl: './client-billing.component.scss'
})
export class ClientBillingComponent implements OnInit {
  readonly icons = AF_ICONS;
  readonly filters: { key: InvoiceFilter; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'due', label: 'À régler' },
    { key: 'overdue', label: 'En retard' },
    { key: 'paid', label: 'Payées' }
  ];

  loading = true;
  errorMessage = '';
  invoices: Invoice[] = [];
  filter: InvoiceFilter = 'all';
  search = '';

  payTarget: Invoice | null = null;
  copied = false;

  @ViewChild('payPanel') set payPanel(panel: ElementRef<HTMLElement> | undefined) {
    panel?.nativeElement.focus();
  }

  private invoiceRepository = inject(INVOICE_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);
  private lastFocused: HTMLElement | null = null;

  ngOnInit(): void {
    this.loadBilling();
  }

  loadBilling(): void {
    this.loading = true;
    this.errorMessage = '';
    this.clientDashboardService['getCurrentClientId']().subscribe({
      next: (clientId) => {
        if (!clientId) { this.loading = false; return; }
        this.invoiceRepository.getByClientId(clientId).pipe(
          catchError(() => {
            this.errorMessage = 'Impossible de charger vos factures pour le moment.';
            return of([] as Invoice[]);
          })
        ).subscribe((invoices) => { this.invoices = invoices; this.loading = false; });
      },
      error: () => {
        this.errorMessage = 'Impossible d’identifier votre compte client.';
        this.loading = false;
      }
    });
  }

  get filteredInvoices(): Invoice[] {
    const term = this.search.trim().toLowerCase();
    return this.invoices
      .filter(i => this.matches(i, this.filter))
      .filter(i => !term || [i.invoiceNumber, i.policyId, this.status(i).label, String(this.total(i))]
        .some(value => (value || '').toLowerCase().includes(term)))
      .sort((a, b) => {
        const aDue = this.isUnpaid(a);
        const bDue = this.isUnpaid(b);
        if (aDue !== bDue) return aDue ? -1 : 1;
        return aDue ? this.sortKey(a) - this.sortKey(b) : this.sortKey(b) - this.sortKey(a);
      });
  }

  count(filter: InvoiceFilter): number {
    return this.invoices.filter(i => this.matches(i, filter)).length;
  }

  get dueTotal(): number {
    return this.invoices.filter(i => this.isUnpaid(i)).reduce((sum, i) => sum + this.total(i), 0);
  }

  get overdueCount(): number {
    return this.count('overdue');
  }

  get paidThisYear(): number {
    const year = new Date().getFullYear();
    return this.invoices
      .filter(i => i.status === 'PAID' && new Date(i.updatedAt || i.createdAt || i.dueDate).getFullYear() === year)
      .reduce((sum, i) => sum + this.total(i), 0);
  }

  get paidTotal(): number {
    return this.invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + this.total(i), 0);
  }

  get nextInvoice(): Invoice | null {
    const unpaid = this.invoices
      .filter(i => this.isUnpaid(i))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return unpaid[0] ?? null;
  }

  isUnpaid(invoice: Invoice): boolean {
    const status = (invoice.status || '').toUpperCase();
    return !SETTLED_STATUSES.includes(status) && status !== 'DRAFT';
  }

  isOverdue(invoice: Invoice): boolean {
    if (!this.isUnpaid(invoice)) return false;
    const days = daysUntil(invoice.dueDate);
    return invoice.overDue || (days !== null && days < 0);
  }

  status(invoice: Invoice): StatusMeta {
    if (this.isOverdue(invoice)) return statusMeta('OVERDUE');
    if (this.isUnpaid(invoice)) return statusMeta('UNPAID');
    return statusMeta(invoice.status);
  }

  total(invoice: Invoice): number {
    return invoice.totalAmount || invoice.amount || 0;
  }

  dueLabel(invoice: Invoice): string {
    const days = daysUntil(invoice.dueDate);
    if (days === null) return 'Échéance non définie';
    if (days < 0) return `En retard de ${-days} jour${days < -1 ? 's' : ''}`;
    if (days === 0) return 'À régler aujourd’hui';
    if (days === 1) return 'À régler demain';
    return `À régler dans ${days} jours`;
  }

  amount(value: number | null | undefined): string {
    return formatMad(value);
  }

  date(value: string | Date | null | undefined): string {
    return formatDateFr(value);
  }

  resetFilters(): void {
    this.filter = 'all';
    this.search = '';
  }

  openPay(invoice: Invoice): void {
    this.lastFocused = document.activeElement as HTMLElement | null;
    this.payTarget = invoice;
    this.copied = false;
  }

  closePay(): void {
    this.payTarget = null;
    this.lastFocused?.focus();
    this.lastFocused = null;
  }

  copyReference(reference: string): void {
    navigator.clipboard?.writeText(reference).then(() => { this.copied = true; }).catch(() => { this.copied = false; });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.payTarget) this.closePay();
  }

  private matches(invoice: Invoice, filter: InvoiceFilter): boolean {
    switch (filter) {
      case 'due': return this.isUnpaid(invoice);
      case 'overdue': return this.isOverdue(invoice);
      case 'paid': return invoice.status === 'PAID';
      default: return true;
    }
  }

  private sortKey(invoice: Invoice): number {
    const time = new Date(invoice.dueDate || invoice.createdAt || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
}
