import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ClientSessionService } from '../../../core/application/services/client-session.service';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { Policy } from '../../../core/domain/models/policy.model';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
  private router = inject(Router);

  isLoading = true;
  isSubmitting = false;
  submitSuccess = false;
  errorMessage = '';
  today = new Date().toISOString().split('T')[0];

  clientId: string | null = null;
  policies: Policy[] = [];

  form = {
    policyId: '',
    incidentDate: '',
    description: '',
    amount: null as number | null
  };

  ngOnInit(): void {
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
      this.isLoading = false;
      this.policies = policies.filter(p => p.status === 'ACTIVE' || p.status === 'active');
    });
  }

  submitClaim(): void {
    if (!this.form.policyId || !this.form.description || !this.form.amount || !this.clientId) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.claimRepository.create({
      policyId: this.form.policyId,
      clientId: this.clientId!,
      incidentDate: this.form.incidentDate || this.today,
      description: this.form.description,
      estimatedAmount: this.form.amount!,
      submittedBy: this.clientId!
    }).pipe(
      catchError(() => {
        this.errorMessage = 'Erreur lors de la soumission. Veuillez réessayer.';
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

  resetForm(): void {
    this.form = { policyId: '', incidentDate: '', description: '', amount: null };
    this.submitSuccess = false;
    this.errorMessage = '';
  }
}
