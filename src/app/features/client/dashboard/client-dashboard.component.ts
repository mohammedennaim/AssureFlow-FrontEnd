import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { catchError, of, forkJoin, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  ClientDashboardService,
  ClientClaimStats,
  ClientPaymentStats
} from '../../../core/application/services/client-dashboard.service';
import { CLIENT_REPOSITORY } from '../../../core/domain/ports/client.repository.port';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';

const POLLING_INTERVAL_MS = 30000;

type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';
type PolicyIcon = 'car' | 'heart' | 'home' | 'shield' | 'briefcase';

interface Attention {
  tone: Tone;
  title: string;
  text: string;
  action?: { label: string; link: string };
}

interface PolicyItem {
  id: string;
  title: string;
  number: string;
  icon: PolicyIcon;
  startDate: string;
  endDate: string;
  premium: number;
  statusLabel: string;
  tone: Tone;
  image?: string;
}

interface Shortcut {
  label: string;
  description: string;
  link: string;
  icon: 'claim' | 'pay' | 'documents' | 'advisor';
  color: 'blue' | 'teal' | 'amber' | 'indigo';
}

interface ClaimTracker {
  id: string;
  number: string;
  description: string;
  date: string;
  statusLabel: string;
  tone: Tone;
  step: number;
}

type CarouselKey = 'offers';

interface SpaceTile {
  label: string;
  value: string;
  hint: string;
  badge: string;
  icon: string;
  cta: string;
  tone: Tone;
  link: string;
}

interface Offer {
  title: string;
  description: string;
  price: string;
  image: string;
  icon: PolicyIcon;
  popular?: boolean;
}

const CLOSED_CLAIM_STATUSES = ['APPROVED', 'REJECTED', 'DENIED', 'PAID', 'CLOSED'];

const POLICY_TYPES: Record<string, { label: string; icon: PolicyIcon; image?: string }> = {
  AUTO: { label: 'Auto', icon: 'car', image: 'images/offer-auto.jpg' },
  VEHICLE: { label: 'Auto', icon: 'car', image: 'images/offer-auto.jpg' },
  HEALTH: { label: 'Santé', icon: 'heart', image: 'images/offer-sante.jpg' },
  LIFE: { label: 'Vie', icon: 'shield', image: 'images/offer-vie.jpg' },
  HOME: { label: 'Habitation', icon: 'home', image: 'images/offer-habitation.jpg' },
  PROPERTY: { label: 'Habitation', icon: 'home', image: 'images/offer-habitation.jpg' },
  BUSINESS: { label: 'Professionnelle', icon: 'briefcase' }
};

const PRIORITY_STYLE: Record<Tone, { tag: string; icon: string }> = {
  danger: { tag: 'En retard', icon: 'alert' },
  warning: { tag: 'Bientôt', icon: 'calendar' },
  info: { tag: 'En cours', icon: 'clock' },
  success: { tag: 'À jour', icon: 'check' },
  neutral: { tag: 'Indisponible', icon: 'info' }
};

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, RevealDirective],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly icons = AF_ICONS;
  loading = true;
  isRefreshing = false;
  firstName = '';
  fullName = '';
  initials = '';
  memberSince = '';

  @ViewChild('offersTrack') offersTrack?: ElementRef<HTMLElement>;
  carousel: Record<CarouselKey, { prev: boolean; next: boolean }> = {
    offers: { prev: false, next: false }
  };

  activeClaim: ClaimTracker | null = null;
  readonly claimSteps = ['Déclaration', 'Analyse', 'Décision', 'Indemnisation'];

  spaceTiles: SpaceTile[] = [];
  private hasPolicyData = false;
  private hasPaymentData = false;
  private hasClaimData = false;
  attention: Attention | null = null;
  lastUpdated: Date | null = null;
  policies: PolicyItem[] = [];
  totalPolicies = 0;
  activePolicies = 0;
  nextPayment: { amount: number; dueDate: string } | null = null;
  nextPaymentDue: { label: string; tone: Tone } | undefined;
  amountDue = 0;
  openClaims = 0;

  readonly shortcuts: Shortcut[] = [
    { label: 'Déclarer un sinistre', description: 'En ligne, en 5 minutes', link: '/client/submit-claim', icon: 'claim', color: 'blue' },
    { label: 'Payer une facture', description: 'Carte bancaire, 100 % sécurisé', link: '/client/billing', icon: 'pay', color: 'teal' },
    { label: 'Mes attestations', description: 'Téléchargeables en PDF', link: '/client/documents', icon: 'documents', color: 'amber' },
    { label: 'Parler à un conseiller', description: 'Chat ou téléphone, 7j/7', link: '/client/support', icon: 'advisor', color: 'indigo' }
  ];

  readonly offers: Offer[] = [
    { title: 'Auto', description: 'Roulez l’esprit tranquille, partout au Maroc.', price: '1 200', image: 'images/offer-auto.jpg', icon: 'car', popular: true },
    { title: 'Santé', description: 'Une couverture complète pour vous et vos proches.', price: '850', image: 'images/offer-sante.jpg', icon: 'heart' },
    { title: 'Habitation', description: 'Protégez votre logement et vos biens.', price: '1 500', image: 'images/offer-habitation.jpg', icon: 'home' },
    { title: 'Vie', description: 'Préparez sereinement l’avenir de votre famille.', price: '2 000', image: 'images/offer-vie.jpg', icon: 'shield' }
  ];

  private pollingSubscription?: Subscription;
  private clientDashboardService = inject(ClientDashboardService);
  private clientRepository = inject(CLIENT_REPOSITORY);

  ngOnInit(): void {
    this.clientRepository.getMe().subscribe({
      next: (client) => {
        this.firstName = client?.firstName?.trim() || '';
        this.fullName = [client?.firstName, client?.lastName].filter(Boolean).join(' ').trim();
        this.initials = [client?.firstName, client?.lastName]
          .map(part => (part || '').trim().charAt(0).toUpperCase())
          .join('');
        const since = client?.createdAt ? new Date(client.createdAt) : null;
        this.memberSince = since && !Number.isNaN(since.getTime()) ? String(since.getFullYear()) : '';
      },
      error: () => {}
    });
    this.loadDashboard();
    this.pollingSubscription = interval(POLLING_INTERVAL_MS)
      .pipe(switchMap(() => this.clientDashboardService.getClientClaimStats().pipe(catchError(() => of(null)))))
      .subscribe(claimStats => {
        if (!claimStats) return;
        this.activeClaim = this.pickActiveClaim(claimStats.myClaims || []);
        this.openClaims = claimStats.pending + claimStats.underReview;
        this.hasClaimData = true;
        if (!this.loading) {
          this.spaceTiles = this.buildSpaceTiles();
        }
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateCarousels());
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  loadDashboard(): void {
    this.loading = !this.isRefreshing;

    forkJoin({
      stats: this.clientDashboardService.getClientDashboardStats().pipe(catchError(() => of(null))),
      policyStats: this.clientDashboardService.getClientPolicyStats().pipe(catchError(() => of(null))),
      claimStats: this.clientDashboardService.getClientClaimStats().pipe(catchError(() => of(null))),
      paymentStats: this.clientDashboardService.getClientPaymentStats().pipe(catchError(() => of(null)))
    }).subscribe(({ stats, policyStats, claimStats, paymentStats }) => {
      this.policies = (policyStats?.myPolicies || []).slice(0, 3).map(p => this.mapPolicy(p));
      this.totalPolicies = stats?.totalPolicies ?? policyStats?.myPolicies?.length ?? 0;
      this.activePolicies = stats?.activePolicies ?? policyStats?.active ?? 0;
      this.activeClaim = this.pickActiveClaim(claimStats?.myClaims || []);
      this.nextPayment = paymentStats?.nextPayment
        ? { amount: paymentStats.nextPayment.amount, dueDate: String(paymentStats.nextPayment.dueDate) }
        : null;
      this.nextPaymentDue = this.nextPayment ? this.dueLabel(this.daysUntil(this.nextPayment.dueDate)) : undefined;
      this.amountDue = (paymentStats?.totalPending ?? 0) + (paymentStats?.totalOverdue ?? 0);
      this.openClaims = claimStats ? claimStats.pending + claimStats.underReview : 0;
      this.hasPolicyData = !!(stats || policyStats);
      this.hasPaymentData = !!paymentStats;
      this.hasClaimData = !!claimStats;
      this.spaceTiles = this.buildSpaceTiles();
      this.attention = this.buildAttention(claimStats, paymentStats);
      this.lastUpdated = new Date();
      this.loading = false;
      this.isRefreshing = false;
    });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboard();
  }

  scrollToOffers(): void {
    document.getElementById('offres')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  }

  get priorityTag(): string {
    return PRIORITY_STYLE[this.attention?.tone || 'neutral'].tag;
  }

  get priorityIcon(): string {
    return PRIORITY_STYLE[this.attention?.tone || 'neutral'].icon;
  }

  get todayLabel(): string {
    const label = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return label.charAt(0).toUpperCase() + label.slice(1) + '.';
  }

  get greeting(): string {
    return new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
  }

  formatCurrency(amount: number | null | undefined): string {
    const value = Math.round(amount || 0);
    return `${value.toLocaleString('fr-FR')} MAD`;
  }

  formatDate(value: string | null | undefined, withYear = true): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', withYear
      ? { day: '2-digit', month: 'short', year: 'numeric' }
      : { day: '2-digit', month: 'short' });
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  formatTime(date: Date | null): string {
    return date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  }

  private daysUntil(value: string): number | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - start.getTime()) / 86400000);
  }

  private dueLabel(days: number | null): { label: string; tone: Tone } | undefined {
    if (days === null) return undefined;
    if (days < 0) return { label: `En retard de ${-days} j`, tone: 'danger' };
    if (days === 0) return { label: 'Aujourd’hui', tone: 'danger' };
    if (days === 1) return { label: 'Demain', tone: 'warning' };
    return { label: `Dans ${days} jours`, tone: days <= 7 ? 'warning' : 'info' };
  }

  private plural(count: number, word: string): string {
    return `${word}${count > 1 ? 's' : ''}`;
  }

  private pickActiveClaim(claims: Claim[]): ClaimTracker | null {
    const claim = claims.find(c => !CLOSED_CLAIM_STATUSES.includes((c.status || '').toUpperCase()));
    if (!claim) return null;

    const status = (claim.status || '').toUpperCase();
    const [statusLabel, tone, step]: [string, Tone, number] =
      status === 'UNDER_REVIEW' || status === 'PROCESSING' ? ['En cours d’analyse', 'warning', 1] :
      ['Déclaré', 'info', 0];

    return {
      id: claim.id,
      number: claim.claimNumber || '—',
      description: claim.description || 'Sinistre déclaré',
      date: claim.submittedAt || claim.createdAt || claim.incidentDate || '',
      statusLabel,
      tone,
      step
    };
  }

  private buildSpaceTiles(): SpaceTile[] {
    const policies = this.activePolicies;
    const claims = this.openClaims;
    const unavailable = 'Indisponible pour le moment';

    const coverage: SpaceTile = !this.hasPolicyData
      ? { label: 'Ma couverture', value: '—', hint: unavailable, badge: '—', icon: 'contracts', cta: 'Mes contrats', tone: 'neutral', link: '/client/policies' }
      : policies
        ? { label: 'Couverture', value: `${policies} ${this.plural(policies, 'contrat')}`, hint: 'Vous êtes bien protégé.', badge: 'Active', icon: 'contracts', cta: 'Mes contrats', tone: 'success', link: '/client/policies' }
        : { label: 'Couverture', value: 'Aucun contrat', hint: 'Trouvons la bonne protection.', badge: 'Inactive', icon: 'contracts', cta: 'Nos offres', tone: 'neutral', link: '/client/support' };

    const payment: SpaceTile = !this.hasPaymentData
      ? { label: 'Mes factures', value: '—', hint: unavailable, badge: '—', icon: 'invoices', cta: 'Mes factures', tone: 'neutral', link: '/client/billing' }
      : this.amountDue
        ? { label: 'Montant à régler', value: this.formatCurrency(this.amountDue), hint: 'Pour rester couvert.', badge: 'En retard', icon: 'invoices', cta: 'Régler', tone: 'danger', link: '/client/billing' }
        : this.nextPayment
          ? { label: 'Prochaine échéance', value: this.formatCurrency(this.nextPayment.amount), hint: `${this.nextPaymentDue?.label || 'Le ' + this.formatDate(this.nextPayment.dueDate)}.`, badge: 'À venir', icon: 'invoices', cta: 'Mes factures', tone: this.nextPaymentDue?.tone || 'info', link: '/client/billing' }
          : { label: 'Mes factures', value: 'À jour', hint: 'Rien à payer pour le moment.', badge: 'À jour', icon: 'invoices', cta: 'Mes factures', tone: 'success', link: '/client/billing' };

    const claim: SpaceTile = !this.hasClaimData
      ? { label: 'Mes sinistres', value: '—', hint: unavailable, badge: '—', icon: 'claims', cta: 'Mes sinistres', tone: 'neutral', link: '/client/claims' }
      : claims
        ? {
            label: 'Sinistres',
            value: `${claims} ${this.plural(claims, 'dossier')}`,
            hint: this.activeClaim ? `Statut : ${this.activeClaim.statusLabel.toLowerCase()}.` : 'Nos équipes s’en occupent.',
            badge: 'En cours',
            icon: 'claims',
            cta: 'Suivre',
            tone: 'warning',
            link: this.activeClaim ? `/client/claims/${this.activeClaim.id}` : '/client/claims'
          }
        : { label: 'Sinistres', value: 'Aucun', hint: 'Un imprévu ? Déclarez-le en 5 min.', badge: 'Rien en cours', icon: 'claims', cta: 'Déclarer', tone: 'success', link: '/client/submit-claim' };

    return [coverage, payment, claim];
  }

  private buildAttention(claimStats: ClientClaimStats | null, paymentStats: ClientPaymentStats | null): Attention {
    if (!claimStats || !paymentStats) {
      return {
        tone: 'neutral',
        title: 'Certaines informations sont indisponibles',
        text: 'Nous n’avons pas pu charger toutes vos données. Réessayez dans un instant.'
      };
    }

    const overdue = paymentStats?.overdueInvoices ?? 0;
    if (overdue) {
      return {
        tone: 'danger',
        title: `${overdue} ${this.plural(overdue, 'facture')} en retard`,
        text: `Réglez ${this.formatCurrency(paymentStats?.totalOverdue)} pour conserver votre couverture active.`,
        action: { label: 'Régler maintenant', link: '/client/billing' }
      };
    }

    const days = this.nextPayment ? this.daysUntil(this.nextPayment.dueDate) : null;
    if (this.nextPayment && days !== null && days <= 7) {
      return {
        tone: 'warning',
        title: days <= 0 ? 'Échéance aujourd’hui' : `Échéance dans ${days} ${this.plural(days, 'jour')}`,
        text: `${this.formatCurrency(this.nextPayment.amount)} à régler avant le ${this.formatDate(this.nextPayment.dueDate)}.`,
        action: { label: 'Payer en ligne', link: '/client/billing' }
      };
    }

    const openClaims = claimStats ? claimStats.pending + claimStats.underReview : 0;
    if (openClaims) {
      return {
        tone: 'info',
        title: `${openClaims} ${this.plural(openClaims, 'sinistre')} en cours de traitement`,
        text: 'Nos équipes analysent votre dossier. Vous serez notifié à chaque étape.',
        action: { label: 'Suivre mon dossier', link: '/client/claims' }
      };
    }

    return {
      tone: 'success',
      title: 'Tout est en ordre',
      text: 'Aucune action requise de votre part. Bonne journée !'
    };
  }

  private mapPolicy(policy: Policy): PolicyItem {
    const type = POLICY_TYPES[(policy.type || '').toUpperCase()] || { label: 'Assurance', icon: 'shield' as PolicyIcon };
    const status = (policy.status || '').toUpperCase();
    const [statusLabel, tone]: [string, Tone] =
      status === 'ACTIVE' ? ['Actif', 'success'] :
      status === 'EXPIRED' ? ['Expiré', 'neutral'] :
      status === 'CANCELLED' ? ['Résilié', 'danger'] :
      ['En attente', 'info'];

    return {
      id: policy.id,
      title: type.label,
      number: policy.policyNumber || '—',
      icon: type.icon,
      image: type.image,
      startDate: policy.startDate,
      endDate: policy.endDate,
      premium: policy.premium || 0,
      statusLabel,
      tone
    };
  }
}
