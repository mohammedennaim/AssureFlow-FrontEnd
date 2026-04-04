import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'statusClass', standalone: true })
export class StatusClassPipe implements PipeTransform {
  transform(status: string): string {
    const statusMap: Record<string, string> = {
      active: 'status--active',
      pending: 'status--pending',
      expired: 'status--expired',
      approved: 'status--approved',
      rejected: 'status--rejected',
      processing: 'status--processing',
      paid: 'status--paid',
      overdue: 'status--overdue',
      draft: 'status--draft',
      cancelled: 'status--cancelled',
      submitted: 'status--submitted',
      under_review: 'status--processing'
    };
    return statusMap[status.toLowerCase()] || '';
  }
}
