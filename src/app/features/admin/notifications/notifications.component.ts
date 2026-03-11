import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="notifications-page">
  <header class="page-header">
    <div class="page-header__start">
      <div class="page-header__icon notifications-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <div class="page-header__content">
        <h1 class="page-header__title">Notifications</h1>
        <p class="page-header__subtitle">{{ unreadCount }} unread notifications</p>
      </div>
    </div>
    <div class="page-header__actions">
      <button class="btn btn--secondary" (click)="markAllAsRead()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M13.1667 4L6 11.1667L2.83337 8"/>
        </svg>
        Mark all read
      </button>
    </div>
  </header>

  <div class="notifications-filters">
    <button class="filter-chip" [class.active]="filter === 'ALL'" (click)="filter = 'ALL'">All</button>
    <button class="filter-chip" [class.active]="filter === 'UNREAD'" (click)="filter = 'UNREAD'">
      Unread
      @if (unreadCount > 0) {
        <span class="filter-chip__badge">{{ unreadCount }}</span>
      }
    </button>
    <button class="filter-chip" [class.active]="filter === 'INFO'" (click)="filter = 'INFO'">
      <span class="filter-chip__dot filter-chip__dot--info"></span>Info
    </button>
    <button class="filter-chip" [class.active]="filter === 'SUCCESS'" (click)="filter = 'SUCCESS'">
      <span class="filter-chip__dot filter-chip__dot--success"></span>Success
    </button>
    <button class="filter-chip" [class.active]="filter === 'WARNING'" (click)="filter = 'WARNING'">
      <span class="filter-chip__dot filter-chip__dot--warning"></span>Warning
    </button>
    <button class="filter-chip" [class.active]="filter === 'ALERT'" (click)="filter = 'ALERT'">
      <span class="filter-chip__dot filter-chip__dot--alert"></span>Alert
    </button>
  </div>

  <div class="notifications-list">
    @for (notification of filteredNotifications; track notification.id; let first = $first) {
      <div class="notification-item" [class.notification-item--unread]="!notification.read" [class.notification-item--first]="first">
        <div class="notification-item__icon notification-item__icon--{{ toLowerCase(notification.type) }}">
          @if (notification.type === 'INFO') {
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="9" cy="9" r="6"/>
              <path d="M9 9V6M9 12h.01"/>
            </svg>
          } @else if (notification.type === 'SUCCESS') {
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="9" cy="9" r="6"/>
              <path d="M6.5 9L9 11.5L11.5 8.5"/>
            </svg>
          } @else if (notification.type === 'WARNING') {
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 2L2 15h14L9 2z"/>
              <path d="M9 8v4M9 15h.01"/>
            </svg>
          } @else if (notification.type === 'ALERT') {
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="9" cy="9" r="6"/>
              <path d="M9 6v6M9 15h.01"/>
            </svg>
          }
        </div>

        <div class="notification-item__content">
          <div class="notification-item__header">
            <h4 class="notification-item__title">{{ notification.title }}</h4>
            <span class="notification-item__time">{{ notification.time }}</span>
          </div>
          <p class="notification-item__message">{{ notification.message }}</p>
          @if (notification.action) {
            <button class="notification-item__action">{{ notification.action }}</button>
          }
        </div>

        @if (!notification.read) {
          <button class="notification-item__mark" (click)="markAsRead(notification.id)" title="Mark as read">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M13.1667 4L6 11.1667L2.83337 8"/>
            </svg>
          </button>
        }
      </div>
    } @empty {
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M32 8a12 12 0 0 0-12 12v5c0 4-2 6-4 8h32c-2-2-4-4-4-8v-5A12 12 0 0 0 32 8z"/>
          <path d="M20 40c0 4 4 8 12 8s12-4 12-8"/>
        </svg>
        <h3>No notifications</h3>
        <p>You're all caught up!</p>
      </div>
    }
  </div>
</div>
  `,
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent {
  filter = 'ALL';
  
  notifications = [
    { id: '1', type: 'ALERT', title: 'High-risk claim detected', message: 'Claim CLM-2024-0891 requires immediate attention due to unusual pattern.', time: '5 min ago', read: false, action: 'Review Claim' },
    { id: '2', type: 'SUCCESS', title: 'Policy renewed successfully', message: 'Policy POL-2024-001 for Jean Dupont has been automatically renewed.', time: '1 hour ago', read: false },
    { id: '3', type: 'WARNING', title: 'Payment overdue', message: 'Invoice INV-2024-003 for Pierre Bernard is 15 days overdue.', time: '2 hours ago', read: false, action: 'Send Reminder' },
    { id: '4', type: 'INFO', title: 'New client registered', message: 'Emma Richard has created a new account and is looking for insurance quotes.', time: '3 hours ago', read: true },
    { id: '5', type: 'SUCCESS', title: 'Claim approved', message: 'Claim CLM-2024-0875 for Sophie Petit has been approved for €1,150.', time: '5 hours ago', read: true },
    { id: '6', type: 'INFO', title: 'System maintenance scheduled', message: 'Scheduled maintenance on Sunday 2AM-4AM. Some features may be unavailable.', time: '1 day ago', read: true },
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get filteredNotifications() {
    if (this.filter === 'ALL') return this.notifications;
    if (this.filter === 'UNREAD') return this.notifications.filter(n => !n.read);
    return this.notifications.filter(n => n.type === this.filter);
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) notification.read = true;
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  toLowerCase(value: string): string {
    return value.toLowerCase();
  }
}
