import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
	{ path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },

	// Dashboard Routes protected by auth and role guards
	{
		path: 'admin-dashboard',
		loadComponent: () => import('./features/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
		canActivate: [authGuard, roleGuard],
		data: { roles: ['ADMIN'] }
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
