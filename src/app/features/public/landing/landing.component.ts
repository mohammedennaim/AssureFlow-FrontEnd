import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, HostListener, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { AuthService } from '../../../core/auth/auth.service';

type CarouselKey = 'offers' | 'reviews';

interface Benefit { title: string; description: string; icon: string; }
interface Offer { title: string; description: string; price: string; image: string; icon: string; popular?: boolean; }
interface Feature { title: string; text: string; icon: string; }
interface KeyFigure { value: string; label: string; }
interface Step { title: string; text: string; icon: string; }
interface Testimonial { name: string; city: string; since: string; quote: string; rating: number; }
interface NavItem { label: string; target: string; }

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  AGENT: '/agent/dashboard',
  FINANCE: '/finance/dashboard',
  CLIENT: '/client/dashboard'
};

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, RevealDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly icons = AF_ICONS;
  readonly currentYear = new Date().getFullYear();

  isLoggedIn = false;
  spaceLink = '/login';
  isScrolled = false;
  isMobileMenuOpen = false;
  showBackToTop = false;

  @ViewChild('offersTrack') offersTrack?: ElementRef<HTMLElement>;
  @ViewChild('reviewsTrack') reviewsTrack?: ElementRef<HTMLElement>;
  carousel: Record<CarouselKey, { prev: boolean; next: boolean }> = {
    offers: { prev: false, next: false },
    reviews: { prev: false, next: false }
  };

  readonly nav: NavItem[] = [
    { label: 'Nos offres', target: 'offres' },
    { label: 'Pourquoi nous', target: 'pourquoi' },
    { label: 'Comment ça marche', target: 'fonctionnement' },
    { label: 'Avis clients', target: 'avis' },
    { label: 'Assistant IA', target: 'assistant' }
  ];

  readonly benefits: Benefit[] = [
    { title: 'Souscription rapide', description: '100 % en ligne', icon: 'fast' },
    { title: 'Suivi en temps réel', description: 'De tous vos dossiers', icon: 'tracking' },
    { title: 'Paiements sécurisés', description: 'Simples et fiables', icon: 'secure' },
    { title: 'Assistance 24/7', description: 'Toujours à votre écoute', icon: 'support' }
  ];

  readonly offers: Offer[] = [
    { title: 'Auto', description: 'Roulez l’esprit tranquille, partout au Maroc.', price: '1 200', image: 'images/offer-auto.jpg', icon: 'car', popular: true },
    { title: 'Santé', description: 'Une couverture complète pour vous et vos proches.', price: '850', image: 'images/offer-sante.jpg', icon: 'heart' },
    { title: 'Habitation', description: 'Protégez votre logement et vos biens.', price: '1 500', image: 'images/offer-habitation.jpg', icon: 'home' },
    { title: 'Vie', description: 'Préparez sereinement l’avenir de votre famille.', price: '2 000', image: 'images/offer-vie.jpg', icon: 'shield' }
  ];

  readonly features: Feature[] = [
    { title: 'Simple et 100 % en ligne', text: 'Souscrivez, déclarez un sinistre ou réglez une facture en quelques clics, sans paperasse.', icon: 'sparkles' },
    { title: 'Indemnisation rapide', text: 'Vos dossiers sont traités en priorité et vous êtes remboursé sous 48 h après validation.', icon: 'fast' },
    { title: 'Paiements sécurisés', text: 'Vos données et transactions sont chiffrées et protégées selon les normes bancaires.', icon: 'secure' },
    { title: 'Des conseillers proches de vous', text: 'Une équipe disponible 7j/7, partout au Maroc, par téléphone, chat ou en agence.', icon: 'handshake' }
  ];

  readonly keyFigures: KeyFigure[] = [
    { value: '+200 000', label: 'Clients satisfaits' },
    { value: '98 %', label: 'Taux de prise en charge' },
    { value: '48 h', label: 'Délai moyen d’indemnisation' },
    { value: '4,8/5', label: 'Note moyenne de nos clients' }
  ];

  readonly steps: Step[] = [
    { title: 'Créez votre compte', text: 'Inscrivez-vous gratuitement en 2 minutes, sans engagement.', icon: 'user' },
    { title: 'Choisissez votre offre', text: 'Comparez nos formules et sélectionnez la protection idéale.', icon: 'contracts' },
    { title: 'Souscrivez en ligne', text: 'Signez et payez en toute sécurité, votre attestation est immédiate.', icon: 'secure' },
    { title: 'Gérez tout en un clic', text: 'Contrats, sinistres et factures réunis dans votre espace.', icon: 'tracking' }
  ];

  readonly testimonials: Testimonial[] = [
    { name: 'Salma El Idrissi', city: 'Casablanca', since: '2021', rating: 5, quote: 'Service rapide et très professionnel. J’ai pu déclarer mon sinistre en quelques minutes et j’ai été bien accompagnée tout au long du processus.' },
    { name: 'Youssef Amrani', city: 'Rabat', since: '2020', rating: 5, quote: 'Une plateforme simple et intuitive. Je gère tous mes contrats et factures sans difficulté. Bravo à toute l’équipe !' },
    { name: 'Nadia Berrada', city: 'Marrakech', since: '2022', rating: 4, quote: 'L’assistance 24/7 est vraiment utile. J’ai eu une réponse rapide et un conseiller très à l’écoute.' },
    { name: 'Karim Tazi', city: 'Tanger', since: '2019', rating: 5, quote: 'Après un dégât des eaux, mon dossier a été traité en quelques jours. Je suis informé à chaque étape, c’est rassurant.' },
    { name: 'Imane Chraibi', city: 'Fès', since: '2023', rating: 5, quote: 'Je télécharge mes attestations en un clic et je paie mes échéances en ligne. Je recommande à toute ma famille.' }
  ];

  readonly ratingBars = [
    { stars: 5, percent: 84 },
    { stars: 4, percent: 12 },
    { stars: 3, percent: 3 },
    { stars: 2, percent: 1 }
  ];

  readonly assistantFeatures: Feature[] = [
    { title: 'Conseils personnalisés', text: 'Le bon contrat pour vous', icon: 'sparkles' },
    { title: 'Suivi de vos sinistres', text: 'Vos dossiers en temps réel', icon: 'tracking' },
    { title: 'Aide sur vos factures', text: 'Échéances sans surprise', icon: 'invoices' },
    { title: 'Relais conseiller', text: 'Un humain prend le relais', icon: 'advisor' }
  ];

  readonly stars = [1, 2, 3, 4, 5];

  private authService = inject(AuthService);
  private zone = inject(NgZone);
  private scrollFrame = 0;

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      const role = (this.authService.getUserRole() ?? '').replace(/^ROLE_/, '').toUpperCase();
      this.spaceLink = ROLE_HOME[role] ?? '/login';
    }

    this.zone.runOutsideAngular(() => window.addEventListener('scroll', this.onScroll, { passive: true }));
    this.updateScroll();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateCarousels());
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    cancelAnimationFrame(this.scrollFrame);
  }

  scrollTo(id: string): void {
    this.isMobileMenuOpen = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  scrollToTop(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  scrollTrack(track: HTMLElement, direction: 1 | -1): void {
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: direction * step, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  updateCarousel(key: CarouselKey, track: HTMLElement | undefined): void {
    if (!track) return;
    this.carousel[key] = {
      prev: track.scrollLeft > 4,
      next: track.scrollLeft + track.clientWidth < track.scrollWidth - 4
    };
  }

  @HostListener('window:resize')
  updateCarousels(): void {
    this.updateCarousel('offers', this.offersTrack?.nativeElement);
    this.updateCarousel('reviews', this.reviewsTrack?.nativeElement);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isMobileMenuOpen = false;
  }

  initialsOf(name: string): string {
    return name.split(' ').map(part => part.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  private readonly onScroll = (): void => {
    cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = requestAnimationFrame(() => this.updateScroll());
  };

  private updateScroll(): void {
    const y = window.scrollY;
    const scrolled = y > 8;
    const backToTop = y > window.innerHeight * 0.9;
    if (scrolled !== this.isScrolled || backToTop !== this.showBackToTop) {
      this.zone.run(() => {
        this.isScrolled = scrolled;
        this.showBackToTop = backToTop;
      });
    }
  }
}
