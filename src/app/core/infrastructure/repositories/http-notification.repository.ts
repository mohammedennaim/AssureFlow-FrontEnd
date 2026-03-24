import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { NotificationRepositoryPort, NotificationStatistics } from '../../domain/ports/notification.repository.port';
import { Notification, CreateNotificationRequest, NotificationType } from '../../domain/models/notification.models';
import { Page } from '../../domain/models/workflow.models';
import { environment } from '../../../../environments/environment';

interface BaseResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface BackendNotification {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  subject?: string;
  content?: string;
  status: string;
  policyId?: string;
  sentAt?: string;
  createdAt?: string;
  read?: boolean;  // Ajout du champ read
}

@Injectable({ providedIn: 'root' })
export class HttpNotificationRepository implements NotificationRepositoryPort {
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  private mapBackendNotification(backend: BackendNotification): Notification {
    const isSent = backend.status === 'DELIVERED' || backend.status === 'SENT';
    // Le champ read vient du backend, sinon on considère que c'est non lu
    const isRead = backend.read === true;
    
    let notificationType: NotificationType = NotificationType.INFO;
    const backendType = backend.type?.toUpperCase() || '';
    
    if (backendType.includes('APPROVED') || backendType.includes('SUCCESS') || 
        backendType.includes('DELIVERED') || backendType.includes('PAID') ||
        backendType.includes('RECEIVED')) {
      notificationType = NotificationType.SUCCESS;
    } else if (backendType.includes('EXPIRING') || backendType.includes('REMINDER') || 
               backendType.includes('OVERDUE')) {
      notificationType = NotificationType.WARNING;
    } else if (backendType.includes('CANCELLED') || backendType.includes('REJECTED') || 
               backendType.includes('FAILED')) {
      notificationType = NotificationType.ALERT;
    } else {
      notificationType = NotificationType.INFO;
    }

    return {
      id: backend.id,
      type: notificationType,
      title: backend.subject || 'Notification',
      message: backend.content || '',
      recipient: backend.recipient,
      policyId: backend.policyId,
      read: isRead,  // Utiliser le champ read du backend
      sent: isSent,
      createdAt: backend.createdAt || backend.sentAt || new Date().toISOString(),
      sentAt: backend.sentAt
    };
  }

  getAllNotifications(page: number = 0, size: number = 20): Observable<Page<Notification>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<BaseResponse<Page<BackendNotification>>>(this.baseUrl, { params }).pipe(
      map(response => ({
        ...response.data,
        content: response.data.content.map(n => this.mapBackendNotification(n))
      }))
    );
  }

  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<BaseResponse<BackendNotification>>(`${this.baseUrl}/${id}`).pipe(
      map(response => this.mapBackendNotification(response.data))
    );
  }

  getNotificationsByPolicyId(policyId: string): Observable<Notification[]> {
    return this.http.get<BaseResponse<BackendNotification[]>>(`${this.baseUrl}/policy/${policyId}`).pipe(
      map(response => response.data.map(n => this.mapBackendNotification(n)))
    );
  }

  getNotificationsByRecipient(recipient: string): Observable<Notification[]> {
    return this.http.get<BaseResponse<BackendNotification[]>>(`${this.baseUrl}/recipient/${recipient}`).pipe(
      map(response => response.data.map(n => this.mapBackendNotification(n)))
    );
  }

  createNotification(request: CreateNotificationRequest): Observable<Notification> {
    return this.http.post<BaseResponse<BackendNotification>>(this.baseUrl, request).pipe(
      map(response => this.mapBackendNotification(response.data))
    );
  }

  sendNotification(id: string): Observable<void> {
    return this.http.post<BaseResponse<void>>(`${this.baseUrl}/${id}/send`, {}).pipe(
      map(response => response.data)
    );
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<BaseResponse<void>>(`${this.baseUrl}/${id}/read`, {}).pipe(
      map(response => response.data)
    );
  }

  markAllAsRead(recipient: string): Observable<void> {
    return this.http.put<BaseResponse<void>>(`${this.baseUrl}/recipient/${recipient}/read-all`, {}).pipe(
      map(response => response.data)
    );
  }

  getUnreadCount(recipient: string): Observable<number> {
    return this.http.get<BaseResponse<number>>(`${this.baseUrl}/recipient/${recipient}/unread-count`).pipe(
      map(response => response.data)
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  getStatistics(): Observable<NotificationStatistics> {
    return this.http.get<BaseResponse<NotificationStatistics>>(`${this.baseUrl}/stats`).pipe(
      map(response => response.data)
    );
  }
}
