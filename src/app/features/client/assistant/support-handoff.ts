import { daysUntil, formatMad, policyTypeMeta, statusMeta } from '../../../shared/utils/client-ui';
import { AssistantContext, SUPPORT_PHONE, TICKET_CATEGORIES } from './assistant-engine';

export type HandoffStep = 'channel' | 'topic' | 'related';
export type HandoffChannel = 'message' | 'callback';

export interface QuickOption {
  id: string;
  label: string;
  icon: string;
  hint?: string;
  href?: string;
  suggested?: boolean;
}

export interface QuickPrompt {
  step: HandoffStep;
  options: QuickOption[];
  selected?: string;
}

export interface HandoffRequest {
  channel: HandoffChannel;
  topic: string;
  related: string;
  summary: string;
  phone: string;
  slot: string;
  status: 'draft' | 'sending' | 'sent';
  touched?: boolean;
  sentAt?: number;
  reference?: string;
}

export interface SupportAvailability {
  open: boolean;
  label: string;
  detail: string;
}

const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;
const CLAIM_OPEN = ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'IN_REVIEW', 'PROCESSING', 'INFO_REQUESTED'];
const INVOICE_SETTLED = ['PAID', 'CANCELLED', 'EXPIRED', 'DRAFT'];
const TOPIC_ICONS = ['contracts', 'claims', 'invoices', 'settings', 'help'];

function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function supportAvailability(now = new Date()): SupportAvailability {
  const hour = now.getHours();
  if (isWorkingDay(now) && hour >= OPEN_HOUR && hour < CLOSE_HOUR) {
    return { open: true, label: 'Conseillers disponibles', detail: 'Réponse en moins de 2 h' };
  }

  if (isWorkingDay(now) && hour < OPEN_HOUR) {
    return { open: false, label: 'Hors horaires', detail: 'Réponse dès 9h aujourd’hui' };
  }

  return { open: false, label: 'Hors horaires', detail: `Réponse dès ${nextWorkingDay(now)} 9h` };
}

function nextWorkingDay(now: Date): string {
  const next = new Date(now);
  do {
    next.setDate(next.getDate() + 1);
  } while (!isWorkingDay(next));
  const tomorrow = next.getDate() === new Date(now.getTime() + 86400000).getDate();
  return tomorrow ? 'demain' : next.toLocaleDateString('fr-FR', { weekday: 'long' });
}

/** Créneaux de rappel proposés, uniquement sur les heures d’ouverture à venir. */
export function callbackSlots(now = new Date()): string[] {
  const hour = now.getHours();
  const slots = ['Dès que possible'];
  if (isWorkingDay(now) && hour < 12) slots.push('Aujourd’hui matin');
  if (isWorkingDay(now) && hour < 16) slots.push('Aujourd’hui après-midi');
  const day = nextWorkingDay(now);
  const label = day.charAt(0).toUpperCase() + day.slice(1);
  slots.push(`${label} matin`, `${label} après-midi`);
  return slots;
}

export function channelOptions(availability: SupportAvailability): QuickOption[] {
  return [
    {
      id: 'message',
      label: 'Écrire à un conseiller',
      hint: availability.open ? 'Réponse en moins de 2 h' : 'Réponse sous 24 h ouvrées',
      icon: 'chat',
      suggested: true
    },
    { id: 'callback', label: 'Être rappelé', hint: 'Choisissez votre créneau', icon: 'phone' },
    {
      id: 'call',
      label: 'Appeler maintenant',
      hint: availability.open ? SUPPORT_PHONE : 'Lun–ven, 9h–18h',
      icon: 'smartphone',
      href: `tel:${SUPPORT_PHONE.replace(/[^\d+]/g, '')}`
    }
  ];
}

export function topicOptions(suggested: string): QuickOption[] {
  return TICKET_CATEGORIES.map((category, index) => ({
    id: category,
    label: category,
    icon: TOPIC_ICONS[index] ?? 'help',
    suggested: category === suggested && category !== TICKET_CATEGORIES[TICKET_CATEGORIES.length - 1]
  }));
}

export function relatedOptions(topic: string, ctx: AssistantContext): QuickOption[] {
  let options: QuickOption[] = [];

  if (topic === TICKET_CATEGORIES[1]) {
    options = [...ctx.claims]
      .sort((a, b) => Number(CLAIM_OPEN.includes((b.status || '').toUpperCase())) - Number(CLAIM_OPEN.includes((a.status || '').toUpperCase())))
      .slice(0, 4)
      .map(claim => ({
        id: `claim:${claim.id}`,
        label: `Sinistre n° ${claim.claimNumber || '—'}`,
        hint: statusMeta(claim.status).label,
        icon: 'claims'
      }));
  } else if (topic === TICKET_CATEGORIES[2]) {
    options = [...ctx.invoices]
      .sort((a, b) => Number(!INVOICE_SETTLED.includes((b.status || '').toUpperCase())) - Number(!INVOICE_SETTLED.includes((a.status || '').toUpperCase())))
      .slice(0, 4)
      .map(invoice => {
        const days = daysUntil(invoice.dueDate);
        const late = !INVOICE_SETTLED.includes((invoice.status || '').toUpperCase()) && (invoice.overDue || (days !== null && days < 0));
        return {
          id: `invoice:${invoice.id}`,
          label: `Facture ${invoice.invoiceNumber || '—'}`,
          hint: `${formatMad(invoice.totalAmount || invoice.amount)} · ${late ? 'En retard' : statusMeta(invoice.status).label}`,
          icon: 'invoices'
        };
      });
  } else if (topic === TICKET_CATEGORIES[0]) {
    options = ctx.policies.slice(0, 4).map(policy => ({
      id: `policy:${policy.id}`,
      label: `Assurance ${policyTypeMeta(policy.type).label}`,
      hint: `N° ${policy.policyNumber || '—'} · ${statusMeta(policy.status).label}`,
      icon: policyTypeMeta(policy.type).icon
    }));
  }

  return options.length
    ? [...options, { id: 'none', label: 'Autre / aucun dossier', icon: 'more' }]
    : [];
}

export function buildSummary(topic: string, related: string, question: string): string {
  const lines = [`Bonjour,\n\nJe souhaite être accompagné(e) au sujet suivant : ${topic.toLowerCase()}.`];
  if (related) lines.push(`Dossier concerné : ${related}.`);
  if (question) lines.push(`Ma question : « ${question} »`);
  lines.push('Merci d’avance pour votre retour.');
  return lines.join('\n\n');
}

export function requestReference(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = Math.random().toString(36).toUpperCase().slice(2, 4);
  return `AF-${stamp}${random}`;
}

export function isValidPhone(value: string): boolean {
  return /^\+?[\d\s.-]{8,}$/.test(value.trim());
}
