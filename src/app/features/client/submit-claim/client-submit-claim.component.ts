import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ClientSessionService } from '../../../core/application/services/client-session.service';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';
import { AF_ICONS } from '../../../shared/icons/af-icons';
import {
  formatDateFr,
  formatMad,
  policyTypeMeta,
  PolicyTypeMeta,
  statusMeta,
  StatusMeta
} from '../../../shared/utils/client-ui';
import { switchMap, catchError, of } from 'rxjs';

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;

@Component({
  selector: 'app-client-submit-claim',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './client-submit-claim.component.html',
  styleUrl: './client-submit-claim.component.scss'
})
export class ClientSubmitClaimComponent implements OnInit {
  private clientSession = inject(ClientSessionService);
  private claimRepository = inject(CLAIM_REPOSITORY);
  private policyRepository = inject(POLICY_REPOSITORY);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly icons = AF_ICONS;
  readonly descriptionMin = DESCRIPTION_MIN;
  readonly descriptionMax = DESCRIPTION_MAX;

  isLoading = true;
  isSubmitting = false;
  submitSuccess = false;
  submitAttempted = false;
  errorMessage = '';
  loadError = '';
  today = new Date().toISOString().split('T')[0];

  clientId: string | null = null;
  policies: Policy[] = [];
  editMode = false;
  claimId: string | null = null;
  existingClaim: Claim | null = null;
  createdClaimId: string | null = null;

  form = {
    policyId: '',
    incidentDate: new Date().toISOString().split('T')[0],
    description: '',
    amount: null as number | null
  };

  ngOnInit(): void {
    this.claimId = this.route.snapshot.paramMap.get('id');
    this.editMode = !!this.claimId;
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.loadError = '';

    this.clientSession.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) {
          this.loadError = 'Impossible d’identifier votre compte client.';
          return of([]);
        }
        this.clientId = clientId;
        return this.policyRepository.getByClientId(clientId);
      }),
      catchError(() => {
        this.loadError = 'Erreur lors du chargement de vos contrats.';
        return of([]);
      })
    ).subscribe((policies) => {
      this.policies = policies;

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
        this.loadError = 'Erreur lors du chargement de la déclaration.';
        this.isLoading = false;
        return of(null);
      })
    ).subscribe((claim) => {
      if (claim) {
        this.existingClaim = claim;
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

  /** Contrats proposés : contrats actifs, plus celui de la déclaration en cours de modification. */
  get selectablePolicies(): Policy[] {
    return this.policies.filter(p =>
      (p.status || '').toUpperCase() === 'ACTIVE' || (this.editMode && p.id === this.form.policyId)
    );
  }

  get selectedPolicy(): Policy | undefined {
    return this.policies.find(p => p.id === this.form.policyId);
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get descriptionTooShort(): boolean {
    return this.descriptionLength > 0 && this.descriptionLength < DESCRIPTION_MIN;
  }

  get dateInFuture(): boolean {
    return !!this.form.incidentDate && this.form.incidentDate > this.today;
  }

  get contractDone(): boolean {
    return !!this.form.policyId;
  }

  get circumstancesDone(): boolean {
    return !!this.form.incidentDate && !this.dateInFuture
      && !!this.form.amount && this.form.amount > 0
      && this.descriptionLength >= DESCRIPTION_MIN;
  }

  typeOf(policy: Policy | undefined): PolicyTypeMeta {
    return policyTypeMeta(policy?.type);
  }

  statusOf(policy: Policy): StatusMeta {
    return statusMeta(policy.status);
  }

  amount(value: number | null | undefined): string {
    return formatMad(value);
  }

  date(value: string | Date | null | undefined): string {
    return formatDateFr(value);
  }

  onSubmit(claimForm: NgForm): void {
    this.submitAttempted = true;
    if (claimForm.invalid || this.dateInFuture) {
      claimForm.form.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les champs signalés avant d’envoyer votre déclaration.';
      return;
    }
    this.submitClaim();
  }

  submitClaim(): void {
    if (!this.form.policyId || !this.form.description || !this.form.amount || !this.clientId) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    const incidentDate = this.form.incidentDate || this.today;

    // Le backend exige une description de 10 à 2000 caractères.
    if (this.form.description.length < DESCRIPTION_MIN) {
      this.errorMessage = 'La description doit contenir au moins 10 caractères.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    if (this.editMode && this.claimId) {
      this.claimRepository.update(this.claimId, {
        incidentDate: incidentDate,
        description: this.form.description,
        estimatedAmount: this.form.amount!
      }).pipe(
        catchError((error) => {
          console.error('Error updating claim:', error);
          this.errorMessage = this.describeError(error, 'Erreur lors de la modification. Veuillez réessayer.');
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
          this.errorMessage = this.describeError(error, 'Erreur lors de l’envoi. Veuillez réessayer.');
          this.isSubmitting = false;
          return of(null);
        })
      ).subscribe((claim) => {
        this.isSubmitting = false;
        if (claim) {
          this.createdClaimId = claim.id || null;
          this.submitSuccess = true;
          setTimeout(() => this.router.navigate(['/client/claims']), 2000);
        }
      });
    }
  }

  resetForm(claimForm?: NgForm): void {
    this.form = {
      policyId: '',
      incidentDate: new Date().toISOString().split('T')[0],
      description: '',
      amount: null
    };
    this.submitSuccess = false;
    this.submitAttempted = false;
    this.errorMessage = '';
    claimForm?.resetForm(this.form);
  }

  private describeError(error: { error?: { details?: Record<string, string>; error?: string } }, fallback: string): string {
    if (error.error?.details) {
      return `Erreur de validation : ${Object.values(error.error.details).join(', ')}`;
    }
    if (error.error?.error) {
      return `Erreur : ${error.error.error}`;
    }
    return fallback;
  }
}
