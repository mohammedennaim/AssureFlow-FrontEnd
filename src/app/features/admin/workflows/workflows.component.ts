import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../../core/application/services/workflow.service';
import {
  AuditLog,
  Escalation,
  SLADefinition,
  SLAViolation,
  SAGATransaction,
  EscalationStatus,
  SLAStatus,
  AuditAction,
  CreateEscalationRequest,
  CreateSLADefinitionRequest,
  ResolveEscalationRequest,
  EscalationLevel
} from '../../../core/domain/models/workflow.models';
import { forkJoin, catchError, of } from 'rxjs';

type TabType = 'audit' | 'escalations' | 'sla-definitions' | 'sla-violations' | 'saga-transactions';

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflows.component.html',
  styleUrl: './workflows.component.scss'
})
export class WorkflowsComponent implements OnInit {
  private workflowService = inject(WorkflowService);

  // State
  activeTab: TabType = 'audit';
  isLoading = false;
  error: string | null = null;

  // Audit Logs
  auditLogs: AuditLog[] = [];
  auditPage = 0;
  auditSize = 20;
  auditTotalPages = 0;
  auditTotalElements = 0;

  // Escalations
  escalations: Escalation[] = [];
  escalationPage = 0;
  escalationSize = 20;
  escalationTotalPages = 0;
  escalationTotalElements = 0;

  // SLA Definitions
  slaDefinitions: SLADefinition[] = [];

  // SLA Violations
  slaViolations: SLAViolation[] = [];
  violationPage = 0;
  violationSize = 20;
  violationTotalPages = 0;
  violationTotalElements = 0;

  // SAGA Transactions
  sagaTransactions: SAGATransaction[] = [];

  // Filters
  filterEscalationStatus: EscalationStatus | 'ALL' = 'ALL';
  filterViolationStatus: SLAStatus | 'ALL' = 'ALL';
  filterAuditAction: AuditAction | 'ALL' = 'ALL';
  filterAuditUser: string = '';
  filterAuditEntityType: string = '';
  filterAuditDateStart: string = '';
  filterAuditDateEnd: string = '';
  filterEscalationAssignedTo: string = '';

  // Modals
  showCreateEscalationModal = false;
  showCreateSLAModal = false;
  showResolveEscalationModal = false;
  showAuditDetailModal = false;
  showEscalationDetailModal = false;
  showSLADetailModal = false;
  showSagaDetailModal = false;
  selectedEscalation: Escalation | null = null;
  selectedAuditLog: AuditLog | null = null;
  selectedSLADefinition: SLADefinition | null = null;
  selectedSaga: SAGATransaction | null = null;

  // Forms
  newEscalation: CreateEscalationRequest = {
    entityId: '',
    entityType: '',
    level: EscalationLevel.LEVEL_1,
    reason: '',
    description: ''
  };

  newSLA: CreateSLADefinitionRequest = {
    name: '',
    entityType: '',
    description: '',
    durationHours: 24,
    autoEscalate: true
  };

  resolveForm: ResolveEscalationRequest = {
    resolution: '',
    resolvedBy: ''
  };

  // Enums for templates
  EscalationStatus = EscalationStatus;
  SLAStatus = SLAStatus;
  AuditAction = AuditAction;
  EscalationLevel = EscalationLevel;

  // Stats
  stats = {
    totalAuditLogs: 0,
    totalEscalations: 0,
    openEscalations: 0,
    totalViolations: 0,
    activeViolations: 0,
    totalSLADefinitions: 0
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      auditLogs: this.workflowService.getAllAuditLogs(this.auditPage, this.auditSize).pipe(
        catchError(err => {
          console.error('[Workflows] Error loading audit logs:', err);
          return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
        })
      ),
      escalations: this.workflowService.getAllEscalations(this.escalationPage, this.escalationSize).pipe(
        catchError(err => {
          console.error('[Workflows] Error loading escalations:', err);
          return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
        })
      ),
      slaDefinitions: this.workflowService.getAllSLADefinitions().pipe(
        catchError(err => {
          console.error('[Workflows] Error loading SLA definitions:', err);
          return of([]);
        })
      ),
      slaViolations: this.workflowService.getAllViolations(this.violationPage, this.violationSize).pipe(
        catchError(err => {
          console.error('[Workflows] Error loading SLA violations:', err);
          return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
        })
      )
    }).subscribe({
      next: ({ auditLogs, escalations, slaDefinitions, slaViolations }) => {
        this.auditLogs = auditLogs.content;
        this.auditTotalPages = auditLogs.totalPages;
        this.auditTotalElements = auditLogs.totalElements;

        this.escalations = escalations.content;
        this.escalationTotalPages = escalations.totalPages;
        this.escalationTotalElements = escalations.totalElements;

        this.slaDefinitions = slaDefinitions;

        this.slaViolations = slaViolations.content;
        this.violationTotalPages = slaViolations.totalPages;
        this.violationTotalElements = slaViolations.totalElements;

        this.calculateStats();
        this.isLoading = false;

        console.log('[Workflows] Data loaded successfully');
      },
      error: (err) => {
        this.error = 'Failed to load workflow data';
        console.error('[Workflows] Error loading data:', err);
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      totalAuditLogs: this.auditTotalElements || 0,
      totalEscalations: this.escalationTotalElements || 0,
      openEscalations: this.escalations?.filter(e => e.status === EscalationStatus.OPEN).length || 0,
      totalViolations: this.violationTotalElements || 0,
      activeViolations: this.slaViolations?.filter(v => v.status === SLAStatus.VIOLATED).length || 0,
      totalSLADefinitions: this.slaDefinitions?.length || 0
    };
    
    console.log('[Workflows] Stats calculated:', this.stats);
    console.log('[Workflows] Raw data:', {
      auditLogs: this.auditLogs?.length,
      escalations: this.escalations?.length,
      slaDefinitions: this.slaDefinitions?.length,
      slaViolations: this.slaViolations?.length
    });
  }

  // Tab Management
  switchTab(tab: TabType): void {
    this.activeTab = tab;
  }

  // Escalation Actions
  openCreateEscalationModal(): void {
    this.newEscalation = {
      entityId: '',
      entityType: '',
      level: EscalationLevel.LEVEL_1,
      reason: '',
      description: ''
    };
    this.showCreateEscalationModal = true;
  }

  createEscalation(): void {
    this.workflowService.createEscalation(this.newEscalation).subscribe({
      next: () => {
        this.showCreateEscalationModal = false;
        this.loadData();
      },
      error: (err) => console.error('[Workflows] Error creating escalation:', err)
    });
  }

  openResolveEscalationModal(escalation: Escalation): void {
    this.selectedEscalation = escalation;
    this.resolveForm = {
      resolution: '',
      resolvedBy: '' // Should be current user ID
    };
    this.showResolveEscalationModal = true;
  }

  resolveEscalation(): void {
    if (this.selectedEscalation) {
      this.workflowService.resolveEscalation(this.selectedEscalation.id, this.resolveForm).subscribe({
        next: () => {
          this.showResolveEscalationModal = false;
          this.selectedEscalation = null;
          this.loadData();
        },
        error: (err) => console.error('[Workflows] Error resolving escalation:', err)
      });
    }
  }

  cancelEscalation(id: string): void {
    if (confirm('Are you sure you want to cancel this escalation?')) {
      this.workflowService.cancelEscalation(id).subscribe({
        next: () => this.loadData(),
        error: (err) => console.error('[Workflows] Error cancelling escalation:', err)
      });
    }
  }

  // SLA Actions
  openCreateSLAModal(): void {
    this.newSLA = {
      name: '',
      entityType: '',
      description: '',
      durationHours: 24,
      autoEscalate: true
    };
    this.showCreateSLAModal = true;
  }

  createSLADefinition(): void {
    this.workflowService.createSLADefinition(this.newSLA).subscribe({
      next: () => {
        this.showCreateSLAModal = false;
        this.loadData();
      },
      error: (err) => console.error('[Workflows] Error creating SLA definition:', err)
    });
  }

  resolveSLAViolation(id: string): void {
    if (confirm('Are you sure you want to resolve this SLA violation?')) {
      this.workflowService.resolveSLAViolation(id).subscribe({
        next: () => this.loadData(),
        error: (err) => console.error('[Workflows] Error resolving SLA violation:', err)
      });
    }
  }

  checkSLAViolations(): void {
    this.workflowService.checkSLAViolations().subscribe({
      next: () => {
        console.log('[Workflows] SLA violations checked');
        this.loadData();
      },
      error: (err) => console.error('[Workflows] Error checking SLA violations:', err)
    });
  }

  // Filters
  applyEscalationFilter(): void {
    if (this.filterEscalationStatus === 'ALL') {
      this.workflowService.getAllEscalations(this.escalationPage, this.escalationSize).subscribe({
        next: (page) => {
          this.escalations = page.content;
          this.escalationTotalPages = page.totalPages;
          this.escalationTotalElements = page.totalElements;
        }
      });
    } else {
      this.workflowService.getEscalationsByStatus(this.filterEscalationStatus, this.escalationPage, this.escalationSize).subscribe({
        next: (page) => {
          this.escalations = page.content;
          this.escalationTotalPages = page.totalPages;
          this.escalationTotalElements = page.totalElements;
        }
      });
    }
  }

  applyViolationFilter(): void {
    if (this.filterViolationStatus === 'ALL') {
      this.workflowService.getAllViolations(this.violationPage, this.violationSize).subscribe({
        next: (page) => {
          this.slaViolations = page.content;
          this.violationTotalPages = page.totalPages;
          this.violationTotalElements = page.totalElements;
        }
      });
    } else {
      this.workflowService.getViolationsByStatus(this.filterViolationStatus, this.violationPage, this.violationSize).subscribe({
        next: (page) => {
          this.slaViolations = page.content;
          this.violationTotalPages = page.totalPages;
          this.violationTotalElements = page.totalElements;
        }
      });
    }
  }

  applyAuditFilter(): void {
    if (this.filterAuditAction === 'ALL') {
      this.workflowService.getAllAuditLogs(this.auditPage, this.auditSize).subscribe({
        next: (page) => {
          this.auditLogs = page.content;
          this.auditTotalPages = page.totalPages;
          this.auditTotalElements = page.totalElements;
        }
      });
    } else {
      this.workflowService.getAuditLogsByAction(this.filterAuditAction, this.auditPage, this.auditSize).subscribe({
        next: (page) => {
          this.auditLogs = page.content;
          this.auditTotalPages = page.totalPages;
          this.auditTotalElements = page.totalElements;
        }
      });
    }
  }

  // Pagination
  nextAuditPage(): void {
    if (this.auditPage < this.auditTotalPages - 1) {
      this.auditPage++;
      this.applyAuditFilter();
    }
  }

  prevAuditPage(): void {
    if (this.auditPage > 0) {
      this.auditPage--;
      this.applyAuditFilter();
    }
  }

  nextEscalationPage(): void {
    if (this.escalationPage < this.escalationTotalPages - 1) {
      this.escalationPage++;
      this.applyEscalationFilter();
    }
  }

  prevEscalationPage(): void {
    if (this.escalationPage > 0) {
      this.escalationPage--;
      this.applyEscalationFilter();
    }
  }

  nextViolationPage(): void {
    if (this.violationPage < this.violationTotalPages - 1) {
      this.violationPage++;
      this.applyViolationFilter();
    }
  }

  prevViolationPage(): void {
    if (this.violationPage > 0) {
      this.violationPage--;
      this.applyViolationFilter();
    }
  }

  // Utility
  closeModals(): void {
    this.showCreateEscalationModal = false;
    this.showCreateSLAModal = false;
    this.showResolveEscalationModal = false;
    this.showAuditDetailModal = false;
    this.showEscalationDetailModal = false;
    this.showSLADetailModal = false;
    this.showSagaDetailModal = false;
    this.selectedEscalation = null;
    this.selectedAuditLog = null;
    this.selectedSLADefinition = null;
    this.selectedSaga = null;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

  trackById(index: number, item: any): string {
    return item.id;
  }

  // ==================== NEW FEATURES ====================

  // Audit Log Details
  openAuditDetailModal(log: AuditLog): void {
    this.selectedAuditLog = log;
    this.showAuditDetailModal = true;
  }

  // Advanced Audit Filters
  applyAdvancedAuditFilters(): void {
    if (this.filterAuditDateStart && this.filterAuditDateEnd) {
      this.workflowService.getAuditLogsByDateRange(this.filterAuditDateStart, this.filterAuditDateEnd).subscribe({
        next: (logs) => {
          this.auditLogs = logs;
          this.auditTotalElements = logs.length;
          this.auditTotalPages = 1;
        },
        error: (err) => console.error('[Workflows] Error filtering by date range:', err)
      });
    } else if (this.filterAuditUser) {
      // Filter locally by username (case-insensitive)
      const filteredLogs = this.auditLogs.filter(log => 
        log.username.toLowerCase().includes(this.filterAuditUser.toLowerCase())
      );
      this.auditLogs = filteredLogs;
      this.auditTotalElements = filteredLogs.length;
      this.auditTotalPages = 1;
    } else if (this.filterAuditEntityType) {
      // Filter locally by entity type (case-insensitive)
      const filteredLogs = this.auditLogs.filter(log => 
        log.entityType.toLowerCase().includes(this.filterAuditEntityType.toLowerCase())
      );
      this.auditLogs = filteredLogs;
      this.auditTotalElements = filteredLogs.length;
      this.auditTotalPages = 1;
    } else {
      this.applyAuditFilter();
    }
  }

  clearAuditFilters(): void {
    this.filterAuditAction = 'ALL';
    this.filterAuditUser = '';
    this.filterAuditEntityType = '';
    this.filterAuditDateStart = '';
    this.filterAuditDateEnd = '';
    this.auditPage = 0;
    this.applyAuditFilter();
  }

  // Escalation Details
  openEscalationDetailModal(escalation: Escalation): void {
    this.workflowService.getEscalationById(escalation.id).subscribe({
      next: (fullEscalation) => {
        this.selectedEscalation = fullEscalation;
        this.showEscalationDetailModal = true;
      },
      error: (err) => console.error('[Workflows] Error loading escalation details:', err)
    });
  }

  // Escalation Assignment Filter
  applyEscalationAssignmentFilter(): void {
    if (this.filterEscalationAssignedTo) {
      this.workflowService.getEscalationsByAssignedTo(this.filterEscalationAssignedTo, this.escalationPage, this.escalationSize).subscribe({
        next: (page) => {
          this.escalations = page.content;
          this.escalationTotalPages = page.totalPages;
          this.escalationTotalElements = page.totalElements;
        },
        error: (err) => console.error('[Workflows] Error filtering by assigned to:', err)
      });
    } else {
      this.applyEscalationFilter();
    }
  }

  clearEscalationFilters(): void {
    this.filterEscalationStatus = 'ALL';
    this.filterEscalationAssignedTo = '';
    this.escalationPage = 0;
    this.applyEscalationFilter();
  }

  // SLA Definition Details
  openSLADetailModal(sla: SLADefinition): void {
    this.workflowService.getSLADefinitionById(sla.id).subscribe({
      next: (fullSLA) => {
        this.selectedSLADefinition = fullSLA;
        this.showSLADetailModal = true;
      },
      error: (err) => console.error('[Workflows] Error loading SLA details:', err)
    });
  }

  loadActiveSLADefinitions(): void {
    this.workflowService.getActiveSLADefinitions().subscribe({
      next: (slas) => {
        this.slaDefinitions = slas;
      },
      error: (err) => console.error('[Workflows] Error loading active SLAs:', err)
    });
  }

  // SAGA Transactions
  loadSagaTransactions(): void {
    // Note: Il n'y a pas d'endpoint pour lister toutes les SAGAs
    // Cette méthode devrait être appelée avec des IDs spécifiques
    console.log('[Workflows] SAGA transactions feature - requires specific IDs');
  }

  openSagaDetailModal(sagaId: string): void {
    this.workflowService.getSagaStatus(sagaId).subscribe({
      next: (saga) => {
        this.selectedSaga = saga;
        this.showSagaDetailModal = true;
      },
      error: (err) => console.error('[Workflows] Error loading SAGA details:', err)
    });
  }

  startNewSaga(sagaType: string, initiatedBy: string): void {
    this.workflowService.startSaga(sagaType, initiatedBy).subscribe({
      next: (saga) => {
        console.log('[Workflows] SAGA started:', saga);
        this.sagaTransactions.push(saga);
      },
      error: (err) => console.error('[Workflows] Error starting SAGA:', err)
    });
  }

  clearViolationFilters(): void {
    this.filterViolationStatus = 'ALL';
    this.violationPage = 0;
    this.applyViolationFilter();
  }
}
