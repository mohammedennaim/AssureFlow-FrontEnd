import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[afReveal]',
  standalone: true,
  host: { class: 'reveal' }
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  @Input() afRevealDelay = 0;

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const el: HTMLElement = this.element.nativeElement;
    if (this.afRevealDelay) {
      el.style.setProperty('--reveal-delay', `${this.afRevealDelay}ms`);
    }

    if (!isPlatformBrowser(this.platformId) || !('IntersectionObserver' in window)) {
      el.classList.add('is-visible');
      return;
    }

    this.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        el.classList.add('is-visible');
        this.observer?.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
