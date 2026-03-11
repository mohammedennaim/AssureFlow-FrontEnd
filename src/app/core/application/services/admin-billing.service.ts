import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { INVOICE_REPOSITORY, IInvoiceRepository, CreateInvoiceData } from '../../domain/ports/invoice.repository.port';
import { Invoice } from '../../domain/ports/invoice.repository.port';

export type { Invoice };

@Injectable({ providedIn: 'root' })
export class BillingService {
  private invoiceRepository = inject(INVOICE_REPOSITORY);

  getAll(page: number = 0, size: number = 20): Observable<Invoice[]> {
    return this.invoiceRepository.getAll(page, size);
  }

  getById(id: string): Observable<Invoice> {
    return this.invoiceRepository.getById(id);
  }

  getByNumber(invoiceNumber: string): Observable<Invoice> {
    return this.invoiceRepository.getByNumber(invoiceNumber);
  }

  getByClientId(clientId: string): Observable<Invoice[]> {
    return this.invoiceRepository.getByClientId(clientId);
  }

  getByPolicyId(policyId: string): Observable<Invoice[]> {
    return this.invoiceRepository.getByPolicyId(policyId);
  }

  create(data: CreateInvoiceData): Observable<Invoice> {
    return this.invoiceRepository.create(data);
  }

  cancel(id: string): Observable<void> {
    return this.invoiceRepository.cancel(id);
  }

  markAsPaid(id: string, paymentId: string): Observable<void> {
    return this.invoiceRepository.markAsPaid(id, paymentId);
  }

  delete(id: string): Observable<void> {
    return this.invoiceRepository.delete(id);
  }
}
