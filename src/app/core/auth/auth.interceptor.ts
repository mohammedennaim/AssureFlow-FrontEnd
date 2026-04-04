import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Authentication Interceptor
 * 
 * Security Design:
 * - Frontend ONLY sends JWT token (Authorization: Bearer)
 * - Gateway extracts role from JWT and sets X-User-Roles header
 * - Gateway is the SINGLE SOURCE OF TRUTH for user identity
 * - Frontend NEVER trusts its own role extraction for authorization
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
