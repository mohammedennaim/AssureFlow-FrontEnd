// Notification Domain Models

export enum NotificationType {
  POLICY_CREATED = 'POLICY_CREATED',
  POLICY_APPROVED = 'POLICY_APPROVED',
  POLICY_REJECTED = 'POLICY_REJECTED',
  POLICY_RENEWED = 'POLICY_RENEWED',
  POLICY_EXPIRING = 'POLICY_EXPIRING',
  POLICY_CANCELLED = 'POLICY_CANCELLED',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  CLAIM_SUBMITTED = 'CLAIM_SUBMITTED',
  CLAIM_APPROVED = 'CLAIM_APPROVED',
  CLAIM_REJECTED = 'CLAIM_REJECTED',
  CLAIM_UNDER_REVIEW = 'CLAIM_UNDER_REVIEW',
  CLAIM_PAID = 'CLAIM_PAID',
  // Legacy types for display purposes
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ALERT = 'ALERT'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipient: string;
  channel?: string;
  policyId?: string;
  read: boolean;
  sent: boolean;
  createdAt: string;
  sentAt?: string;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  channel: string;
  recipient: string;
  linkName?: string;
  subject: string;
  content: string;
  policyId?: string;
}
