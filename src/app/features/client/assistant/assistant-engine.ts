import { Claim } from '../../../core/domain/models/claim.model';
import { Policy } from '../../../core/domain/models/policy.model';
import { Invoice } from '../../../core/domain/ports/invoice.repository.port';
import { daysUntil, formatDateFr, formatMad, policyTypeMeta, statusMeta } from '../../../shared/utils/client-ui';

export interface AssistantContext {
  firstName: string;
  phone: string;
  policies: Policy[];
  claims: Claim[];
  invoices: Invoice[];
}

export interface AssistantAction {
  label: string;
  icon: string;
  route?: string;
  /** In-chat action handled by the component instead of navigating. */
  kind?: 'handoff';
}

export interface AssistantReply {
  text: string;
  actions?: AssistantAction[];
  /** The client asked for a human: the component starts the guided support handoff instead. */
  handoff?: boolean;
}

export interface AssistantSuggestion {
  title: string;
  hint: string;
  prompt: string;
  icon: string;
}

export const ASSISTANT_SUGGESTIONS: AssistantSuggestion[] = [
  { title: 'Où en est mon sinistre ?', hint: 'Suivre l’avancement de mes dossiers', prompt: 'Où en sont mes sinistres ?', icon: 'claims' },
  { title: 'Déclarer un sinistre', hint: 'Les étapes et les justificatifs', prompt: 'Comment déclarer un sinistre ?', icon: 'claim' },
  { title: 'Mes factures à régler', hint: 'Montants et prochaines échéances', prompt: 'Ai-je des factures à payer ?', icon: 'invoices' },
  { title: 'Mes garanties', hint: 'Résumé de mes contrats actifs', prompt: 'Quels sont mes contrats et mes garanties ?', icon: 'contracts' }
];

export const ASSISTANT_FAQ: string[] = [
  'Combien de temps prend le traitement d’un sinistre ?',
  'Comment payer mes factures ?',
  'Où trouver mes attestations ?',
  'Comment modifier mes informations personnelles ?',
  'Comment résilier un contrat ?'
];

export const TICKET_CATEGORIES = [
  'Question sur un contrat',
  'Suivi d’un sinistre',
  'Facturation et paiements',
  'Problème technique',
  'Autre demande'
];

export const SUPPORT_EMAIL = 'support@assureflow.ma';
export const SUPPORT_PHONE = '+212 5XX-XXXXXX';
export const SUPPORT_HOURS = 'Du lundi au vendredi, 9h–18h';

export function guessTicketCategory(text: string): string {
  const q = normalize(text);
  if (has(q, 'sinistre', 'dossier', 'indemnis', 'accident', 'declar')) return TICKET_CATEGORIES[1];
  if (has(q, 'facture', 'paie', 'payer', 'prime', 'prelevement', 'rembours')) return TICKET_CATEGORIES[2];
  if (has(q, 'contrat', 'garantie', 'resili', 'couverture', 'attestation')) return TICKET_CATEGORIES[0];
  if (has(q, 'connexion', 'mot de passe', 'bug', 'erreur', 'page', 'application')) return TICKET_CATEGORIES[3];
  return TICKET_CATEGORIES[4];
}

const ACTIONS = {
  declare: { label: 'Déclarer un sinistre', route: '/client/submit-claim', icon: 'claim' },
  claims: { label: 'Mes sinistres', route: '/client/claims', icon: 'claims' },
  billing: { label: 'Mes factures', route: '/client/billing', icon: 'invoices' },
  policies: { label: 'Mes contrats', route: '/client/policies', icon: 'contracts' },
  documents: { label: 'Mes documents', route: '/client/documents', icon: 'documents' },
  profile: { label: 'Mon profil', route: '/client/profile', icon: 'user' },
  support: { label: 'Parler à un conseiller', icon: 'support', kind: 'handoff' }
} satisfies Record<string, AssistantAction>;

const UNPAID_EXCLUDED = ['PAID', 'CANCELLED', 'EXPIRED', 'DRAFT'];
const OPEN_CLAIM = ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'IN_REVIEW', 'PROCESSING', 'INFO_REQUESTED'];

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ');
}

function has(text: string, ...words: string[]): boolean {
  return words.some(word => text.includes(word));
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function upper(value: string | null | undefined): string {
  return (value || '').toUpperCase();
}

function isUnpaid(invoice: Invoice): boolean {
  return !UNPAID_EXCLUDED.includes(upper(invoice.status));
}

function isOverdue(invoice: Invoice): boolean {
  if (!isUnpaid(invoice)) return false;
  const days = daysUntil(invoice.dueDate);
  return invoice.overDue || (days !== null && days < 0);
}

function invoiceAmount(invoice: Invoice): number {
  return invoice.totalAmount || invoice.amount || 0;
}

function dueLabel(value: string | null | undefined): string {
  const days = daysUntil(value);
  if (days === null) return '';
  if (days < 0) return ` (en retard de ${plural(-days, 'jour')})`;
  if (days === 0) return ' (aujourd’hui)';
  return ` (dans ${plural(days, 'jour')})`;
}

function claimNextStep(status: string): string {
  switch (upper(status)) {
    case 'PENDING':
    case 'SUBMITTED':
      return 'votre déclaration a bien été reçue, un gestionnaire va la prendre en charge.';
    case 'UNDER_REVIEW':
    case 'IN_REVIEW':
    case 'PROCESSING':
      return 'un gestionnaire analyse votre dossier.';
    case 'INFO_REQUESTED':
      return 'des informations complémentaires vous ont été demandées.';
    case 'APPROVED':
      return 'votre dossier est accepté, l’indemnisation est en cours.';
    case 'PAID':
      return 'l’indemnisation a été versée.';
    case 'REJECTED':
    case 'DENIED':
      return 'le dossier a été refusé, un conseiller peut vous expliquer la décision.';
    default:
      return 'le dossier est clôturé.';
  }
}

function greeting(ctx: AssistantContext): AssistantReply {
  const name = ctx.firstName ? ` ${ctx.firstName}` : '';
  return {
    text: `Bonjour${name} ! Je suis l’assistant AssureFlow.\n\nJe peux vous aider à :\n- suivre vos **sinistres** et leur avancement\n- consulter vos **contrats** et vos garanties\n- vérifier vos **factures** et vos échéances\n- vous guider pour **déclarer un sinistre**\n\nQue souhaitez-vous faire ?`
  };
}

function declareGuide(): AssistantReply {
  return {
    text: 'Déclarer un sinistre prend environ **3 minutes** :\n\n1. Choisissez le **contrat** concerné.\n2. Indiquez la **date**, le **montant estimé** et décrivez les **circonstances**.\n3. Envoyez votre déclaration : vous recevez aussitôt un numéro de dossier.\n\nPréparez si possible : photos des dommages, constat amiable (auto), factures ou devis, et dépôt de plainte en cas de vol.\n\n**Bon à savoir :** déclarez dans les **5 jours ouvrés** (2 jours en cas de vol).',
    actions: [ACTIONS.declare, ACTIONS.claims]
  };
}

function claimsStatus(ctx: AssistantContext): AssistantReply {
  if (!ctx.claims.length) {
    return {
      text: 'Vous n’avez **aucun sinistre déclaré** pour le moment.\n\nEn cas d’imprévu, je peux vous guider pour faire votre déclaration en quelques minutes.',
      actions: [ACTIONS.declare]
    };
  }

  const sorted = [...ctx.claims].sort((a, b) =>
    new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
  const open = sorted.filter(c => OPEN_CLAIM.includes(upper(c.status)));
  const lines = sorted.slice(0, 5).map(c =>
    `- **Sinistre n° ${c.claimNumber || '—'}** · ${statusMeta(c.status).label} : ${claimNextStep(c.status)}`);

  const intro = open.length
    ? `Vous avez **${plural(open.length, 'dossier')} en cours** sur ${plural(ctx.claims.length, 'sinistre')} au total.`
    : `Aucun dossier en cours : vos ${plural(ctx.claims.length, 'sinistre')} ${ctx.claims.length > 1 ? 'sont traités' : 'est traité'}.`;
  const more = sorted.length > 5 ? `\n\n…et ${plural(sorted.length - 5, 'autre dossier')}.` : '';

  return { text: `${intro}\n\n${lines.join('\n')}${more}`, actions: [ACTIONS.claims, ACTIONS.declare] };
}

function billing(ctx: AssistantContext): AssistantReply {
  const unpaid = ctx.invoices.filter(isUnpaid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  if (!ctx.invoices.length) {
    return { text: 'Aucune facture n’est disponible sur votre espace pour le moment.', actions: [ACTIONS.billing] };
  }
  if (!unpaid.length) {
    return { text: 'Bonne nouvelle : **toutes vos factures sont réglées**. Vous n’avez rien à payer actuellement.', actions: [ACTIONS.billing] };
  }

  const total = unpaid.reduce((sum, inv) => sum + invoiceAmount(inv), 0);
  const overdue = unpaid.filter(isOverdue);
  const lines = unpaid.slice(0, 4).map(inv =>
    `- Facture **${inv.invoiceNumber || '—'}** : ${formatMad(invoiceAmount(inv))}, échéance le ${formatDateFr(inv.dueDate)}${dueLabel(inv.dueDate)}`);
  const warning = overdue.length
    ? `\n\n**Attention :** ${plural(overdue.length, 'facture')} ${overdue.length > 1 ? 'sont' : 'est'} en retard. Réglez-la rapidement pour garder vos garanties actives.`
    : '';

  return {
    text: `Vous avez **${plural(unpaid.length, 'facture')} à régler** pour un total de **${formatMad(total)}** :\n\n${lines.join('\n')}${warning}`,
    actions: [ACTIONS.billing, ACTIONS.support]
  };
}

function policies(ctx: AssistantContext): AssistantReply {
  if (!ctx.policies.length) {
    return {
      text: 'Vous n’avez **aucun contrat** sur votre espace pour le moment. Un conseiller peut vous aider à trouver la couverture adaptée à vos besoins.',
      actions: [ACTIONS.support]
    };
  }

  const active = ctx.policies.filter(p => upper(p.status) === 'ACTIVE');
  const lines = ctx.policies.slice(0, 5).map(p => {
    const coverage = p.coverageAmount ? `, couverture ${formatMad(p.coverageAmount)}` : '';
    return `- **Assurance ${policyTypeMeta(p.type).label}** (n° ${p.policyNumber || '—'}) · ${statusMeta(p.status).label}${coverage}, jusqu’au ${formatDateFr(p.endDate)}`;
  });

  return {
    text: `Vous avez **${plural(active.length, 'contrat actif', 'contrats actifs')}** sur ${plural(ctx.policies.length, 'contrat')} :\n\n${lines.join('\n')}\n\nOuvrez un contrat pour voir le détail de vos garanties.`,
    actions: [ACTIONS.policies]
  };
}

function renewal(ctx: AssistantContext): AssistantReply {
  const upcoming = ctx.policies
    .map(p => ({ policy: p, days: daysUntil(p.endDate) }))
    .filter((item): item is { policy: Policy; days: number } => item.days !== null && item.days >= 0)
    .sort((a, b) => a.days - b.days);

  if (!upcoming.length) {
    return { text: 'Aucun de vos contrats n’arrive à échéance prochainement.', actions: [ACTIONS.policies] };
  }

  const lines = upcoming.slice(0, 3).map(({ policy, days }) =>
    `- **Assurance ${policyTypeMeta(policy.type).label}** : échéance le ${formatDateFr(policy.endDate)} (dans ${plural(days, 'jour')})`);

  return {
    text: `Voici vos prochaines échéances :\n\n${lines.join('\n')}\n\nVos contrats sont renouvelés automatiquement, sauf résiliation de votre part au moins **2 mois** avant l’échéance.`,
    actions: [ACTIONS.policies, ACTIONS.support]
  };
}

export function buildReply(question: string, ctx: AssistantContext): AssistantReply {
  const q = normalize(question).trim();

  if (!q) return greeting(ctx);

  if (/^(bonjour|bonsoir|salut|salam|hello|coucou|hey|hi)\b/.test(q) && q.length < 30) {
    return greeting(ctx);
  }

  if (has(q, 'merci', 'chokran', 'choukran', 'shukran', 'parfait', 'super')) {
    return { text: 'Avec plaisir ! N’hésitez pas si vous avez une autre question, je suis disponible 24h/24.' };
  }

  if (has(q, 'conseiller', 'humain', 'agent', 'appeler', 'contacter', 'parler a', 'joindre', 'reclam', 'contest', 'plainte', 'support')) {
    return { text: '', handoff: true };
  }

  if (has(q, 'combien de temps', 'delai', 'duree de traitement', 'traitement d')) {
    return {
      text: 'Un dossier **complet** est généralement traité sous **5 à 10 jours ouvrés** :\n\n1. **Déclaré** : votre dossier est enregistré immédiatement.\n2. **Analyse** : un gestionnaire vérifie votre contrat et vos justificatifs.\n3. **Décision** : vous êtes notifié de l’acceptation ou du refus.\n4. **Indemnisé** : le versement intervient sous 48 h après acceptation.\n\nUn justificatif manquant allonge le délai : envoyez-les dès que possible.',
      actions: [ACTIONS.claims]
    };
  }

  if (has(q, 'comment payer', 'moyen de paiement', 'moyens de paiement', 'payer en ligne', 'virement')) {
    return {
      text: 'Toutes vos échéances sont regroupées dans **Mes factures**, avec leur montant et leur date limite.\n\nPour régler une facture :\n- par **virement bancaire**, en indiquant la référence de la facture ;\n- en **agence**, avec la référence de la facture.\n\nLe **paiement en ligne** par carte arrive très prochainement sur votre espace.',
      actions: [ACTIONS.billing, ACTIONS.support]
    };
  }

  if (has(q, 'declar', 'accident', 'degat', 'vol ', 'vole', 'incendie', 'inondation', 'cass', 'constat')
      && !has(q, 'ou en', 'statut', 'suivi', 'avancement')) {
    return declareGuide();
  }

  if (has(q, 'sinistre', 'dossier', 'indemnis', 'rembourse')) {
    return claimsStatus(ctx);
  }

  if (has(q, 'facture', 'payer', 'paiement', 'regler', 'retard', 'impaye', 'prelevement', 'cotisation', 'prime')) {
    return billing(ctx);
  }

  if (has(q, 'renouvel', 'expire', 'echeance', 'fin de contrat')) {
    return renewal(ctx);
  }

  if (has(q, 'resili', 'annuler mon contrat', 'arreter mon contrat')) {
    return {
      text: 'Vous pouvez résilier votre contrat :\n\n- **à l’échéance annuelle**, en nous prévenant au moins **2 mois** avant ;\n- **à tout moment** en cas de changement de situation (vente du véhicule, déménagement…).\n\nChaque demande est examinée sous **3 jours ouvrés**. Je peux transmettre votre demande à un conseiller, qui vous confirmera les modalités.',
      actions: [ACTIONS.support, ACTIONS.policies]
    };
  }

  if (has(q, 'attestation', 'document', 'certificat', 'carte verte', 'justificatif', 'telecharg')) {
    return {
      text: 'Tous vos documents sont réunis dans **Mes documents** : contrats, attestations et rapports de sinistres.\n\nBesoin d’une attestation spécifique ? Faites une demande à votre conseiller, il vous l’envoie sous 24 h ouvrées.',
      actions: [ACTIONS.documents, ACTIONS.support]
    };
  }

  if (has(q, 'contrat', 'garantie', 'couverture', 'couvert', 'assurance', 'police', 'franchise')) {
    return policies(ctx);
  }

  if (has(q, 'mot de passe', 'password', 'connexion', 'identifiant')) {
    return {
      text: 'Pour changer votre mot de passe ou en cas de problème de connexion, contactez notre support : un conseiller sécurisera votre compte.\n\n**Rappel :** AssureFlow ne vous demandera jamais votre mot de passe.',
      actions: [ACTIONS.support]
    };
  }

  if (has(q, 'information', 'personnel', 'adresse', 'telephone', 'coordonnee', 'profil', 'email', 'e-mail', 'mon nom')) {
    return {
      text: 'Vous pouvez modifier vos **nom, prénom, téléphone et date de naissance** directement depuis votre profil.\n\nPour changer votre adresse ou votre e-mail, envoyez une demande à votre conseiller.',
      actions: [ACTIONS.profile, ACTIONS.support]
    };
  }

  return {
    text: 'Je ne suis pas certain d’avoir bien compris votre demande.\n\nJe peux vous renseigner sur vos **sinistres**, vos **contrats**, vos **factures**, vos **documents** ou vous guider pour **déclarer un sinistre**. Vous pouvez aussi reformuler votre question, ou je transmets votre demande à un conseiller.',
    actions: [ACTIONS.support]
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(value: string): string {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Minimal Markdown (paragraphs, **bold**, "- " and "1. " lists) rendered to HTML with all input escaped. */
export function renderMarkdown(text: string): string {
  return text.split(/\n{2,}/).map(block => {
    const lines = block.split('\n');
    if (lines.every(line => /^- /.test(line))) {
      return `<ul>${lines.map(line => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
    }
    if (lines.every(line => /^\d+\. /.test(line))) {
      return `<ol>${lines.map(line => `<li>${inline(line.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
    }
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}
