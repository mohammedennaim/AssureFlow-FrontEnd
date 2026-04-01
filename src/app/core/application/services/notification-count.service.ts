import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, interval, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { AuthService } from '../../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationCountService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private pollingInterval = 30000;

  constructor() {
    this.startPolling();
  }

  private startPolling(): void {
    this.fetchUnreadCount();
    interval(this.pollingInterval).pipe(
      switchMap(() => this.fetchUnreadCount())
    ).subscribe();
  }

  private fetchUnreadCount(): Observable<number> {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return of(0);
    }

    const userEmail = user.id;
    const userClientId = user.clientId;
    console.log('[NotificationCount] Fetching count for:', userEmail, 'clientId:', userClientId, 'role:', user.role);

    // CLIENT : utiliser getNotificationsByRecipient (autorisé)
    if (user.role === 'CLIENT') {
      const recipients = [userEmail, userClientId].filter((value, index, array) =>
        !!value && array.indexOf(value) === index
      ) as string[];

      if (recipients.length === 0) {
        this.unreadCountSubject.next(0);
        return of(0);
      }

      const requests = recipients.map(recipient =>
        this.notificationService.getNotificationsByRecipient(recipient).pipe(
          catchError((err) => {
            console.error('[NotificationCount] Error fetching recipient notifications:', recipient, err);
            return of([]);
          })
        )
      );

      return forkJoin(requests).pipe(
        switchMap(notifications => {
          const merged = new Map<string, { read: boolean }>();
          notifications.flat().forEach(notification => merged.set(notification.id, notification));
          const unread = Array.from(merged.values()).filter(n => !n.read).length;
          console.log('[NotificationCount] CLIENT unread:', unread, '(email:', userEmail + ')');
          this.unreadCountSubject.next(unread);
          return of(unread);
        }),
        catchError((err) => {
          console.error('[NotificationCount] Error:', err);
          return of(0);
        })
      );
    }

    // ADMIN/AGENT : filtrer par email OU clientId
    return this.notificationService.getAllNotifications(0, 100).pipe(
      switchMap(page => {
        const unread = page.content.filter(n => 
          !n.read && (n.recipient === userEmail || n.recipient === userClientId)
        ).length;
        console.log('[NotificationCount]', user.role, 'unread:', unread, '(email:', userEmail + ')');
        this.unreadCountSubject.next(unread);
        return of(unread);
      }),
      catchError((err) => {
        console.error('[NotificationCount] Error:', err);
        return of(0);
      })
    );
  }

  refreshCount(): void {
    this.fetchUnreadCount().subscribe();
  }

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.getValue();
  }
}
