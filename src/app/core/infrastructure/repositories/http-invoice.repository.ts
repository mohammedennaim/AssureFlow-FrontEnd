import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IInvoiceRepository, CreateInvoiceData, Invoice } from '../../domain/ports/invoice.repository.port';
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
        } else if (res?.invoices && Array.isArray(res.invoices)) {
          data = res.invoices;
        } else if (res?.items && Array.isArray(res.items)) {
          data = res.items;
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
        
        let dto: InvoiceDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.invoice) {
          dto = res.invoice;
        } else {
          dto = res;
        }
        
        return this.mapToInvoice(dto as InvoiceDto);
      }),
      catchError(() => of({} as Invoice))
    );
  }

  getByNumber(invoiceNumber: string): Observable<Invoice> {
    return this.http.get<any>(`${this.apiUrl}/number/${invoiceNumber}`).pipe(
      map((res) => {
        let dto: InvoiceDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.invoice) {
          dto = res.invoice;
        } else {
          dto = res;
        }
        
        return this.mapToInvoice(dto as InvoiceDto);
      }),
      catchError(() => of({} as Invoice))
    );
  }

  getByClientId(clientId: string): Observable<Invoice[]> {
    return this.http.get<any>(`${this.apiUrl}/client/${clientId}`).pipe(
      map((res) => {
        console.log('[InvoiceRepository] getByClientId raw response:', res);

        let data: InvoiceDto[] = [];

        // Handle BaseResponse wrapper
        if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res)) {
          data = res;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.invoices && Array.isArray(res.invoices)) {
          data = res.invoices;
        }

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
        
        let data: InvoiceDto[] = [];
        
        if (Array.isArray(res)) {
          data = res;
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.invoices && Array.isArray(res.invoices)) {
          data = res.invoices;
        }
        
        return data.map(this.mapToInvoice);
      }),
      catchError(() => of([]))
    );
  }

  create(data: CreateInvoiceData): Observable<Invoice> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        let dto: InvoiceDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.invoice) {
          dto = res.invoice;
        } else {
          dto = res;
        }
        
        return this.mapToInvoice(dto as InvoiceDto);
      })
    );
  }

  cancel(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/cancel`, {});
  }

  markAsPaid(id: string, paymentId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/pay/${paymentId}`, {});
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
      amount: dto.totalAmount || dto.amount || 0,
      status: dto.status as Invoice['status'],
      dueDate: dto.dueDate,
      createdAt: dto.createdAt || dto.dueDate,
    };
  }
}

interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  clientId: string;
  policyId: string;
  amount?: number;
  totalAmount?: number;
  status: string;
  dueDate: string;
  createdAt?: string;
}
