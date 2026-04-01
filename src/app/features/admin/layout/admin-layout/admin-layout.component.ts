import { Component, inject, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationCenterComponent } from '../../../../shared/components/notification-center/notification-center.component';
import { NotificationCountService } from '../../../../core/application/services/notification-count.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationCenterComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  isUserMenuOpen = false;
  isDark = false;
  unreadCount = 0;
  private destroy$ = new Subject<void>();

  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationCountService = inject(NotificationCountService);

  ngOnInit(): void {
    // S'abonner aux mises à jour du compteur de notifications
    this.notificationCountService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    document.body.classList.toggle('dark-theme', this.isDark);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.topbar__user-menu')) {
      this.closeUserMenu();
    }
  }
}
