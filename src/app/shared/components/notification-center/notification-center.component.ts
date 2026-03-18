import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss'
})
export class NotificationCenterComponent implements OnInit {
  isOpen = false;
  notifications: Notification[] = [];

  ngOnInit(): void {
    // Mock notifications - replace with real API call
    this.loadNotifications();
  }

  toggleNotifications(): void {
    this.isOpen = !this.isOpen;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notification: Notification): void {
    notification.read = true;
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  private loadNotifications(): void {
    // Mock data - replace with real API
    this.notifications = [
      {
        id: '1',
        title: 'Claim Approved',
        message: 'Your claim #CLM-2024-001 has been approved',
        type: 'success',
        timestamp: new Date(Date.now() - 3600000),
        read: false
      },
      {
        id: '2',
        title: 'Payment Due',
        message: 'Payment of $1,200 is due in 3 days',
        type: 'warning',
        timestamp: new Date(Date.now() - 7200000),
        read: false
      },
      {
        id: '3',
        title: 'Policy Renewal',
        message: 'Your policy will expire in 30 days',
        type: 'info',
        timestamp: new Date(Date.now() - 86400000),
        read: true
      }
    ];
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
