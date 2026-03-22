// Workflow Domain Models

export enum AuditAction {
  // Client actions
  CLIENT_CREATED = 'CLIENT_CREATED',
  CLIENT_UPDATED = 'CLIENT_UPDATED',
  CLIENT_DELETED = 'CLIENT_DELETED',
  CLIENT_ACTIVATED = 'CLIENT_ACTIVATED',
  CLIENT_DEACTIVATED = 'CLIENT_DEACTIVATED',
  CLIENT_REGISTERED = 'CLIENT_REGISTERED',
  
  // Policy actions
  POLICY_CREATED = 'POLICY_CREATED',
  POLICY_UPDATED = 'POLICY_UPDATED',
  POLICY_SUBMITTED = 'POLICY_SUBMITTED',
  POLICY_APPROVED = 'POLICY_APPROVED',
  POLICY_REJECTED = 'POLICY_REJECTED',
  POLICY_CANCELLED = 'POLICY_CANCELLED',
  POLICY_EXPIRED = 'POLICY_EXPIRED',
  POLICY_RENEWED = 'POLICY_RENEWED',
  
  // Claim actions
  CLAIM_CREATED = 'CLAIM_CREATED',
  CLAIM_UPDATED = 'CLAIM_UPDATED',
  CLAIM_SUBMITTED = 'CLAIM_SUBMITTED',
  CLAIM_REVIEWED = 'CLAIM_REVIEWED',
  CLAIM_APPROVED = 'CLAIM_APPROVED',
  CLAIM_REJECTED = 'CLAIM_REJECTED',
  CLAIM_INFO_REQUESTED = 'CLAIM_INFO_REQUESTED',
  CLAIM_PAYOUT_INITIATED = 'CLAIM_PAYOUT_INITIATED',
  CLAIM_MARKED_AS_PAID = 'CLAIM_MARKED_AS_PAID',
  CLAIM_PAID = 'CLAIM_PAID',
  CLAIM_CLOSED = 'CLAIM_CLOSED',
  CLAIM_DELETED = 'CLAIM_DELETED',
  
  // Billing actions
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  INVOICE_PAID = 'INVOICE_PAID',
  INVOICE_CANCELLED = 'INVOICE_CANCELLED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  
  // User actions
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_CREATED = 'USER_CREATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // System actions
  SLA_VIOLATED = 'SLA_VIOLATED',
  ESCALATION_CREATED = 'ESCALATION_CREATED',
  ESCALATION_RESOLVED = 'ESCALATION_RESOLVED',
  SAGA_STARTED = 'SAGA_STARTED',
  SAGA_COMPLETED = 'SAGA_COMPLETED',
  SAGA_FAILED = 'SAGA_FAILED',
  SAGA_COMPENSATED = 'SAGA_COMPENSATED',
  REPORT_GENERATED = 'REPORT_GENERATED'
}

export enum EscalationLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
  CRITICAL = 'CRITICAL'
}

export enum EscalationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export enum SLAStatus {
  ACTIVE = 'ACTIVE',
  VIOLATED = 'VIOLATED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export enum SAGAStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED'
}

export enum StepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED'
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface Escalation {
  id: string;
  entityId: string;
  entityType: string;
  level: EscalationLevel;
  status: EscalationStatus;
  reason: string;
  description?: string;
  assignedTo?: string;
  assignedToName?: string;
  slaViolationId?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface SLADefinition {
  id: string;
  name: string;
  entityType: string;
  description?: string;
  durationHours: number;
  autoEscalate: boolean;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SLAViolation {
  id: string;
  slaDefinitionId: string;
  slaDefinitionName: string;
  entityId: string;
  entityType: string;
  deadline: string;
  violatedAt: string;
  delayMinutes: number;
  status: SLAStatus;
  escalated: boolean;
  escalationId?: string;
  notes?: string;
  createdAt: string;
}

export interface SAGAStep {
  id: string;
  stepName: string;
  status: StepStatus;
  action: string;
  compensationAction?: string;
  errorDetails?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SAGATransaction {
  id: string;
  sagaType: string;
  status: SAGAStatus;
  initiatedBy: string;
  createdAt: string;
  updatedAt?: string;
  steps: SAGAStep[];
}

// Request DTOs
export interface CreateAuditRequest {
  userId: string;
  username: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateEscalationRequest {
  entityId: string;
  entityType: string;
  level: EscalationLevel;
  reason: string;
  description?: string;
  assignedTo?: string;
  slaViolationId?: string;
}

export interface ResolveEscalationRequest {
  resolution: string;
  resolvedBy: string;
}

export interface CreateSLADefinitionRequest {
  name: string;
  entityType: string;
  description?: string;
  durationHours: number;
  autoEscalate: boolean;
}

// Pagination
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
