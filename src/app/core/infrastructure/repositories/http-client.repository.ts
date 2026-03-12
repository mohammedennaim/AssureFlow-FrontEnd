import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IClientRepository, CreateClientData } from '../../domain/ports/client.repository.port';
import { Client } from '../../domain/models/client.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpClientRepository implements IClientRepository {
  private readonly apiUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 100): Observable<Client[]> {
    return this.http.get<any>(this.apiUrl, {
      params: { page: page.toString(), size: size.toString() }
    }).pipe(
      map((res) => {
        console.log('[ClientRepository] getAll raw response:', res);
        
        let data: ClientDto[] = [];
        
        if (Array.isArray(res)) {
          data = res;
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
        } else if (res?.content && Array.isArray(res.content)) {
          data = res.content;
        } else if (res?.clients && Array.isArray(res.clients)) {
          data = res.clients;
        } else if (res?.items && Array.isArray(res.items)) {
          data = res.items;
        }
        
        console.log('[ClientRepository] extracted data:', data);
        return data.map(this.mapToClient);
      }),
      catchError((err) => {
        console.error('[ClientRepository] getAll error:', err);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<Client> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        console.log('[ClientRepository] getById raw response:', res);
        
        let dto: ClientDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.client) {
          dto = res.client;
        } else if (res?.content) {
          dto = res.content;
        } else {
          dto = res;
        }
        
        console.log('[ClientRepository] extracted dto:', dto);
        return this.mapToClient(dto as ClientDto);
      }),
      catchError(() => of({} as Client))
    );
  }

  getByEmail(email: string): Observable<Client> {
    return this.http.get<any>(`${this.apiUrl}/email/${email}`).pipe(
      map((res) => {
        console.log('[ClientRepository] getByEmail raw response:', res);
        
        let dto: ClientDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.client) {
          dto = res.client;
        } else {
          dto = res;
        }
        
        return this.mapToClient(dto as ClientDto);
      }),
      catchError(() => of({} as Client))
    );
  }

  getMe(): Observable<Client> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      map((res) => {
        let dto: ClientDto | null = null;
        if (res?.data) {
          dto = res.data;
        } else if (res?.client) {
          dto = res.client;
        } else {
          dto = res;
        }
        return this.mapToClient(dto as ClientDto);
      }),
      catchError(() => of({} as Client))
    );
  }

  updateMe(data: Partial<Client>): Observable<Client> {
    return this.http.patch<any>(`${this.apiUrl}/me`, data).pipe(
      map((res) => {
        let dto: ClientDto | null = null;
        if (res?.data) {
          dto = res.data;
        } else if (res?.client) {
          dto = res.client;
        } else {
          dto = res;
        }
        return this.mapToClient(dto as ClientDto);
      }),
      catchError(() => of({} as Client))
    );
  }

  getByCin(cin: string): Observable<Client> {
    return this.http.get<any>(`${this.apiUrl}/cin/${cin}`).pipe(
      map((res) => {
        console.log('[ClientRepository] getByCin raw response:', res);
        
        let dto: ClientDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.client) {
          dto = res.client;
        } else {
          dto = res;
        }
        
        return this.mapToClient(dto as ClientDto);
      }),
      catchError(() => of({} as Client))
    );
  }

  create(data: CreateClientData): Observable<Client> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map((res) => {
        console.log('[ClientRepository] create raw response:', res);
        
        let dto: ClientDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.client) {
          dto = res.client;
        } else {
          dto = res;
        }
        
        return this.mapToClient(dto as ClientDto);
      })
    );
  }

  update(id: string, data: Partial<Client>): Observable<Client> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data).pipe(
      map((res) => {
        console.log('[ClientRepository] update raw response:', res);
        
        let dto: ClientDto | null = null;
        
        if (res?.data) {
          dto = res.data;
        } else if (res?.client) {
          dto = res.client;
        } else {
          dto = res;
        }
        
        return this.mapToClient(dto as ClientDto);
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  activate(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  private mapToClient(dto: ClientDto): Client {
    return {
      id: dto.id,
      clientNumber: dto.clientNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      zipCode: dto.zipCode,
      dateOfBirth: dto.dateOfBirth,
      cin: dto.cin,
      addresses: dto.addresses,
      status: dto.status,
      type: dto.type,
      userId: dto.userId,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }
}

interface ClientDto {
  id: string;
  clientNumber?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  dateOfBirth?: string;
  cin?: string;
  addresses?: Array<{
    id: string;
    street: string;
    city: string;
    postalCode?: string;
    country: string;
    isPrimary?: boolean;
  }>;
  status?: string;
  type?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}
