import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
	{ path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent), canActivate: [authGuard], data: { public: true } },
	{ path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent), canActivate: [authGuard], data: { public: true } },

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
		path: 'agent',
		loadComponent: () => import('./features/agent/layout/agent-layout/agent-layout.component').then(m => m.AgentLayoutComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['AGENT'] },
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./features/agent/dashboard/agent-dashboard.component').then(m => m.AgentDashboardComponent)
			},
			{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }
		]
	},
	{
		path: 'client',
		loadComponent: () => import('./features/client/layout/client-layout/client-layout.component').then(m => m.ClientLayoutComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['CLIENT'] },
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./features/client/dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent)
			},
			{
				path: 'policies',
				loadComponent: () => import('./features/client/policies/client-policies.component').then(m => m.ClientPoliciesComponent)
			},
			{
				path: 'claims',
				loadComponent: () => import('./features/client/claims/client-claims.component').then(m => m.ClientClaimsComponent)
			},
			{
				path: 'billing',
				loadComponent: () => import('./features/client/billing/client-billing.component').then(m => m.ClientBillingComponent)
			},
			{
				path: 'profile',
				loadComponent: () => import('./features/client/profile/client-profile.component').then(m => m.ClientProfileComponent)
			},
			{
				path: 'documents',
				loadComponent: () => import('./features/client/documents/client-documents.component').then(m => m.ClientDocumentsComponent).catch(() => import('./features/client/dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent))
			},
			{
				path: 'support',
				loadComponent: () => import('./features/client/support/client-support.component').then(m => m.ClientSupportComponent).catch(() => import('./features/client/dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent))
			},
			{
				path: 'submit-claim',
				loadComponent: () => import('./features/client/submit-claim/client-submit-claim.component').then(m => m.ClientSubmitClaimComponent).catch(() => import('./features/client/claims/client-claims.component').then(m => m.ClientClaimsComponent))
			},
			{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }
		]
	},
	{
		path: 'finance',
		loadComponent: () => import('./features/finance/layout/finance-layout/finance-layout.component').then(m => m.FinanceLayoutComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['FINANCE'] },
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./features/finance/dashboard/finance-dashboard.component').then(m => m.FinanceDashboardComponent)
			},
			{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }
		]
	},

	{ path: '', redirectTo: '/login', pathMatch: 'full' },
	{ path: '**', redirectTo: '/login' }
];
