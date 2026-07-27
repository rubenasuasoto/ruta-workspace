import type {
  ElementRef} from '@angular/core';
import {
  Component,
  HostListener,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FeedbackService } from './feedback.service';

@Component({
  selector: 'app-feedback',
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (toast of feedback.toasts(); track toast.id) {
        <div class="toast" [class]="toast.tone">
          <span>{{ toast.text }}</span>
          <button type="button" (click)="feedback.dismiss(toast.id)" aria-label="Cerrar notificación">×</button>
        </div>
      }
    </div>
    @if (feedback.confirmation(); as dialog) {
      <div
        class="confirm-backdrop"
        tabindex="-1"
        (click)="dismissFromBackdrop($event)"
        (keydown.escape)="feedback.answer(false)"
      >
        <section
          #dialogElement
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          tabindex="-1"
        >
          <p class="eyebrow">Confirmación</p>
          <h2 id="confirm-title">{{ dialog.title }}</h2>
          <p id="confirm-message">{{ dialog.message }}</p>
          <div>
            <button type="button" class="button secondary" (click)="feedback.answer(false)">Cancelar</button>
            <button type="button" class="button" [class.danger]="dialog.danger" (click)="feedback.answer(true)">
              {{ dialog.confirmLabel ?? 'Confirmar' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    .toasts{display:grid;gap:.55rem;max-width:min(390px,calc(100vw - 2rem));position:fixed;right:1rem;top:5.2rem;z-index:80}.toast{align-items:center;background:var(--ink);border-radius:.7rem;box-shadow:0 8px 28px #183a3c40;color:white;display:flex;gap:1rem;justify-content:space-between;padding:.8rem 1rem}.toast.error{background:#9e3423}.toast.info{background:#496568}.toast button{background:transparent;border:0;color:white;font-size:1.1rem}.confirm-backdrop{align-items:center;background:#12242488;display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:90}.confirm-dialog{background:var(--paper);border-radius:1rem;box-shadow:0 20px 70px #0004;max-width:470px;padding:1.6rem;width:100%}.confirm-dialog:focus{outline:3px solid #f6cfc4}.confirm-dialog h2{font-size:2rem;margin-bottom:.5rem}.confirm-dialog>p:not(.eyebrow){color:var(--muted);line-height:1.55}.confirm-dialog>div{display:flex;gap:.7rem;justify-content:flex-end;margin-top:1.5rem}.button.danger{background:#a33a2c;border-color:#a33a2c}
  `,
})
export class FeedbackComponent {
  readonly feedback = inject(FeedbackService);
  @ViewChild('dialogElement') private dialog?: ElementRef<HTMLElement>;
  private previousFocus?: HTMLElement;

  constructor() {
    effect(() => {
      if (this.feedback.confirmation()) {
        this.previousFocus = document.activeElement as HTMLElement;
        queueMicrotask(() => this.dialog?.nativeElement.focus());
      } else {
        queueMicrotask(() => this.previousFocus?.focus());
      }
    });
  }

  dismissFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.feedback.answer(false);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.feedback.confirmation()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.feedback.answer(false);
      return;
    }
    if (event.key !== 'Tab' || !this.dialog) return;
    const focusable = Array.from(
      this.dialog.nativeElement.querySelectorAll<HTMLElement>('button'),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
