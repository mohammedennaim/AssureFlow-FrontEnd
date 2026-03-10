import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { AdminStatsService, DashboardStats } from './services/admin-stats.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private adminStatsService = inject(AdminStatsService);

  stats: DashboardStats | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.error = null;
    this.adminStatsService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load dashboard statistics. Please try again later.';
        this.loading = false;
      }
    });
  }
}
