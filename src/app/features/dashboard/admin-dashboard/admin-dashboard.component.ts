import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { AdminStatsService, DashboardStats } from './services/admin-stats.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading: boolean = true;
  error: string | null = null;

  constructor(private adminStatsService: AdminStatsService) { }

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
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.error = 'Failed to load dashboard statistics. Please try again later.';
        this.loading = false;
      }
    });
  }
}
