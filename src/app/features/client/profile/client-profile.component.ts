import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CLIENT_REPOSITORY } from '../../../core/domain/ports/client.repository.port';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
  cin?: string;
  clientNumber?: string;
}

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.scss'
})
export class ClientProfileComponent implements OnInit {
  private clientRepository = inject(CLIENT_REPOSITORY);

  isEditing = false;
  isSaving = false;
  isLoading = true;
  errorMessage = '';
  activeTab: 'profile' | 'security' | 'notifications' = 'profile';

  private clientId: string | null = null;

  profile: UserProfile = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    dateOfBirth: ''
  };

  originalProfile: UserProfile = { ...this.profile };

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clientRepository.getMe().pipe(
      catchError(() => {
        this.errorMessage = 'Erreur lors du chargement du profil.';
        return of(null);
      })
    ).subscribe((client) => {
      this.isLoading = false;
      if (client && client.id) {
        this.clientId = client.id;
        const primaryAddress = client.addresses?.find((a: any) => a.isPrimary) ?? client.addresses?.[0];
        this.profile = {
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone ?? '',
          address: primaryAddress?.street ?? (client as any).address ?? '',
          city: primaryAddress?.city ?? (client as any).city ?? '',
          zipCode: primaryAddress?.postalCode ?? (client as any).zipCode ?? '',
          country: primaryAddress?.country ?? '',
          dateOfBirth: client.dateOfBirth ?? '',
          cin: client.cin ?? '',
          clientNumber: client.clientNumber ?? ''
        };
        this.originalProfile = { ...this.profile };
      }
    });
  }

  toggleEdit(): void {
    if (this.isEditing) {
      this.profile = { ...this.originalProfile };
    }
    this.isEditing = !this.isEditing;
  }

  saveProfile(): void {
    this.isSaving = true;
    this.errorMessage = '';

    this.clientRepository.updateMe({
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      phone: this.profile.phone,
      dateOfBirth: this.profile.dateOfBirth
    }).pipe(
      catchError(() => {
        this.errorMessage = 'Erreur lors de la sauvegarde.';
        return of(null);
      })
    ).subscribe((updated) => {
      this.isSaving = false;
      if (updated) {
        this.originalProfile = { ...this.profile };
        this.isEditing = false;
      }
    });
  }

  cancelEdit(): void {
    this.profile = { ...this.originalProfile };
    this.isEditing = false;
  }
}
