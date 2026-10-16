import { Component, inject, HostListener, OnInit, OnDestroy, NgZone, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/auth.service';
import { CLIENT_REPOSITORY } from '../../../../core/domain/ports/client.repository.port';
import { ProfileMediaService } from '../../../../core/application/services/profile-media.service';
import { LucideAngularModule } from 'lucide-angular';
import { AF_ICONS } from '../../../../shared/icons/af-icons';
import { NotificationCenterComponent } from '../../../../shared/components/notification-center/notification-center.component';

interface NavLink {
  label: string;
  path: string;
  exact?: boolean;
}

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationCenterComponent, LucideAngularModule],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.scss'
})
export class ClientLayoutComponent implements OnInit, OnDestroy {
  readonly icons = AF_ICONS;
  isUserMenuOpen = false;
  isMobileMenuOpen = false;
  isHome = false;
  isApp = false;
  isScrolled = false;
  showBackToTop = false;
  currentYear = new Date().getFullYear();

  displayName = 'Mon compte';
  initials = 'AF';

  readonly navLinks: NavLink[] = [
    { label: 'Accueil', path: '/client/dashboard', exact: true },
    { label: 'Contrats', path: '/client/policies' },
    { label: 'Sinistres', path: '/client/claims' },
    { label: 'Factures', path: '/client/billing' },
    { label: 'Documents', path: '/client/documents' },
    { label: 'Assistance', path: '/client/support' }
  ];

  private authService = inject(AuthService);
  private clientRepository = inject(CLIENT_REPOSITORY);
  readonly media = inject(ProfileMediaService);
  private router = inject(Router);
  private zone = inject(NgZone);
  private host = inject(ElementRef<HTMLElement>);
  private scrollFrame = 0;

  ngOnInit(): void {
    this.clientRepository.getMe().subscribe({
      next: (client) => {
        if (client?.id) this.media.load(client.id);
        const fullName = [client?.firstName, client?.lastName].filter(Boolean).join(' ').trim();
        if (fullName) {
          this.displayName = fullName;
          this.initials = fullName
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join('');
        }
      },
      error: () => {}
    });

    this.isHome = this.isHomeUrl(this.router.url);
    this.isApp = this.isAppUrl(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.isHome = this.isHomeUrl(event.urlAfterRedirects);
        this.isApp = this.isAppUrl(event.urlAfterRedirects);
        this.isMobileMenuOpen = false;
        this.isUserMenuOpen = false;
      });

    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });
    this.updateScroll();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    cancelAnimationFrame(this.scrollFrame);
  }

  scrollToTop(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    (this.host.nativeElement.querySelector('.site-header__brand') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  private readonly onScroll = (): void => {
    cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = requestAnimationFrame(() => this.updateScroll());
  };

  private updateScroll(): void {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, y / max) : 0;
    this.host.nativeElement.style.setProperty('--scroll-progress', progress.toFixed(4));

    const scrolled = y > 8;
    const backToTop = y > window.innerHeight * 0.9;
    if (scrolled !== this.isScrolled || backToTop !== this.showBackToTop) {
      this.zone.run(() => {
        this.isScrolled = scrolled;
        this.showBackToTop = backToTop;
      });
    }
  }

  private isHomeUrl(url: string): boolean {
    return url.split(/[?#]/)[0].replace(/\/$/, '') === '/client/dashboard';
  }

  private isAppUrl(url: string): boolean {
    return url.split(/[?#]/)[0].replace(/\/$/, '') === '/client/support';
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.site-header__user')) {
      this.isUserMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isUserMenuOpen = false;
    this.isMobileMenuOpen = false;
  }
}
