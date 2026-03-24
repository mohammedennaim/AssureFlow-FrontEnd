import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { HttpNotificationRepository } from '../../infrastructure/repositories/http-notification.repository';
import { Notification, CreateNotificationRequest } from '../../domain/models/notification.models';
import { Page } from '../../domain/models/workflow.models';

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

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private repository: NotificationRepositoryPort = inject(HttpNotificationRepository);

  getAllNotifications(page: number = 0, size: number = 20): Observable<Page<Notification>> {
    return this.repository.getAllNotifications(page, size);
  }

  getNotificationById(id: string): Observable<Notification> {
    return this.repository.getNotificationById(id);
  }

  getNotificationsByPolicyId(policyId: string): Observable<Notification[]> {
    return this.repository.getNotificationsByPolicyId(policyId);
  }

  getNotificationsByRecipient(recipient: string): Observable<Notification[]> {
    return this.repository.getNotificationsByRecipient(recipient);
  }

  createNotification(request: CreateNotificationRequest): Observable<Notification> {
    return this.repository.createNotification(request);
  }

  sendNotification(id: string): Observable<void> {
    return this.repository.sendNotification(id);
  }

  markAsRead(id: string): Observable<void> {
    return this.repository.markAsRead(id);
  }

  markAllAsRead(recipient: string): Observable<void> {
    return this.repository.markAllAsRead(recipient);
  }

  getUnreadCount(recipient: string): Observable<number> {
    return this.repository.getUnreadCount(recipient);
  }

  deleteNotification(id: string): Observable<void> {
    return this.repository.deleteNotification(id);
  }

  getStatistics(): Observable<NotificationStatistics> {
    return this.repository.getStatistics();
  }
}
