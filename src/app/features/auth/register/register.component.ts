import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AF_ICONS } from '../../../shared/icons/af-icons';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  readonly icons = AF_ICONS;

  readonly perks = [
    { icon: 'fast', title: 'Inscription gratuite', text: 'en 2 minutes' },
    { icon: 'documents', title: 'Vos contrats', text: 'au même endroit' },
    { icon: 'support', title: 'Un conseiller dédié', text: '24/7' }
  ];

  isLoading = false;
  error: string | null = null;
  showPassword = false;
  passwordValue = '';

  get passwordStrength(): number {
    const v = this.passwordValue;
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return score;
  }

  get strengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Excellent'][this.passwordStrength] ?? '';
  }

  constructor(private auth: AuthService, private router: Router) { }

  onSubmit(username: string, email: string, password: string, terms: boolean) {
    if (!username.trim() || !email.trim() || !password) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }
    if (password.length < 8) {
      this.error = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (!terms) {
      this.error = 'Veuillez accepter les conditions d’utilisation.';
      return;
    }

    this.error = null;
    this.isLoading = true;
    this.auth.register(username.trim(), email.trim(), password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.status === 0
          ? 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'
          : err?.status === 409
            ? 'Un compte existe déjà avec cette adresse e-mail.'
            : err?.status >= 500
              ? 'Le service est momentanément indisponible. Réessayez dans un instant.'
              : err?.error?.message || 'L’inscription a échoué. Vérifiez vos informations et réessayez.';
      }
    });
  }
}
