import { Injectable, signal } from '@angular/core';

export interface ProfileMedia {
  avatar: string | null;
  cover: string | null;
}

export interface CoverPreset {
  id: string;
  label: string;
  src: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  { id: 'famille', label: 'Famille', src: 'images/hero-bg-sm.jpg' },
  { id: 'auto', label: 'Route', src: 'images/offer-auto.jpg' },
  { id: 'habitation', label: 'Maison', src: 'images/offer-habitation.jpg' },
  { id: 'sante', label: 'Santé', src: 'images/offer-sante.jpg' },
  { id: 'vie', label: 'Vie', src: 'images/offer-vie.jpg' }
];

export const DEFAULT_COVER = COVER_PRESETS[0].src;

const STORAGE_PREFIX = 'af.profile.media.v1.';
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * L’API ne gère pas encore les images de profil : elles sont redimensionnées
 * puis conservées dans le navigateur, par client.
 */
@Injectable({ providedIn: 'root' })
export class ProfileMediaService {
  readonly avatar = signal<string | null>(null);
  readonly cover = signal<string | null>(null);

  private clientId: string | null = null;

  load(clientId: string): void {
    if (this.clientId === clientId) return;
    this.clientId = clientId;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + clientId) ?? 'null') as ProfileMedia | null;
      this.avatar.set(saved?.avatar ?? null);
      this.cover.set(saved?.cover ?? null);
    } catch {
      this.avatar.set(null);
      this.cover.set(null);
    }
  }

  /** Retourne false si le stockage du navigateur est plein. */
  save(media: ProfileMedia): boolean {
    if (!this.clientId) return false;
    try {
      localStorage.setItem(STORAGE_PREFIX + this.clientId, JSON.stringify(media));
    } catch {
      return false;
    }
    this.avatar.set(media.avatar);
    this.cover.set(media.cover);
    return true;
  }

  validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Format non pris en charge. Utilisez une image JPG, PNG ou WebP.';
    if (file.size > MAX_FILE_SIZE) return 'Image trop lourde (8 Mo maximum).';
    return null;
  }

  /** Recadre l’image au centre au format demandé et la compresse en JPEG. */
  resize(file: File, width: number, height: number, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const ratio = width / height;
        let sw = img.naturalWidth;
        let sh = sw / ratio;
        if (sh > img.naturalHeight) {
          sh = img.naturalHeight;
          sw = sh * ratio;
        }
        const sx = (img.naturalWidth - sw) / 2;
        const sy = (img.naturalHeight - sh) / 2;
        const scale = Math.min(1, img.naturalWidth / width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('image'));
      };
      img.src = url;
    });
  }
}
