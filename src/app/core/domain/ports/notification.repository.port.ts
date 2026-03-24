import { Observable } from 'rxjs';
import { Notification, CreateNotificationRequest } from '../models/notification.models';
import { Page } from '../models/workflow.models';

export interface NotificationStatistics {
  totalNotifications: number;
  deliveredCount: number;
  pendingCount: number;
  failedCount: number;
  emailCount: number;
  smsCount: number;
  pushCount: number;
  successRate: number;
  recentNotifications: number;
}

export abstract class NotificationRepositoryPort {
  abstract getAllNotifications(page: number, size: number): Observable<Page<Notification>>;
  abstract getNotificationById(id: string): Observable<Notification>;
  abstract getNotificationsByPolicyId(policyId: string): Observable<Notification[]>;
  abstract getNotificationsByRecipient(recipient: string): Observable<Notification[]>;
  abstract createNotification(request: CreateNotificationRequest): Observable<Notification>;
  abstract sendNotification(id: string): Observable<void>;
  abstract markAsRead(id: string): Observable<void>;
  abstract markAllAsRead(recipient: string): Observable<void>;
  abstract getUnreadCount(recipient: string): Observable<number>;
  abstract deleteNotification(id: string): Observable<void>;
  abstract getStatistics(): Observable<NotificationStatistics>;
}
