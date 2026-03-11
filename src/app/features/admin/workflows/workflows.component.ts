import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="workflows-page">
  <header class="page-header">
    <div class="page-header__start">
      <div class="page-header__icon workflows-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>
          <path d="M6 9v6M18 9v6M9 6h6M9 18h6"/>
        </svg>
      </div>
      <div class="page-header__content">
        <h1 class="page-header__title">Workflows</h1>
        <p class="page-header__subtitle">Automate business processes</p>
      </div>
    </div>
    <button class="btn btn--primary">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 3.75v10.5M3.75 9h10.5"/>
      </svg>
      New Workflow
    </button>
  </header>

  <section class="stats-row">
    <div class="stat-card">
      <div class="stat-card__icon" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="1.5">
          <path d="M10 5v10M5 10h10"/>
        </svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">Today's Executions</span>
        <span class="stat-card__value">128</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%);">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="1.5">
          <path d="M6.5 10L9 12.5L13.5 7.5"/>
        </svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">Success Rate</span>
        <span class="stat-card__value">97.8%</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="1.5">
          <circle cx="10" cy="10" r="7"/>
          <path d="M10 6.5v7"/>
        </svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">In Progress</span>
        <span class="stat-card__value">24</span>
      </div>
    </div>
  </section>

  <div class="workflows-grid">
    @for (workflow of workflows; track workflow.id) {
      <div class="workflow-card">
        <div class="workflow-card__header">
          <div class="workflow-card__title-group">
            <div class="workflow-card__icon" [class.workflow-card__icon--active]="workflow.status === 'ACTIVE'">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="5" cy="5" r="2.5"/><circle cx="15" cy="5" r="2.5"/><circle cx="10" cy="15" r="2.5"/>
                <path d="M6.5 6.5L9 13M13.5 6.5L11 13"/>
              </svg>
            </div>
            <div>
              <h3 class="workflow-card__title">{{ workflow.name }}</h3>
              <p class="workflow-card__description">{{ workflow.description }}</p>
            </div>
          </div>
          <span class="workflow-status workflow-status--{{ toLowerCase(workflow.status) }}">{{ workflow.status }}</span>
        </div>

        <div class="workflow-card__body">
          <div class="workflow-steps">
            @for (step of workflow.steps; track step; let i = $index) {
              <div class="workflow-step">
                <span class="workflow-step__number">{{ i + 1 }}</span>
                <span class="workflow-step__name">{{ step }}</span>
                @if (i < workflow.steps.length - 1) {
                  <svg class="workflow-step__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                    <path d="M6 13L11 8L6 3"/>
                  </svg>
                }
              </div>
            }
          </div>

          <div class="workflow-card__stats">
            <div class="workflow-stat">
              <span class="workflow-stat__label">Executions</span>
              <span class="workflow-stat__value">{{ workflow.executions }}</span>
            </div>
            <div class="workflow-stat">
              <span class="workflow-stat__label">Success Rate</span>
              <span class="workflow-stat__value">{{ workflow.successRate }}%</span>
            </div>
          </div>

          <div class="workflow-card__footer">
            <span class="workflow-card__last-run">Last run: {{ workflow.lastRun }}</span>
            <div class="workflow-card__actions">
              <button class="btn-icon" title="Toggle">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                  @if (workflow.status === 'ACTIVE') {
                    <path d="M5 4v8M11 4v8M4 8h8"/>
                  } @else {
                    <path d="M5 3l8 5-8 5V3z"/>
                  }
                </svg>
              </button>
              <button class="btn-icon" title="Edit">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                  <path d="M11.625 2.75L13.25 4.375L6.5 11.125L4 11.75L4.625 9.25L11.375 2.5L11.625 2.75Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  </div>
</div>
  `,
  styleUrl: './workflows.component.scss'
})
export class WorkflowsComponent {
  workflows = [
    { id: '1', name: 'Claims Processing', description: 'Automated claims validation', steps: ['Submit', 'Validate', 'Review', 'Approve'], executions: 245, successRate: 98.5, status: 'ACTIVE', lastRun: '2 min ago' },
    { id: '2', name: 'Policy Renewal', description: 'Auto-renewal notifications', steps: ['Check Date', 'Notify', 'Generate', 'Send'], executions: 189, successRate: 99.2, status: 'ACTIVE', lastRun: '15 min ago' },
    { id: '3', name: 'Payment Reminder', description: 'Overdue payment alerts', steps: ['Check Status', 'Send Email', 'Send SMS', 'Escalate'], executions: 156, successRate: 94.8, status: 'PAUSED', lastRun: '1 hour ago' },
  ];

  toLowerCase(value: string): string {
    return value.toLowerCase();
  }
}
