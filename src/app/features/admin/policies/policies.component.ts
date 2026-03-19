import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PoliciesService, Policy } from '../../../core/application/services/admin-policies.service';
import { AdminStatisticsService, PolicyStats } from '../../../core/application/services/admin-statistics.service';
import { ClientsService } from '../../../core/application/services/admin-clients.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.scss'
})
export class PoliciesComponent implements OnInit {
  private policiesService = inject(PoliciesService);
  private adminStatsService = inject(AdminStatisticsService);
  private clientsService = inject(ClientsService);
  private fb = inject(FormBuilder);

  policies: Policy[] = [];
  filteredPolicies: Policy[] = [];
  clients: any[] = [];
  isLoading = true;
  error: string | null = null;
  searchQuery = '';
  filterType = 'ALL';
  filterStatus = 'ALL';
  viewMode: 'table' | 'cards' = 'table';
  policyStats: PolicyStats | null = null;

  // Cache for progress calculations to avoid ExpressionChangedAfterItHasBeenCheckedError
  private progressCache = new Map<string, number>();

  // Modal State
  showModal = false;
  showBackdrop = false;
  isEditMode = false;
  selectedPolicyId: string | null = null;
  isSaving = false;
  policyForm!: FormGroup;

  // Delete Confirmation
  showDeleteConfirm = false;
  policyToDelete: string | null = null;

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadPolicies();
    this.loadClients();
  }

  initForm(): void {
    this.policyForm = this.fb.group({
      clientId: ['', Validators.required],
      type: ['VEHICLE', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      premiumAmount: ['', [Validators.required, Validators.min(1)]],
      coverageAmount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  loadPolicies(): void {
    this.isLoading = true;
    this.error = null;

    this.policiesService.getAll().pipe(
      catchError((err) => {
        this.error = 'Failed to load policies';
        console.error('Error fetching policies:', err);
        return of([]);
      })
    ).subscribe((data) => {
      this.policies = data;
      this.filteredPolicies = data;

      // Pre-calculate progress for all policies to avoid change detection issues
      this.progressCache.clear();
      data.forEach(policy => {
        const cacheKey = `${policy.startDate}-${policy.endDate}`;
        this.progressCache.set(cacheKey, this.calculateProgress(policy.startDate, policy.endDate));
      });

      // Enrich policies with client names
      this.enrichPoliciesWithClientNames();

      this.adminStatsService.getPolicyStats(data).subscribe((stats) => {
        this.policyStats = stats;
      });

      this.isLoading = false;
    });
  }

  private enrichPoliciesWithClientNames(): void {
    // Map client IDs to names for quick lookup
    const clientMap = new Map(this.clients.map(c => [c.id, `${c.firstName} ${c.lastName}`]));
    
    // Update policies with client names
    this.policies = this.policies.map(policy => ({
      ...policy,
      clientName: clientMap.get(policy.clientId) || 'Unknown Client'
    }));
    
    this.filteredPolicies = [...this.policies];
  }

  loadClients(): void {
    if (this.clients.length > 0) {
      return; // Already loaded
    }
    
    this.clientsService.getAll().subscribe({
      next: (clients) => {
        this.clients = clients;
        
        // Enrich policies with client names if policies are already loaded
        if (this.policies.length > 0) {
          this.enrichPoliciesWithClientNames();
        }
      },
      error: (err) => console.error('Error loading clients:', err)
    });
  }

  get stats() {
    if (this.policyStats) {
      return {
        active: this.policyStats.active,
        revenue: this.policyStats.totalPremium,
        expiring: this.policyStats.expiringSoon
      };
    }
    return {
      active: this.policies.filter(p => p.status === 'ACTIVE').length,
      revenue: this.policies.filter(p => p.status === 'ACTIVE').reduce((sum, p) => sum + p.premium, 0),
      expiring: this.policies.filter(p => {
        const daysLeft = (new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysLeft > 0 && daysLeft < 60;
      }).length
    };
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedPolicyId = null;
    this.policyForm.reset({ type: 'VEHICLE' });
    this.showBackdrop = true;
    setTimeout(() => {
      this.showModal = true;
    }, 10);
  }

  openEditModal(policy: Policy): void {
    this.isEditMode = true;
    this.selectedPolicyId = policy.id;

    // Helper to format date string (YYYY-MM-DDTHH:mm:ss...) to YYYY-MM-DD
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      return dateStr.split('T')[0];
    };

    // Patch form values BEFORE showing modal
    this.policyForm.patchValue({
      clientId: policy.clientId,
      type: policy.type,
      startDate: formatDate(policy.startDate),
      endDate: formatDate(policy.endDate),
      premiumAmount: policy.premium,
      coverageAmount: policy.coverageAmount
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
      this.policyForm.reset();
      // Re-enable start date field
      // this.policyForm.get('startDate')?.enable();
    }, 300);
  }

  savePolicy(): void {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.policyForm.value;

    if (this.isEditMode && this.selectedPolicyId) {
      // For update, only send allowed fields
      const updateData = {
        clientId: formValue.clientId,
        type: formValue.type,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        premiumAmount: formValue.premiumAmount,
        coverageAmount: formValue.coverageAmount
      };

      this.policiesService.update(this.selectedPolicyId, updateData).subscribe({
        next: () => {
          this.loadPolicies();
          this.closeModal();
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Error updating policy:', err);
          console.error('Error details:', err.error);
          
          let errorMessage = 'Failed to update policy. ';
          if (err.error?.message) {
            errorMessage += err.error.message;
          } else if (typeof err.error === 'string') {
            errorMessage += err.error;
          }
          
          alert(errorMessage);
          this.isSaving = false;
        }
      });
    } else {
      // For create, send all fields
      this.policiesService.create(formValue).subscribe({
        next: () => {
          this.loadPolicies();
          this.closeModal();
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Error creating policy:', err);
          console.error('Error details:', err.error);

          // Show user-friendly error message
          let errorMessage = 'Failed to create policy. ';
          if (err.status === 409) {
            errorMessage += 'There was a conflict with the client service. Please try again or contact support.';
          } else if (err.error?.message) {
            errorMessage += err.error.message;
          }

          alert(errorMessage);
          this.isSaving = false;
        }
      });
    }
  }

  confirmDelete(policyId: string): void {
    this.policyToDelete = policyId;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.policyToDelete = null;
  }

  deletePolicy(): void {
    if (this.policyToDelete) {
      this.policiesService.delete(this.policyToDelete).subscribe({
        next: () => {
          this.loadPolicies();
          this.closeDeleteConfirm();
        },
        error: (err) => console.error('Error deleting policy:', err)
      });
    }
  }

  onBackdropClick(event: Event): void {
    event.stopPropagation();
    this.closeModal();
  }

  onModalClick(event: Event): void {
    event.stopPropagation();
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'VEHICLE': 'fa-car',
      'HOME': 'fa-house',
      'LIFE': 'fa-heart-pulse',
      'HEALTH': 'fa-stethoscope',
      'BUSINESS': 'fa-building'
    };
    return icons[type] || 'fa-file';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'ACTIVE': 'policy-status--active',
      'EXPIRED': 'policy-status--expired',
      'PENDING': 'policy-status--pending',
      'CANCELLED': 'policy-status--cancelled'
    };
    return classes[status] || '';
  }

  getProgress(startDate: string, endDate: string): number {
    const cacheKey = `${startDate}-${endDate}`;
    if (this.progressCache.has(cacheKey)) {
      return this.progressCache.get(cacheKey)!;
    }
    const progress = this.calculateProgress(startDate, endDate);
    this.progressCache.set(cacheKey, progress);
    return progress;
  }

  private calculateProgress(startDate: string, endDate: string): number {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(progress * 100) / 100;
  }

  getDaysLeft(endDate: string): number {
    const daysLeft = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return Math.ceil(daysLeft);
  }

  toLowerCase(value: string): string {
    return value.toLowerCase();
  }
}
