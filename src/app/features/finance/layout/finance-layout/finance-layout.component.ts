import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-finance-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './finance-layout.component.html',
  styleUrl: './finance-layout.component.scss'
})
export class FinanceLayoutComponent {
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
