import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import {
  PASSWORD_LOGIN_REQUIRED,
  PASSWORD_REQUIREMENTS,
  PASSWORD_VALIDATORS,
} from '../auth/password-policy';
import { PublicConfigStore } from '../core/public-config.store';
import { TripStore } from '../core/trip-store.service';
import { GoogleSignInComponent } from '../features/account/google-sign-in.component';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink, GoogleSignInComponent],
  template: `
    <section class="auth-shell">
      <div class="auth-story">
        <p class="eyebrow">Opción 1 · Demo guiada</p>
        <h1>Todo viaje empieza con un lugar donde imaginarlo.</h1>
        <p>
          Recorre un viaje ficticio y descubre paso a paso el itinerario, el presupuesto, los mapas
          y las decisiones técnicas del proyecto.
        </p>
        <a class="button demo-button" routerLink="/demo" [queryParams]="{ tour: 1 }">
          Explorar la demo guiada →
        </a>
        <span>ruta · acceso privado por invitación</span>
      </div>

      <div class="auth-panel">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <p class="eyebrow">
            {{ isRegister() ? 'Invitación privada' : 'Opción 2 · Acceso privado' }}
          </p>
          <h2>{{ isRegister() ? 'Crea tu espacio' : 'Continúa el camino' }}</h2>
          <p class="lead">
            {{
              isRegister()
                ? 'Esta invitación es personal, caduca y solo puede utilizarse una vez.'
                : 'Accede a tus viajes, ideas y presupuestos.'
            }}
          </p>

          @if (isRegister()) {
            @if (invitationLoading()) {
              <p role="status">Comprobando invitación…</p>
            } @else if (invitationError()) {
              <div class="form-error" role="alert">{{ invitationError() }}</div>
            } @else {
              <div class="field">
                <label for="invited-email">Correo invitado</label>
                <input id="invited-email" [value]="invitationEmail()" readonly />
              </div>
              <div class="field">
                <label for="name">Nombre</label>
                <input id="name" autocomplete="name" formControlName="name" />
                @if (form.controls.name.touched && form.controls.name.invalid) {
                  <span class="error">Indica tu nombre.</span>
                }
              </div>
            }
          } @else {
            <div class="field">
              <label for="email">Correo electrónico</label>
              <input id="email" type="email" autocomplete="email" formControlName="email" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="error">Introduce un correo válido.</span>
              }
            </div>
            <a class="forgot" routerLink="/recuperar-contrasena">¿Has olvidado tu contraseña?</a>
          }

          <div class="field">
            <label for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              [attr.autocomplete]="isRegister() ? 'new-password' : 'current-password'"
              formControlName="password"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <span class="error">
                {{ isRegister() ? passwordRequirements : loginPasswordRequired }}
              </span>
            }
          </div>

          @if (auth.error()) {
            <div class="form-error" role="alert">{{ auth.error() }}</div>
          }
          <button
            class="button coral submit"
            type="submit"
            [disabled]="
              auth.loading() || (isRegister() && (invitationLoading() || !!invitationError()))
            "
          >
            {{ auth.loading() ? 'Conectando…' : isRegister() ? 'Aceptar invitación' : 'Acceder' }}
          </button>

          @if (googleEnabled()) {
            <div class="divider"><span>o</span></div>
            <app-google-sign-in
              [clientId]="publicConfig.googleClientId()"
              (credential)="loginWithGoogle($event)"
              (loadError)="googleError.set(true)"
            />
          }
          @if (googleError()) {
            <p class="error" role="alert">No se pudo cargar el acceso de Google.</p>
          }

          <p class="switch">
            @if (isRegister()) {
              ¿Ya tienes cuenta? <a routerLink="/acceso">Accede</a>
            } @else {
              Ruta es privada. Las cuentas nuevas necesitan una invitación personal.
            }
          </p>
        </form>
      </div>
    </section>
  `,
  styles: `
    .auth-shell {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      min-height: calc(100vh - 72px);
    }
    .auth-story {
      background:
        linear-gradient(135deg, rgba(24, 58, 60, 0.9), rgba(24, 58, 60, 0.62)),
        url('/assets/editorial/ruta-auth-hero.png') center/cover;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: clamp(2.5rem, 7vw, 7rem);
    }
    .auth-story h1 {
      font-size: clamp(3rem, 5.5vw, 6rem);
      line-height: 0.96;
      margin: 0.6rem 0 1.4rem;
      max-width: 800px;
    }
    .auth-story > p:not(.eyebrow) {
      color: #d9e4e0;
      line-height: 1.65;
      max-width: 520px;
    }
    .auth-story > span {
      border-top: 1px solid #ffffff4d;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      margin-top: 2rem;
      padding-top: 1rem;
      text-transform: uppercase;
    }
    .demo-button {
      align-self: flex-start;
      background: var(--coral);
      border-color: var(--coral);
      color: #fff;
      margin-top: 1.25rem;
      text-decoration: none;
    }
    .auth-panel {
      align-items: center;
      display: flex;
      justify-content: center;
      padding: clamp(2rem, 6vw, 6rem);
    }
    form {
      max-width: 460px;
      width: 100%;
    }
    h2 {
      font-size: clamp(2.4rem, 4vw, 3.7rem);
      margin: 0.4rem 0 0.6rem;
    }
    .lead {
      color: var(--muted);
      line-height: 1.55;
      margin-bottom: 2rem;
    }
    .field {
      margin-bottom: 1rem;
    }
    .forgot {
      color: var(--deep);
      display: inline-block;
      font-size: 0.82rem;
      margin: -0.35rem 0 0.8rem;
    }
    .submit,
    .google {
      min-height: 48px;
      width: 100%;
    }
    .submit {
      margin-top: 0.4rem;
    }
    .submit:disabled {
      opacity: 0.65;
    }
    .form-error {
      background: #fff0ec;
      border: 1px solid #efb7aa;
      border-radius: 0.6rem;
      color: #9e3423;
      font-size: 0.82rem;
      margin: 1rem 0;
      padding: 0.8rem;
    }
    .divider {
      align-items: center;
      color: var(--muted);
      display: flex;
      font-size: 0.75rem;
      gap: 0.8rem;
      margin: 1.3rem 0;
    }
    .divider:before,
    .divider:after {
      background: var(--line);
      content: '';
      height: 1px;
      flex: 1;
    }
    .switch {
      color: var(--muted);
      font-size: 0.84rem;
      margin: 1.4rem 0 0;
      text-align: center;
    }
    .switch a {
      color: var(--coral);
      font-weight: 700;
    }
    @media (max-width: 800px) {
      .auth-shell {
        grid-template-columns: 1fr;
      }
      .auth-story {
        min-height: 300px;
        padding: 2rem 1.25rem;
      }
      .auth-story h1 {
        font-size: 2.8rem;
      }
      .auth-panel {
        padding: 2.5rem 1.25rem;
      }
    }
  `,
})
export class AuthPage {
  readonly auth = inject(AuthStore);
  private readonly trips = inject(TripStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly publicConfig = inject(PublicConfigStore);

  readonly isRegister = computed(() => this.route.snapshot.data['mode'] === 'register');
  readonly googleEnabled = computed(() => this.publicConfig.googleClientId().length > 0);
  readonly invitationToken = this.route.snapshot.queryParamMap.get('invite')?.trim() ?? '';
  readonly invitationEmail = signal('');
  readonly invitationLoading = signal(false);
  readonly invitationError = signal('');
  readonly googleError = signal(false);
  readonly passwordRequirements = PASSWORD_REQUIREMENTS;
  readonly loginPasswordRequired = PASSWORD_LOGIN_REQUIRED;
  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: [''],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (this.isRegister()) void this.inspectInvitation();
  }

  async submit(): Promise<void> {
    this.form.controls.name.setValidators(this.isRegister() ? [Validators.required] : []);
    this.form.controls.email.setValidators(
      this.isRegister() ? [] : [Validators.required, Validators.email],
    );
    this.form.controls.password.setValidators(
      this.isRegister() ? PASSWORD_VALIDATORS : [Validators.required],
    );
    this.form.updateValueAndValidity();
    if (
      this.form.invalid ||
      (this.isRegister() && (!this.invitationToken || !!this.invitationError()))
    ) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, password } = this.form.getRawValue();
    try {
      if (this.isRegister()) await this.auth.register(name.trim(), password, this.invitationToken);
      else await this.auth.login(email.trim(), password);
      await this.finishAuthentication();
    } catch {
      // AuthStore exposes the safe user-facing error.
    }
  }

  async loginWithGoogle(credential: string): Promise<void> {
    try {
      await this.auth.loginWithGoogle(
        credential,
        this.isRegister() ? this.invitationToken : undefined,
      );
      await this.finishAuthentication();
    } catch {
      // AuthStore exposes the safe user-facing error.
    }
  }

  private async inspectInvitation(): Promise<void> {
    if (!this.invitationToken) {
      this.invitationError.set('Necesitas una invitación personal para crear una cuenta.');
      return;
    }
    this.invitationLoading.set(true);
    try {
      const invitation = await this.auth.inspectInvitation(this.invitationToken);
      this.invitationEmail.set(invitation.email);
    } catch {
      this.invitationError.set('La invitación no es válida, ha caducado o ya fue utilizada.');
    } finally {
      this.invitationLoading.set(false);
    }
  }

  private async finishAuthentication(): Promise<void> {
    await this.trips.load();
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    await this.router.navigateByUrl(safeReturnUrl(requested));
  }
}

export function safeReturnUrl(requested: string | null): string {
  if (
    !requested ||
    !requested.startsWith('/') ||
    requested.startsWith('//') ||
    requested.includes('\\')
  )
    return '/';
  return requested;
}
