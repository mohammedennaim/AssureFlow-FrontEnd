import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-agent-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agent-layout.component.html',
  styleUrl: './agent-layout.component.scss'
})
export class AgentLayoutComponent {
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
