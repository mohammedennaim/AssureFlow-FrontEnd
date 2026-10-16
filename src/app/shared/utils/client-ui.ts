export type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export interface StatusMeta {
  label: string;
  tone: Tone;
}

export interface PolicyTypeMeta {
  label: string;
  icon: 'car' | 'heart' | 'home' | 'shield' | 'briefcase';
  image?: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Actif', tone: 'success' },
  INACTIVE: { label: 'Inactif', tone: 'neutral' },
  PENDING: { label: 'En attente', tone: 'warning' },
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  EXPIRED: { label: 'Expiré', tone: 'neutral' },
  SUSPENDED: { label: 'Suspendu', tone: 'warning' },
  CANCELLED: { label: 'Annulé', tone: 'neutral' },
  CANCELED: { label: 'Annulé', tone: 'neutral' },
  TERMINATED: { label: 'Résilié', tone: 'neutral' },
  RENEWED: { label: 'Renouvelé', tone: 'success' },

  SUBMITTED: { label: 'Déclaré', tone: 'info' },
  UNDER_REVIEW: { label: 'En cours d’analyse', tone: 'warning' },
  IN_REVIEW: { label: 'En cours d’analyse', tone: 'warning' },
  PROCESSING: { label: 'En traitement', tone: 'warning' },
  INFO_REQUESTED: { label: 'Informations demandées', tone: 'warning' },
  APPROVED: { label: 'Accepté', tone: 'success' },
  REJECTED: { label: 'Refusé', tone: 'danger' },
  DENIED: { label: 'Refusé', tone: 'danger' },
  PAID: { label: 'Payé', tone: 'success' },
  CLOSED: { label: 'Clôturé', tone: 'neutral' },

  OVERDUE: { label: 'En retard', tone: 'danger' },
  UNPAID: { label: 'À régler', tone: 'warning' },
  DUE: { label: 'À régler', tone: 'warning' },
  ISSUED: { label: 'Émise', tone: 'info' },
  SENT: { label: 'Envoyée', tone: 'info' },
  PARTIALLY_PAID: { label: 'Partiellement payée', tone: 'warning' },
  FAILED: { label: 'Échoué', tone: 'danger' },
  REFUNDED: { label: 'Remboursé', tone: 'neutral' },
  COMPLETED: { label: 'Terminé', tone: 'success' },

  OPEN: { label: 'Ouvert', tone: 'info' },
  IN_PROGRESS: { label: 'En cours', tone: 'warning' },
  RESOLVED: { label: 'Résolu', tone: 'success' },
  VERIFIED: { label: 'Vérifié', tone: 'success' }
};

const POLICY_TYPES: Record<string, PolicyTypeMeta> = {
  AUTO: { label: 'Auto', icon: 'car', image: 'images/offer-auto.jpg' },
  VEHICLE: { label: 'Auto', icon: 'car', image: 'images/offer-auto.jpg' },
  HEALTH: { label: 'Santé', icon: 'heart', image: 'images/offer-sante.jpg' },
  LIFE: { label: 'Vie', icon: 'shield', image: 'images/offer-vie.jpg' },
  HOME: { label: 'Habitation', icon: 'home', image: 'images/offer-habitation.jpg' },
  PROPERTY: { label: 'Habitation', icon: 'home', image: 'images/offer-habitation.jpg' },
  BUSINESS: { label: 'Professionnelle', icon: 'briefcase' }
};

export function statusMeta(status: string | null | undefined): StatusMeta {
  const key = (status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (STATUS_META[key]) return STATUS_META[key];
  if (!key) return { label: '—', tone: 'neutral' };
  const label = key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
  return { label, tone: 'neutral' };
}

export function policyTypeMeta(type: string | null | undefined): PolicyTypeMeta {
  const key = (type || '').trim().toUpperCase();
  return POLICY_TYPES[key] || { label: type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Assurance', icon: 'shield' };
}

export function formatMad(amount: number | null | undefined): string {
  const value = Math.round(Number(amount) || 0);
  return `${value.toLocaleString('fr-FR')} MAD`;
}

export function formatDateFr(value: string | Date | null | undefined, withYear = true): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', withYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' });
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - start.getTime()) / 86400000);
}
