import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  INVOICE_REPOSITORY, 
  PAYMENT_REPOSITORY,
  IInvoiceRepository,
  IPaymentRepository,
  CreateInvoiceData,
  CreatePaymentData,
  Invoice,
  Payment
} from '../../domain/ports/invoice.repository.port';

export type { Invoice, Payment };

@Injectable({ providedIn: 'root' })
export class BillingService {
  private invoiceRepository = inject(INVOICE_REPOSITORY);
  private paymentRepository = inject(PAYMENT_REPOSITORY);

  // Invoice methods
  getAllInvoices(page: number = 0, size: number = 20): Observable<Invoice[]> {
    return this.invoiceRepository.getAll(page, size);
  }

  getInvoiceById(id: string): Observable<Invoice> {
    return this.invoiceRepository.getById(id);
  }

  getInvoiceByNumber(invoiceNumber: string): Observable<Invoice> {
    return this.invoiceRepository.getByNumber(invoiceNumber);
  }

  getInvoicesByClientId(clientId: string): Observable<Invoice[]> {
    return this.invoiceRepository.getByClientId(clientId);
  }

  getInvoicesByPolicyId(policyId: string): Observable<Invoice[]> {
    return this.invoiceRepository.getByPolicyId(policyId);
  }

  createInvoice(data: CreateInvoiceData): Observable<Invoice> {
    return this.invoiceRepository.create(data);
  }

  cancelInvoice(id: string): Observable<void> {
    return this.invoiceRepository.cancel(id);
  }

  markInvoiceAsPaid(invoiceId: string, paymentId: string): Observable<void> {
    return this.invoiceRepository.markAsPaid(invoiceId, paymentId);
  }

  deleteInvoice(id: string): Observable<void> {
    return this.invoiceRepository.delete(id);
  }

  // Payment methods
  getAllPayments(): Observable<Payment[]> {
    return this.paymentRepository.getAll();
  }

  getPaymentById(id: string): Observable<Payment> {
    return this.paymentRepository.getById(id);
  }

  getPaymentsByInvoiceId(invoiceId: string): Observable<Payment[]> {
    return this.paymentRepository.getByInvoiceId(invoiceId);
  }

  getPaymentsByClientId(clientId: string): Observable<Payment[]> {
    return this.paymentRepository.getByClientId(clientId);
  }

  createPayment(data: CreatePaymentData): Observable<Payment> {
    return this.paymentRepository.create(data);
  }

  deletePayment(id: string): Observable<void> {
    return this.paymentRepository.delete(id);
  }

  // Legacy methods for backward compatibility
  getAll(page: number = 0, size: number = 20): Observable<Invoice[]> {
    return this.getAllInvoices(page, size);
  }

  getById(id: string): Observable<Invoice> {
    return this.getInvoiceById(id);
  }

  getByNumber(invoiceNumber: string): Observable<Invoice> {
    return this.getInvoiceByNumber(invoiceNumber);
  }

  getByClientId(clientId: string): Observable<Invoice[]> {
    return this.getInvoicesByClientId(clientId);
  }

  getByPolicyId(policyId: string): Observable<Invoice[]> {
    return this.getInvoicesByPolicyId(policyId);
  }

  create(data: CreateInvoiceData): Observable<Invoice> {
    return this.createInvoice(data);
  }

  cancel(id: string): Observable<void> {
    return this.cancelInvoice(id);
  }

  markAsPaid(id: string, paymentId: string): Observable<void> {
    return this.markInvoiceAsPaid(id, paymentId);
  }

  delete(id: string): Observable<void> {
    return this.deleteInvoice(id);
  }
}
