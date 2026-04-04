import { Component, OnInit, inject, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/application/services/notification.service';
import { NotificationCountService } from '../../../core/application/services/notification-count.service';
import { Notification } from '../../../core/domain/models/notification.models';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { Page } from '../../../core/domain/models/page.model';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { ClientSessionService } from '../../../core/application/services/client-session.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, RouterLink, TimeAgoPipe],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss'
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  isOpen = false;
  isLoading = false;
  isRefreshing = false;
  notifications: Notification[] = [];
  private destroy$ = new Subject<void>();
  private currentEmail: string | null = null;
  private currentClientId: string | null = null;
  private currentRole: string | null = null;

  private notificationService = inject(NotificationService);
  private notificationCountService = inject(NotificationCountService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private clientSessionService = inject(ClientSessionService);

  ngOnInit(): void {
    // Read identity from JWT first
    const user = this.authService.getCurrentUser();
    this.currentEmail = user?.id || null;
    this.currentClientId = user?.clientId || null;
    this.currentRole = user?.role || null;

    console.log('[NotificationCenter] Current user:', user);
    console.log('[NotificationCenter] Current email:', this.currentEmail);
    console.log('[NotificationCenter] Current clientId:', this.currentClientId);

    // Ensure clientId is resolved even when JWT does not include clientId claim.
    if (!this.isPrivilegedUser()) {
      this.clientSessionService.getCurrentClientId().subscribe({
        next: (resolvedClientId) => {
          if (resolvedClientId) {
            this.currentClientId = resolvedClientId;
          }
          this.loadNotifications();
        },
        error: () => {
          this.loadNotifications();
        }
      });
      return;
    }

    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get unreadCount(): number {
    return this.notificationCountService.getUnreadCount();
  }

  toggleNotifications(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.notifications.length === 0) {
      this.loadNotifications();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  loadNotifications(): void {
    this.isLoading = true;
    
    // CLIENT : utiliser getNotificationsByRecipient (autorisé)
    // ADMIN/AGENT : utiliser getAllNotifications
    if (this.isPrivilegedUser()) {
      this.notificationService.getAllNotifications(0, 100).pipe(
        catchError((err) => {
          console.error('[NotificationCenter] Error:', err);
          return of({ content: [] } as unknown as Page<Notification>);
        })
      ).subscribe({
        next: (page) => {
          console.log('[NotificationCenter] Received all notifications:', page.content.length);
          this.updateNotifications(page.content);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('[NotificationCenter] Error:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.loadClientNotifications();
    }
  }

  refreshNotifications(): void {
    this.isRefreshing = true;
    
    if (this.isPrivilegedUser()) {
      this.notificationService.getAllNotifications(0, 100).pipe(
        catchError((err) => {
          console.error('[NotificationCenter] Refresh error:', err);
          return of({ content: [] } as unknown as Page<Notification>);
        })
      ).subscribe({
        next: (page) => {
          this.updateNotifications(page.content);
          this.isRefreshing = false;
        },
        error: (err) => {
          console.error('[NotificationCenter] Refresh error:', err);
          this.isRefreshing = false;
        }
      });
    } else {
      this.refreshClientNotifications();
    }
  }

  private isPrivilegedUser(): boolean {
    const role = (this.currentRole || '').toUpperCase();
    return role === 'ADMIN' || role === 'AGENT' || role === 'ROLE_ADMIN' || role === 'ROLE_AGENT';
  }

  private loadClientNotifications(): void {
    const recipients = this.getClientRecipients();
    if (recipients.length === 0) {
      this.updateNotifications([]);
      this.isLoading = false;
      return;
    }

    const requests = recipients.map(recipient =>
      this.notificationService.getNotificationsByRecipient(recipient).pipe(
        catchError((err) => {
          console.error('[NotificationCenter] Error loading recipient notifications:', recipient, err);
          return of([] as Notification[]);
        })
      )
    );

    forkJoin(requests).pipe(
      map((results) => this.mergeNotifications(results))
    ).subscribe({
      next: (notifications) => {
        this.updateNotifications(notifications);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[NotificationCenter] Error:', err);
        this.isLoading = false;
      }
    });
  }

  private refreshClientNotifications(): void {
    const recipients = this.getClientRecipients();
    if (recipients.length === 0) {
      this.updateNotifications([]);
      this.isRefreshing = false;
      return;
    }

    const requests = recipients.map(recipient =>
      this.notificationService.getNotificationsByRecipient(recipient).pipe(
        catchError((err) => {
          console.error('[NotificationCenter] Refresh error for recipient:', recipient, err);
          return of([] as Notification[]);
        })
      )
    );

    forkJoin(requests).pipe(
      map((results) => this.mergeNotifications(results))
    ).subscribe({
      next: (notifications) => {
        this.updateNotifications(notifications);
        this.isRefreshing = false;
      },
      error: (err) => {
        console.error('[NotificationCenter] Refresh error:', err);
        this.isRefreshing = false;
      }
    });
  }

  private getClientRecipients(): string[] {
    const recipients = new Set<string>();
    if (this.currentEmail) {
      recipients.add(this.currentEmail);
    }
    if (this.currentClientId) {
      recipients.add(this.currentClientId);
    }
    return Array.from(recipients);
  }

  private mergeNotifications(notificationsByRecipient: Notification[][]): Notification[] {
    const merged = new Map<string, Notification>();
    notificationsByRecipient.flat().forEach(notification => {
      merged.set(notification.id, notification);
    });
    return this.sortByNewest(Array.from(merged.values()));
  }

  private sortByNewest(notifications: Notification[]): Notification[] {
    return [...notifications].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.sentAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.sentAt || 0).getTime();
      return bTime - aTime;
    });
  }

  private isInAppNotification(notification: Notification): boolean {
    return (notification.channel || '').toUpperCase() === 'IN_APP';
  }

  private dedupeSemanticNotifications(notifications: Notification[]): Notification[] {
    const sorted = this.sortByNewest(notifications);
    const deduped = new Map<string, Notification>();

    for (const notification of sorted) {
      const rawTimestamp = notification.createdAt || notification.sentAt || '';
      const timestampMs = new Date(rawTimestamp).getTime();
      const minuteBucket = Number.isNaN(timestampMs) ? rawTimestamp : Math.floor(timestampMs / 60000).toString();
      const signature = [
        notification.type,
        notification.title,
        notification.message,
        notification.policyId || '',
        minuteBucket
      ].join('|');

      if (!deduped.has(signature)) {
        deduped.set(signature, notification);
      }
    }

    return Array.from(deduped.values());
  }

  private updateNotifications(newNotifications: Notification[]): void {
    const role = (this.currentRole || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN';

    const filteredNotifications = newNotifications.filter((n) => {
      if (!this.isInAppNotification(n)) {
        return false;
      }

      if (isAdmin) {
        // Admin header should show only global admin notifications.
        return n.recipient === 'ADMIN';
      }

      // Client/Agent should show only own notifications.
      const isOwnRecipient = n.recipient === this.currentEmail || n.recipient === this.currentClientId;
      return isOwnRecipient && n.recipient !== 'ADMIN';
    });

    console.log('[NotificationCenter] Filtering for email:', this.currentEmail, 'clientId:', this.currentClientId);
    console.log('[NotificationCenter] Filtered from', newNotifications.length, 'to', filteredNotifications.length);
    console.log('[NotificationCenter] Filtered recipients:', [...new Set(filteredNotifications.map(n => n.recipient))]);

    const normalizedNotifications = isAdmin
      ? filteredNotifications
      : this.dedupeSemanticNotifications(filteredNotifications);

    this.notifications = this.sortByNewest(normalizedNotifications);
    const unread = this.notifications.filter(n => !n.read).length;
    console.log('[NotificationCenter] Updated - total:', this.notifications.length, 'unread:', unread);
    this.notificationCountService.setUnreadCount(unread);
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.read = true;
          const unread = this.notifications.filter(n => !n.read).length;
          this.notificationCountService.setUnreadCount(unread);
        },
        error: (err) => {
          console.error('[NotificationCenter] Error marking as read:', err);
          notification.read = true;
          const unread = this.notifications.filter(n => !n.read).length;
          this.notificationCountService.setUnreadCount(unread);
        }
      });
    }
  }

  markAllAsRead(): void {
    const recipients = this.isPrivilegedUser()
      ? (this.currentEmail ? [this.currentEmail] : [])
      : this.getClientRecipients();
    if (recipients.length === 0) return;

    const requests = recipients.map(recipient =>
      this.notificationService.markAllAsRead(recipient).pipe(
        catchError((err) => {
          console.error('[NotificationCenter] Error marking all as read for recipient:', recipient, err);
          return of(void 0);
        })
      )
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.notificationCountService.setUnreadCount(0);
      },
      error: (err) => {
        console.error('[NotificationCenter] Error marking all as read:', err);
        this.notifications.forEach(n => n.read = true);
        this.notificationCountService.setUnreadCount(0);
      }
    });
  }

  onNotificationClick(notification: Notification): void {
    this.markAsRead(notification);

    if (notification.policyId) {
      this.router.navigate(['/admin/policies', notification.policyId]);
    } else {
      this.router.navigate(['/admin/notifications']);
    }
    this.close();
  }

  getNotificationTypeClass(type: string): string {
    const typeMap: Record<string, string> = {
      SUCCESS: 'success',
      INFO: 'info',
      WARNING: 'warning',
      ALERT: 'error'
    };
    return typeMap[type] || 'info';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-center')) {
      this.close();
    }
  }
}
