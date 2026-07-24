import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { PublicConfigStore } from '../core/public-config.store';
import { TurnstileComponent } from '../features/account/turnstile.component';

@Component({
  selector: 'app-password-recovery',
  imports: [ReactiveFormsModule, RouterLink, TurnstileComponent],
  template: `
    <section class="form-shell">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <p class="eyebrow">
          {{ isVerification ? 'Verifica tu cuenta' : 'Recupera el acceso' }}
        </p>
        <h1>
          {{ isVerification ? 'Confirma tu correo.' : 'Volvamos a tu ruta.' }}
        </h1>
        @if (sent()) {
          <p class="lead" role="status">
            {{
              isVerification
                ? 'Si existe una cuenta pendiente con ese correo, recibirás un nuevo enlace de verificación.'
                : 'Si existe una cuenta verificada con ese correo, recibirás un enlace para crear una contraseña nueva.'
            }}
          </p>
          <a class="button coral" routerLink="/acceso">Volver al acceso</a>
        } @else {
          <p class="lead">Escribe tu correo. La respuesta no revela si existe una cuenta.</p>
          <div class="field">
            <label for="recovery-email">Correo electrónico</label>
            <input id="recovery-email" type="email" autocomplete="email" formControlName="email" />
          </div>
          @if (config.turnstileEnabled()) {
            <app-turnstile
              [siteKey]="config.turnstileSiteKey()"
              (tokenChange)="turnstileToken.set($event)"
            />
          }
          @if (auth.error()) {
            <p class="form-error" role="alert">{{ auth.error() }}</p>
          }
          <button class="button coral" type="submit" [disabled]="auth.loading()">
            {{
              auth.loading()
                ? 'Enviando…'
                : isVerification
                  ? 'Reenviar verificación'
                  : 'Enviar enlace'
            }}
          </button>
        }
      </form>
    </section>
  `,
  styles: `
    .form-shell {
      display: grid;
      min-height: calc(100vh - 72px);
      padding: 2rem 1.25rem;
      place-items: center;
    }
    form {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1.4rem;
      max-width: 520px;
      padding: clamp(2rem, 6vw, 4rem);
      width: 100%;
    }
    h1 {
      font-size: clamp(2.5rem, 6vw, 4rem);
      margin: 0.4rem 0 1rem;
    }
    .lead {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .field,
    button {
      width: 100%;
    }
    .form-error {
      color: #9e3423;
    }
  `,
})
export class PasswordRecoveryPage {
  readonly auth = inject(AuthStore);
  readonly config = inject(PublicConfigStore);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly isVerification = this.route.snapshot.data['mode'] === 'verification';
  readonly sent = signal(false);
  readonly turnstileToken = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.config.turnstileEnabled() && !this.turnstileToken()) return;
    try {
      const email = this.form.controls.email.value.trim();
      if (this.isVerification)
        await this.auth.resendVerification(email, this.turnstileToken() || undefined);
      else await this.auth.forgotPassword(email, this.turnstileToken() || undefined);
      this.sent.set(true);
    } catch {
      // AuthStore exposes the safe user-facing error.
    }
  }
}
