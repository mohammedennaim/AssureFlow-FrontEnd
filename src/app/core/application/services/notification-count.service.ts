import { Injectable, inject, DestroyRef } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, interval, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from './notification.service';
import { AuthService } from '../../auth/auth.service';
import { ClientSessionService } from './client-session.service';

@Injectable({ providedIn: 'root' })
export class NotificationCountService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private clientSessionService = inject(ClientSessionService);
  private destroyRef = inject(DestroyRef);
  private pollingInterval = 30000;

  private isInAppNotification(channel?: string): boolean {
    return (channel || '').toUpperCase() === 'IN_APP';
  }

  constructor() {
    this.startPolling();
  }

  private startPolling(): void {
    this.fetchUnreadCount();
    interval(this.pollingInterval).pipe(
      switchMap(() => this.fetchUnreadCount()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  private fetchUnreadCount(): Observable<number> {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return of(0);
    }

    const userEmail = user.id;

    // CLIENT : utiliser getNotificationsByRecipient (autorisé)
    if (user.role === 'CLIENT') {
      return this.clientSessionService.getCurrentClientId().pipe(
        switchMap((resolvedClientId) => {
          const recipients = [userEmail, resolvedClientId].filter((value, index, array) =>
            !!value && array.indexOf(value) === index
          ) as string[];

          if (recipients.length === 0) {
            this.unreadCountSubject.next(0);
            return of(0);
          }

          const requests = recipients.map(recipient =>
            this.notificationService.getNotificationsByRecipient(recipient).pipe(
              catchError(() => of([]))
            )
          );

          return forkJoin(requests).pipe(
            switchMap(notifications => {
              const merged = new Map<string, { read: boolean; channel?: string; type?: string; title?: string; message?: string; policyId?: string; createdAt?: string; sentAt?: string }>();
              notifications.flat().forEach(notification => merged.set(notification.id, notification));

              const inApp = Array.from(merged.values()).filter(n => this.isInAppNotification(n.channel));
              const deduped = new Map<string, { read: boolean }>();
              inApp
                .sort((a, b) => new Date((b.createdAt || b.sentAt || 0) as string).getTime() - new Date((a.createdAt || a.sentAt || 0) as string).getTime())
                .forEach(n => {
                  const rawTimestamp = n.createdAt || n.sentAt || '';
                  const timestampMs = new Date(rawTimestamp).getTime();
                  const minuteBucket = Number.isNaN(timestampMs) ? rawTimestamp : Math.floor(timestampMs / 60000).toString();
                  const signature = [n.type || '', n.title || '', n.message || '', n.policyId || '', minuteBucket].join('|');
                  if (!deduped.has(signature)) {
                    deduped.set(signature, { read: n.read });
                  }
                });

              const unread = Array.from(deduped.values()).filter(n => !n.read).length;
              this.unreadCountSubject.next(unread);
              return of(unread);
            })
          );
        }),
        catchError(() => of(0))
      );
    }

    // ADMIN/AGENT : filtrer par email OU clientId
    return this.notificationService.getAllNotifications(0, 100).pipe(
      switchMap(page => {
        const userClientId = user.clientId;
        const unread = page.content.filter(n =>
          !n.read && this.isInAppNotification(n.channel) && (n.recipient === userEmail || n.recipient === userClientId || n.recipient === 'ADMIN')
        ).length;
        this.unreadCountSubject.next(unread);
        return of(unread);
      }),
      catchError(() => of(0))
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
