import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { WorkflowRepositoryPort } from '../../domain/ports/workflow.repository.port';
import { HttpWorkflowRepository } from '../../infrastructure/repositories/http-workflow.repository';
import {
  AuditLog,
  CreateAuditRequest,
  Escalation,
  CreateEscalationRequest,
  ResolveEscalationRequest,
  SLADefinition,
  CreateSLADefinitionRequest,
  SLAViolation,
  SAGATransaction,
  Page,
  EscalationStatus,
  AuditAction,
  SLAStatus
} from '../../domain/models/workflow.models';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private repository: WorkflowRepositoryPort = inject(HttpWorkflowRepository);

  // ==================== Audit Logs ====================
  createAuditLog(request: CreateAuditRequest): Observable<AuditLog> {
    return this.repository.createAuditLog(request);
  }

  getAllAuditLogs(page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    return this.repository.getAllAuditLogs(page, size);
  }

  getAuditLogById(id: string): Observable<AuditLog> {
    return this.repository.getAuditLogById(id);
  }

  getAuditLogsByEntity(entityType: string, entityId: string, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    return this.repository.getAuditLogsByEntity(entityType, entityId, page, size);
  }

  getAuditLogsByUser(userId: string, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    return this.repository.getAuditLogsByUser(userId, page, size);
  }

  getAuditLogsByAction(action: AuditAction, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    return this.repository.getAuditLogsByAction(action, page, size);
  }

  getAuditLogsByEntityType(entityType: string, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    return this.repository.getAuditLogsByEntityType(entityType, page, size);
  }

  getAuditLogsByDateRange(start: string, end: string): Observable<AuditLog[]> {
    return this.repository.getAuditLogsByDateRange(start, end);
  }

  // ==================== Escalations ====================
  createEscalation(request: CreateEscalationRequest): Observable<Escalation> {
    return this.repository.createEscalation(request);
  }

  getAllEscalations(page: number = 0, size: number = 20): Observable<Page<Escalation>> {
    return this.repository.getAllEscalations(page, size);
  }

  getEscalationById(id: string): Observable<Escalation> {
    return this.repository.getEscalationById(id);
  }

  getEscalationsByStatus(status: EscalationStatus, page: number = 0, size: number = 20): Observable<Page<Escalation>> {
    return this.repository.getEscalationsByStatus(status, page, size);
  }

  getEscalationsByAssignedTo(userId: string, page: number = 0, size: number = 20): Observable<Page<Escalation>> {
    return this.repository.getEscalationsByAssignedTo(userId, page, size);
  }

  resolveEscalation(id: string, request: ResolveEscalationRequest): Observable<Escalation> {
    return this.repository.resolveEscalation(id, request);
  }

  cancelEscalation(id: string): Observable<Escalation> {
    return this.repository.cancelEscalation(id);
  }

  // ==================== SLA Definitions ====================
  createSLADefinition(request: CreateSLADefinitionRequest): Observable<SLADefinition> {
    return this.repository.createSLADefinition(request);
  }

  getAllSLADefinitions(): Observable<SLADefinition[]> {
    return this.repository.getAllSLADefinitions();
  }

  getSLADefinitionById(id: string): Observable<SLADefinition> {
    return this.repository.getSLADefinitionById(id);
  }

  getActiveSLADefinitions(): Observable<SLADefinition[]> {
    return this.repository.getActiveSLADefinitions();
  }

  getSLADefinitionByEntityType(entityType: string): Observable<SLADefinition> {
    return this.repository.getSLADefinitionByEntityType(entityType);
  }

  // ==================== SLA Violations ====================
  getAllViolations(page: number = 0, size: number = 20): Observable<Page<SLAViolation>> {
    return this.repository.getAllViolations(page, size);
  }

  getViolationsByEntity(entityId: string, page: number = 0, size: number = 20): Observable<Page<SLAViolation>> {
    return this.repository.getViolationsByEntity(entityId, page, size);
  }

  getViolationsByStatus(status: SLAStatus, page: number = 0, size: number = 20): Observable<Page<SLAViolation>> {
    return this.repository.getViolationsByStatus(status, page, size);
  }

  resolveSLAViolation(id: string): Observable<void> {
    return this.repository.resolveSLAViolation(id);
  }

  checkSLAViolations(): Observable<void> {
    return this.repository.checkSLAViolations();
  }

  // ==================== SAGA Transactions ====================
  getSagaStatus(id: string): Observable<SAGATransaction> {
    return this.repository.getSagaStatus(id);
  }

  startSaga(sagaType: string, initiatedBy: string): Observable<SAGATransaction> {
    return this.repository.startSaga(sagaType, initiatedBy);
  }

  reportStepSuccess(sagaId: string, stepId: string): Observable<void> {
    return this.repository.reportStepSuccess(sagaId, stepId);
  }

  reportStepFailure(sagaId: string, stepId: string, errorDetails: string): Observable<void> {
    return this.repository.reportStepFailure(sagaId, stepId, errorDetails);
  }

  reportCompensationSuccess(sagaId: string, stepId: string): Observable<void> {
    return this.repository.reportCompensationSuccess(sagaId, stepId);
  }
}
