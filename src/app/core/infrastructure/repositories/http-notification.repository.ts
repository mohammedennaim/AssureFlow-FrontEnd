import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { Notification, CreateNotificationRequest } from '../../domain/models/notification.models';
import { Page } from '../../domain/models/workflow.models';
import { environment } from '../../../../environments/environment';

interface BaseResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class HttpNotificationRepository implements NotificationRepositoryPort {
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getAllNotifications(page: number = 0, size: number = 20): Observable<Page<Notification>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<BaseResponse<Page<Notification>>>(this.baseUrl, { params }).pipe(
      map(response => response.data)
    );
  }

  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<BaseResponse<Notification>>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  getNotificationsByPolicyId(policyId: string): Observable<Notification[]> {
    return this.http.get<BaseResponse<Notification[]>>(`${this.baseUrl}/policy/${policyId}`).pipe(
      map(response => response.data)
    );
  }

  getNotificationsByRecipient(recipient: string): Observable<Notification[]> {
    return this.http.get<BaseResponse<Notification[]>>(`${this.baseUrl}/recipient/${recipient}`).pipe(
      map(response => response.data)
    );
  }

  createNotification(request: CreateNotificationRequest): Observable<Notification> {
    return this.http.post<BaseResponse<Notification>>(this.baseUrl, request).pipe(
      map(response => response.data)
    );
  }

  sendNotification(id: string): Observable<void> {
    return this.http.post<BaseResponse<void>>(`${this.baseUrl}/${id}/send`, {}).pipe(
      map(response => response.data)
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }
}
