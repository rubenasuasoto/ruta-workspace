import type {
  AfterViewInit,
  ElementRef,
  OnDestroy} from '@angular/core';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { ExternalScriptService } from './external-script.service';

interface TurnstileApi {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
      theme: 'light';
    },
  ): string;
  remove(widgetId: string): void;
}

@Component({
  selector: 'app-turnstile',
  template: `<div #host class="turnstile-host"></div>`,
  styles: `
    .turnstile-host {
      display: flex;
      justify-content: center;
      margin: 1rem 0;
      min-height: 65px;
    }
  `,
})
export class TurnstileComponent implements AfterViewInit, OnDestroy {
  private readonly scripts = inject(ExternalScriptService);
  @ViewChild('host', { static: true })
  private host!: ElementRef<HTMLElement>;
  @Input({ required: true }) siteKey = '';
  @Output() tokenChange = new EventEmitter<string>();
  @Output() loadError = new EventEmitter<void>();
  private widgetId?: string;

  async ngAfterViewInit(): Promise<void> {
    if (!this.siteKey) return;
    try {
      await this.scripts.load(
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      );
      const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (!turnstile) throw new Error('Turnstile no disponible');
      this.widgetId = turnstile.render(this.host.nativeElement, {
        sitekey: this.siteKey,
        callback: (token) => this.tokenChange.emit(token),
        'expired-callback': () => this.tokenChange.emit(''),
        'error-callback': () => {
          this.tokenChange.emit('');
          this.loadError.emit();
        },
        theme: 'light',
      });
    } catch {
      this.loadError.emit();
    }
  }

  ngOnDestroy(): void {
    const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (this.widgetId && turnstile) turnstile.remove(this.widgetId);
  }
}
