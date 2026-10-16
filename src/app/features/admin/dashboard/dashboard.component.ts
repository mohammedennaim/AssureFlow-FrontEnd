import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  Chart,
  DoughnutController,
  LineController,
  BarController,
  ArcElement,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  ChartConfiguration
} from 'chart.js';
import { AdminStatisticsService, DashboardKpiStats } from '../../../core/application/services/admin-statistics.service';
import { Subscription } from 'rxjs';
import { Claim } from '../../../core/domain/models/claim.model';
import { Policy } from '../../../core/domain/models/policy.model';
import { Client } from '../../../core/domain/models/client.model';

Chart.register(
  DoughnutController,
  LineController,
  BarController,
  ArcElement,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

interface KpiStat {
  label: string;
  value: string;
  hint: string;
  faIcon: string;
  tone: Tone;
  link: string;
  trend: number;
  spark: number[];
}

interface Slice {
  label: string;
  count: number;
  color: string;
  percent: number;
}

interface Activity {
  id: number;
  text: string;
  target: string;
  time: string;
  at: number;
  type: Tone;
  faIcon: string;
}

interface Shortcut {
  label: string;
  link: string;
  faIcon: string;
  tone: Tone;
}

interface PriorityItem {
  label: string;
  hint: string;
  count: number;
  link: string;
  tone: Tone;
  faIcon: string;
}

interface MonthlySeries {
  labels: string[];
  clients: number[];
  policies: number[];
  claims: number[];
  invoices: number[];
}

const C = {
  primary: '#15345b',
  secondary: '#0799d5',
  accent: '#43c4c0',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  navy: '#15345b',
  blue: '#0799d5',
  teal: '#43c4c0',
  slate: '#64748b'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('evolutionChart') evolutionRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('policyChart') policyRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('claimsChart') claimsRef?: ElementRef<HTMLCanvasElement>;

  today = new Date();
  private sub?: Subscription;
  private viewReady = false;
  private charts: Chart[] = [];

  kpiStats: KpiStat[] = this.emptyKpis();
  recentActivities: Activity[] = [];
  policySlices: Slice[] = [];
  claimsSlices: Slice[] = [];
  monthly: MonthlySeries = this.emptyMonthly();
  totalInvoices = 0;
  stats: DashboardKpiStats = this.emptyStats();
  collectionRate = 0;

  shortcuts: Shortcut[] = [
    { label: 'Nouveau client', link: '/admin/clients', faIcon: 'fa-solid fa-user-plus', tone: 'info' },
    { label: 'Nouvelle police', link: '/admin/policies', faIcon: 'fa-solid fa-file-signature', tone: 'success' },
    { label: 'Traiter sinistre', link: '/admin/claims', faIcon: 'fa-solid fa-clipboard-check', tone: 'warning' },
    { label: 'Créer facture', link: '/admin/billing', faIcon: 'fa-solid fa-receipt', tone: 'neutral' }
  ];

  priorities: PriorityItem[] = this.emptyPriorities();

  private cdr = inject(ChangeDetectorRef);
  private adminStats = inject(AdminStatisticsService);

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRender();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.destroyCharts();
  }

  loadDashboard(): void {
    this.sub?.unsubscribe();

    this.sub = this.adminStats.getDashboardBundle().subscribe({
      next: (r) => {
        this.applyDashboardData(r.stats, r.clients, r.policies, r.claims, r.invoices);
      },
      error: () => {
        this.applyDashboardData(this.emptyStats(), [], [], [], []);
      }
    });
  }

  private emptyStats(): DashboardKpiStats {
    return {
      totalUsers: 0, totalClients: 0, totalPolicies: 0, activePolicies: 0,
      pendingPolicies: 0, expiredPolicies: 0, totalClaims: 0, pendingClaims: 0,
      approvedClaims: 0, rejectedClaims: 0, underReviewClaims: 0,
      monthlyRevenue: 0, pendingRevenue: 0, totalRevenue: 0, collectionRate: 0
    };
  }

  private emptyMonthly(): MonthlySeries {
    const labels: string[] = [];
    const zeros: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('fr-FR', { month: 'short' }));
      zeros.push(0);
    }
    return { labels, clients: [...zeros], policies: [...zeros], claims: [...zeros], invoices: [...zeros] };
  }

  private emptyKpis(): KpiStat[] {
    const spark = [0, 0, 0, 0, 0, 0];
    return [
      { label: 'Total Clients', value: '0', hint: '0 utilisateurs', faIcon: 'fa-solid fa-users', tone: 'info', link: '/admin/clients', trend: 0, spark },
      { label: 'Polices actives', value: '0', hint: '0 au total', faIcon: 'fa-solid fa-shield-halved', tone: 'success', link: '/admin/policies', trend: 0, spark },
      { label: 'Factures générées', value: '0', hint: '0 MAD / mois', faIcon: 'fa-solid fa-file-invoice-dollar', tone: 'neutral', link: '/admin/billing', trend: 0, spark },
      { label: 'Sinistres en cours', value: '0', hint: '0 dossiers', faIcon: 'fa-solid fa-house-fire', tone: 'success', link: '/admin/claims', trend: 0, spark }
    ];
  }

  private emptyPriorities(): PriorityItem[] {
    return [
      { label: 'Sinistres à traiter', hint: 'En attente de décision', count: 0, link: '/admin/claims', tone: 'success', faIcon: 'fa-solid fa-triangle-exclamation' },
      { label: 'Sinistres en revue', hint: 'Expertise en cours', count: 0, link: '/admin/claims', tone: 'neutral', faIcon: 'fa-solid fa-magnifying-glass-chart' },
      { label: 'Polices en attente', hint: 'Validation requise', count: 0, link: '/admin/policies', tone: 'success', faIcon: 'fa-solid fa-hourglass-half' },
      { label: 'Factures en attente', hint: 'Paiement attendu', count: 0, link: '/admin/billing', tone: 'success', faIcon: 'fa-solid fa-coins' }
    ];
  }

  private applyDashboardData(
    admin: DashboardKpiStats,
    clients: Client[],
    policies: Policy[],
    claims: Claim[],
    invoices: unknown[]
  ): void {
    const safeClients = Array.isArray(clients) ? clients : [];
    const safePolicies = Array.isArray(policies) ? policies : [];
    const safeClaims = Array.isArray(claims) ? claims : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];

    this.stats = admin;
    this.totalInvoices = safeInvoices.length;
    this.collectionRate = admin.collectionRate || 0;
    this.monthly = this.buildMonthlySeries(safeClients, safePolicies, safeClaims, safeInvoices);
    this.buildKpis(admin, safeClients, safePolicies, safeClaims, safeInvoices);
    this.policySlices = this.toSlices(
      this.countBy(safePolicies, p => p.type),
      [C.secondary, C.accent, C.primary, C.success, C.warning, C.slate]
    );
    this.claimsSlices = this.buildClaimsSlices(safeClaims);
    this.buildActivity(safeClaims, safePolicies, safeClients);
    this.buildPriorities(admin, safeInvoices);
    this.cdr.detectChanges();
    this.tryRender();
  }

  private buildKpis(
    admin: DashboardKpiStats,
    clients: Client[],
    policies: Policy[],
    claims: Claim[],
    invoices: any[]
  ): void {
    const clientSpark = this.monthly.clients;
    const policySpark = this.monthly.policies;
    const invoiceSpark = this.monthly.invoices;
    const claimSpark = this.monthly.claims;

    this.kpiStats = [
      {
        label: 'Total Clients',
        value: this.fmt(admin.totalClients),
        hint: `${admin.totalUsers} utilisateurs`,
        faIcon: 'fa-solid fa-users',
        tone: 'info',
        link: '/admin/clients',
        trend: this.trendPct(clientSpark),
        spark: clientSpark
      },
      {
        label: 'Polices actives',
        value: this.fmt(admin.activePolicies),
        hint: `${admin.totalPolicies} au total`,
        faIcon: 'fa-solid fa-shield-halved',
        tone: 'success',
        link: '/admin/policies',
        trend: this.trendPct(policySpark),
        spark: policySpark
      },
      {
        label: 'Factures générées',
        value: this.fmt(this.totalInvoices),
        hint: `${this.fmt(admin.monthlyRevenue)} MAD / mois`,
        faIcon: 'fa-solid fa-file-invoice-dollar',
        tone: 'neutral',
        link: '/admin/billing',
        trend: this.trendPct(invoiceSpark),
        spark: invoiceSpark
      },
      {
        label: 'Sinistres en cours',
        value: this.fmt(admin.pendingClaims),
        hint: `${admin.totalClaims} dossiers`,
        faIcon: 'fa-solid fa-house-fire',
        tone: admin.pendingClaims > 0 ? 'warning' : 'success',
        link: '/admin/claims',
        trend: this.trendPct(claimSpark),
        spark: claimSpark
      }
    ];
  }

  private buildPriorities(admin: DashboardKpiStats, invoices: unknown[]): void {
    const overdue = (invoices as { overDue?: boolean }[]).filter(i => i.overDue).length;
    const pendingInvoices = (invoices as { status?: string }[]).filter(i => i.status === 'PENDING').length;

    this.priorities = [
      {
        label: 'Sinistres à traiter',
        hint: 'En attente de décision',
        count: admin.pendingClaims,
        link: '/admin/claims',
        tone: admin.pendingClaims > 0 ? 'warning' : 'success',
        faIcon: 'fa-solid fa-triangle-exclamation'
      },
      {
        label: 'Sinistres en revue',
        hint: 'Expertise en cours',
        count: admin.underReviewClaims,
        link: '/admin/claims',
        tone: admin.underReviewClaims > 0 ? 'info' : 'neutral',
        faIcon: 'fa-solid fa-magnifying-glass-chart'
      },
      {
        label: 'Polices en attente',
        hint: 'Validation requise',
        count: admin.pendingPolicies,
        link: '/admin/policies',
        tone: admin.pendingPolicies > 0 ? 'warning' : 'success',
        faIcon: 'fa-solid fa-hourglass-half'
      },
      {
        label: overdue > 0 ? 'Factures en retard' : 'Factures en attente',
        hint: overdue > 0 ? 'Relance recommandée' : 'Paiement attendu',
        count: overdue > 0 ? overdue : pendingInvoices,
        link: '/admin/billing',
        tone: overdue > 0 ? 'danger' : pendingInvoices > 0 ? 'info' : 'success',
        faIcon: overdue > 0 ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-coins'
      }
    ];
  }

  private buildActivity(claims: Claim[], policies: Policy[], clients: Client[]): void {
    const items: Activity[] = [];

    clients.filter(c => c.createdAt).forEach((c, i) => {
      const at = new Date(c.createdAt!).getTime();
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Client';
      items.push({
        id: 10 + i,
        text: 'Nouveau client',
        target: name,
        time: this.timeAgo(new Date(at)),
        at,
        type: 'info',
        faIcon: 'fa-solid fa-user-check'
      });
    });

    claims.filter(c => c.createdAt).forEach((c, i) => {
      const at = new Date(c.createdAt!).getTime();
      items.push({
        id: 100 + i,
        text: 'Nouveau sinistre',
        target: c.claimNumber,
        time: this.timeAgo(new Date(at)),
        at,
        type: c.status === 'PENDING' ? 'warning' : 'info',
        faIcon: 'fa-solid fa-file-circle-exclamation'
      });
    });

    policies.filter(p => p.createdAt).forEach((p, i) => {
      const at = new Date(p.createdAt!).getTime();
      items.push({
        id: 1000 + i,
        text: 'Nouvelle police',
        target: p.policyNumber,
        time: this.timeAgo(new Date(at)),
        at,
        type: 'success',
        faIcon: 'fa-solid fa-file-shield'
      });
    });

    this.recentActivities = items.sort((a, b) => b.at - a.at).slice(0, 12);
  }

  private buildMonthlySeries(
    clients: Client[],
    policies: Policy[],
    claims: Claim[],
    invoices: any[]
  ): MonthlySeries {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short' })
      });
    }

    const bucket = (items: { createdAt?: string | Date | null }[]) =>
      months.map(m =>
        items.filter(item => {
          if (!item.createdAt) return false;
          const d = new Date(item.createdAt);
          return `${d.getFullYear()}-${d.getMonth()}` === m.key;
        }).length
      );

    return {
      labels: months.map(m => m.label),
      clients: bucket(clients),
      policies: bucket(policies),
      claims: bucket(claims),
      invoices: bucket(invoices)
    };
  }

  private tryRender(): void {
    if (!this.viewReady) return;
    setTimeout(() => this.renderCharts(), 0);
  }

  private renderCharts(): void {
    this.destroyCharts();

    if (this.evolutionRef) {
      this.charts.push(this.createEvolution(this.evolutionRef.nativeElement));
    }
    if (this.policyRef && this.policySlices.length) {
      this.charts.push(this.createDoughnut(this.policyRef.nativeElement, this.policySlices, 'Contrats'));
    }
    if (this.claimsRef && this.claimsSlices.length) {
      this.charts.push(this.createDoughnut(this.claimsRef.nativeElement, this.claimsSlices, 'Dossiers'));
    }
  }

  private createEvolution(canvas: HTMLCanvasElement): Chart {
    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.monthly.labels,
        datasets: [
          {
            label: 'Clients',
            data: this.monthly.clients,
            borderColor: C.secondary,
            backgroundColor: 'rgba(62, 165, 233, 0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.5
          },
          {
            label: 'Polices',
            data: this.monthly.policies,
            borderColor: C.accent,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 2.5
          },
          {
            label: 'Sinistres',
            data: this.monthly.claims,
            borderColor: C.warning,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 2.5
          },
          {
            label: 'Factures',
            data: this.monthly.invoices,
            borderColor: C.primary,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              borderRadius: 4,
              useBorderRadius: true,
              padding: 16,
              color: '#64748b',
              font: { size: 11, family: 'Plus Jakarta Sans, sans-serif', weight: 600 }
            }
          },
          tooltip: {
            backgroundColor: C.primary,
            padding: 12,
            cornerRadius: 10,
            titleFont: { size: 12, weight: 700 },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11, family: 'Plus Jakarta Sans, sans-serif' } },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              precision: 0,
              color: '#94a3b8',
              font: { size: 11, family: 'Plus Jakarta Sans, sans-serif' }
            },
            border: { display: false }
          }
        }
      }
    };
    return new Chart(canvas, cfg);
  }

  private createDoughnut(canvas: HTMLCanvasElement, slices: Slice[], centerLabel: string): Chart {
    const total = slices.reduce((s, x) => s + x.count, 0);
    const cfg: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: slices.map(s => s.label),
        datasets: [{
          data: slices.map(s => s.count),
          backgroundColor: slices.map(s => s.color),
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: C.primary,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const v = Number(ctx.raw || 0);
                const pct = total ? Math.round((v / total) * 100) : 0;
                return ` ${ctx.label}: ${v} (${pct}%)`;
              }
            }
          }
        }
      },
      plugins: [{
        id: `center-${centerLabel}`,
        beforeDraw(chart) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const x = (chartArea.left + chartArea.right) / 2;
          const y = (chartArea.top + chartArea.bottom) / 2;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = C.primary;
          ctx.font = '800 18px Montserrat, Plus Jakarta Sans, sans-serif';
          ctx.fillText(String(total), x, y - 7);
          ctx.fillStyle = '#64748b';
          ctx.font = '600 10px Plus Jakarta Sans, sans-serif';
          ctx.fillText(centerLabel, x, y + 10);
          ctx.restore();
        }
      }]
    };
    return new Chart(canvas, cfg);
  }

  private buildClaimsSlices(claims: Claim[]): Slice[] {
    const labels: Record<string, string> = {
      SUBMITTED: 'Soumis',
      PENDING: 'En attente',
      UNDER_REVIEW: 'En revue',
      IN_REVIEW: 'En revue',
      APPROVED: 'Approuvé',
      PAID: 'Payé',
      PAYOUT_INITIATED: 'Paiement lancé',
      REJECTED: 'Rejeté',
      CLOSED: 'Clos'
    };
    const colors: Record<string, string> = {
      SUBMITTED: '#FBBF24',
      PENDING: C.warning,
      UNDER_REVIEW: C.secondary,
      IN_REVIEW: C.secondary,
      APPROVED: C.success,
      PAID: '#059669',
      PAYOUT_INITIATED: '#6366F1',
      REJECTED: C.danger,
      CLOSED: C.slate
    };
    const order = [
      'SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'APPROVED',
      'PAYOUT_INITIATED', 'PAID', 'REJECTED', 'CLOSED'
    ];
    const counts = this.countBy(claims, c => c.status);
    const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;

    if (counts['IN_REVIEW']) {
      counts['UNDER_REVIEW'] = (counts['UNDER_REVIEW'] || 0) + counts['IN_REVIEW'];
      delete counts['IN_REVIEW'];
    }

    const known = order
      .filter(key => counts[key])
      .map(key => ({
        label: labels[key] || key,
        count: counts[key],
        color: colors[key] || C.secondary,
        percent: Math.round((counts[key] / total) * 100)
      }));

    const extras = Object.entries(counts)
      .filter(([key]) => !order.includes(key) && key !== 'IN_REVIEW')
      .map(([key, count]) => ({
        label: labels[key] || key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
        count,
        color: colors[key] || '#94a3b8',
        percent: Math.round((count / total) * 100)
      }));

    return [...known, ...extras];
  }

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  sparkPath(values: number[]): string {
    if (!values.length) return '';
    const w = 52;
    const h = 18;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    return values
      .map((v, i) => {
        const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  private countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
    const map: Record<string, number> = {};
    items.forEach(item => {
      const key = keyFn(item) || 'N/A';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }

  private toSlices(
    data: Record<string, number>,
    colors: string[] | Record<string, string>,
    labelTransform?: (label: string) => string
  ): Slice[] {
    const total = Object.values(data).reduce((s, n) => s + n, 0) || 1;
    let index = 0;
    return Object.entries(data)
      .map(([label, count]) => {
        const color = Array.isArray(colors)
          ? colors[index++ % colors.length]
          : colors[label] || C.secondary;
        return {
          label: labelTransform ? labelTransform(label) : label,
          count,
          color,
          percent: Math.round((count / total) * 100)
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private trendPct(series: number[]): number {
    if (series.length < 2) return 0;
    const prev = series[series.length - 2] || 0;
    const curr = series[series.length - 1] || 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  private fmt(value: number): string {
    return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(value || 0);
  }

  private timeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'À l’instant';
    if (mins < 60) return `Il y a ${mins} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days < 7) return `Il y a ${days} j`;
    return date.toLocaleDateString('fr-FR');
  }

  getGreeting(): string {
    const h = this.today.getHours();
    if (h < 12) return 'Bonjour';
    if (h < 17) return 'Bon après-midi';
    return 'Bonsoir';
  }

  trackByIndex(i: number): number {
    return i;
  }

  trackByActivityId(_: number, a: Activity): number {
    return a.id;
  }

  refreshData(): void {
    this.loadDashboard();
  }
}
