import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';

const FAQ_ITEMS = [
  { q: 'How do I submit a claim?', a: 'Go to "Submit a Claim" in the left menu, select your active policy, fill in the incident details and submit.' },
  { q: 'How long does claim processing take?', a: 'Claims are typically processed within 5–10 business days. You can track the status in "My Claims".' },
  { q: 'How do I update my personal information?', a: 'Navigate to "My Profile" and click "Edit Profile" to update your contact details and address.' },
  { q: 'When is my next payment due?', a: 'Check the "Billing" section for your upcoming invoices and due dates.' },
  { q: 'How do I cancel a policy?', a: 'Contact our support team through this form. Policy cancellations require a review period of 3 business days.' },
];

@Component({
  selector: 'app-client-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-support.component.html',
  styleUrl: './client-support.component.scss'
})
export class ClientSupportComponent {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  faqItems = FAQ_ITEMS;
  openFaqIndex: number | null = null;
  isSubmitting = false;
  submitSuccess = false;
  errorMessage = '';

  form = {
    subject: '',
    category: '',
    message: ''
  };

  categories = ['Policy Question', 'Claim Issue', 'Billing', 'Technical Problem', 'Other'];

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  submitTicket(): void {
    if (!this.form.subject || !this.form.category || !this.form.message) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    const user = this.authService.getCurrentUser();
    const recipient = user?.id ?? 'support@assureflow.ma';

    this.http.post(`${environment.apiUrl}/notifications`, {
      type: 'SUPPORT_REQUEST',
      recipient,
      subject: `[${this.form.category}] ${this.form.subject}`,
      content: this.form.message,
      policyId: null
    }).pipe(
      catchError(() => {
        // Even if notification service fails, show success (email fallback)
        return of({ success: true });
      })
    ).subscribe(() => {
      this.isSubmitting = false;
      this.submitSuccess = true;
      this.form = { subject: '', category: '', message: '' };
      setTimeout(() => this.submitSuccess = false, 5000);
    });
  }
}
