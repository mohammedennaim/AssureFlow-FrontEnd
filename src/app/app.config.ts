import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/auth/auth.interceptor';

import { AUTH_REPOSITORY } from './core/domain/ports/auth.repository.port';
import { HttpAuthRepository } from './core/infrastructure/repositories/http-auth.repository';
import { USER_REPOSITORY } from './core/domain/ports/user.repository.port';
import { HttpUserRepository } from './core/infrastructure/repositories/http-user.repository';
import { DASHBOARD_REPOSITORY } from './core/domain/ports/dashboard.repository.port';
import { HttpDashboardRepository } from './core/infrastructure/repositories/http-dashboard.repository';
import { POLICY_REPOSITORY } from './core/domain/ports/policy.repository.port';
import { HttpPolicyRepository } from './core/infrastructure/repositories/http-policy.repository';
import { CLIENT_REPOSITORY } from './core/domain/ports/client.repository.port';
import { HttpClientRepository } from './core/infrastructure/repositories/http-client.repository';
import { CLAIM_REPOSITORY } from './core/domain/ports/claim.repository.port';
import { HttpClaimRepository } from './core/infrastructure/repositories/http-claim.repository';
import { INVOICE_REPOSITORY, PAYMENT_REPOSITORY } from './core/domain/ports/invoice.repository.port';
import { HttpInvoiceRepository, HttpPaymentRepository } from './core/infrastructure/repositories/http-invoice.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: AUTH_REPOSITORY, useClass: HttpAuthRepository },
    { provide: USER_REPOSITORY, useClass: HttpUserRepository },
    { provide: DASHBOARD_REPOSITORY, useClass: HttpDashboardRepository },
    { provide: POLICY_REPOSITORY, useClass: HttpPolicyRepository },
    { provide: CLIENT_REPOSITORY, useClass: HttpClientRepository },
    { provide: CLAIM_REPOSITORY, useClass: HttpClaimRepository },
    { provide: INVOICE_REPOSITORY, useClass: HttpInvoiceRepository },
    { provide: PAYMENT_REPOSITORY, useClass: HttpPaymentRepository },
  ]
};
