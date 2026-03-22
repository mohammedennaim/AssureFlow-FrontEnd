import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkflowRepositoryPort } from '../../domain/ports/workflow.repository.port';
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
export class HttpWorkflowRepository extends WorkflowRepositoryPort {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  // ==================== Audit Logs ====================
  createAuditLog(request: CreateAuditRequest): Observable<AuditLog> {
    return this.http.post<AuditLog>(`${this.baseUrl}/audit`, request);
  }

  getAllAuditLogs(page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<AuditLog>>(`${this.baseUrl}/audit`, { params });
  }

  getAuditLogById(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.baseUrl}/audit/${id}`);
  }

  getAuditLogsByEntity(entityType: string, entityId: string, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<AuditLog>>(`${this.baseUrl}/audit/entity/${entityType}/${entityId}`, { params });
  }

  getAuditLogsByUser(userId: string, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<AuditLog>>(`${this.baseUrl}/audit/user/${userId}`, { params });
  }

  getAuditLogsByAction(action: AuditAction, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<AuditLog>>(`${this.baseUrl}/audit/action/${action}`, { params });
  }

  getAuditLogsByEntityType(entityType: string, page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<AuditLog>>(`${this.baseUrl}/audit/entity-type/${entityType}`, { params });
  }

  getAuditLogsByDateRange(start: string, end: string): Observable<AuditLog[]> {
    const params = new HttpParams()
      .set('start', start)
      .set('end', end);
    return this.http.get<AuditLog[]>(`${this.baseUrl}/audit/date-range`, { params });
  }

  // ==================== Escalations ====================
  createEscalation(request: CreateEscalationRequest): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.baseUrl}/escalations`, request);
  }

  getAllEscalations(page: number = 0, size: number = 20): Observable<Page<Escalation>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<Escalation>>(`${this.baseUrl}/escalations`, { params });
  }

  getEscalationById(id: string): Observable<Escalation> {
    return this.http.get<Escalation>(`${this.baseUrl}/escalations/${id}`);
  }

  getEscalationsByStatus(status: EscalationStatus, page: number = 0, size: number = 20): Observable<Page<Escalation>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<Escalation>>(`${this.baseUrl}/escalations/status/${status}`, { params });
  }

  getEscalationsByAssignedTo(userId: string, page: number = 0, size: number = 20): Observable<Page<Escalation>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<Escalation>>(`${this.baseUrl}/escalations/assigned/${userId}`, { params });
  }

  resolveEscalation(id: string, request: ResolveEscalationRequest): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.baseUrl}/escalations/${id}/resolve`, request);
  }

  cancelEscalation(id: string): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.baseUrl}/escalations/${id}/cancel`, {});
  }

  // ==================== SLA Definitions ====================
  createSLADefinition(request: CreateSLADefinitionRequest): Observable<SLADefinition> {
    return this.http.post<SLADefinition>(`${this.baseUrl}/sla/definitions`, request);
  }

  getAllSLADefinitions(): Observable<SLADefinition[]> {
    return this.http.get<SLADefinition[]>(`${this.baseUrl}/sla/definitions`);
  }

  getSLADefinitionById(id: string): Observable<SLADefinition> {
    return this.http.get<SLADefinition>(`${this.baseUrl}/sla/definitions/${id}`);
  }

  getActiveSLADefinitions(): Observable<SLADefinition[]> {
    return this.http.get<SLADefinition[]>(`${this.baseUrl}/sla/definitions/active`);
  }

  getSLADefinitionByEntityType(entityType: string): Observable<SLADefinition> {
    return this.http.get<SLADefinition>(`${this.baseUrl}/sla/definitions/entity-type/${entityType}`);
  }

  // ==================== SLA Violations ====================
  getAllViolations(page: number = 0, size: number = 20): Observable<Page<SLAViolation>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<SLAViolation>>(`${this.baseUrl}/sla/violations`, { params });
  }

  getViolationsByEntity(entityId: string, page: number = 0, size: number = 20): Observable<Page<SLAViolation>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<SLAViolation>>(`${this.baseUrl}/sla/violations/entity/${entityId}`, { params });
  }

  getViolationsByStatus(status: SLAStatus, page: number = 0, size: number = 20): Observable<Page<SLAViolation>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<SLAViolation>>(`${this.baseUrl}/sla/violations/status/${status}`, { params });
  }

  resolveSLAViolation(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sla/violations/${id}/resolve`, {});
  }

  checkSLAViolations(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sla/check`, {});
  }

  // ==================== SAGA Transactions ====================
  getSagaStatus(id: string): Observable<SAGATransaction> {
    return this.http.get<SAGATransaction>(`${this.baseUrl}/sagas/${id}`);
  }

  startSaga(sagaType: string, initiatedBy: string): Observable<SAGATransaction> {
    const params = new HttpParams()
      .set('sagaType', sagaType)
      .set('initiatedBy', initiatedBy);
    return this.http.post<SAGATransaction>(`${this.baseUrl}/sagas/start`, null, { params });
  }

  reportStepSuccess(sagaId: string, stepId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sagas/${sagaId}/steps/${stepId}/success`, {});
  }

  reportStepFailure(sagaId: string, stepId: string, errorDetails: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sagas/${sagaId}/steps/${stepId}/failure`, errorDetails);
  }

  reportCompensationSuccess(sagaId: string, stepId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sagas/${sagaId}/steps/${stepId}/compensate`, {});
  }
}
