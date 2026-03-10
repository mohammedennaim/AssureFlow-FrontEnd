import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService, User } from './services/users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  isLoading = true;
  error: string | null = null;

  // Modal State
  showModal = false;
  modalTitle = '';
  isEditMode = false;
  userForm!: FormGroup;
  selectedUserId: string | null = null;
  isSaving = false;
  saveError: string | null = null;

  readonly roles = ['ADMIN', 'AGENT', 'CLIENT', 'FINANCE'];

  constructor(private usersService: UsersService, private fb: FormBuilder) {
    this.initForm();
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      role: ['CLIENT'],
      active: [true]
    });
  }

  fetchUsers(): void {
    this.isLoading = true;
    this.error = null;
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users. Please try again later.';
        console.error('Error fetching users:', err);
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.modalTitle = 'Add New User';
    this.selectedUserId = null;
    this.saveError = null;
    this.userForm.reset({ active: true, role: 'CLIENT' });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal = true;
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.modalTitle = 'Edit User';
    this.selectedUserId = user.id;
    this.saveError = null;
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      active: user.active
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = null;
    const formValue = this.userForm.value;

    if (this.isEditMode && this.selectedUserId) {
      this.usersService.updateUser(this.selectedUserId, {
        username: formValue.username,
        email: formValue.email,
        active: formValue.active
      }).subscribe({
        next: () => {
          this.fetchUsers();
          this.closeModal();
          this.isSaving = false;
        },
        error: (err) => {
          this.saveError = err?.message || 'Failed to update user. Please try again.';
          this.isSaving = false;
        }
      });
    } else {
      this.usersService.createUser({
        username: formValue.username,
        email: formValue.email,
        password: formValue.password,
        role: formValue.role
      }).subscribe({
        next: () => {
          this.fetchUsers();
          this.closeModal();
          this.isSaving = false;
        },
        error: (err) => {
          this.saveError = err?.error?.message || err?.message || 'Failed to create user. Please try again.';
          this.isSaving = false;
        }
      });
    }
  }

  deleteUser(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      this.usersService.deleteUser(id).subscribe({
        next: () => this.fetchUsers(),
        error: (err) => console.error('Error deleting user:', err)
      });
    }
  }
}
