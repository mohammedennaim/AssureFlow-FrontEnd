import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private router = inject(Router);

  handleError(error: any): void {
    console.error('Global error handler:', error);

    // Log error details
    if (error?.message) {
      console.error('Error message:', error.message);
    }
    if (error?.stack) {
      console.error('Stack trace:', error.stack);
    }

    // Handle specific error types
    if (error?.status === 401) {
      // Unauthorized - redirect to login
      this.router.navigate(['/auth/login']);
    } else if (error?.status === 403) {
      // Forbidden - redirect to unauthorized page
      console.error('Access forbidden');
    } else if (error?.status === 404) {
      // Not found
      console.error('Resource not found');
    }

    // Rethrow the error to preserve default behavior
    throw error;
  }
}
