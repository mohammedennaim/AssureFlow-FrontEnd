import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'avatarColor', standalone: true })
export class AvatarColorPipe implements PipeTransform {
  private readonly colors = [
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
  ];

  transform(name: string): string {
    const index = name.charCodeAt(0) % this.colors.length;
    return this.colors[index];
  }
}
