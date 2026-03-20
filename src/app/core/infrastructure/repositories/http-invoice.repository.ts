import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  IInvoiceRepository, 
  IPaymentRepository,
  CreateInvoiceData, 
  CreatePaymentData,
  Invoice,
  Payment,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus
} from '../../domain/ports/invoice.repository.port';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpInvoiceRepository implements IInvoiceRepository {
  private readonly apiUrl = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 20): Observable<Invoice[]> {
    return this.http.get<any>(this.apiUrl, {
      params: { page: page.toString(), size: size.toString() }
    }).pipe(
      map((res) => {
        console.log('[InvoiceRepository] getAll raw response:', res);
        
        let data: InvoiceDto[] = [];
        
        // Handle paginated response with content
        if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.data?.content && Array.isArray(res.data.content)) {
          data = res.data.content;
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res)) {
          data = res;
        }
        
        console.log('[InvoiceRepository] extracted data:', data);
        return data.map(this.mapToInvoice);
      }),
      catchError((err) => {
        console.error('[InvoiceRepository] getAll error:', err);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<Invoice> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        console.log('[InvoiceRepository] getById raw response:', res);
        const dto = res?.data || res;
        return this.mapToInvoice(dto as InvoiceDto);
      }),
      catchError(() => of({} as Invoice))
    );
  }

  getByNumber(invoiceNumber: string): Observable<Invoice> {
    return this.http.get<any>(`${this.apiUrl}/number/${invoiceNumber}`).pipe(
      map((res) => {
        const dto = res?.data || res;
        return this.mapToInvoice(dto as InvoiceDto);
      }),
      catchError(() => of({} as Invoice))
    );
  }

  getByClientId(clientId: string): Observable<Invoice[]> {
    return this.http.get<any>(`${this.apiUrl}/client/${clientId}`).pipe(
      map((res) => {
        console.log('[InvoiceRepository] getByClientId raw response:', res);
        const data: InvoiceDto[] = res?.data || res || [];
        console.log('[InvoiceRepository] getByClientId extracted data:', data);
        return data.map(this.mapToInvoice);
      }),
      catchError((err) => {
        console.error('[InvoiceRepository] getByClientId error:', err);
        return of([]);
      })
    );
  }

  getByPolicyId(policyId: string): Observable<Invoice[]> {
    return this.http.get<any>(`${this.apiUrl}/policy/${policyId}`).pipe(
      map((res) => {
        console.log('[InvoiceRepository] getByPolicyId raw response:', res);
        const data: InvoiceDto[] = res?.data || res || [];
        return data.map(this.mapToInvoice);
      }),
      catchError(() => of([]))
    );
  }

  create(data: CreateInvoiceData): Observable<Invoice> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        const dto = res?.data || res;
        return this.mapToInvoice(dto as InvoiceDto);
      })
    );
  }

  cancel(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/cancel`, {});
  }

  markAsPaid(invoiceId: string, paymentId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${invoiceId}/pay/${paymentId}`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private mapToInvoice(dto: InvoiceDto): Invoice {
    return {
      id: dto.id,
      invoiceNumber: dto.invoiceNumber,
      clientId: dto.clientId,
      policyId: dto.policyId,
      amount: dto.amount || 0,
      taxAmount: dto.taxAmount || 0,
      totalAmount: dto.totalAmount || 0,
      status: dto.status as InvoiceStatus,
      dueDate: dto.dueDate,
      generatedBy: dto.generatedBy,
      paidDirect: dto.paidDirect || false,
      overDue: dto.overDue || false,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class HttpPaymentRepository implements IPaymentRepository {
  private readonly apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Payment[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => {
        console.log('[PaymentRepository] getAll raw response:', res);
        const data: PaymentDto[] = res?.data || res || [];
        return data.map(this.mapToPayment);
      }),
      catchError((err) => {
        console.error('[PaymentRepository] getAll error:', err);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<Payment> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        const dto = res?.data || res;
        return this.mapToPayment(dto as PaymentDto);
      }),
      catchError(() => of({} as Payment))
    );
  }

  getByInvoiceId(invoiceId: string): Observable<Payment[]> {
    return this.http.get<any>(`${this.apiUrl}/invoice/${invoiceId}`).pipe(
      map((res) => {
        const data: PaymentDto[] = res?.data || res || [];
        return data.map(this.mapToPayment);
      }),
      catchError(() => of([]))
    );
  }

  getByClientId(clientId: string): Observable<Payment[]> {
    return this.http.get<any>(`${this.apiUrl}/client/${clientId}`).pipe(
      map((res) => {
        const data: PaymentDto[] = res?.data || res || [];
        return data.map(this.mapToPayment);
      }),
      catchError(() => of([]))
    );
  }

  create(data: CreatePaymentData): Observable<Payment> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        const dto = res?.data || res;
        return this.mapToPayment(dto as PaymentDto);
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private mapToPayment(dto: PaymentDto): Payment {
    return {
      id: dto.id,
      invoiceId: dto.invoiceId,
      clientId: dto.clientId,
      amount: dto.amount || 0,
      method: dto.method as PaymentMethod,
      status: dto.status as PaymentStatus,
      transactionId: dto.transactionId,
      processedBy: dto.processedBy,
    };
  }
}

interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  clientId: string;
  policyId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  generatedBy?: string;
  paidDirect: boolean;
  overDue: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PaymentDto {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  processedBy?: string;
}
