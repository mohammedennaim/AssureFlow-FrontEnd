import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CLIENT_REPOSITORY } from '../../../core/domain/ports/client.repository.port';
import { AuthService } from '../../../core/auth/auth.service';
import { COVER_PRESETS, DEFAULT_COVER, ProfileMediaService } from '../../../core/application/services/profile-media.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import { formatDateFr, statusMeta, StatusMeta } from '../../../shared/utils/client-ui';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
  cin?: string;
  clientNumber?: string;
}

interface NotificationPref {
  key: string;
  label: string;
  hint: string;
  icon: string;
  enabled: boolean;
}

interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
  field?: string;
}

const PREFS_KEY = 'af.profile.notifications.v1';
const PHONE_PATTERN = /^\+?[\d\s.-]{8,20}$/;

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.scss'
})
export class ClientProfileComponent implements OnInit, OnDestroy {
  private clientRepository = inject(CLIENT_REPOSITORY);
  private authService = inject(AuthService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private media = inject(ProfileMediaService);

  readonly icons = AF_ICONS;
  readonly coverPresets = COVER_PRESETS;
  readonly today = new Date().toISOString().slice(0, 10);
  readonly device = describeDevice(navigator.userAgent);

  isEditing = false;
  isSaving = false;
  isLoading = true;
  loadFailed = false;
  saveSuccess = false;
  errorMessage = '';
  copied = false;
  savedPref: string | null = null;

  draftAvatar: string | null = null;
  draftCover: string | null = null;
  menu: 'avatar' | 'cover' | null = null;
  mediaBusy: 'avatar' | 'cover' | null = null;
  mediaError = '';

  memberSince: string | null = null;
  accountStatus: string | null = null;

  private successTimer?: ReturnType<typeof setTimeout>;
  private copyTimer?: ReturnType<typeof setTimeout>;
  private prefTimer?: ReturnType<typeof setTimeout>;

  profile: UserProfile = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    dateOfBirth: ''
  };

  originalProfile: UserProfile = { ...this.profile };

  notificationPrefs: NotificationPref[] = [
    { key: 'policies', label: 'Mes contrats', hint: 'Modifications, échéances et renouvellements', icon: 'contracts', enabled: true },
    { key: 'claims', label: 'Mes sinistres', hint: 'Chaque étape du traitement de vos dossiers', icon: 'claims', enabled: true },
    { key: 'payments', label: 'Rappels de paiement', hint: 'Quelques jours avant chaque échéance', icon: 'invoices', enabled: true },
    { key: 'marketing', label: 'Offres et actualités', hint: 'Nouveautés et conseils AssureFlow', icon: 'sparkles', enabled: false }
  ];

  ngOnInit(): void {
    this.restorePrefs();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    clearTimeout(this.successTimer);
    clearTimeout(this.copyTimer);
    clearTimeout(this.prefTimer);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menu) {
      this.menu = null;
    } else if (this.isEditing && !this.isSaving) {
      this.cancelEdit();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menu && !(event.target as HTMLElement).closest('.media-menu, [data-media-trigger]')) this.menu = null;
  }

  get avatarSrc(): string | null {
    return this.isEditing ? this.draftAvatar : this.media.avatar();
  }

  get coverSrc(): string {
    return (this.isEditing ? this.draftCover : this.media.cover()) ?? DEFAULT_COVER;
  }

  get hasCustomCover(): boolean {
    const cover = this.isEditing ? this.draftCover : this.media.cover();
    return !!cover && !this.coverPresets.some(p => p.src === cover);
  }

  get initials(): string {
    const first = this.originalProfile.firstName?.trim().charAt(0) ?? '';
    const last = this.originalProfile.lastName?.trim().charAt(0) ?? '';
    return (first + last).toUpperCase() || '?';
  }

  get status(): StatusMeta | null {
    return this.accountStatus ? statusMeta(this.accountStatus) : null;
  }

  get cityLine(): string {
    const p = this.originalProfile;
    return [p.zipCode, p.city].filter(Boolean).join(' ');
  }

  get hasAddress(): boolean {
    const p = this.originalProfile;
    return !!(p.address || p.city || p.zipCode || p.country);
  }

  get age(): number | null {
    const raw = this.originalProfile.dateOfBirth;
    if (!raw) return null;
    const birth = new Date(raw);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  }

  get completion(): CompletionItem[] {
    const p = this.originalProfile;
    return [
      { key: 'name', label: 'Nom et prénom', done: !!(p.firstName && p.lastName) },
      { key: 'email', label: 'Adresse e-mail', done: !!p.email },
      { key: 'phone', label: 'Numéro de téléphone', done: !!p.phone, field: 'profile-phone' },
      { key: 'birth', label: 'Date de naissance', done: !!p.dateOfBirth, field: 'profile-birth' },
      { key: 'address', label: 'Adresse postale', done: this.hasAddress }
    ];
  }

  get completionPercent(): number {
    const items = this.completion;
    return Math.round((items.filter(i => i.done).length / items.length) * 100);
  }

  get nextMissing(): CompletionItem | undefined {
    return this.completion.find(i => !i.done);
  }

  get infoDirty(): boolean {
    const a = this.profile;
    const b = this.originalProfile;
    return a.firstName !== b.firstName || a.lastName !== b.lastName || a.phone !== b.phone || a.dateOfBirth !== b.dateOfBirth;
  }

  get mediaDirty(): boolean {
    return this.draftAvatar !== this.media.avatar() || this.draftCover !== this.media.cover();
  }

  get isDirty(): boolean {
    return this.infoDirty || this.mediaDirty;
  }

  get canSave(): boolean {
    return this.isDirty && !this.isSaving && !this.phoneInvalid
      && !!this.profile.firstName.trim() && !!this.profile.lastName.trim();
  }

  get phoneInvalid(): boolean {
    const phone = this.profile.phone?.trim();
    return !!phone && !PHONE_PATTERN.test(phone);
  }

  get memberSinceShort(): string {
    if (!this.memberSince) return '—';
    const d = new Date(this.memberSince);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  }

  get seniority(): string {
    if (!this.memberSince) return '—';
    const start = new Date(this.memberSince);
    if (Number.isNaN(start.getTime())) return '—';
    const months = (new Date().getFullYear() - start.getFullYear()) * 12 + new Date().getMonth() - start.getMonth();
    if (months < 1) return 'Nouveau';
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    return `${years} an${years > 1 ? 's' : ''}`;
  }

  get enabledPrefs(): number {
    return this.notificationPrefs.filter(p => p.enabled).length;
  }

  date(value: string | null | undefined): string {
    return formatDateFr(value);
  }

  loadProfile(): void {
    this.isLoading = true;
    this.loadFailed = false;
    this.errorMessage = '';

    this.clientRepository.getMe().pipe(
      catchError(() => {
        this.errorMessage = 'Erreur lors du chargement du profil.';
        return of(null);
      })
    ).subscribe((client) => {
      this.isLoading = false;
      if (client && client.id) {
        this.media.load(client.id);
        this.memberSince = client.createdAt ?? null;
        this.accountStatus = client.status ?? null;
        const primaryAddress = client.addresses?.find((a: any) => a.isPrimary) ?? client.addresses?.[0];
        this.profile = {
          firstName: client.firstName ?? '',
          lastName: client.lastName ?? '',
          email: client.email ?? '',
          phone: client.phone ?? '',
          address: primaryAddress?.street ?? (client as any).address ?? '',
          city: primaryAddress?.city ?? (client as any).city ?? '',
          zipCode: primaryAddress?.postalCode ?? (client as any).zipCode ?? '',
          country: primaryAddress?.country ?? '',
          dateOfBirth: client.dateOfBirth ?? '',
          cin: client.cin ?? '',
          clientNumber: client.clientNumber ?? ''
        };
        this.originalProfile = { ...this.profile };
      } else {
        this.loadFailed = true;
        this.errorMessage ||= 'Impossible de charger votre profil pour le moment.';
      }
    });
  }

  startEdit(fieldId?: string): void {
    this.profile = { ...this.originalProfile };
    this.draftAvatar = this.media.avatar();
    this.draftCover = this.media.cover();
    this.isEditing = true;
    this.saveSuccess = false;
    this.errorMessage = '';
    this.mediaError = '';
    if (!fieldId) return;
    setTimeout(() => {
      this.scrollTo('informations');
      const input = this.host.nativeElement.querySelector(`#${fieldId}`) as HTMLInputElement | null;
      input?.focus({ preventScroll: true });
    });
  }

  completeNext(): void {
    const item = this.nextMissing;
    if (!item) return;
    if (item.field) {
      this.startEdit(item.field);
    } else if (item.key === 'address') {
      this.scrollTo('adresse');
    }
  }

  toggleMenu(menu: 'avatar' | 'cover'): void {
    this.menu = this.menu === menu ? null : menu;
    this.mediaError = '';
  }

  async onMediaSelected(kind: 'avatar' | 'cover', event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.menu = null;
    if (!file) return;
    const invalid = this.media.validate(file);
    if (invalid) {
      this.mediaError = invalid;
      return;
    }
    this.mediaError = '';
    this.mediaBusy = kind;
    try {
      const data = kind === 'avatar'
        ? await this.media.resize(file, 320, 320, 0.88)
        : await this.media.resize(file, 1400, 360, 0.8);
      if (kind === 'avatar') this.draftAvatar = data;
      else this.draftCover = data;
    } catch {
      this.mediaError = 'Impossible de lire cette image. Essayez-en une autre.';
    } finally {
      this.mediaBusy = null;
    }
  }

  chooseCover(src: string): void {
    this.draftCover = src === DEFAULT_COVER ? null : src;
    this.menu = null;
  }

  isCoverSelected(src: string): boolean {
    return (this.draftCover ?? DEFAULT_COVER) === src;
  }

  removeAvatar(): void {
    this.draftAvatar = null;
    this.menu = null;
  }

  saveProfile(): void {
    if (!this.canSave) return;
    if (!this.infoDirty) {
      this.commitMedia();
      return;
    }
    this.isSaving = true;
    this.errorMessage = '';
    this.saveSuccess = false;

    this.clientRepository.updateMe({
      firstName: this.profile.firstName.trim(),
      lastName: this.profile.lastName.trim(),
      phone: this.profile.phone.trim(),
      dateOfBirth: this.profile.dateOfBirth
    }).pipe(
      catchError(() => {
        this.errorMessage = 'Erreur lors de la sauvegarde.';
        return of(null);
      })
    ).subscribe((updated) => {
      this.isSaving = false;
      if (!updated?.id) {
        this.errorMessage ||= 'Erreur lors de la sauvegarde. Veuillez réessayer.';
        return;
      }
      this.profile = {
        ...this.profile,
        firstName: this.profile.firstName.trim(),
        lastName: this.profile.lastName.trim(),
        phone: this.profile.phone.trim()
      };
      this.originalProfile = { ...this.profile };
      this.commitMedia();
    });
  }

  private commitMedia(): void {
    if (this.mediaDirty && !this.media.save({ avatar: this.draftAvatar, cover: this.draftCover })) {
      this.errorMessage = 'Espace de stockage du navigateur insuffisant pour enregistrer ces images.';
      return;
    }
    this.isEditing = false;
    this.menu = null;
    this.saveSuccess = true;
    clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => this.saveSuccess = false, 5000);
  }

  cancelEdit(): void {
    this.profile = { ...this.originalProfile };
    this.draftAvatar = this.media.avatar();
    this.draftCover = this.media.cover();
    this.isEditing = false;
    this.menu = null;
    this.errorMessage = '';
    this.mediaError = '';
  }

  copyClientNumber(): void {
    const value = this.originalProfile.clientNumber;
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      this.copied = true;
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied = false, 2000);
    }).catch(() => undefined);
  }

  togglePref(pref: NotificationPref): void {
    try {
      const values = Object.fromEntries(this.notificationPrefs.map(p => [p.key, p.enabled]));
      localStorage.setItem(PREFS_KEY, JSON.stringify(values));
    } catch {
      return;
    }
    this.savedPref = pref.key;
    clearTimeout(this.prefTimer);
    this.prefTimer = setTimeout(() => this.savedPref = null, 2000);
  }

  scrollTo(id: string): void {
    this.host.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private restorePrefs(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Record<string, boolean> | null;
      if (!saved) return;
      this.notificationPrefs.forEach(p => {
        if (typeof saved[p.key] === 'boolean') p.enabled = saved[p.key];
      });
    } catch {
      localStorage.removeItem(PREFS_KEY);
    }
  }

}

function describeDevice(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Navigateur';
  const os = /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : '';
  return os ? `${browser} sur ${os}` : browser;
}
