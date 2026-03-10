import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  isLoading = false;
  error: string | null = null;
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) { }

  onSubmit(email: string, password: string) {
    this.error = null;
    this.isLoading = true;
    this.auth.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        const role = this.auth.getUserRole();

        console.log('[LoginComponent] Login successful. Extracted Role:', role);

        switch (role) {
          case 'ADMIN':
            console.log('[LoginComponent] Navigating to /admin/dashboard');
            this.router.navigateByUrl('/admin/dashboard').then(success => {
              console.log('[LoginComponent] Navigation result:', success);
            }).catch(err => {
              console.error('[LoginComponent] Navigation error:', err);
            });
            break;
          case 'AGENT':
            this.router.navigateByUrl('/agent-dashboard');
            break;
          case 'FINANCE':
            this.router.navigateByUrl('/finance-dashboard');
            break;
          case 'CLIENT':
            this.router.navigateByUrl('/client-dashboard');
            break;
          default:
            console.log('[LoginComponent] No matching role found, navigating to /login');
            this.router.navigateByUrl('/login');
            break;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.message || err?.error?.message || 'Invalid email or password.';
      }
    });
  }
}
