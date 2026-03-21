import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UsersService, User } from '../../../core/application/services/admin-users.service';

interface UserStats {
  total: number;
  admins: number;
  agents: number;
  active: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private usersService = inject(UsersService);
  private fb = inject(FormBuilder);

  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = true;
  error: string | null = null;
  searchQuery = '';
  filterRole = 'ALL';
  filterStatus = 'ALL';
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  viewMode: 'table' | 'cards' = 'table';
  selectedUsers = new Set<string>();
  showDeleteConfirm = false;
  userToDelete: string | null = null;
  showModal = false;
  showBackdrop = false;
  modalTitle = '';
  isEditMode = false;
  userForm!: FormGroup;
  selectedUserId: string | null = null;
  isSaving = false;
  saveError: string | null = null;

  // New modals
  showRolesModal = false;
  showSessionsModal = false;
  showAuditModal = false;
  selectedUser: User | null = null;
  userSessions: any[] = [];
  userAuditLogs: any[] = [];
  availableRoles = [
    { id: '10000000-0000-0000-0000-000000000001', name: 'ADMIN' },
    { id: '10000000-0000-0000-0000-000000000002', name: 'AGENT' },
    { id: '10000000-0000-0000-0000-000000000003', name: 'CLIENT' },
    { id: '10000000-0000-0000-0000-000000000004', name: 'FINANCE' }
  ];

  // Notification
  notification: { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null = null;

  currentPage = 1;
  pageSize = 10;

  readonly roles = ['ADMIN', 'AGENT', 'CLIENT', 'FINANCE'];

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
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
        this.filteredUsers = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users. Please try again later.';
        console.error('Error fetching users:', err);
        this.isLoading = false;
      }
    });
  }

  // Stats getters
  get totalAdmins(): number {
    return this.users.filter(u => u.role === 'ADMIN').length;
  }

  get totalAgents(): number {
    return this.users.filter(u => u.role === 'AGENT').length;
  }

  get totalActive(): number {
    return this.users.filter(u => u.active).length;
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.filterUsers();
  }

  onRoleFilterChange(): void {
    this.currentPage = 1;
    this.filterUsers();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.filterUsers();
  }

  sortUsers(column: string): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
    
    this.filteredUsers.sort((a, b) => {
      let aVal: any = a[column as keyof User];
      let bVal: any = b[column as keyof User];
      
      if (column === 'username' || column === 'email') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  filterUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesRole = this.filterRole === 'ALL' || user.role === this.filterRole;
      const matchesStatus = this.filterStatus === 'ALL' || 
        (this.filterStatus === 'ACTIVE' && user.active) ||
        (this.filterStatus === 'INACTIVE' && !user.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.paginatedUsers.forEach(u => this.selectedUsers.add(u.id));
    } else {
      this.paginatedUsers.forEach(u => this.selectedUsers.delete(u.id));
    }
  }

  toggleSelectUser(userId: string): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  isAllSelected(): boolean {
    return this.paginatedUsers.every(u => this.selectedUsers.has(u.id));
  }

  openCreateModal(): void {
    console.log('[UsersComponent] Opening create modal');
    this.isEditMode = false;
    this.modalTitle = 'Add New User';
    this.selectedUserId = null;
    this.saveError = null;
    this.userForm.reset({ active: true, role: 'CLIENT' });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showBackdrop = true;
    console.log('[UsersComponent] showBackdrop set to true');
    setTimeout(() => {
      this.showModal = true;
      console.log('[UsersComponent] showModal set to true');
    }, 10);
  }

  openEditModal(user: User): void {
    console.log('[UsersComponent] Opening edit modal for user:', user);
    this.isEditMode = true;
    this.modalTitle = 'Edit User';
    this.selectedUserId = user.id;
    this.saveError = null;
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      role: user.role,
      active: user.active
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showBackdrop = true;
    console.log('[UsersComponent] showBackdrop set to true');
    setTimeout(() => {
      this.showModal = true;
      console.log('[UsersComponent] showModal set to true');
    }, 10);
  }

  closeModal(): void {
    this.showModal = false;
    setTimeout(() => {
      this.showBackdrop = false;
      this.userForm.reset();
    }, 300);
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

  confirmDelete(userId: string): void {
    this.userToDelete = userId;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (this.userToDelete) {
      this.usersService.deleteUser(this.userToDelete).subscribe({
        next: () => {
          this.fetchUsers();
          this.closeDeleteConfirm();
        },
        error: (err) => console.error('Error deleting user:', err)
      });
    }
  }

  getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      'ADMIN': 'user-table__role--admin',
      'AGENT': 'user-table__role--agent',
      'CLIENT': 'user-table__role--client',
      'FINANCE': 'user-table__role--finance'
    };
    return classes[role] || '';
  }

  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      'ADMIN': 'fa-crown',
      'AGENT': 'fa-briefcase',
      'CLIENT': 'fa-user',
      'FINANCE': 'fa-coins'
    };
    return icons[role] || 'fa-user';
  }

  getUserInitial(username: string): string {
    return username ? username.charAt(0).toUpperCase() : '?';
  }

  getUserAvatarColor(username: string): string {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterRole = 'ALL';
    this.filterStatus = 'ALL';
    this.filterUsers();
  }

  hasActiveFilters(): boolean {
    return this.searchQuery !== '' || this.filterRole !== 'ALL' || this.filterStatus !== 'ALL';
  }

  onBackdropClick(event: Event): void {
    event.stopPropagation();
    this.closeModal();
  }

  onModalClick(event: Event): void {
    event.stopPropagation();
  }

  trackByUserId(index: number, user: User): string {
    return user.id;
  }

  // New methods for advanced features
  openRolesModal(user: User): void {
    console.log('[UsersComponent] Opening roles modal for user:', user);
    this.selectedUser = user;
    this.showRolesModal = true;
    console.log('[UsersComponent] showRolesModal:', this.showRolesModal);
  }

  closeRolesModal(): void {
    console.log('[UsersComponent] Closing roles modal');
    this.showRolesModal = false;
    this.selectedUser = null;
  }

  assignRole(roleId: string): void {
    if (!this.selectedUser) return;

    this.usersService.assignRole(this.selectedUser.id, roleId).subscribe({
      next: () => {
        this.showNotification('Role assigned successfully', 'success');
        this.fetchUsers();
        this.closeRolesModal();
      },
      error: (err) => {
        console.error('Error assigning role:', err);
        this.showNotification('Failed to assign role', 'error');
      }
    });
  }

  removeRole(roleId: string): void {
    if (!this.selectedUser) return;

    this.usersService.removeRole(this.selectedUser.id, roleId).subscribe({
      next: () => {
        this.showNotification('Role removed successfully', 'success');
        this.fetchUsers();
        this.closeRolesModal();
      },
      error: (err) => {
        console.error('Error removing role:', err);
        this.showNotification('Failed to remove role', 'error');
      }
    });
  }

  hasRole(roleName: string): boolean {
    if (!this.selectedUser || !this.selectedUser.roles) return false;
    return this.selectedUser.roles.some(r => r.name === roleName);
  }

  openSessionsModal(user: User): void {
    this.selectedUser = user;
    this.usersService.getUserSessions(user.id).subscribe({
      next: (sessions) => {
        this.userSessions = sessions;
        if (sessions.length === 0) {
          this.showNotification('No active sessions found for this user', 'info');
        }
        this.showSessionsModal = true;
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.showNotification('Failed to load sessions', 'error');
      }
    });
  }

  closeSessionsModal(): void {
    this.showSessionsModal = false;
    this.selectedUser = null;
    this.userSessions = [];
  }

  invalidateAllSessions(): void {
    if (!this.selectedUser) return;

    this.usersService.invalidateUserSessions(this.selectedUser.id).subscribe({
      next: () => {
        this.showNotification('All sessions invalidated successfully', 'success');
        this.closeSessionsModal();
      },
      error: (err) => {
        console.error('Error invalidating sessions:', err);
        this.showNotification('Failed to invalidate sessions', 'error');
      }
    });
  }

  openAuditModal(user: User): void {
    this.selectedUser = user;
    this.usersService.getUserAuditLogs(user.id).subscribe({
      next: (logs) => {
        this.userAuditLogs = logs;
        if (logs.length === 0) {
          this.showNotification('No audit logs found for this user', 'info');
        }
        this.showAuditModal = true;
      },
      error: (err) => {
        console.error('Error loading audit logs:', err);
        this.showNotification('Failed to load audit logs', 'error');
      }
    });
  }

  closeAuditModal(): void {
    this.showAuditModal = false;
    this.selectedUser = null;
    this.userAuditLogs = [];
  }

  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.notification = { message, type };
    setTimeout(() => {
      this.notification = null;
    }, 5000);
  }

  closeNotification(): void {
    this.notification = null;
  }
}
