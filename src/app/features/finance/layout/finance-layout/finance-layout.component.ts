import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-finance-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './finance-layout.component.html',
  styleUrl: './finance-layout.component.scss'
})
export class FinanceLayoutComponent {
  isSidebarCollapsed = false;
  private authService = inject(AuthService);
  private router = inject(Router);

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
