import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ClientSessionService } from '../../../core/application/services/client-session.service';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';
import { switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-client-submit-claim',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './client-submit-claim.component.html',
  styleUrl: './client-submit-claim.component.scss'
})
export class ClientSubmitClaimComponent implements OnInit {
  private clientSession = inject(ClientSessionService);
  private claimRepository = inject(CLAIM_REPOSITORY);
  private policyRepository = inject(POLICY_REPOSITORY);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = true;
  isSubmitting = false;
  submitSuccess = false;
  errorMessage = '';
  today = new Date().toISOString().split('T')[0];

  clientId: string | null = null;
  policies: Policy[] = [];
  editMode = false;
  claimId: string | null = null;
  existingClaim: Claim | null = null;

  form = {
    policyId: '',
    incidentDate: new Date().toISOString().split('T')[0],
    description: '',
    amount: null as number | null
  };

  ngOnInit(): void {
    // Check if we're in edit mode (claim ID in route)
    this.claimId = this.route.snapshot.paramMap.get('id');
    this.editMode = !!this.claimId;

    this.clientSession.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) {
          this.errorMessage = 'Client introuvable.';
          return of([]);
        }
        this.clientId = clientId;
        return this.policyRepository.getByClientId(clientId);
      }),
      catchError(() => {
        this.errorMessage = 'Erreur lors du chargement des polices.';
        return of([]);
      })
    ).subscribe((policies) => {
      this.policies = policies;
      
      console.log('[SubmitClaim] Edit mode:', this.editMode, 'Claim ID:', this.claimId);
      console.log('[SubmitClaim] Loaded policies:', policies);

      // If edit mode, load existing claim data
      if (this.editMode && this.claimId) {
        this.loadExistingClaim();
      } else {
        this.isLoading = false;
      }
    });
  }

  loadExistingClaim(): void {
    if (!this.claimId) return;

    this.claimRepository.getById(this.claimId).pipe(
      catchError((err) => {
        console.error('[SubmitClaim] Error loading claim:', err);
        this.errorMessage = 'Erreur lors du chargement de la réclamation.';
        this.isLoading = false;
        return of(null);
      })
    ).subscribe((claim) => {
      if (claim) {
        this.existingClaim = claim;
        // Populate form with existing data
        this.form = {
          policyId: claim.policyId || '',
          incidentDate: claim.incidentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          description: claim.description || '',
          amount: claim.amount || claim.estimatedAmount || null
        };
      }
      this.isLoading = false;
    });
  }

  submitClaim(): void {
    if (!this.form.policyId || !this.form.description || !this.form.amount || !this.clientId) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    // Ensure incident date is set
    const incidentDate = this.form.incidentDate || this.today;

    // Validate description length (backend requires 10-2000 characters)
    if (this.form.description.length < 10) {
      this.errorMessage = 'La description doit contenir au moins 10 caractères.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    if (this.editMode && this.claimId) {
      // Update existing claim
      this.claimRepository.update(this.claimId, {
        incidentDate: incidentDate,
        description: this.form.description,
        estimatedAmount: this.form.amount!
      }).pipe(
        catchError((error) => {
          console.error('Error updating claim:', error);

          if (error.error?.details) {
            const details = error.error.details;
            const errorMessages = Object.values(details).join(', ');
            this.errorMessage = `Validation error: ${errorMessages}`;
          } else if (error.error?.error) {
            this.errorMessage = `Error: ${error.error.error}`;
          } else {
            this.errorMessage = 'Erreur lors de la modification. Veuillez réessayer.';
          }

          this.isSubmitting = false;
          return of(null);
        })
      ).subscribe((claim) => {
        this.isSubmitting = false;
        if (claim) {
          this.submitSuccess = true;
          setTimeout(() => this.router.navigate(['/client/claims', this.claimId]), 2000);
        }
      });
    } else {
      // Create new claim
      this.claimRepository.create({
        policyId: this.form.policyId,
        clientId: this.clientId!,
        incidentDate: incidentDate,
        description: this.form.description,
        estimatedAmount: this.form.amount!,
        submittedBy: this.clientId!
      }).pipe(
        catchError((error) => {
          console.error('Error submitting claim:', error);

          if (error.error?.details) {
            const details = error.error.details;
            const errorMessages = Object.values(details).join(', ');
            this.errorMessage = `Validation error: ${errorMessages}`;
          } else if (error.error?.error) {
            this.errorMessage = `Error: ${error.error.error}`;
          } else {
            this.errorMessage = 'Erreur lors de la soumission. Veuillez réessayer.';
          }

          this.isSubmitting = false;
          return of(null);
        })
      ).subscribe((claim) => {
        this.isSubmitting = false;
        if (claim) {
          this.submitSuccess = true;
          setTimeout(() => this.router.navigate(['/client/claims']), 2000);
        }
      });
    }
  }

  resetForm(): void {
    this.form = {
      policyId: '',
      incidentDate: new Date().toISOString().split('T')[0],
      description: '',
      amount: null
    };
    this.submitSuccess = false;
    this.errorMessage = '';
  }
}
