import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (accepted: boolean) => void;
}

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly confirmation = signal<ConfirmRequest | null>(null);
  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 1;

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.confirmation()?.resolve(false);
    return new Promise((resolve) =>
      this.confirmation.set({ ...options, resolve }),
    );
  }

  answer(accepted: boolean): void {
    const current = this.confirmation();
    if (!current) return;
    this.confirmation.set(null);
    current.resolve(accepted);
  }

  notify(
    text: string,
    tone: ToastMessage['tone'] = 'success',
  ): void {
    const toast = { id: this.nextId++, text, tone };
    this.toasts.update((items) => [...items, toast]);
    window.setTimeout(() => this.dismiss(toast.id), 4500);
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }
}
