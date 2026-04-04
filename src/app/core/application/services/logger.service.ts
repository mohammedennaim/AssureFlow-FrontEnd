import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private isDevelopment = true; // Set based on environment

  log(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.info(message, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(message, ...args);
    }
  }
}
