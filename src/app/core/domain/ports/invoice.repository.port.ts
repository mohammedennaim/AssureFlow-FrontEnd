import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'SUBMITTED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  policyId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  generatedBy?: string;
  paidDirect: boolean;
  overDue: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvoiceData {
  policyId: string;
  clientId: string;
  amount: number;
  taxAmount?: number;
  dueDate: string;
  generatedBy?: string;
}

export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHECK';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  processedBy?: string;
}

export interface CreatePaymentData {
  invoiceId: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  processedBy?: string;
}

export interface IInvoiceRepository {
  getAll(page?: number, size?: number): Observable<Invoice[]>;
  getById(id: string): Observable<Invoice>;
  getByNumber(invoiceNumber: string): Observable<Invoice>;
  getByClientId(clientId: string): Observable<Invoice[]>;
  getByPolicyId(policyId: string): Observable<Invoice[]>;
  create(data: CreateInvoiceData): Observable<Invoice>;
  cancel(id: string): Observable<void>;
  markAsPaid(invoiceId: string, paymentId: string): Observable<void>;
  delete(id: string): Observable<void>;
}

export interface IPaymentRepository {
  getAll(): Observable<Payment[]>;
  getById(id: string): Observable<Payment>;
  getByInvoiceId(invoiceId: string): Observable<Payment[]>;
  getByClientId(clientId: string): Observable<Payment[]>;
  create(data: CreatePaymentData): Observable<Payment>;
  delete(id: string): Observable<void>;
}

export const INVOICE_REPOSITORY = new InjectionToken<IInvoiceRepository>('IInvoiceRepository');
export const PAYMENT_REPOSITORY = new InjectionToken<IPaymentRepository>('IPaymentRepository');
