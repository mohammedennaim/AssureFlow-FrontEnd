import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ClientsService, Client } from '../../../core/application/services/admin-clients.service';
import { AdminStatisticsService, ClientStats } from '../../../core/application/services/admin-statistics.service';
import { catchError, of } from 'rxjs';

interface ClientStatsLocal {
  total: number;
  active: number;
  withPolicies: number;
  prospects: number;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class ClientsComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private adminStatsService = inject(AdminStatisticsService);
  private fb = inject(FormBuilder);

  clients: Client[] = [];
  filteredClients: Client[] = [];
  isLoading = true;
  error: string | null = null;
  searchQuery = '';
  filterStatus = 'ALL';
  filterPolicies = 'ALL';
  viewMode: 'table' | 'cards' = 'table';
  selectedClient: Client | null = null;
  showDeleteConfirm = false;
  clientToDelete: string | null = null;

  // Modal State
  showModal = false;
  showBackdrop = false;
  isEditMode = false;
  clientForm!: FormGroup;
  selectedClientId: string | null = null;
  isSaving = false;

  // Stats
  clientStats: ClientStats | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadClients();
  }

  initForm(): void {
    this.clientForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      dateOfBirth: ['', [Validators.required]],
      cin: ['', [Validators.required, Validators.minLength(5)]],
      address: [''],
      city: [''],
      zipCode: [''],
    });
  }

  loadClients(): void {
    this.isLoading = true;
    this.error = null;

    this.clientsService.getAll().pipe(
      catchError((err) => {
        this.error = 'Failed to load clients';
        console.error('Error fetching clients:', err);
        return of([]);
      })
    ).subscribe((data) => {
      this.clients = data;
      this.filteredClients = data;

      // Calcule les statistiques réelles
      this.adminStatsService.getClientStats(data).subscribe((stats) => {
        this.clientStats = stats;
      });

      this.isLoading = false;
    });
  }

  // Stats getters
  get stats(): ClientStatsLocal {
    if (this.clientStats) {
      return {
        total: this.clientStats.total,
        active: this.clientStats.active,
        withPolicies: this.clientStats.withPolicies,
        prospects: this.clientStats.prospects
      };
    }
    return {
      total: this.clients.length,
      active: this.clients.length,
      withPolicies: this.clients.length,
      prospects: this.clients.length
    };
  }

  get paginatedClients(): Client[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredClients.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredClients.length / this.pageSize);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.filterClients();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.filterClients();
  }

  onPoliciesFilterChange(): void {
    this.currentPage = 1;
    this.filterClients();
  }

  filterClients(): void {
    this.filteredClients = this.clients.filter(client => {
      const matchesSearch =
        client.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStatus = this.filterStatus === 'ALL' || client.email.toUpperCase().includes(this.filterStatus);

      return matchesSearch && matchesStatus;
    });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedClientId = null;
    this.clientForm.reset();
    this.showBackdrop = true;
    setTimeout(() => {
      this.showModal = true;
    }, 10);
  }

  openEditModal(client: Client): void {
    this.isEditMode = true;
    this.selectedClientId = client.id;
    this.clientForm.patchValue({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: '',
      zipCode: ''
    });
    this.showBackdrop = true;
    setTimeout(() => {
      this.showModal = true;
    }, 10);
  }

  closeModal(): void {
    this.showModal = false;
    setTimeout(() => {
      this.showBackdrop = false;
      this.clientForm.reset();
    }, 300);
  }

  confirmDelete(clientId: string): void {
    this.clientToDelete = clientId;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.clientToDelete = null;
  }

  deleteClient(): void {
    if (this.clientToDelete) {
      this.clientsService.delete(this.clientToDelete).subscribe({
        next: () => {
          this.loadClients();
          this.closeDeleteConfirm();
        },
        error: (err) => console.error('Error deleting client:', err)
      });
    }
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.clientForm.value;

    if (this.isEditMode && this.selectedClientId) {
      this.clientsService.update(this.selectedClientId, formValue).subscribe({
        next: () => {
          this.loadClients();
          this.closeModal();
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Error updating client:', err);
          this.isSaving = false;
        }
      });
    } else {
      // Préparer les données pour la création
      const clientData: any = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phone: formValue.phone,
        dateOfBirth: formValue.dateOfBirth,
        cin: formValue.cin,
        type: 'INDIVIDUAL'
      };
      
      // N'ajouter l'adresse que si tous les champs requis sont remplis
      if (formValue.address && formValue.city && formValue.zipCode) {
        clientData.addresses = [{
          street: formValue.address,
          city: formValue.city,
          postalCode: formValue.zipCode,
          country: 'Morocco',
          primary: true
        }];
      }
      
      console.log('[ClientsComponent] Creating client with data:', clientData);
      this.clientsService.create(clientData).subscribe({
        next: () => {
          this.loadClients();
          this.closeModal();
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Error creating client:', err);
          console.error('Error details:', err.error);
          this.isSaving = false;
        }
      });
    }
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'ACTIVE': 'client-status--active',
      'INACTIVE': 'client-status--inactive',
      'PROSPECT': 'client-status--prospect'
    };
    return classes[status] || '';
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterStatus = 'ALL';
    this.filterPolicies = 'ALL';
    this.filterClients();
  }

  hasActiveFilters(): boolean {
    return this.searchQuery !== '' || this.filterStatus !== 'ALL' || this.filterPolicies !== 'ALL';
  }

  onBackdropClick(event: Event): void {
    event.stopPropagation();
    this.closeModal();
  }

  onModalClick(event: Event): void {
    event.stopPropagation();
  }

  trackByClientId(index: number, client: Client): string {
    return client.id;
  }
}
