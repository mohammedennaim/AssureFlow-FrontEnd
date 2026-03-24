import { Component, OnInit, inject, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../../core/application/services/notification.service';
import { NotificationCountService } from '../../../../../core/application/services/notification-count.service';
import { Notification } from '../../../../../core/domain/models/notification.models';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-dropdown" [class.open]="isOpen">
      <button class="topbar__btn notification-dropdown__trigger" (click)="toggle()" type="button" aria-label="Notifications">
        <div class="notification-icon-wrapper">
          <svg class="notification-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="notification-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366F1"/>
                <stop offset="100%" stop-color="#8B5CF6"/>
              </linearGradient>
            </defs>
            <path class="notification-icon__bell" d="M11 3C8.5 3 6.5 5 6.5 7.5V11.5C6.5 12.8 5.5 14 4 14H18C16.5 14 15.5 12.8 15.5 11.5V7.5C15.5 5 13.5 3 11 3Z" stroke="url(#notification-gradient)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path class="notification-icon__clapper" d="M8.5 16.5C8.5 18.433 9.767 20 11 20C12.233 20 13.5 18.433 13.5 16.5" stroke="url(#notification-gradient)" stroke-width="1.8" stroke-linecap="round"/>
            <circle class="notification-icon__dot" cx="11" cy="5" r="1.5" fill="#EF4444"/>
          </svg>
          <span class="notification-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
        </div>
      </button>

      <div class="notification-dropdown__panel" *ngIf="isOpen">
        <div class="notification-dropdown__header">
          <h3 class="notification-dropdown__title">Notifications</h3>
          <div class="notification-dropdown__actions">
            <button class="notification-dropdown__refresh" (click)="refreshNotifications()" title="Rafraîchir">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 8C14 11.3137 11.3137 14 8 14C5.52285 14 3.39894 12.5017 2.48223 10.3571"/>
                <path d="M2 8C2 4.68629 4.68629 2 8 2C10.4772 2 12.6011 3.49826 13.5178 5.64289"/>
                <path d="M2 4V8H6"/>
                <path d="M14 12V8H10"/>
              </svg>
            </button>
            <button class="notification-dropdown__mark-all" (click)="markAllAsRead()" *ngIf="unreadCount > 0">
              Mark all read
            </button>
          </div>
        </div>

        <div class="notification-dropdown__loading" *ngIf="isLoading && notifications.length === 0">
          <div class="spinner"></div>
          <span>Loading notifications...</span>
        </div>

        <div class="notification-dropdown__refreshing" *ngIf="isRefreshing">
          <div class="spinner--small"></div>
          <span>Actualisation...</span>
        </div>

        <div class="notification-dropdown__list" *ngIf="!isLoading && notifications.length > 0">
          <div class="notification-dropdown__item" 
               *ngFor="let notification of notifications | slice:0:5"
               [class.notification-dropdown__item--unread]="!notification.read"
               (click)="onNotificationClick(notification)">
            <div class="notification-dropdown__item-icon" [class]="'notification-dropdown__item-icon--' + getNotificationTypeClass(notification.type)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" *ngIf="notification.type === 'SUCCESS'">
                <circle cx="8" cy="8" r="6"/>
                <path d="M5.5 8L8 10.5L10.5 7.5"/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" *ngIf="notification.type === 'INFO'">
                <circle cx="8" cy="8" r="6"/>
                <path d="M8 8V6M8 11h.01"/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" *ngIf="notification.type === 'WARNING'">
                <path d="M8 2L2 13h12L8 2z"/>
                <path d="M8 7v4M8 13h.01"/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" *ngIf="notification.type === 'ALERT'">
                <circle cx="8" cy="8" r="6"/>
                <path d="M8 5v6M8 13h.01"/>
              </svg>
            </div>
            <div class="notification-dropdown__item-content">
              <h4 class="notification-dropdown__item-title">{{ notification.title }}</h4>
              <p class="notification-dropdown__item-message">{{ notification.message | slice:0:60 }}{{ notification.message.length > 60 ? '...' : '' }}</p>
              <span class="notification-dropdown__item-time">{{ timeAgo(notification.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="notification-dropdown__empty" *ngIf="!isLoading && notifications.length === 0">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M24 8C19 8 15 12 15 17V25C15 28 12 31 9 31H39C36 31 33 28 33 25V17C33 12 29 8 24 8Z"/>
            <path d="M18 37C18 40 20 43 24 43C28 43 30 40 30 37"/>
          </svg>
          <p>Aucune notification</p>
        </div>

        <div class="notification-dropdown__footer" *ngIf="notifications.length > 0">
          <a routerLink="/admin/notifications" class="notification-dropdown__view-all">
            Voir toutes les notifications
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 12L10 8L6 4"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-dropdown {
      position: relative;
    }

    .notification-dropdown__trigger {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .notification-icon-wrapper:hover {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      transform: scale(1.05);
    }

    .notification-icon {
      filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3));
    }

    .notification-icon__bell {
      animation: bell-glow 2s ease-in-out infinite;
    }

    @keyframes bell-glow {
      0%, 100% {
        filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.5));
      }
      50% {
        filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.8));
      }
    }

    .notification-icon__clapper {
      transform-origin: center 16.5px;
      animation: clapper-swing 3s ease-in-out infinite;
    }

    @keyframes clapper-swing {
      0%, 100% {
        transform: rotate(-5deg);
      }
      50% {
        transform: rotate(5deg);
      }
    }

    .notification-icon__dot {
      animation: dot-pulse 1.5s ease-in-out infinite;
    }

    @keyframes dot-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.8;
      }
    }

    .notification-badge {
      position: absolute;
      top: 8px;
      right: 4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;
      font-size: 11px;
      font-weight: 700;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5), 0 0 0 2px #fff;
      animation: badge-pulse 2s ease-in-out infinite;
      z-index: 10;
    }

    @keyframes badge-pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
      }
      50% {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
      }
    }

    .notification-dropdown__panel {
      position: absolute;
      top: 100%;
      right: 0;
      width: 380px;
      max-height: 480px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      border: 1px solid #e5e7eb;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .notification-dropdown__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .notification-dropdown__title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .notification-dropdown__actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .notification-dropdown__refresh {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      color: #6b7280;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-dropdown__refresh:hover {
      background-color: #f3f4f6;
      color: #6366f1;
      transform: rotate(90deg);
    }

    .notification-dropdown__mark-all {
      font-size: 13px;
      color: #6366f1;
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 500;
    }

    .notification-dropdown__mark-all:hover {
      text-decoration: underline;
    }

    .notification-dropdown__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #6b7280;
      gap: 12px;
    }

    .notification-dropdown__refreshing {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      background-color: #f9fafb;
      color: #6366f1;
      font-size: 13px;
      border-bottom: 1px solid #e5e7eb;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #e5e7eb;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner--small {
      width: 16px;
      height: 16px;
      border: 2px solid #e5e7eb;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .notification-dropdown__list {
      overflow-y: auto;
      max-height: 340px;
    }

    .notification-dropdown__item {
      display: flex;
      gap: 12px;
      padding: 14px 20px;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 1px solid #f3f4f6;
    }

    .notification-dropdown__item:hover {
      background-color: #f9fafb;
    }

    .notification-dropdown__item--unread {
      background-color: #f0f0ff;
    }

    .notification-dropdown__item--unread:hover {
      background-color: #e8e8ff;
    }

    .notification-dropdown__item-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-dropdown__item-icon--success {
      background-color: #d1fae5;
      color: #059669;
    }

    .notification-dropdown__item-icon--info {
      background-color: #dbeafe;
      color: #2563eb;
    }

    .notification-dropdown__item-icon--warning {
      background-color: #fef3c7;
      color: #d97706;
    }

    .notification-dropdown__item-icon--alert {
      background-color: #fee2e2;
      color: #dc2626;
    }

    .notification-dropdown__item-content {
      flex: 1;
      min-width: 0;
    }

    .notification-dropdown__item-title {
      font-size: 14px;
      font-weight: 500;
      color: #1f2937;
      margin: 0 0 4px 0;
    }

    .notification-dropdown__item-message {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 6px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notification-dropdown__item-time {
      font-size: 12px;
      color: #9ca3af;
    }

    .notification-dropdown__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #9ca3af;
      gap: 12px;
    }

    .notification-dropdown__empty svg {
      opacity: 0.5;
    }

    .notification-dropdown__empty p {
      margin: 0;
      font-size: 14px;
    }

    .notification-dropdown__footer {
      padding: 12px 20px;
      border-top: 1px solid #e5e7eb;
      background-color: #f9fafb;
    }

    .notification-dropdown__view-all {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }

    .notification-dropdown__view-all:hover {
      color: #4f46e5;
    }
  `]
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  isOpen = false;
  isLoading = false;
  isRefreshing = false;
  notifications: Notification[] = [];
  private destroy$ = new Subject<void>();

  private notificationService = inject(NotificationService);
  private notificationCountService = inject(NotificationCountService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadNotifications();
    // Rafraîchissement automatique toutes les 30 secondes
    interval(30000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.notificationService.getAllNotifications(0, 50))
      )
      .subscribe({
        next: (page) => {
          this.updateNotifications(page.content);
        },
        error: (err) => {
          console.error('[NotificationDropdown] Auto-refresh error:', err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get unreadCount(): number {
    return this.notificationCountService.getUnreadCount();
  }

  toggle(): void {
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
    this.notificationService.getAllNotifications(0, 50).subscribe({
      next: (page) => {
        this.updateNotifications(page.content);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[NotificationDropdown] Error:', err);
        this.isLoading = false;
      }
    });
  }

  refreshNotifications(): void {
    this.isRefreshing = true;
    this.notificationService.getAllNotifications(0, 50).subscribe({
      next: (page) => {
        this.updateNotifications(page.content);
        this.isRefreshing = false;
      },
      error: (err) => {
        console.error('[NotificationDropdown] Refresh error:', err);
        this.isRefreshing = false;
      }
    });
  }

  private updateNotifications(newNotifications: Notification[]): void {
    // Mettre à jour uniquement si les données ont changé
    const hasChanged = JSON.stringify(newNotifications) !== JSON.stringify(this.notifications);
    if (hasChanged) {
      this.notifications = newNotifications;  // Garder le champ read tel quel du backend
      // Mettre à jour le compteur global
      const unread = this.notifications.filter(n => !n.read).length;
      this.notificationCountService.setUnreadCount(unread);
      console.log('[NotificationDropdown] Updated notifications:', {
        total: this.notifications.length,
        unread: unread,
        notifications: this.notifications.map(n => ({ id: n.id, read: n.read, title: n.title }))
      });
    } else {
      // Même si les données n'ont pas changé, mettre à jour le compteur
      const unread = this.notifications.filter(n => !n.read).length;
      this.notificationCountService.setUnreadCount(unread);
    }
  }

  markAllAsRead(): void {
    const currentUser = 'admin@assureflow.com'; // TODO: Get from auth service
    this.notificationService.markAllAsRead(currentUser).subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.notificationCountService.setUnreadCount(0);
      },
      error: (err) => {
        console.error('[NotificationDropdown] Error marking all as read:', err);
        // Fallback: mark locally even if API fails
        this.notifications.forEach(n => n.read = true);
        this.notificationCountService.setUnreadCount(0);
      }
    });
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.read = true;
          const unread = this.notifications.filter(n => !n.read).length;
          this.notificationCountService.setUnreadCount(unread);
        },
        error: (err) => {
          console.error('[NotificationDropdown] Error marking as read:', err);
          // Fallback: mark locally even if API fails
          notification.read = true;
          const unread = this.notifications.filter(n => !n.read).length;
          this.notificationCountService.setUnreadCount(unread);
        }
      });
    }
    
    if (notification.policyId) {
      this.router.navigate(['/admin/policies', notification.policyId]);
    } else {
      this.router.navigate(['/admin/notifications']);
    }
    this.close();
  }

  timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "À l'instant";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}j`;
  }

  getNotificationTypeClass(type: string): string {
    return type.toLowerCase();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-dropdown')) {
      this.close();
    }
  }
}
