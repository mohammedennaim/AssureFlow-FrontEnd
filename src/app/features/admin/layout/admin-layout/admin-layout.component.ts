import { Component, inject, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationCenterComponent } from '../../../../shared/components/notification-center/notification-center.component';
import { NotificationCountService } from '../../../../core/application/services/notification-count.service';
import { Subject, filter } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface NavItem {
  label: string;
  link: string;
  icon: string;
  exact?: boolean;
  badge?: boolean;
}

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
  unreadCount = 0;
  lastUpdatedLabel = '';
  pageTitle = 'Tableau de bord';

  readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', link: '/admin/dashboard', icon: 'fa-solid fa-gauge-high', exact: true },
    { label: 'Clients', link: '/admin/clients', icon: 'fa-solid fa-users' },
    { label: 'Polices', link: '/admin/policies', icon: 'fa-solid fa-shield-halved' },
    { label: 'Sinistres', link: '/admin/claims', icon: 'fa-solid fa-clipboard-list' },
    { label: 'Factures', link: '/admin/billing', icon: 'fa-solid fa-file-invoice-dollar' },
    { label: 'Utilisateurs', link: '/admin/users', icon: 'fa-solid fa-user-gear' },
    { label: 'Notifications', link: '/admin/notifications', icon: 'fa-solid fa-bell', badge: true }
  ];

  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationCountService = inject(NotificationCountService);

  ngOnInit(): void {
    this.lastUpdatedLabel = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    this.updatePageTitle(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(e => this.updatePageTitle(e.urlAfterRedirects));

    this.notificationCountService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  private updatePageTitle(url: string): void {
    const match = [...this.navItems]
      .sort((a, b) => b.link.length - a.link.length)
      .find(item => url === item.link || url.startsWith(item.link + '/'));
    this.pageTitle = match?.label ?? 'Administration';
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
