import {
  Component,
  HostListener,
  ViewChild,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import type { ElementRef } from '@angular/core';

export interface DemoTourStep {
  targetId: string;
  context?: string;
  eyebrow: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-demo-tour',
  template: `
    @if (active() && current(); as step) {
      <div class="tour-shade" aria-hidden="true"></div>
      <aside
        #dialog
        class="tour-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        tabindex="-1"
      >
        <header>
          <p class="eyebrow">{{ step.eyebrow }}</p>
          <button type="button" (click)="skip()">Saltar guía</button>
        </header>
        <p class="progress" aria-live="polite">Paso {{ index() + 1 }} de {{ steps().length }}</p>
        <h2 id="tour-title">{{ step.title }}</h2>
        <p id="tour-description">{{ step.description }}</p>
        <footer>
          <button
            type="button"
            class="button secondary"
            [disabled]="index() === 0"
            (click)="previous()"
          >
            Anterior
          </button>
          <button type="button" class="button coral" (click)="next()">
            {{ isLast() ? 'Terminar' : 'Siguiente' }}
          </button>
        </footer>
      </aside>
    }
  `,
  styles: `
    .tour-shade {
      background: rgb(9 24 25 / 62%);
      inset: 0;
      position: fixed;
      z-index: 100;
    }
    .tour-dialog {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      bottom: clamp(1rem, 4vw, 2.5rem);
      box-shadow: 0 24px 80px rgb(6 21 22 / 45%);
      max-width: 440px;
      padding: 1.4rem;
      position: fixed;
      right: clamp(1rem, 4vw, 2.5rem);
      width: calc(100vw - 2rem);
      z-index: 120;
    }
    .tour-dialog:focus-visible {
      outline: 3px solid var(--coral);
      outline-offset: 3px;
    }
    header,
    footer {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }
    header button {
      background: transparent;
      border: 0;
      color: var(--deep);
      font-size: 0.78rem;
      font-weight: 800;
      text-decoration: underline;
    }
    .progress {
      color: var(--coral);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin: 1.3rem 0 0.35rem;
      text-transform: uppercase;
    }
    h2 {
      font-size: clamp(2rem, 5vw, 3rem);
      line-height: 1;
      margin: 0;
    }
    #tour-description {
      color: var(--muted);
      line-height: 1.6;
      margin: 1rem 0 1.5rem;
    }
    footer {
      gap: 0.75rem;
      justify-content: flex-end;
    }
    @media (max-width: 600px) {
      .tour-dialog {
        bottom: 0.75rem;
        left: 0.75rem;
        right: 0.75rem;
        width: auto;
      }
    }
  `,
})
export class DemoTourComponent {
  readonly active = input(false);
  readonly steps = input.required<readonly DemoTourStep[]>();
  readonly closed = output<'skipped' | 'completed'>();
  readonly stepChanged = output<DemoTourStep>();
  readonly index = signal(0);
  readonly current = computed(() => this.steps()[this.index()] ?? null);
  readonly isLast = computed(() => this.index() === this.steps().length - 1);

  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  private highlighted?: HTMLElement;

  constructor() {
    effect(() => {
      const step = this.active() ? this.current() : null;
      queueMicrotask(() => this.focusStep(step));
    });
  }

  previous(): void {
    if (this.index() > 0) this.index.update((value) => value - 1);
  }

  next(): void {
    if (this.isLast()) {
      this.close('completed');
      return;
    }
    this.index.update((value) => value + 1);
  }

  skip(): void {
    this.close('skipped');
  }

  @HostListener('document:keydown.escape')
  closeWithEscape(): void {
    if (this.active()) this.skip();
  }

  private close(result: 'skipped' | 'completed'): void {
    this.clearHighlight();
    this.index.set(0);
    this.closed.emit(result);
  }

  private focusStep(step: DemoTourStep | null): void {
    this.clearHighlight();
    if (!step) return;
    this.stepChanged.emit(step);
    requestAnimationFrame(() => {
      const target = document.getElementById(step.targetId);
      if (target) {
        this.highlighted = target;
        target.classList.add('demo-tour-focus');
        target.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      this.dialog?.nativeElement.focus();
    });
  }

  private clearHighlight(): void {
    this.highlighted?.classList.remove('demo-tour-focus');
    this.highlighted = undefined;
  }
}
