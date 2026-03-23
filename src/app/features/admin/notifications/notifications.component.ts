import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/application/services/notification.service';
import { Notification, NotificationType } from '../../../core/domain/models/notification.models';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);

  filter: 'ALL' | 'UNREAD' | NotificationType = 'ALL';
  isLoading = false;
  notifications: Notification[] = [];

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getAllNotifications(0, 50).pipe(
      catchError(err => {
        console.error('[Notifications] Error loading notifications:', err);
        this.isLoading = false;
        return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
      })
    ).subscribe({
      next: (page) => {
        this.notifications = page.content.map(n => ({
          ...n,
          read: false
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Notifications] Error:', err);
        this.isLoading = false;
      }
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get filteredNotifications(): Notification[] {
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

  timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }
}
