import { Observable } from 'rxjs';
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
} from '../models/workflow.models';

export abstract class WorkflowRepositoryPort {
  // Audit Logs
  abstract createAuditLog(request: CreateAuditRequest): Observable<AuditLog>;
  abstract getAllAuditLogs(page: number, size: number): Observable<Page<AuditLog>>;
  abstract getAuditLogById(id: string): Observable<AuditLog>;
  abstract getAuditLogsByEntity(entityType: string, entityId: string, page: number, size: number): Observable<Page<AuditLog>>;
  abstract getAuditLogsByUser(userId: string, page: number, size: number): Observable<Page<AuditLog>>;
  abstract getAuditLogsByAction(action: AuditAction, page: number, size: number): Observable<Page<AuditLog>>;
  abstract getAuditLogsByEntityType(entityType: string, page: number, size: number): Observable<Page<AuditLog>>;
  abstract getAuditLogsByDateRange(start: string, end: string): Observable<AuditLog[]>;

  // Escalations
  abstract createEscalation(request: CreateEscalationRequest): Observable<Escalation>;
  abstract getAllEscalations(page: number, size: number): Observable<Page<Escalation>>;
  abstract getEscalationById(id: string): Observable<Escalation>;
  abstract getEscalationsByStatus(status: EscalationStatus, page: number, size: number): Observable<Page<Escalation>>;
  abstract getEscalationsByAssignedTo(userId: string, page: number, size: number): Observable<Page<Escalation>>;
  abstract resolveEscalation(id: string, request: ResolveEscalationRequest): Observable<Escalation>;
  abstract cancelEscalation(id: string): Observable<Escalation>;

  // SLA Definitions
  abstract createSLADefinition(request: CreateSLADefinitionRequest): Observable<SLADefinition>;
  abstract getAllSLADefinitions(): Observable<SLADefinition[]>;
  abstract getSLADefinitionById(id: string): Observable<SLADefinition>;
  abstract getActiveSLADefinitions(): Observable<SLADefinition[]>;
  abstract getSLADefinitionByEntityType(entityType: string): Observable<SLADefinition>;

  // SLA Violations
  abstract getAllViolations(page: number, size: number): Observable<Page<SLAViolation>>;
  abstract getViolationsByEntity(entityId: string, page: number, size: number): Observable<Page<SLAViolation>>;
  abstract getViolationsByStatus(status: SLAStatus, page: number, size: number): Observable<Page<SLAViolation>>;
  abstract resolveSLAViolation(id: string): Observable<void>;
  abstract checkSLAViolations(): Observable<void>;

  // SAGA Transactions
  abstract getSagaStatus(id: string): Observable<SAGATransaction>;
  abstract startSaga(sagaType: string, initiatedBy: string): Observable<SAGATransaction>;
  abstract reportStepSuccess(sagaId: string, stepId: string): Observable<void>;
  abstract reportStepFailure(sagaId: string, stepId: string, errorDetails: string): Observable<void>;
  abstract reportCompensationSuccess(sagaId: string, stepId: string): Observable<void>;
}
