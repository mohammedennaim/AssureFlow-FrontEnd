// Notification Domain Models

export enum NotificationType {
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
  policyId?: string;
  read: boolean;
  sent: boolean;
  createdAt: string;
  sentAt?: string;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  recipient: string;
  policyId?: string;
}
