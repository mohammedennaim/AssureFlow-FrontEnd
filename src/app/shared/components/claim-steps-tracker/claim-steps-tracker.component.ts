import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-claim-steps-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="claim-steps-tracker">
      @for (step of steps; track step.id; let last = $last) {
        <div class="step" 
             [class.step--completed]="isStepCompleted(step.id)" 
             [class.step--active]="isStepActive(step.id)"
             [class.step--rejected]="isRejected()">
          <div class="step__connector" *ngIf="!last"></div>
          <div class="step__indicator">
            @if (isStepCompleted(step.id) && !isRejected()) {
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66666 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            } @else if (isRejected() && isStepCompleted(step.id)) {
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66666 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            } @else if (isStepActive(step.id)) {
              <div class="step__spinner"></div>
            } @else if (isRejected() && step.id === 'UNDER_REVIEW') {
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66666 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            } @else {
              <span>{{ step.number }}</span>
            }
          </div>
          <div class="step__content">
            <span class="step__title">{{ step.title }}</span>
            <span class="step__description">{{ step.description }}</span>
          </div>
        </div>
      }
      @if (isRejected()) {
        <div class="step step--final-rejected">
          <div class="step__indicator step__indicator--rejected">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.3333 4L4 13.3333M4 4L13.3333 13.3333" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="step__content">
            <span class="step__title">{{ status === 'CLOSED' ? 'Closed' : 'Rejected' }}</span>
            <span class="step__description">{{ status === 'CLOSED' ? 'Claim closed' : 'Not approved' }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .claim-steps-tracker {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 1.5rem;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      margin: 1.5rem 0;
    }

    .step {
      display: flex;
      align-items: flex-start;
      position: relative;
      gap: 1rem;
    }

    .step__connector {
      position: absolute;
      left: 1.25rem;
      top: 3rem;
      width: 2px;
      height: calc(100% - 3rem);
      background: #e2e8f0;
      z-index: 0;
    }

    .step--completed .step__connector {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .step__indicator {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: #ffffff;
      border: 3px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
      color: #64748b;
      z-index: 1;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .step--completed .step__indicator {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-color: #10b981;
      color: white;
    }

    .step--active .step__indicator {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-color: #3b82f6;
      color: white;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }

    .step--rejected .step__indicator {
      border-color: #ef4444;
    }

    .step--final-rejected {
      margin-left: 0.5rem;

      .step__indicator--rejected {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border-color: #ef4444;
      }

      .step__title {
        color: #dc2626;
      }
    }

    .step__spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .step__content {
      flex: 1;
      padding: 0.75rem 0;
      padding-right: 1rem;
    }

    .step__title {
      display: block;
      font-weight: 600;
      font-size: 0.9375rem;
      color: #1e293b;
      margin-bottom: 0.25rem;
    }

    .step--completed .step__title {
      color: #059669;
    }

    .step--active .step__title {
      color: #2563eb;
    }

    .step__description {
      display: block;
      font-size: 0.8125rem;
      color: #64748b;
    }

    @media (min-width: 768px) {
      .claim-steps-tracker {
        flex-direction: row;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .step {
        flex: 1;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .step__connector {
        position: absolute;
        left: 50%;
        top: 1.25rem;
        width: calc(100% - 3rem);
        height: 2px;
        transform: translateX(-50%);
      }

      .step__content {
        padding: 0.5rem 0 0 0;
        max-width: 140px;
      }
    }
  `]
})
export class ClaimStepsTrackerComponent {
  @Input() status: string = 'SUBMITTED';

  readonly steps = [
    { id: 'SUBMITTED', number: 1, title: 'Submitted', description: 'Claim received' },
    { id: 'UNDER_REVIEW', number: 2, title: 'In Review', description: 'Being assessed' },
    { id: 'APPROVED', number: 3, title: 'Approved', description: 'Claim approved' },
    { id: 'PAID', number: 4, title: 'Paid', description: 'Payment completed' }
  ];

  private rejectedStatuses = ['REJECTED', 'CLOSED', 'INFO_REQUESTED'];

  isStepCompleted(stepId: string): boolean {
    const statusOrder = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'];
    const currentIndex = statusOrder.indexOf(this.status.toUpperCase());
    const stepIndex = statusOrder.indexOf(stepId);
    
    // For rejected/closed claims, mark all steps up to current as completed
    if (this.isRejected()) {
      // Find the last positive status before rejection
      const lastPositiveIndex = this.getLastPositiveStatusIndex();
      return stepIndex <= lastPositiveIndex;
    }
    
    return currentIndex > stepIndex;
  }

  isStepActive(stepId: string): boolean {
    // Don't show any step as active for rejected/closed claims
    if (this.isRejected()) {
      return false;
    }
    return this.status.toUpperCase() === stepId;
  }

  isRejected(): boolean {
    return this.rejectedStatuses.includes(this.status.toUpperCase());
  }

  private getLastPositiveStatusIndex(): number {
    const statusOrder = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'];
    // For rejected claims, show steps up to UNDER_REVIEW as completed
    // For closed claims, show all steps as completed
    if (this.status.toUpperCase() === 'CLOSED') {
      return statusOrder.length; // All steps completed
    }
    // For REJECTED or INFO_REQUESTED, show up to UNDER_REVIEW
    return 1; // SUBMITTED and UNDER_REVIEW completed
  }
}
