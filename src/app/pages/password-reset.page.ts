import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-password-reset',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="form-shell">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <p class="eyebrow">Nueva contraseña</p>
        <h1>Protege tus próximos viajes.</h1>
        @if (completed()) {
          <p class="lead" role="status">
            Contraseña actualizada. Todas las sesiones anteriores se han cerrado.
          </p>
          <a class="button coral" routerLink="/acceso">Acceder</a>
        } @else {
          <div class="field">
            <label for="new-password">Contraseña nueva</label>
            <input
              id="new-password"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            />
          </div>
          <div class="field">
            <label for="repeat-password">Repite la contraseña</label>
            <input
              id="repeat-password"
              type="password"
              autocomplete="new-password"
              formControlName="confirmation"
            />
          </div>
          @if (mismatch()) {
            <p class="form-error" role="alert">Las contraseñas no coinciden.</p>
          }
          @if (auth.error()) {
            <p class="form-error" role="alert">{{ auth.error() }}</p>
          }
          <button class="button coral" type="submit" [disabled]="auth.loading()">
            Guardar contraseña
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
      max-width: 540px;
      padding: clamp(2rem, 6vw, 4rem);
      width: 100%;
    }
    h1 {
      font-size: clamp(2.4rem, 6vw, 4rem);
      margin: 0.4rem 0 1.4rem;
    }
    .field {
      margin-bottom: 1rem;
    }
    button {
      width: 100%;
    }
    .lead {
      color: var(--muted);
      line-height: 1.6;
    }
    .form-error {
      color: #9e3423;
    }
  `,
})
export class PasswordResetPage {
  readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly completed = signal(false);
  readonly mismatch = signal(false);
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(10)]],
    confirmation: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    this.mismatch.set(this.form.controls.password.value !== this.form.controls.confirmation.value);
    if (this.form.invalid || this.mismatch()) {
      this.form.markAllAsTouched();
      return;
    }
    try {
      await this.auth.resetPassword(
        this.route.snapshot.queryParamMap.get('token') ?? '',
        this.form.controls.password.value,
      );
      this.completed.set(true);
    } catch {
      // AuthStore exposes the safe user-facing error.
    }
  }
}
