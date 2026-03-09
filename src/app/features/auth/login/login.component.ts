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

        switch (role) {
          case 'ADMIN':
            this.router.navigateByUrl('/admin-dashboard');
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
