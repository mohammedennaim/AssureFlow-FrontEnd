import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, firstValueFrom, forkJoin, map, of, switchMap, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { ClientDashboardService } from '../../../core/application/services/client-dashboard.service';
import { Claim } from '../../../core/domain/models/claim.model';
import { Policy } from '../../../core/domain/models/policy.model';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { CLIENT_REPOSITORY } from '../../../core/domain/ports/client.repository.port';
import { INVOICE_REPOSITORY, Invoice } from '../../../core/domain/ports/invoice.repository.port';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import {
  ASSISTANT_FAQ,
  ASSISTANT_SUGGESTIONS,
  AssistantAction,
  AssistantContext,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
  TICKET_CATEGORIES,
  buildReply,
  guessTicketCategory,
  renderMarkdown
} from './assistant-engine';
import {
  HandoffChannel,
  HandoffRequest,
  QuickOption,
  QuickPrompt,
  SupportAvailability,
  buildSummary,
  callbackSlots,
  channelOptions,
  isValidPhone,
  relatedOptions,
  requestReference,
  supportAvailability,
  topicOptions
} from './support-handoff';

type Role = 'user' | 'assistant';
type Feedback = 'up' | 'down' | null;

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  html: string;
  actions?: AssistantAction[];
  quick?: QuickPrompt;
  request?: HandoffRequest;
  /** User bubble produced by clicking a quick reply rather than typing. */
  choice?: boolean;
  createdAt: number;
  feedback?: Feedback;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface ConversationGroup {
  label: string;
  items: Conversation[];
}

interface HandoffSelection {
  channel?: HandoffChannel;
  topic?: string;
  related?: string;
  relatedDone: boolean;
  question: string;
}

const STORAGE_KEY = 'af.assistant.conversations.v1';
const MAX_CONVERSATIONS = 30;
const SUMMARY_MIN = 15;
const EMPTY_CONTEXT: AssistantContext = { firstName: '', phone: '', policies: [], claims: [], invoices: [] };

@Component({
  selector: 'app-client-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './client-assistant.component.html',
  styleUrl: './client-assistant.component.scss'
})
export class ClientAssistantComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly icons = AF_ICONS;
  readonly suggestions = ASSISTANT_SUGGESTIONS;
  readonly faq = ASSISTANT_FAQ;
  readonly slots = callbackSlots();
  readonly summaryMin = SUMMARY_MIN;
  readonly supportEmail = SUPPORT_EMAIL;
  readonly supportPhone = SUPPORT_PHONE;
  readonly supportHours = SUPPORT_HOURS;
  readonly phoneHref = `tel:${SUPPORT_PHONE.replace(/[^\d+]/g, '')}`;
  readonly availability: SupportAvailability = supportAvailability();

  @ViewChild('thread') private thread?: ElementRef<HTMLElement>;
  @ViewChild('composer') private composer?: ElementRef<HTMLTextAreaElement>;

  conversations: Conversation[] = [];
  activeId: string | null = null;
  draft = '';
  firstName = '';
  isThinking = false;
  isStreaming = false;
  sidebarOpen = false;
  copiedId: string | null = null;

  private context: Promise<AssistantContext> = Promise.resolve(EMPTY_CONTEXT);
  private streamTimer: ReturnType<typeof setInterval> | null = null;
  private thinkTimer: ReturnType<typeof setTimeout> | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;
  private streamingMessage: { message: ChatMessage; full: string } | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private zone = inject(NgZone);
  private host = inject(ElementRef<HTMLElement>);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private dashboardService = inject(ClientDashboardService);
  private clientRepository = inject(CLIENT_REPOSITORY);
  private policyRepository = inject(POLICY_REPOSITORY);
  private claimRepository = inject(CLAIM_REPOSITORY);
  private invoiceRepository = inject(INVOICE_REPOSITORY);

  ngOnInit(): void {
    this.conversations = this.load();
    this.context = this.loadContext();
    this.context.then(ctx => this.firstName = ctx.firstName);
  }

  ngAfterViewInit(): void {
    const prompt = this.route.snapshot.queryParamMap.get('q');
    const fragment = this.route.snapshot.fragment;
    if (prompt) {
      this.router.navigate([], { queryParams: { q: null }, queryParamsHandling: 'merge', replaceUrl: true });
      setTimeout(() => this.send(prompt));
    } else if (fragment === 'contact') {
      setTimeout(() => this.startHandoff());
    } else if (fragment === 'faq') {
      setTimeout(() => this.host.nativeElement.querySelector('#faq')?.scrollIntoView({ block: 'center' }));
    } else {
      this.focusComposer();
    }
  }

  ngOnDestroy(): void {
    this.finishStream();
    this.clearTimer(this.thinkTimer);
    this.clearTimer(this.copyTimer);
  }

  get active(): Conversation | null {
    return this.conversations.find(c => c.id === this.activeId) ?? null;
  }

  get messages(): ChatMessage[] {
    return this.active?.messages ?? [];
  }

  get isBusy(): boolean {
    return this.isThinking || this.isStreaming;
  }

  get canSend(): boolean {
    return !!this.draft.trim() && !this.isBusy;
  }

  get groups(): ConversationGroup[] {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const week = startOfDay - 6 * 86400000;
    const buckets: ConversationGroup[] = [
      { label: 'Aujourd’hui', items: [] },
      { label: '7 derniers jours', items: [] },
      { label: 'Plus ancien', items: [] }
    ];
    for (const conversation of this.conversations) {
      const index = conversation.updatedAt >= startOfDay ? 0 : conversation.updatedAt >= week ? 1 : 2;
      buckets[index].items.push(conversation);
    }
    return buckets.filter(group => group.items.length);
  }

  newChat(): void {
    this.stop();
    this.activeId = null;
    this.draft = '';
    this.sidebarOpen = false;
    this.focusComposer();
  }

  open(conversation: Conversation): void {
    if (this.isBusy) this.stop();
    this.activeId = conversation.id;
    this.sidebarOpen = false;
    this.scrollToBottom(false);
    this.focusComposer();
  }

  remove(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    if (this.activeId === conversation.id) {
      this.stop();
      this.activeId = null;
    }
    this.conversations = this.conversations.filter(c => c.id !== conversation.id);
    this.save();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.submit();
    }
  }

  autosize(): void {
    const el = this.composer?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  submit(): void {
    if (this.canSend) this.send(this.draft);
  }

  async send(raw: string): Promise<void> {
    const text = raw.trim();
    if (!text || this.isBusy) return;

    const conversation = this.ensureConversation(text);
    conversation.messages.push(this.message('user', text));
    this.touch(conversation);
    this.draft = '';
    if (this.composer) this.composer.nativeElement.value = '';
    this.autosize();
    this.scrollToBottom();
    await this.respond(conversation, text);
  }

  regenerate(): void {
    const conversation = this.active;
    if (!conversation || this.isBusy) return;
    const lastUser = [...conversation.messages].reverse().find(m => m.role === 'user' && !m.choice);
    if (!lastUser) return;
    if (conversation.messages[conversation.messages.length - 1]?.role === 'assistant') {
      conversation.messages.pop();
    }
    this.respond(conversation, lastUser.text);
  }

  stop(): void {
    this.clearTimer(this.thinkTimer);
    this.thinkTimer = null;
    this.isThinking = false;
    this.finishStream(false);
  }

  copy(message: ChatMessage): void {
    navigator.clipboard?.writeText(message.text).then(() => {
      this.copiedId = message.id;
      this.clearTimer(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copiedId = null, 1800);
    }).catch(() => {});
  }

  rate(message: ChatMessage, value: Feedback): void {
    message.feedback = message.feedback === value ? null : value;
    this.save();
  }

  runAction(action: AssistantAction): void {
    if (action.kind === 'handoff') this.startHandoff();
  }

  // ==================== Mise en relation avec un conseiller ====================

  startHandoff(): void {
    if (this.isBusy) this.stop();
    this.sidebarOpen = false;

    const pending = this.pendingHandoff();
    if (pending) {
      this.focusMessage(pending);
      return;
    }

    const conversation = this.ensureConversation('Parler à un conseiller');
    conversation.messages.push({ ...this.message('user', 'Je souhaite parler à un conseiller'), choice: true });
    this.touch(conversation);
    this.scrollToBottom();
    this.askChannel(conversation);
  }

  choose(message: ChatMessage, option: QuickOption): void {
    const quick = message.quick;
    const conversation = this.active;
    if (!quick || quick.selected || !conversation || this.isBusy) return;

    quick.selected = option.id;
    conversation.messages.push({ ...this.message('user', option.label), choice: true });
    this.touch(conversation);
    this.scrollToBottom();

    if (quick.step === 'channel' && option.id === 'call') {
      const text = this.availability.open
        ? `Nos conseillers vous répondent au **${SUPPORT_PHONE}**. Ils sont disponibles maintenant : bonne conversation !`
        : `Nos conseillers sont joignables au **${SUPPORT_PHONE}**, **${SUPPORT_HOURS.toLowerCase()}**. En dehors de ces horaires, je peux transmettre un message ou programmer un rappel.`;
      this.say(conversation, text, this.availability.open ? undefined : { step: 'channel', options: channelOptions(this.availability).filter(o => o.id !== 'call') });
      return;
    }

    this.advanceHandoff(conversation);
  }

  isChosen(quick: QuickPrompt, option: QuickOption): boolean {
    return quick.selected === option.id;
  }

  requestValid(request: HandoffRequest): boolean {
    const summaryOk = request.summary.trim().length >= SUMMARY_MIN;
    return request.channel === 'callback' ? summaryOk && isValidPhone(request.phone) : summaryOk;
  }

  phoneInvalid(request: HandoffRequest): boolean {
    return !!request.touched && request.channel === 'callback' && !isValidPhone(request.phone);
  }

  summaryInvalid(request: HandoffRequest): boolean {
    return !!request.touched && request.summary.trim().length < SUMMARY_MIN;
  }

  submitRequest(message: ChatMessage): void {
    const request = message.request;
    const conversation = this.active;
    if (!request || !conversation || request.status !== 'draft') return;
    if (!this.requestValid(request)) {
      request.touched = true;
      return;
    }

    request.status = 'sending';
    request.reference = requestReference();
    const user = this.authService.getCurrentUser();
    const isCallback = request.channel === 'callback';
    const details = [
      `Canal souhaité : ${isCallback ? `rappel (${request.slot}) au ${request.phone.trim()}` : 'réponse écrite'}`,
      request.related ? `Dossier concerné : ${request.related}` : '',
      '',
      request.summary.trim()
    ].filter((line, index) => line || index === 2).join('\n');

    this.http.post(`${environment.apiUrl}/notifications`, {
      type: 'SUPPORT_REQUEST',
      recipient: user?.id ?? SUPPORT_EMAIL,
      subject: `[${request.topic}] ${isCallback ? 'Demande de rappel' : 'Message'} · Réf. ${request.reference}`,
      content: details,
      policyId: null
    }).pipe(
      // The request is also routed by e-mail, so a notification-service failure must not block the client.
      catchError(() => of(null))
    ).subscribe(() => {
      request.status = 'sent';
      request.sentAt = Date.now();
      this.touch(conversation);
      const text = isCallback
        ? `C’est noté ! Un conseiller vous rappellera au **${request.phone.trim()}** (${request.slot.toLowerCase()}).\n\nPuis-je vous aider pour autre chose en attendant ?`
        : `C’est envoyé ! Votre demande **${request.reference}** est entre les mains de nos conseillers. ${this.availability.open ? 'Vous recevrez une réponse **en moins de 2 h**.' : `Vous recevrez une réponse **${this.availability.detail.replace('Réponse ', '')}**.`}\n\nPuis-je vous aider pour autre chose en attendant ?`;
      this.say(conversation, text);
    });
  }

  cancelRequest(message: ChatMessage): void {
    const conversation = this.active;
    if (!conversation || message.request?.status === 'sending') return;
    conversation.messages = conversation.messages.filter(m => m !== message);
    this.touch(conversation);
    this.say(conversation, 'Pas de souci, j’ai annulé la demande. Je reste à votre disposition si vous avez une question.');
  }

  setSlot(request: HandoffRequest, slot: string): void {
    if (request.status === 'draft') request.slot = slot;
  }

  sentLabel(timestamp: number | undefined): string {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  // ==================== Affichage ====================

  isLastAssistant(message: ChatMessage): boolean {
    const list = this.messages;
    return list[list.length - 1] === message && message.role === 'assistant';
  }

  isStreamingMessage(message: ChatMessage): boolean {
    return this.isStreaming && this.streamingMessage?.message === message;
  }

  isInteractive(message: ChatMessage): boolean {
    return !!(message.quick || message.request);
  }

  private async respond(conversation: Conversation, question: string): Promise<void> {
    this.isThinking = true;
    this.scrollToBottom();

    const [ctx] = await Promise.all([
      this.context,
      new Promise<void>(resolve => this.thinkTimer = setTimeout(resolve, 650 + Math.random() * 450))
    ]);

    if (!this.isThinking || this.activeId !== conversation.id) return;
    this.isThinking = false;

    const reply = buildReply(question, ctx);
    if (reply.handoff) {
      const pending = this.pendingHandoff();
      if (pending) {
        this.say(conversation, 'Votre demande est en cours de préparation juste au-dessus : complétez-la et je la transmets à un conseiller.');
        this.focusMessage(pending);
      } else {
        this.askChannel(conversation, false);
      }
      return;
    }

    const message = this.message('assistant', '');
    message.actions = reply.actions;
    conversation.messages.push(message);
    this.stream(message, reply.text, conversation);
  }

  private askChannel(conversation: Conversation, think = true): void {
    const open = this.availability.open;
    const text = open
      ? 'Je vous mets en relation avec un conseiller : ils sont **disponibles maintenant**. Comment préférez-vous échanger ?'
      : `Je vous mets en relation avec un conseiller. L’équipe est actuellement **hors ligne** (${SUPPORT_HOURS.toLowerCase()}). Laissez-leur un message ou demandez à être rappelé : ${this.availability.detail.charAt(0).toLowerCase()}${this.availability.detail.slice(1)}.`;
    this.say(conversation, text, { step: 'channel', options: channelOptions(this.availability) }, think);
  }

  private async advanceHandoff(conversation: Conversation): Promise<void> {
    const selection = this.handoffSelection(conversation);
    if (!selection.channel) return;

    if (!selection.topic) {
      const suggested = selection.question ? guessTicketCategory(selection.question) : '';
      this.say(conversation, 'C’est noté. **Quel est le sujet** de votre demande ?', { step: 'topic', options: topicOptions(suggested) });
      return;
    }

    const ctx = await this.context;
    if (!selection.relatedDone) {
      const options = relatedOptions(selection.topic, ctx);
      if (options.length) {
        this.say(conversation, 'Votre demande concerne-t-elle **l’un de vos dossiers** ? Le conseiller gagnera du temps.', { step: 'related', options });
        return;
      }
    }

    const message = this.message('assistant', '');
    message.request = {
      channel: selection.channel,
      topic: selection.topic,
      related: selection.related ?? '',
      summary: buildSummary(selection.topic, selection.related ?? '', selection.question),
      phone: ctx.phone,
      slot: this.slots[0],
      status: 'draft'
    };
    const text = selection.channel === 'callback'
      ? 'Parfait ! Indiquez **votre numéro** et **le créneau** qui vous arrange. J’ai préparé un résumé pour le conseiller : vous pouvez le modifier.'
      : 'Parfait ! J’ai **préparé votre message** pour le conseiller à partir de notre échange. Relisez-le, complétez si besoin, puis envoyez.';
    this.say(conversation, text, undefined, true, message);
  }

  private handoffSelection(conversation: Conversation): HandoffSelection {
    const messages = conversation.messages;
    let start = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].quick?.step === 'channel' && messages[i].quick?.selected) {
        start = i;
        break;
      }
    }

    const selection: HandoffSelection = { relatedDone: false, question: '' };
    if (start < 0) return selection;

    for (const message of messages.slice(start)) {
      const quick = message.quick;
      if (!quick?.selected) continue;
      const option = quick.options.find(o => o.id === quick.selected);
      if (quick.step === 'channel' && (quick.selected === 'message' || quick.selected === 'callback')) {
        selection.channel = quick.selected;
      } else if (quick.step === 'topic') {
        selection.topic = quick.selected;
      } else if (quick.step === 'related') {
        selection.relatedDone = true;
        selection.related = quick.selected === 'none' ? '' : `${option?.label ?? ''}${option?.hint ? ` (${option.hint})` : ''}`;
      }
    }

    selection.question = [...messages.slice(0, start)].reverse()
      .find(m => m.role === 'user' && !m.choice && !this.isBareHandoffRequest(m.text))?.text ?? '';
    return selection;
  }

  /** « Je veux parler à un conseiller » : demande de contact sans contexte utile pour le résumé. */
  private isBareHandoffRequest(text: string): boolean {
    return !!buildReply(text, EMPTY_CONTEXT).handoff && guessTicketCategory(text) === TICKET_CATEGORIES[4];
  }

  private pendingHandoff(): ChatMessage | undefined {
    return [...this.messages].reverse().find(m =>
      (m.quick && !m.quick.selected) || (m.request && m.request.status !== 'sent'));
  }

  private say(conversation: Conversation, text: string, quick?: QuickPrompt, think = true, preset?: ChatMessage): void {
    const reveal = () => {
      const message = preset ?? this.message('assistant', '');
      message.text = '';
      message.html = '';
      if (quick) message.quick = quick;
      conversation.messages.push(message);
      this.stream(message, text, conversation);
    };

    if (!think) {
      reveal();
      return;
    }

    this.isThinking = true;
    this.scrollToBottom();
    this.thinkTimer = setTimeout(() => {
      if (!this.isThinking) return;
      this.isThinking = false;
      reveal();
    }, 450);
  }

  private stream(message: ChatMessage, full: string, conversation: Conversation): void {
    const tokens = full.match(/\S+\s*|\s+/g) ?? [full];
    let index = 0;
    this.isStreaming = true;
    this.streamingMessage = { message, full };

    this.streamTimer = setInterval(() => {
      index = Math.min(tokens.length, index + 2);
      message.text = tokens.slice(0, index).join('');
      message.html = renderMarkdown(message.text);
      this.scrollToBottom(false, false);
      if (index >= tokens.length) {
        this.finishStream(true);
        this.touch(conversation);
        if (message.quick || message.request) this.scrollToBottom();
      }
    }, 24);
  }

  private finishStream(complete = true): void {
    this.clearTimer(this.streamTimer);
    this.streamTimer = null;
    if (this.streamingMessage) {
      const { message, full } = this.streamingMessage;
      if (complete || message.quick || message.request) {
        message.text = full;
        message.html = renderMarkdown(full);
      } else if (!message.text.trim()) {
        message.text = 'Réponse interrompue.';
        message.html = renderMarkdown(message.text);
      }
      this.streamingMessage = null;
      this.save();
    }
    this.isStreaming = false;
  }

  private ensureConversation(firstMessage: string): Conversation {
    const existing = this.active;
    if (existing) return existing;
    const conversation: Conversation = {
      id: this.uid(),
      title: firstMessage.length > 48 ? `${firstMessage.slice(0, 48).trim()}…` : firstMessage,
      updatedAt: Date.now(),
      messages: []
    };
    this.conversations = [conversation, ...this.conversations].slice(0, MAX_CONVERSATIONS);
    this.activeId = conversation.id;
    return conversation;
  }

  private touch(conversation: Conversation): void {
    conversation.updatedAt = Date.now();
    this.conversations = [conversation, ...this.conversations.filter(c => c !== conversation)];
    this.save();
  }

  private message(role: Role, text: string): ChatMessage {
    return { id: this.uid(), role, text, html: role === 'assistant' ? renderMarkdown(text) : '', createdAt: Date.now() };
  }

  private loadContext(): Promise<AssistantContext> {
    const profile$ = this.clientRepository.getMe().pipe(
      map(client => ({ firstName: client?.firstName?.trim() || '', phone: client?.phone?.trim() || '' })),
      catchError(() => of({ firstName: '', phone: '' }))
    );
    const data$ = this.dashboardService.getCurrentClientId().pipe(
      switchMap(clientId => clientId
        ? forkJoin({
            policies: this.policyRepository.getByClientId(clientId).pipe(catchError(() => of([] as Policy[]))),
            claims: this.claimRepository.getByClientId(clientId).pipe(catchError(() => of([] as Claim[]))),
            invoices: this.invoiceRepository.getByClientId(clientId).pipe(catchError(() => of([] as Invoice[])))
          })
        : of({ policies: [], claims: [], invoices: [] })),
      catchError(() => of({ policies: [], claims: [], invoices: [] }))
    );

    return firstValueFrom(
      forkJoin({ profile: profile$, data: data$ }).pipe(
        map(({ profile, data }) => ({ ...profile, ...data })),
        timeout(8000),
        catchError(() => of(EMPTY_CONTEXT))
      )
    );
  }

  private load(): Conversation[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Conversation[];
      return Array.isArray(parsed)
        ? parsed.map(c => ({
            ...c,
            messages: c.messages.map(m => ({
              ...m,
              html: m.role === 'assistant' ? renderMarkdown(m.text) : '',
              request: m.request?.status === 'sending' ? { ...m.request, status: 'draft' as const } : m.request
            }))
          }))
        : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      const data = this.conversations
        .filter(c => c.messages.length)
        .map(c => ({ ...c, messages: c.messages.map(({ html, ...rest }) => rest) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable: the conversation simply isn't persisted.
    }
  }

  private scrollToBottom(smooth = true, force = true): void {
    this.zone.runOutsideAngular(() => requestAnimationFrame(() => {
      const el = this.thread?.nativeElement;
      if (!el) return;
      if (!force && el.scrollHeight - el.scrollTop - el.clientHeight > 160) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    }));
  }

  private focusMessage(message: ChatMessage): void {
    setTimeout(() => {
      const el = this.host.nativeElement.querySelector(`[data-message="${message.id}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el?.querySelector('button:not([disabled]), input, textarea') as HTMLElement | null)?.focus({ preventScroll: true });
    }, 60);
  }

  private focusComposer(): void {
    setTimeout(() => this.composer?.nativeElement.focus({ preventScroll: true }));
  }

  private clearTimer(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null): void {
    if (timer) clearTimeout(timer as ReturnType<typeof setTimeout>);
  }

  private uid(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
