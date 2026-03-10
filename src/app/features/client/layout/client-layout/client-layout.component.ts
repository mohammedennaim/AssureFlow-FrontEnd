import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.scss'
})
export class ClientLayoutComponent {
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
