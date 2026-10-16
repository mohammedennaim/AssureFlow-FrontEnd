import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, of } from 'rxjs';
import { ClientDashboardService } from '../../../../core/application/services/client-dashboard.service';
import { Claim } from '../../../../core/domain/models/claim.model';
import { Policy } from '../../../../core/domain/models/policy.model';
import { CLAIM_REPOSITORY } from '../../../../core/domain/ports/claim.repository.port';
import { POLICY_REPOSITORY } from '../../../../core/domain/ports/policy.repository.port';
import { AF_ICONS } from '../../../../shared/icons/af-icons';
import {
  formatDateFr,
  formatMad,
  policyTypeMeta,
  PolicyTypeMeta,
  statusMeta,
  StatusMeta,
  Tone
} from '../../../../shared/utils/client-ui';

const STEP_ORDER = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'];
const REJECTED_STATUSES = ['REJECTED', 'DENIED', 'CLOSED'];
const REVIEW_STATUSES = ['UNDER_REVIEW', 'IN_REVIEW', 'PROCESSING', 'INFO_REQUESTED'];
const EDITABLE_STATUSES = ['PENDING', 'SUBMITTED'];

interface NextStep {
  title: string;
  text: string;
  icon: string;
  tone: Tone;
}

interface TimelineEvent {
  label: string;
  date: string;
  icon: string;
  tone: Tone;
}

@Component({
  selector: 'app-claim-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './claim-detail.component.html',
  styleUrl: './claim-detail.component.scss'
})
export class ClaimDetailComponent implements OnInit {
  readonly icons = AF_ICONS;
  readonly steps = ['Déclaré', 'Analyse', 'Décision', 'Indemnisé'];

  loading = true;
  error = '';
  claim: Claim | null = null;
  policy: Policy | null = null;
  policyLoading = false;
  claimId: string | null = null;

  private claimRepository = inject(CLAIM_REPOSITORY);
  private policyRepository = inject(POLICY_REPOSITORY);
  private clientDashboardService = inject(ClientDashboardService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.claimId = this.route.snapshot.paramMap.get('id');
    if (!this.claimId) {
      this.router.navigate(['/client/claims']);
      return;
    }
    this.loadClaim();
  }

  loadClaim(): void {
    this.loading = true;
    this.error = '';

    this.clientDashboardService.getCurrentClientId().subscribe({
      next: (clientId) => {
        if (!clientId || !this.claimId) {
          this.router.navigate(['/client/claims']);
          return;
        }

        this.claimRepository.getById(this.claimId).pipe(
          catchError((err) => {
            console.error('[ClaimDetail] Error loading claim:', err);
            this.error = 'Impossible de charger ce sinistre pour le moment.';
            return of(null);
          })
        ).subscribe((claim) => {
          if (claim && claim.clientId === clientId) {
            this.claim = claim;
            if (claim.policyId) {
              this.loadPolicy(claim.policyId);
            }
          } else if (claim) {
            this.router.navigate(['/client/claims']);
          }
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('[ClaimDetail] Error getting clientId:', err);
        this.error = 'Impossible de vérifier votre session. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

  loadPolicy(policyId: string): void {
    this.policyLoading = true;
    this.policyRepository.getById(policyId).pipe(
      catchError((err) => {
        console.error('[ClaimDetail] Error loading policy:', err);
        return of(null);
      })
    ).subscribe((policy) => {
      this.policy = policy;
      this.policyLoading = false;
    });
  }

  get status(): StatusMeta {
    return statusMeta(this.claim?.status);
  }

  get policyType(): PolicyTypeMeta {
    return policyTypeMeta(this.policy?.type);
  }

  get policyStatus(): StatusMeta {
    return statusMeta(this.policy?.status);
  }

  get normalizedStatus(): string {
    return (this.claim?.status || '').trim().toUpperCase();
  }

  get isRejected(): boolean {
    return REJECTED_STATUSES.includes(this.normalizedStatus);
  }

  get canEdit(): boolean {
    return EDITABLE_STATUSES.includes(this.normalizedStatus);
  }

  get declaredAmount(): number | undefined {
    return this.claim?.amount || this.claim?.estimatedAmount;
  }

  get coverageRate(): number | null {
    const declared = this.declaredAmount;
    const approved = this.claim?.approvedAmount;
    if (!declared || !approved) return null;
    return Math.min(100, Math.round((approved / declared) * 100));
  }

  get nextStep(): NextStep {
    const status = this.normalizedStatus;
    if (status === 'INFO_REQUESTED') {
      return {
        title: 'Informations complémentaires demandées',
        text: 'Votre gestionnaire a besoin de précisions. Contactez le support pour transmettre les éléments manquants.',
        icon: 'alert',
        tone: 'warning'
      };
    }
    if (REVIEW_STATUSES.includes(status)) {
      return {
        title: 'Analyse en cours',
        text: 'Un gestionnaire étudie votre dossier. Vous serez notifié dès qu’une décision sera prise.',
        icon: 'hourglass',
        tone: 'warning'
      };
    }
    if (status === 'APPROVED') {
      return {
        title: 'Indemnisation en préparation',
        text: 'Votre sinistre est accepté. Le versement sera effectué sous quelques jours ouvrés.',
        icon: 'banknote',
        tone: 'success'
      };
    }
    if (status === 'PAID') {
      return {
        title: 'Dossier indemnisé',
        text: 'Le montant accepté vous a été versé. Ce dossier est désormais terminé.',
        icon: 'check',
        tone: 'success'
      };
    }
    if (this.isRejected) {
      return {
        title: status === 'CLOSED' ? 'Dossier clôturé' : 'Demande non retenue',
        text: 'Pour comprendre cette décision ou la contester, nos conseillers sont à votre écoute.',
        icon: 'rejected',
        tone: 'danger'
      };
    }
    return {
      title: 'Déclaration reçue',
      text: 'Votre déclaration a bien été enregistrée. Elle sera prise en charge par un gestionnaire sous 48 h ouvrées.',
      icon: 'send',
      tone: 'info'
    };
  }

  get timeline(): TimelineEvent[] {
    const claim = this.claim;
    if (!claim) return [];
    const events: TimelineEvent[] = [];
    if (claim.incidentDate) {
      events.push({ label: 'Survenance du sinistre', date: claim.incidentDate, icon: 'alert', tone: 'neutral' });
    }
    const declared = claim.submittedAt || claim.createdAt;
    if (declared) {
      events.push({ label: 'Déclaration enregistrée', date: declared, icon: 'send', tone: 'info' });
    }
    if (claim.resolvedAt) {
      events.push({
        label: 'Décision : ' + this.status.label.toLowerCase(),
        date: claim.resolvedAt,
        icon: this.isRejected ? 'rejected' : 'check',
        tone: this.isRejected ? 'danger' : 'success'
      });
    }
    return events;
  }

  stepState(index: number): 'is-done' | 'is-current' | 'is-failed' | '' {
    const status = this.normalizedStatus;
    if (REJECTED_STATUSES.includes(status)) {
      return index === 0 ? 'is-done' : index === 2 ? 'is-failed' : index === 1 ? 'is-done' : '';
    }
    const normalized = ['IN_REVIEW', 'PROCESSING', 'INFO_REQUESTED'].includes(status) ? 'UNDER_REVIEW'
      : status === 'PENDING' ? 'SUBMITTED' : status;
    const current = Math.max(0, STEP_ORDER.indexOf(normalized));
    if (index < current) return 'is-done';
    if (index === current) return current === STEP_ORDER.length - 1 ? 'is-done' : 'is-current';
    return '';
  }

  stepLabel(step: string, index: number): string {
    return index === 2 && this.isRejected ? this.status.label : step;
  }

  amount(value: number | null | undefined): string {
    return formatMad(value);
  }

  date(value: string | Date | null | undefined): string {
    return formatDateFr(value);
  }
}
