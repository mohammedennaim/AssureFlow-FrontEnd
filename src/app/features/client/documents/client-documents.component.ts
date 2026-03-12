import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientSessionService } from '../../../core/application/services/client-session.service';
import { POLICY_REPOSITORY } from '../../../core/domain/ports/policy.repository.port';
import { CLAIM_REPOSITORY } from '../../../core/domain/ports/claim.repository.port';
import { Policy } from '../../../core/domain/models/policy.model';
import { Claim } from '../../../core/domain/models/claim.model';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export interface DocumentItem {
  id: string;
  title: string;
  type: 'POLICY' | 'CLAIM';
  subtype: string;
  status: string;
  date: string;
  reference: string;
}

@Component({
  selector: 'app-client-documents',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-documents.component.html',
  styleUrl: './client-documents.component.scss'
})
export class ClientDocumentsComponent implements OnInit {
  private clientSession = inject(ClientSessionService);
  private policyRepository = inject(POLICY_REPOSITORY);
  private claimRepository = inject(CLAIM_REPOSITORY);

  isLoading = true;
  errorMessage = '';
  activeFilter: 'all' | 'POLICY' | 'CLAIM' = 'all';
  documents: DocumentItem[] = [];

  get filteredDocuments(): DocumentItem[] {
    if (this.activeFilter === 'all') return this.documents;
    return this.documents.filter(d => d.type === this.activeFilter);
  }

  ngOnInit(): void {
    this.clientSession.getCurrentClientId().pipe(
      switchMap((clientId) => {
        if (!clientId) { this.errorMessage = 'Client introuvable.'; return of([[], []] as [Policy[], Claim[]]); }
        return forkJoin([
          this.policyRepository.getByClientId(clientId).pipe(catchError(() => of([]))),
          this.claimRepository.getByClientId(clientId).pipe(catchError(() => of([])))
        ]);
      }),
      catchError(() => { this.errorMessage = 'Erreur lors du chargement.'; return of([[], []] as [Policy[], Claim[]]); })
    ).subscribe(([policies, claims]) => {
      this.isLoading = false;
      const policyDocs: DocumentItem[] = (policies as Policy[]).map(p => ({
        id: p.id, title: `Police ${p.type} — ${p.policyNumber}`,
        type: 'POLICY', subtype: p.type, status: p.status,
        date: p.createdAt ?? p.startDate, reference: p.policyNumber
      }));
      const claimDocs: DocumentItem[] = (claims as Claim[]).map(c => ({
        id: c.id, title: `Sinistre — ${c.claimNumber}`,
        type: 'CLAIM', subtype: 'CLAIM_REPORT', status: c.status,
        date: c.submittedAt ?? c.createdAt ?? '', reference: c.claimNumber
      }));
      this.documents = [...policyDocs, ...claimDocs]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (['active', 'approved', 'paid'].includes(s)) return 'badge badge--success';
    if (['pending', 'submitted', 'draft', 'processing'].includes(s)) return 'badge badge--warning';
    if (['rejected', 'cancelled', 'expired', 'overdue'].includes(s)) return 'badge badge--danger';
    return 'badge badge--neutral';
  }

  getTypeIcon(type: 'POLICY' | 'CLAIM'): string {
    return type === 'POLICY'
      ? 'M8 2H14L18 6V20H6V2H8ZM14 2V6H18'
      : 'M12 2L2 7L12 12L22 7L12 2ZM2 17L12 22L22 17M2 12L12 17L22 12';
  }
}
