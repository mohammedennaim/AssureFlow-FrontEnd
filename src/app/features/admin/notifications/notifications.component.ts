import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/application/services/notification.service';
import { NotificationCountService } from '../../../core/application/services/notification-count.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Notification, NotificationType, CreateNotificationRequest } from '../../../core/domain/models/notification.models';
import { ClientsService } from '../../../core/application/services/admin-clients.service';
import { UsersService } from '../../../core/application/services/admin-users.service';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private notificationCountService = inject(NotificationCountService);
  private clientsService = inject(ClientsService);
  private usersService = inject(UsersService);
  private authService = inject(AuthService);

  filter: 'ALL' | 'UNREAD' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'ALL';
  isLoading = false;
  notifications: Notification[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 6;

  // Create notification modal
  showCreateModal = false;
  newNotification: CreateNotificationRequest = {
    type: NotificationType.POLICY_CREATED,
    channel: 'EMAIL',
    recipient: '',
    subject: '',
    content: ''
  };

  // Search & filter
  searchQuery = '';
  selectedRecipient = '';
  filterByPolicyId = '';

  // Detail modal
  showDetailModal = false;
  selectedNotification: Notification | null = null;

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    
    forkJoin({
      notificationsPage: this.notificationService.getAllNotifications(0, 1000).pipe(
        catchError(err => {
          console.error('[Notifications] Error loading notifications:', err);
          return of({ content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 });
        })
      ),
      clients: this.clientsService.getAll().pipe(catchError(() => of([]))),
      users: this.usersService.getUsers().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ notificationsPage, clients, users }) => {
        // Build an ID -> Email lookup map to resolve UUIDs
        const recipientMap = new Map<string, string>();
        clients.forEach(c => {
          if (c.id) recipientMap.set(c.id, c.email);
        });
        users.forEach(u => {
          if (u.id) recipientMap.set(u.id, u.email);
        });

        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

        this.notifications = notificationsPage.content.map(n => {
           const mappedEmail = recipientMap.get(n.recipient);
           const finalRecipient = mappedEmail 
             ? mappedEmail 
             : (uuidRegex.test(n.recipient) ? 'ID: ' + n.recipient.substring(0, 8).toUpperCase() : n.recipient);
             
           return {
              ...n,
              recipient: finalRecipient
           };
        });

        this.currentPage = 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[Notifications] Error fetching grouped data:', err);
        this.isLoading = false;
      }
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get filteredNotifications(): Notification[] {
    let filtered = this.notifications;

    // Filter by type
    if (this.filter === 'UNREAD') {
      filtered = filtered.filter(n => !n.read);
    } else if (this.filter !== 'ALL') {
      // Filter by category (INFO, SUCCESS, WARNING, ALERT)
      filtered = filtered.filter(n => this.getNotificationCategory(n.type) === this.filter);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.recipient.toLowerCase().includes(query)
      );
    }

    // Filter by recipient
    if (this.selectedRecipient) {
      filtered = filtered.filter(n => n.recipient === this.selectedRecipient);
    }

    return filtered;
  }

  get paginatedNotifications(): Notification[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredNotifications.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredNotifications.length / this.pageSize);
  }

  get totalElements(): number {
    return this.notifications.length;
  }

  get uniqueRecipients(): string[] {
    return [...new Set(this.notifications.map(n => n.recipient))].sort();
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
          notification.read = true;
        }
        this.notificationCountService.refreshCount();
      },
      error: (err) => {
        console.error('[Notifications] Error marking as read:', err);
      }
    });
  }

  markAllAsRead(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) return;

    this.notificationService.markAllAsRead(user.id).subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.notificationCountService.refreshCount();
      },
      error: (err) => {
        console.error('[Notifications] Error marking all as read:', err);
      }
    });
  }

  deleteNotification(id: string): void {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    this.notificationService.deleteNotification(id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notificationCountService.refreshCount();
      },
      error: (err) => {
        console.error('[Notifications] Error deleting notification:', err);
      }
    });
  }

  sendNotification(id: string): void {
    console.log('[SEND NOTIFICATION] Attempting to send notification:', id);
    this.notificationService.sendNotification(id).subscribe({
      next: () => {
        console.log('[SEND NOTIFICATION] Success, reloading notification details');
        // Recharger la notification depuis le backend pour obtenir le statut à jour
        this.notificationService.getNotificationById(id).subscribe({
          next: (updatedNotification) => {
            const index = this.notifications.findIndex(n => n.id === id);
            if (index !== -1) {
              this.notifications[index] = updatedNotification;
              console.log('[SEND NOTIFICATION] Updated notification:', updatedNotification);
            }
          },
          error: (err) => {
            console.error('[SEND NOTIFICATION] Error reloading notification:', err);
            // Fallback: mettre à jour localement
            const notification = this.notifications.find(n => n.id === id);
            if (notification) {
              notification.sent = true;
            }
          }
        });
      },
      error: (err) => {
        console.error('[SEND NOTIFICATION] Error details:', err);
        console.error('[SEND NOTIFICATION] Error status:', err.status);
        console.error('[SEND NOTIFICATION] Error message:', err.error);
        alert(`Error sending notification: ${err.error?.message || err.message || 'Unknown error'}`);
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.resetNewNotification();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetNewNotification();
  }

  resetNewNotification(): void {
    this.newNotification = {
      type: NotificationType.POLICY_CREATED,
      channel: 'EMAIL',
      recipient: '',
      subject: '',
      content: ''
    };
  }

  createNotification(): void {
    if (!this.newNotification.recipient || !this.newNotification.subject || !this.newNotification.content) {
      alert('Please fill in all required fields');
      return;
    }

    // Créer une copie propre sans les champs undefined
    const payload: any = {
      type: this.newNotification.type,
      channel: this.newNotification.channel,
      recipient: this.newNotification.recipient,
      subject: this.newNotification.subject,
      content: this.newNotification.content
    };

    // Ajouter les champs optionnels seulement s'ils sont définis
    if (this.newNotification.linkName) {
      payload.linkName = this.newNotification.linkName;
    }
    if (this.newNotification.policyId) {
      payload.policyId = this.newNotification.policyId;
    }

    console.log('[CREATE NOTIFICATION] Sending request:', payload);

    this.notificationService.createNotification(payload).subscribe({
      next: (notification) => {
        console.log('[CREATE NOTIFICATION] Success:', notification);
        this.notifications.unshift(notification);
        this.closeCreateModal();
        this.notificationCountService.refreshCount();
      },
      error: (err) => {
        console.error('[CREATE NOTIFICATION] Error details:', err);
        console.error('[CREATE NOTIFICATION] Error status:', err.status);
        console.error('[CREATE NOTIFICATION] Error message:', err.error);
        alert(`Error creating notification: ${err.error?.message || err.message || 'Unknown error'}`);
      }
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  clearFilters(): void {
    this.filter = 'ALL';
    this.searchQuery = '';
    this.selectedRecipient = '';
    this.currentPage = 1;
  }

  toLowerCase(value: string): string {
    return value.toLowerCase();
  }

  getNotificationCategory(type: NotificationType): 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' {
    const typeStr = type.toString();
    if (typeStr.includes('APPROVED') || typeStr.includes('PAID') || typeStr.includes('RECEIVED')) {
      return 'SUCCESS';
    } else if (typeStr.includes('EXPIRING') || typeStr.includes('REMINDER') || typeStr.includes('OVERDUE')) {
      return 'WARNING';
    } else if (typeStr.includes('CANCELLED') || typeStr.includes('REJECTED')) {
      return 'ALERT';
    }
    return 'INFO';
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
