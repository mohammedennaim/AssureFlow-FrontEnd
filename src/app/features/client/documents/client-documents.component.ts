import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ClientSessionService } from '../../../core/application/services/client-session.service';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { CLIENT_REPOSITORY } from '../../../core/domain/ports/client.repository.port';
import { INVOICE_REPOSITORY, Invoice } from '../../../core/domain/ports/invoice.repository.port';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';
import { Client } from '../../../core/domain/models/client.model';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import { daysUntil, formatDateFr, formatMad, policyTypeMeta, statusMeta, StatusMeta } from '../../../shared/utils/client-ui';

export type DocumentCategory = 'ATTESTATION' | 'CONTRACT' | 'INVOICE' | 'RECEIPT' | 'CLAIM';
type DocumentFilter = 'all' | 'ATTESTATION' | 'CONTRACT' | 'INVOICE' | 'CLAIM';
type SortOrder = 'recent' | 'oldest';
type ViewMode = 'date' | 'contract';

interface DocumentField {
  label: string;
  value: string;
}

interface ContractInfo {
  id: string;
  number: string;
  label: string;
  icon: string;
  image?: string;
  status: string;
}

export interface DocumentItem {
  key: string;
  category: DocumentCategory;
  title: string;
  subtitle: string;
  reference: string;
  date: string;
  status: string;
  link: string[];
  icon: string;
  contractId?: string;
  amount?: number;
  validFrom?: string;
  validUntil?: string;
  intro?: string;
  fields: DocumentField[];
  note?: string;
}

interface DocumentGroup {
  key: string;
  label: string;
  contract?: ContractInfo;
  items: DocumentItem[];
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  ATTESTATION: 'Attestation',
  CONTRACT: 'Contrat',
  INVOICE: 'Facture',
  RECEIPT: 'Reçu',
  CLAIM: 'Sinistre'
};

const FILTER_KEYS: DocumentFilter[] = ['all', 'ATTESTATION', 'CONTRACT', 'INVOICE', 'CLAIM'];
const RECENT_DAYS = 30;

@Component({
  selector: 'app-client-documents',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './client-documents.component.html',
  styleUrl: './client-documents.component.scss'
})
export class ClientDocumentsComponent implements OnInit, OnDestroy {
  private clientSession = inject(ClientSessionService);
  private clientRepository = inject(CLIENT_REPOSITORY);
  private policyRepository = inject(POLICY_REPOSITORY);
  private claimRepository = inject(CLAIM_REPOSITORY);
  private invoiceRepository = inject(INVOICE_REPOSITORY);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly icons = AF_ICONS;
  readonly today = new Date().toISOString();
  readonly filters: { key: DocumentFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'ATTESTATION', label: 'Attestations' },
    { key: 'CONTRACT', label: 'Contrats' },
    { key: 'INVOICE', label: 'Factures et reçus' },
    { key: 'CLAIM', label: 'Sinistres' }
  ];

  isLoading = true;
  errorMessage = '';
  activeFilter: DocumentFilter = 'all';
  sortOrder: SortOrder = 'recent';
  viewMode: ViewMode = 'date';
  search = '';
  documents: DocumentItem[] = [];
  contracts: ContractInfo[] = [];
  client: Client | null = null;
  preview: DocumentItem | null = null;
  copied = false;
  collapsed = new Set<string>();

  private lastFocus: HTMLElement | null = null;
  private copyTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const type = (params.get('type') || '').toUpperCase() as DocumentFilter;
    if (FILTER_KEYS.includes(type)) this.activeFilter = type;
    if (params.get('vue') === 'contrat') this.viewMode = 'contract';
    this.search = params.get('q') ?? '';
    this.loadDocuments();
  }

  ngOnDestroy(): void {
    clearTimeout(this.copyTimer);
    document.body.classList.remove('af-printing', 'af-modal-open');
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA');

    if (this.preview) {
      if (event.key === 'Escape') this.closePreview();
      else if (event.key === 'ArrowLeft' && !typing) this.step(-1);
      else if (event.key === 'ArrowRight' && !typing) this.step(1);
      else if (event.key === 'Tab') this.trapFocus(event);
      return;
    }

    if (event.key === '/' && !typing) {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    } else if (event.key === 'Escape' && target === this.searchInput?.nativeElement && this.search) {
      this.setSearch('');
    }
  }

  get filteredDocuments(): DocumentItem[] {
    const term = this.normalize(this.search.trim());
    const list = this.documents
      .filter(d => this.matchesFilter(d, this.activeFilter))
      .filter(d => !term || this.searchText(d).includes(term));
    return this.sortOrder === 'recent' ? list : [...list].reverse();
  }

  get groups(): DocumentGroup[] {
    const docs = this.filteredDocuments;
    if (this.viewMode === 'contract') {
      const groups: DocumentGroup[] = this.contracts
        .map(c => ({ key: c.id, label: c.label, contract: c, items: docs.filter(d => d.contractId === c.id) }))
        .filter(g => g.items.length);
      const others = docs.filter(d => !d.contractId || !this.contracts.some(c => c.id === d.contractId));
      if (others.length) groups.push({ key: 'others', label: 'Autres documents', items: others });
      return groups;
    }

    const groups: DocumentGroup[] = [];
    for (const doc of docs) {
      const year = new Date(doc.date).getFullYear();
      const label = Number.isNaN(year) ? 'Sans date' : String(year);
      const group = groups.find(g => g.key === label);
      if (group) group.items.push(doc);
      else groups.push({ key: label, label, items: [doc] });
    }
    return groups;
  }

  get attestations(): DocumentItem[] {
    return this.documents.filter(d => d.category === 'ATTESTATION').slice(0, 3);
  }

  get overdue(): DocumentItem[] {
    return this.documents.filter(d => d.category === 'INVOICE' && d.status === 'OVERDUE');
  }

  get overdueTotal(): string {
    return formatMad(this.overdue.reduce((sum, d) => sum + (d.amount ?? 0), 0));
  }

  get hasActiveFilters(): boolean {
    return this.activeFilter !== 'all' || !!this.search.trim();
  }

  get clientName(): string {
    return [this.client?.firstName, this.client?.lastName].filter(Boolean).join(' ') || 'Assuré AssureFlow';
  }

  get previewIndex(): number {
    return this.preview ? this.filteredDocuments.findIndex(d => d.key === this.preview!.key) : -1;
  }

  get previewTotal(): number {
    return this.filteredDocuments.length;
  }

  get shareLink(): string {
    const doc = this.preview;
    if (!doc) return '';
    const lines = [`${doc.title} — ${doc.reference}`, '', ...doc.fields.map(f => `${f.label} : ${f.value}`), '', `Assuré : ${this.clientName}`];
    return `mailto:?subject=${encodeURIComponent(`${doc.title} — ${doc.reference}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
  }

  contractOf(doc: DocumentItem): ContractInfo | undefined {
    return this.contracts.find(c => c.id === doc.contractId);
  }

  count(filter: DocumentFilter): number {
    return this.documents.filter(d => this.matchesFilter(d, filter)).length;
  }

  categoryLabel(doc: DocumentItem): string {
    return CATEGORY_LABELS[doc.category];
  }

  status(doc: DocumentItem | ContractInfo): StatusMeta {
    return statusMeta(doc.status);
  }

  isRecent(doc: DocumentItem): boolean {
    const t = this.time(doc.date);
    return t > 0 && Date.now() - t < RECENT_DAYS * 86400000;
  }

  date(value: string | null | undefined): string {
    return formatDateFr(value);
  }

  validityLeft(doc: DocumentItem): number {
    const start = this.time(doc.validFrom ?? '');
    const end = this.time(doc.validUntil ?? '');
    if (!start || !end || end <= start) return 0;
    return Math.max(0, Math.min(100, Math.round(((end - Date.now()) / (end - start)) * 100)));
  }

  remaining(doc: DocumentItem): { label: string; soon: boolean } {
    const days = daysUntil(doc.validUntil);
    if (days === null) return { label: '', soon: false };
    if (days < 0) return { label: 'Expirée', soon: true };
    if (days === 0) return { label: 'Expire aujourd’hui', soon: true };
    if (days <= 30) return { label: `Expire dans ${days} jour${days > 1 ? 's' : ''}`, soon: true };
    const months = Math.floor(days / 30.44);
    return { label: months >= 12 ? `Encore ${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}${months % 12 ? ` et ${months % 12} mois` : ''}` : `Encore ${months} mois`, soon: false };
  }

  setFilter(filter: DocumentFilter): void {
    this.activeFilter = filter;
    this.syncUrl();
  }

  setView(mode: ViewMode): void {
    this.viewMode = mode;
    this.collapsed.clear();
    this.syncUrl();
  }

  setSearch(value: string): void {
    this.search = value;
    this.syncUrl();
  }

  resetFilters(): void {
    this.activeFilter = 'all';
    this.search = '';
    this.syncUrl();
  }

  toggleGroup(key: string): void {
    if (this.collapsed.has(key)) this.collapsed.delete(key);
    else this.collapsed.add(key);
  }

  openPreview(doc: DocumentItem, print = false): void {
    if (!this.preview) this.lastFocus = document.activeElement as HTMLElement | null;
    this.preview = doc;
    this.copied = false;
    document.body.classList.add('af-modal-open');
    setTimeout(() => {
      // Rendered under <body> so the fixed overlay escapes transformed ancestors and printing can hide the rest of the app.
      const overlay = this.overlay();
      if (overlay && overlay.parentElement !== document.body) document.body.appendChild(overlay);
      if (!overlay?.contains(document.activeElement)) (overlay?.querySelector('.preview__close') as HTMLElement | null)?.focus();
      overlay?.querySelector('.preview__scroll')?.scrollTo({ top: 0 });
      if (print) {
        const logo = overlay?.querySelector('.paper__logo') as HTMLImageElement | null;
        if (logo && !logo.complete) logo.addEventListener('load', () => this.print(), { once: true });
        else this.print();
      }
    });
  }

  closePreview(): void {
    this.preview = null;
    document.body.classList.remove('af-modal-open');
    this.lastFocus?.focus();
  }

  step(direction: 1 | -1): void {
    const list = this.filteredDocuments;
    const next = list[this.previewIndex + direction];
    if (next) this.openPreview(next);
  }

  print(): void {
    document.body.classList.add('af-printing');
    const done = () => {
      document.body.classList.remove('af-printing');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  copyReference(): void {
    const ref = this.preview?.reference;
    if (!ref || !navigator.clipboard) return;
    navigator.clipboard.writeText(ref).then(() => {
      this.copied = true;
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied = false, 1800);
    }).catch(() => undefined);
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.clientSession.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) {
          this.errorMessage = 'Client introuvable.';
          return of(null);
        }
        return forkJoin({
          client: this.clientRepository.getMe().pipe(catchError(() => of(null))),
          policies: this.policyRepository.getByClientId(clientId).pipe(catchError(() => of([] as Policy[]))),
          claims: this.claimRepository.getByClientId(clientId).pipe(catchError(() => of([] as Claim[]))),
          invoices: this.invoiceRepository.getByClientId(clientId).pipe(catchError(() => of([] as Invoice[])))
        });
      }),
      catchError(() => {
        this.errorMessage = 'Erreur lors du chargement de vos documents.';
        return of(null);
      })
    ).subscribe((data) => {
      this.isLoading = false;
      if (!data) {
        this.documents = [];
        this.contracts = [];
        return;
      }
      this.client = data.client;
      this.contracts = data.policies.map(p => {
        const type = policyTypeMeta(p.type);
        return { id: p.id, number: p.policyNumber, label: `Assurance ${type.label}`, icon: type.icon, image: type.image, status: p.status };
      });
      const numberOf = (id: string) => this.contracts.find(c => c.id === id)?.number;
      this.documents = [
        ...data.policies.flatMap(p => this.policyDocuments(p)),
        ...data.invoices.flatMap(i => this.invoiceDocuments(i, numberOf(i.policyId))),
        ...data.claims.map(c => this.claimDocument(c, numberOf(c.policyId)))
      ].sort((a, b) => this.time(b.date) - this.time(a.date));
    });
  }

  private policyDocuments(p: Policy): DocumentItem[] {
    const type = policyTypeMeta(p.type);
    const period = `Du ${formatDateFr(p.startDate)} au ${formatDateFr(p.endDate)}`;
    const docs: DocumentItem[] = [{
      key: `contract-${p.id}`,
      category: 'CONTRACT',
      title: 'Conditions particulières',
      subtitle: `Assurance ${type.label}`,
      reference: p.policyNumber,
      date: p.createdAt ?? p.startDate,
      status: p.status,
      link: ['/client/policies', p.id],
      icon: type.icon,
      contractId: p.id,
      fields: [
        { label: 'Contrat', value: `Assurance ${type.label}` },
        { label: 'N° de contrat', value: p.policyNumber || '—' },
        { label: 'Période de couverture', value: period },
        { label: 'Prime', value: formatMad(p.premium) },
        { label: 'Capital garanti', value: p.coverageAmount ? formatMad(p.coverageAmount) : '—' },
        { label: 'Statut', value: statusMeta(p.status).label }
      ]
    }];

    if ((p.status || '').toUpperCase() === 'ACTIVE') {
      docs.push({
        key: `attestation-${p.id}`,
        category: 'ATTESTATION',
        title: 'Attestation d’assurance',
        subtitle: `Assurance ${type.label}`,
        reference: p.policyNumber,
        date: p.startDate ?? p.createdAt ?? '',
        status: p.status,
        link: ['/client/policies', p.id],
        icon: type.icon,
        contractId: p.id,
        validFrom: p.startDate,
        validUntil: p.endDate,
        intro: `est titulaire auprès d’AssureFlow du contrat d’assurance ${type.label} n° ${p.policyNumber}, en cours de validité ${period.toLowerCase()}.`,
        fields: [
          { label: 'Contrat', value: `Assurance ${type.label}` },
          { label: 'N° de contrat', value: p.policyNumber || '—' },
          { label: 'Date d’effet', value: formatDateFr(p.startDate) },
          { label: 'Date d’échéance', value: formatDateFr(p.endDate) }
        ],
        note: 'Cette attestation est délivrée pour servir et valoir ce que de droit.'
      });
    }
    return docs;
  }

  private invoiceDocuments(i: Invoice, policyNumber?: string): DocumentItem[] {
    const status = i.overDue && i.status !== 'PAID' ? 'OVERDUE' : i.status;
    const fields: DocumentField[] = [
      { label: 'N° de facture', value: i.invoiceNumber || '—' },
      { label: 'Contrat', value: policyNumber || '—' },
      { label: 'Échéance', value: formatDateFr(i.dueDate) },
      { label: 'Montant HT', value: formatMad(i.amount) },
      { label: 'TVA', value: formatMad(i.taxAmount) },
      { label: 'Total TTC', value: formatMad(i.totalAmount) }
    ];
    const docs: DocumentItem[] = [{
      key: `invoice-${i.id}`,
      category: 'INVOICE',
      title: `Facture ${i.invoiceNumber || ''}`.trim(),
      subtitle: `${formatMad(i.totalAmount)} · échéance ${formatDateFr(i.dueDate)}`,
      reference: i.invoiceNumber,
      date: i.createdAt ?? i.dueDate,
      status,
      link: ['/client/billing'],
      icon: 'invoices',
      contractId: i.policyId,
      amount: i.totalAmount,
      fields
    }];

    if (i.status === 'PAID') {
      docs.push({
        key: `receipt-${i.id}`,
        category: 'RECEIPT',
        title: 'Reçu de paiement',
        subtitle: `Facture ${i.invoiceNumber} · ${formatMad(i.totalAmount)}`,
        reference: i.invoiceNumber,
        date: i.updatedAt ?? i.dueDate,
        status: 'PAID',
        link: ['/client/billing'],
        icon: 'checkAll',
        contractId: i.policyId,
        amount: i.totalAmount,
        intro: `a réglé la somme de ${formatMad(i.totalAmount)} au titre de la facture n° ${i.invoiceNumber}.`,
        fields: fields.filter(f => f.label !== 'Échéance')
      });
    }
    return docs;
  }

  private claimDocument(c: Claim, policyNumber?: string): DocumentItem {
    return {
      key: `claim-${c.id}`,
      category: 'CLAIM',
      title: 'Déclaration de sinistre',
      subtitle: policyNumber ? `Contrat ${policyNumber}` : 'Sinistre déclaré',
      reference: c.claimNumber,
      date: c.submittedAt ?? c.createdAt ?? '',
      status: c.status,
      link: ['/client/claims', c.id],
      icon: 'claims',
      contractId: c.policyId,
      fields: [
        { label: 'N° de sinistre', value: c.claimNumber || '—' },
        { label: 'Contrat', value: policyNumber || '—' },
        { label: 'Date de l’événement', value: formatDateFr(c.incidentDate) },
        { label: 'Déclaré le', value: formatDateFr(c.submittedAt ?? c.createdAt) },
        { label: 'Montant estimé', value: c.estimatedAmount ? formatMad(c.estimatedAmount) : '—' },
        { label: 'Statut', value: statusMeta(c.status).label },
        { label: 'Description', value: c.description || '—' }
      ]
    };
  }

  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        type: this.activeFilter === 'all' ? null : this.activeFilter.toLowerCase(),
        vue: this.viewMode === 'contract' ? 'contrat' : null,
        q: this.search.trim() || null
      },
      replaceUrl: true
    });
  }

  private overlay(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.af-print-root') ?? document.querySelector('.af-print-root');
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(this.overlay()?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private searchText(doc: DocumentItem): string {
    return this.normalize([doc.title, doc.subtitle, doc.reference, CATEGORY_LABELS[doc.category], this.status(doc).label,
      this.contractOf(doc)?.label, this.contractOf(doc)?.number].filter(Boolean).join(' '));
  }

  private matchesFilter(doc: DocumentItem, filter: DocumentFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'INVOICE') return doc.category === 'INVOICE' || doc.category === 'RECEIPT';
    return doc.category === filter;
  }

  private normalize(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private time(value: string): number {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
}
