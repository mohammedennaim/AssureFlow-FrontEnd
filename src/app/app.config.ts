import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/auth/auth.interceptor';

import { AUTH_REPOSITORY } from './core/domain/ports/auth.repository.port';
import { HttpAuthRepository } from './core/infrastructure/repositories/http-auth.repository';
import { USER_REPOSITORY } from './core/domain/ports/user.repository.port';
import { HttpUserRepository } from './core/infrastructure/repositories/http-user.repository';
import { DASHBOARD_REPOSITORY } from './core/domain/ports/dashboard.repository.port';
import { HttpDashboardRepository } from './core/infrastructure/repositories/http-dashboard.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: AUTH_REPOSITORY, useClass: HttpAuthRepository },
    { provide: USER_REPOSITORY, useClass: HttpUserRepository },
    { provide: DASHBOARD_REPOSITORY, useClass: HttpDashboardRepository },
  ]
};
