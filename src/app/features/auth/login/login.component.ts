import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AF_ICONS } from '../../../shared/icons/af-icons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  readonly icons = AF_ICONS;

  readonly perks = [
    { icon: 'shield', title: 'Des offres adaptées', text: 'à vos besoins' },
    { icon: 'fast', title: 'Une gestion rapide', text: 'de vos sinistres' },
    { icon: 'support', title: 'Une équipe à vos côtés', text: '24/7' }
  ];

  isLoading = false;
  error: string | null = null;
  notice: string | null = null;
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) { }

  onGoogle() {
    this.notice = 'La connexion avec Google sera bientôt disponible. Utilisez votre e-mail en attendant.';
  }

  onSubmit(email: string, password: string) {
    if (!email.trim() || !password) {
      this.error = 'Veuillez saisir votre adresse e-mail et votre mot de passe.';
      return;
    }

    this.error = null;
    this.isLoading = true;
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        this.isLoading = false;
        const role = this.auth.getUserRole();

        switch (role) {
          case 'ADMIN':
            this.router.navigateByUrl('/admin/dashboard');
            break;
          case 'AGENT':
            this.router.navigateByUrl('/agent/dashboard');
            break;
          case 'FINANCE':
            this.router.navigateByUrl('/finance/dashboard');
            break;
          case 'CLIENT':
            this.router.navigateByUrl('/client/dashboard');
            break;
          default:
            this.router.navigateByUrl('/login');
            break;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.status === 0
          ? 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.'
          : err?.status >= 500
            ? 'Le service est momentanément indisponible. Réessayez dans un instant.'
            : 'Adresse e-mail ou mot de passe incorrect.';
      }
    });
  }
}
