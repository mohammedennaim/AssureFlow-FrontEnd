import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles: string[] = route.data['roles'];
  const userRole = authService.getUserRole();

  console.log(`[RoleGuard] Checking access for URL: ${state.url}`);
  console.log(`[RoleGuard] Expected Roles: ${expectedRoles}, User Role: ${userRole}`);

  if (!authService.isAuthenticated()) {
    console.log('[RoleGuard] User not authenticated. Redirecting to /login');
    return router.parseUrl('/login');
  }

  if (expectedRoles && userRole && expectedRoles.includes(userRole)) {
    console.log('[RoleGuard] Access granted.');
    return true;
  }

  console.log('[RoleGuard] Access denied. Redirecting based on role fallback.');
  switch (userRole) {
    case 'ADMIN': return router.parseUrl('/admin/dashboard');
    case 'AGENT': return router.parseUrl('/agent-dashboard');
    case 'FINANCE': return router.parseUrl('/finance-dashboard');
    case 'CLIENT': return router.parseUrl('/client-dashboard');
    default: return router.parseUrl('/login');
  }
};
