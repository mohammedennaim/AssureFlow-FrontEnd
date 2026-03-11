import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CLIENT_REPOSITORY, IClientRepository, CreateClientData } from '../../domain/ports/client.repository.port';
import { Client } from '../../domain/models/client.model';

export type { Client };

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private clientRepository = inject(CLIENT_REPOSITORY);

  getAll(page: number = 0, size: number = 20): Observable<Client[]> {
    return this.clientRepository.getAll(page, size);
  }

  getById(id: string): Observable<Client> {
    return this.clientRepository.getById(id);
  }

  getByEmail(email: string): Observable<Client> {
    return this.clientRepository.getByEmail(email);
  }

  getByCin(cin: string): Observable<Client> {
    return this.clientRepository.getByCin(cin);
  }

  create(data: CreateClientData): Observable<Client> {
    return this.clientRepository.create(data);
  }

  update(id: string, data: Partial<Client>): Observable<Client> {
    return this.clientRepository.update(id, data);
  }

  delete(id: string): Observable<void> {
    return this.clientRepository.delete(id);
  }

  activate(id: string): Observable<void> {
    return this.clientRepository.activate(id);
  }

  deactivate(id: string): Observable<void> {
    return this.clientRepository.deactivate(id);
  }
}
