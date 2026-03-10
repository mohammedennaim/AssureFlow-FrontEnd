import { Component } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
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
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength] ?? '';
  }

  constructor(private auth: AuthService, private router: Router) { }

  onSubmit(username: string, email: string, password: string) {
    this.error = null;
    this.isLoading = true;
    this.auth.register(username, email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err?.message || err?.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
