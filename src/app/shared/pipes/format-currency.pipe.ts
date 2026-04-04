import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatCurrency', standalone: true })
export class FormatCurrencyPipe implements PipeTransform {
  transform(amount: number, currency: string = 'EUR', display: string = 'symbol', digitsInfo: string = '1.0-0'): string {
    if (amount == null || isNaN(amount)) {
      return '';
    }

    const { minimumFractionDigits, maximumFractionDigits } = this.parseDigitsInfo(digitsInfo);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: display as any,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount);
  }

  private parseDigitsInfo(digitsInfo: string): { minimumFractionDigits: number; maximumFractionDigits: number } {
    // Angular-like format: {minInteger}.{minFraction}-{maxFraction}, e.g. 1.0-2
    const match = /^(\d+)\.(\d+)-(\d+)$/.exec((digitsInfo || '').trim());

    let minFraction = match ? Number(match[2]) : 0;
    let maxFraction = match ? Number(match[3]) : 0;

    if (!Number.isFinite(minFraction) || minFraction < 0) {
      minFraction = 0;
    }
    if (!Number.isFinite(maxFraction) || maxFraction < 0) {
      maxFraction = minFraction;
    }

    // Intl.NumberFormat supports 0..20 for fraction digits
    minFraction = Math.min(20, minFraction);
    maxFraction = Math.min(20, maxFraction);

    if (maxFraction < minFraction) {
      maxFraction = minFraction;
    }

    return {
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction
    };
  }
}
