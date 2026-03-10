import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
	{ path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },

	// Dashboard Routes protected by auth and role guards
	// Dashboard Routes protected by auth and role guards
	{
		path: 'admin',
		loadComponent: () => import('./features/admin/layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['ADMIN'] },
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
			},
			{
				path: 'users',
				loadComponent: () => import('./features/admin/users/users.component').then(m => m.UsersComponent)
			},
			{
				path: 'clients',
				loadComponent: () => import('./features/admin/clients/clients.component').then(m => m.ClientsComponent)
			},
			{
				path: 'policies',
				loadComponent: () => import('./features/admin/policies/policies.component').then(m => m.PoliciesComponent)
			},
			{
				path: 'claims',
				loadComponent: () => import('./features/admin/claims/claims.component').then(m => m.ClaimsComponent)
			},
			{
				path: 'billing',
				loadComponent: () => import('./features/admin/billing/billing.component').then(m => m.BillingComponent)
			},
			{
				path: 'workflows',
				loadComponent: () => import('./features/admin/workflows/workflows.component').then(m => m.WorkflowsComponent)
			},
			{
				path: 'notifications',
				loadComponent: () => import('./features/admin/notifications/notifications.component').then(m => m.NotificationsComponent)
			},
			{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }
		]
	},
	{
		path: 'agent-dashboard',
		loadComponent: () => import('./features/dashboard/agent-dashboard/agent-dashboard.component').then(m => m.AgentDashboardComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['AGENT'] }
	},
	{
		path: 'finance-dashboard',
		loadComponent: () => import('./features/dashboard/finance-dashboard/finance-dashboard.component').then(m => m.FinanceDashboardComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['FINANCE'] }
	},
	{
		path: 'client-dashboard',
		loadComponent: () => import('./features/dashboard/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['CLIENT'] }
	},

	{ path: '', redirectTo: '/login', pathMatch: 'full' },
	{ path: '**', redirectTo: '/login' }
];
