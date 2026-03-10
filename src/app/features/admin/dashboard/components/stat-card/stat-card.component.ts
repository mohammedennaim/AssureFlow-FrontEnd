import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: number | string = 0;
  @Input() iconClass: string = 'fa-solid fa-chart-bar';
  @Input() colorClass: string = 'text-primary';
  @Input() loading: boolean = false;
}
