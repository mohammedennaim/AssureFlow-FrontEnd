import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  policyId: string;
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
  overDue?: boolean;
  paidDirect?: boolean;
}

export interface CreateInvoiceData {
  clientId: string;
  policyId: string;
  amount: number;
  dueDate: string;
}

export interface IInvoiceRepository {
  getAll(page?: number, size?: number): Observable<Invoice[]>;
  getById(id: string): Observable<Invoice>;
  getByNumber(invoiceNumber: string): Observable<Invoice>;
  getByClientId(clientId: string): Observable<Invoice[]>;
  getByPolicyId(policyId: string): Observable<Invoice[]>;
  create(data: CreateInvoiceData): Observable<Invoice>;
  cancel(id: string): Observable<void>;
  markAsPaid(id: string, paymentId: string): Observable<void>;
  delete(id: string): Observable<void>;
}

export const INVOICE_REPOSITORY = new InjectionToken<IInvoiceRepository>('IInvoiceRepository');
