import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { AuthService } from '../../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationCountService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private pollingInterval = 30000; // Poll every 30 seconds

  constructor() {
    this.startPolling();
  }

  private startPolling(): void {
    // Initial fetch
    this.fetchUnreadCount();

    // Poll every 30 seconds
    interval(this.pollingInterval).pipe(
      switchMap(() => this.fetchUnreadCount())
    ).subscribe();
  }

  private fetchUnreadCount(): Observable<number> {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return of(0);
    }

    return this.notificationService.getUnreadCount(user.id).pipe(
      tap(count => this.unreadCountSubject.next(count)),
      catchError(() => {
        console.error('[NotificationCount] Error fetching unread count');
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
