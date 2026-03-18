import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const user = authService.getCurrentUser();

  if (token) {
    const headers: any = {
      Authorization: `Bearer ${token}`
    };

    // Add user role header for API Gateway routing
    if (user && user.role) {
      headers['X-User-Role'] = user.role;
    }

    const cloned = req.clone({
      setHeaders: headers
    });
    return next(cloned);
  }

  return next(req);
};
