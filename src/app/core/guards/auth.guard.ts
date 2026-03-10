import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();
  const isPublicRoute = route.data['public'];

  if (isPublicRoute && isAuthenticated) {
    const role = authService.getUserRole();
    switch (role) {
      case 'ADMIN':
        return router.parseUrl('/admin/dashboard');
      case 'AGENT':
        return router.parseUrl('/agent/dashboard');
      case 'FINANCE':
        return router.parseUrl('/finance/dashboard');
      case 'CLIENT':
        return router.parseUrl('/client/dashboard');
      default:
        return router.parseUrl('/login');
    }
  }

  if (!isAuthenticated) {
    return router.parseUrl('/login');
  }

  return true;
};
