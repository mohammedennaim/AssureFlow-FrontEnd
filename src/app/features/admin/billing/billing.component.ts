import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillingService, Invoice, Payment } from '../../../core/application/services/admin-billing.service';
import { AdminStatisticsService, BillingStats } from '../../../core/application/services/admin-statistics.service';
import { PoliciesService, Policy } from '../../../core/application/services/admin-policies.service';
import { ClientsService, Client } from '../../../core/application/services/admin-clients.service';
import { CreateInvoiceData, CreatePaymentData, PaymentMethod } from '../../../core/domain/ports/invoice.repository.port';
import { catchError, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent implements OnInit {
  private billingService = inject(BillingService);
  private adminStatsService = inject(AdminStatisticsService);
  private policiesService = inject(PoliciesService);
  private clientsService = inject(ClientsService);

  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  payments: Payment[] = [];
  policies: Policy[] = [];
  clients: Client[] = [];
  isLoading = true;
  error: string | null = null;
  billingStats: BillingStats | null = null;

  // Search and Filter
  searchTerm: string = '';
  filterStatus: string = 'ALL';
  filterOverdue: string = 'ALL';
  statusOptions: string[] = ['ALL', 'DRAFT', 'PENDING', 'ACTIVE', 'PAID', 'EXPIRED', 'CANCELLED', 'SUBMITTED'];

  // Modal states
  showCreateInvoiceModal = false;
  showViewInvoiceModal = false;
  showCreatePaymentModal = false;
  showViewPaymentsModal = false;
  showEditInvoiceModal = false;
  selectedInvoice: Invoice | null = null;
  selectedInvoicePayments: Payment[] = [];

  // Notification state
  notification: { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null = null;

  // Form data
  newInvoice: CreateInvoiceData = {
    policyId: '',
    clientId: '',
    amount: 0,
    taxAmount: 0,
    dueDate: '',
  };

  editInvoice: CreateInvoiceData = {
    policyId: '',
    clientId: '',
    amount: 0,
    taxAmount: 0,
    dueDate: '',
  };

  newPayment: CreatePaymentData = {
    invoiceId: '',
    clientId: '',
    amount: 0,
    method: 'CREDIT_CARD',
    transactionId: '',
  };

  paymentMethods: PaymentMethod[] = ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'CHECK'];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    console.log('[Billing] Loading data...');

    forkJoin({
      invoices: this.billingService.getAllInvoices().pipe(
        catchError((err) => {
          console.error('[Billing] Error loading invoices:', err);
          return of([]);
        })
      ),
      payments: this.billingService.getAllPayments().pipe(
        catchError((err) => {
          console.error('[Billing] Error loading payments:', err);
          return of([]);
        })
      ),
      stats: this.adminStatsService.getBillingStats().pipe(
        catchError((err) => {
          console.error('[Billing] Error loading stats:', err);
          return of(null);
        })
      ),
      policies: this.policiesService.getAll().pipe(
        catchError((err) => {
          console.error('[Billing] Error loading policies:', err);
          return of([]);
        })
      ),
      clients: this.clientsService.getAll(0, 100).pipe(
        catchError((err) => {
          console.error('[Billing] Error loading clients:', err);
          return of([]);
        })
      )
    }).subscribe({
      next: ({ invoices, payments, stats, policies, clients }) => {
        this.invoices = invoices;
        this.filteredInvoices = invoices;
        this.payments = payments;
        this.billingStats = stats;
        this.policies = policies;
        this.clients = clients;
        this.isLoading = false;
        
        console.log('[Billing] Data loaded successfully:', {
          invoices: invoices.length,
          payments: payments.length,
          policies: policies.length,
          clients: clients.length,
          stats
        });

        // Apply filters after loading
        this.applyFilters();

        // Vérifier si les listes sont vides
        if (policies.length === 0) {
          console.warn('[Billing] No policies found. Please create policies first.');
        }
        if (clients.length === 0) {
          console.warn('[Billing] No clients found. Please create clients first.');
        }
      },
      error: (err) => {
        this.error = 'Failed to load billing data';
        console.error('[Billing] Error loading data:', err);
        this.isLoading = false;
      }
    });
  }

  // Invoice actions
  openCreateInvoiceModal(): void {
    this.newInvoice = {
      policyId: '',
      clientId: '',
      amount: 0,
      taxAmount: 0,
      dueDate: '',
    };
    this.showCreateInvoiceModal = true;
  }

  openViewInvoiceModal(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.showViewInvoiceModal = true;
    
    // Load payments for this invoice
    this.billingService.getPaymentsByInvoiceId(invoice.id).subscribe({
      next: (payments) => {
        this.selectedInvoicePayments = payments;
      },
      error: (err) => console.error('[Billing] Error loading invoice payments:', err)
    });
  }

  openEditInvoiceModal(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.editInvoice = {
      policyId: invoice.policyId,
      clientId: invoice.clientId,
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      dueDate: invoice.dueDate,
    };
    this.showEditInvoiceModal = true;
  }

  createInvoice(): void {
    if (!this.newInvoice.policyId || !this.newInvoice.clientId || !this.newInvoice.amount || !this.newInvoice.dueDate) {
      this.showNotification('Please fill all required fields', 'warning');
      return;
    }

    this.billingService.createInvoice(this.newInvoice).subscribe({
      next: (invoice) => {
        console.log('[Billing] Invoice created:', invoice);
        this.closeModals();
        this.loadData();
        this.showNotification('Invoice created successfully!', 'success');
      },
      error: (err) => {
        console.error('[Billing] Error creating invoice:', err);
        const errorMsg = err?.error?.message || err?.message || 'Failed to create invoice';
        this.showNotification(errorMsg, 'error');
      }
    });
  }

  cancelInvoice(id: string): void {
    this.billingService.cancelInvoice(id).subscribe({
      next: () => {
        console.log('[Billing] Invoice cancelled');
        this.loadData();
        this.showNotification('Invoice cancelled successfully!', 'success');
      },
      error: (err) => {
        console.error('[Billing] Error cancelling invoice:', err);
        const errorMsg = err?.error?.message || err?.message || 'Failed to cancel invoice';
        this.showNotification(errorMsg, 'error');
      }
    });
  }

  deleteInvoice(id: string): void {
    this.billingService.deleteInvoice(id).subscribe({
      next: () => {
        console.log('[Billing] Invoice deleted');
        this.invoices = this.invoices.filter(i => i.id !== id);
        this.filteredInvoices = this.filteredInvoices.filter(i => i.id !== id);
        this.showNotification('Invoice deleted successfully!', 'success');
      },
      error: (err) => {
        console.error('[Billing] Error deleting invoice:', err);
        const errorMsg = err?.error?.message || err?.message || 'Failed to delete invoice';
        this.showNotification(errorMsg, 'error');
      }
    });
  }

  // Payment actions
  openCreatePaymentModal(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.newPayment = {
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: invoice.totalAmount,
      method: 'CREDIT_CARD',
      transactionId: '',
    };
    this.showCreatePaymentModal = true;
  }

  createPayment(): void {
    if (!this.newPayment.invoiceId || !this.newPayment.clientId || !this.newPayment.amount) {
      this.showNotification('Please fill all required fields', 'warning');
      return;
    }

    this.billingService.createPayment(this.newPayment).subscribe({
      next: (payment) => {
        console.log('[Billing] Payment created:', payment);
        
        // Mark invoice as paid
        if (this.selectedInvoice) {
          this.billingService.markInvoiceAsPaid(this.selectedInvoice.id, payment.id).subscribe({
            next: () => {
              console.log('[Billing] Invoice marked as paid');
              this.closeModals();
              this.loadData();
              this.showNotification('Payment created and invoice marked as paid!', 'success');
            },
            error: (err) => {
              console.error('[Billing] Error marking invoice as paid:', err);
              this.closeModals();
              this.loadData();
              this.showNotification('Payment created but failed to mark invoice as paid', 'warning');
            }
          });
        }
      },
      error: (err) => {
        console.error('[Billing] Error creating payment:', err);
        const errorMsg = err?.error?.message || err?.message || 'Failed to create payment';
        this.showNotification(errorMsg, 'error');
      }
    });
  }

  viewPayments(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.billingService.getPaymentsByInvoiceId(invoice.id).subscribe({
      next: (payments) => {
        this.selectedInvoicePayments = payments;
        this.showViewPaymentsModal = true;
      },
      error: (err) => {
        console.error('[Billing] Error loading payments:', err);
        this.showNotification('Failed to load payments', 'error');
      }
    });
  }

  closeModals(): void {
    this.showCreateInvoiceModal = false;
    this.showViewInvoiceModal = false;
    this.showCreatePaymentModal = false;
    this.showViewPaymentsModal = false;
    this.showEditInvoiceModal = false;
    this.selectedInvoice = null;
    this.selectedInvoicePayments = [];
  }

  // Helper methods for selects
  onPolicyChange(): void {
    const selectedPolicy = this.policies.find(p => p.id === this.newInvoice.policyId);
    if (selectedPolicy) {
      this.newInvoice.clientId = selectedPolicy.clientId;
      // Auto-fill amount from policy premium if available
      if (selectedPolicy.premium) {
        this.newInvoice.amount = selectedPolicy.premium;
        this.newInvoice.taxAmount = selectedPolicy.premium * 0.2; // 20% tax
      }
    }
  }

  getClientName(clientId: string): string {
    const client = this.clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : clientId.substring(0, 8);
  }

  getPolicyNumber(policyId: string): string {
    const policy = this.policies.find(p => p.id === policyId);
    return policy?.policyNumber || policyId.substring(0, 8);
  }

  // Utility methods
  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

  toLowerCase(value: string): string {
    return value.toLowerCase();
  }

  trackByInvoiceId(index: number, invoice: Invoice): string {
    return invoice.id;
  }

  trackByPaymentId(index: number, payment: Payment): string {
    return payment.id;
  }

  trackByPolicyId(index: number, policy: Policy): string {
    return policy.id;
  }

  trackByClientId(index: number, client: Client): string {
    return client.id;
  }

  calculateTotalAmount(): number {
    const amount = this.newInvoice.amount || 0;
    const taxAmount = this.newInvoice.taxAmount || 0;
    return amount + taxAmount;
  }

  formatPaymentMethod(method: string): string {
    return method.replace('_', ' ');
  }

  // Search and Filter methods
  applyFilters(): void {
    let filtered = [...this.invoices];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => {
        const clientName = this.getClientName(invoice.clientId).toLowerCase();
        const policyNumber = this.getPolicyNumber(invoice.policyId).toLowerCase();
        const invoiceNumber = (invoice.invoiceNumber || '').toLowerCase();
        
        return clientName.includes(term) || 
               policyNumber.includes(term) || 
               invoiceNumber.includes(term) ||
               invoice.id.toLowerCase().includes(term);
      });
    }

    // Apply status filter
    if (this.filterStatus !== 'ALL') {
      filtered = filtered.filter(invoice => invoice.status === this.filterStatus);
    }

    // Apply overdue filter
    if (this.filterOverdue === 'OVERDUE') {
      filtered = filtered.filter(invoice => invoice.overDue);
    } else if (this.filterOverdue === 'NOT_OVERDUE') {
      filtered = filtered.filter(invoice => !invoice.overDue);
    }

    this.filteredInvoices = filtered;
    console.log('[Billing] Filters applied:', {
      total: this.invoices.length,
      filtered: filtered.length,
      searchTerm: this.searchTerm,
      filterStatus: this.filterStatus,
      filterOverdue: this.filterOverdue
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'ALL';
    this.filterOverdue = 'ALL';
    this.applyFilters();
  }

  // Export methods
  exportToPDF(): void {
    if (this.filteredInvoices.length === 0) {
      this.showNotification('No invoices to export', 'warning');
      return;
    }

    // Create a simple HTML table for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showNotification('Please allow popups to export PDF', 'warning');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoices Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; text-align: center; }
          .meta { text-align: center; color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #4CAF50; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; }
          .status-paid { background: #d4edda; color: #155724; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-overdue { background: #f8d7da; color: #721c24; }
          .overdue { color: #dc3545; font-weight: bold; }
          .total { font-weight: bold; margin-top: 20px; text-align: right; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Invoices Report</h1>
        <div class="meta">
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Invoices: ${this.filteredInvoices.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Policy</th>
              <th>Amount</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredInvoices.map(invoice => `
              <tr>
                <td>${invoice.invoiceNumber || invoice.id.substring(0, 8)}</td>
                <td>${this.getClientName(invoice.clientId)}</td>
                <td>${this.getPolicyNumber(invoice.policyId)}</td>
                <td>€${invoice.amount.toFixed(2)}</td>
                <td>€${invoice.taxAmount.toFixed(2)}</td>
                <td>€${invoice.totalAmount.toFixed(2)}</td>
                <td class="${invoice.overDue ? 'overdue' : ''}">${new Date(invoice.dueDate).toLocaleDateString()}</td>
                <td><span class="status status-${invoice.status.toLowerCase()}">${invoice.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          <p>Total Amount: €${this.filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print / Save as PDF</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    console.log('[Billing] Opened PDF export window with', this.filteredInvoices.length, 'invoices');
  }

  printInvoice(invoice: Invoice): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showNotification('Please allow popups to print invoice', 'warning');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #4CAF50; padding-bottom: 20px; }
          .header h1 { color: #4CAF50; margin: 0; }
          .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-block { background: #f9f9f9; padding: 15px; border-radius: 8px; }
          .info-block h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
          .info-block p { margin: 5px 0; font-size: 13px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .items-table th { background: #4CAF50; color: white; }
          .totals { text-align: right; margin-top: 20px; }
          .totals p { margin: 8px 0; font-size: 14px; }
          .totals .grand-total { font-size: 18px; font-weight: bold; color: #4CAF50; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; }
          .status-paid { background: #d4edda; color: #155724; }
          .status-pending { background: #fff3cd; color: #856404; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p style="margin: 10px 0 0 0; color: #666;">Invoice #${invoice.invoiceNumber}</p>
        </div>
        
        <div class="invoice-info">
          <div class="info-block">
            <h3>Bill To:</h3>
            <p><strong>${this.getClientName(invoice.clientId)}</strong></p>
            <p>Client ID: ${invoice.clientId.substring(0, 8)}</p>
          </div>
          <div class="info-block">
            <h3>Invoice Details:</h3>
            <p><strong>Date:</strong> ${new Date(invoice.createdAt || '').toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span></p>
            <p><strong>Policy:</strong> ${this.getPolicyNumber(invoice.policyId)}</p>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Insurance Premium - Policy ${this.getPolicyNumber(invoice.policyId)}</td>
              <td style="text-align: right;">€${invoice.amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Tax (20%)</td>
              <td style="text-align: right;">€${invoice.taxAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <p>Subtotal: €${invoice.amount.toFixed(2)}</p>
          <p>Tax: €${invoice.taxAmount.toFixed(2)}</p>
          <p class="grand-total">Total: €${invoice.totalAmount.toFixed(2)}</p>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>AssureFlow Insurance Services</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print Invoice</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    console.log('[Billing] Opened print window for invoice:', invoice.invoiceNumber);
  }

  // Notification methods
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.notification = { message, type };
    setTimeout(() => {
      this.notification = null;
    }, 5000);
  }

  closeNotification(): void {
    this.notification = null;
  }

  // Confirmation modals
  showDeleteConfirmModal = false;
  showCancelConfirmModal = false;
  pendingActionInvoiceId: string | null = null;

  confirmDelete(id: string): void {
    this.pendingActionInvoiceId = id;
    this.showDeleteConfirmModal = true;
  }

  confirmCancel(id: string): void {
    this.pendingActionInvoiceId = id;
    this.showCancelConfirmModal = true;
  }

  executeDelete(): void {
    if (this.pendingActionInvoiceId) {
      this.deleteInvoice(this.pendingActionInvoiceId);
    }
    this.showDeleteConfirmModal = false;
    this.pendingActionInvoiceId = null;
  }

  executeCancel(): void {
    if (this.pendingActionInvoiceId) {
      this.cancelInvoice(this.pendingActionInvoiceId);
    }
    this.showCancelConfirmModal = false;
    this.pendingActionInvoiceId = null;
  }

  cancelAction(): void {
    this.showDeleteConfirmModal = false;
    this.showCancelConfirmModal = false;
    this.pendingActionInvoiceId = null;
  }
}
