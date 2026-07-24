import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { PublicConfigStore } from '../core/public-config.store';
import { TripStore } from '../core/trip-store.service';
import { GoogleSignInComponent } from '../features/account/google-sign-in.component';
import { TurnstileComponent } from '../features/account/turnstile.component';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink, GoogleSignInComponent, TurnstileComponent],
  template: `
    <section class="auth-shell">
      <div class="auth-story">
        <p class="eyebrow">Tu atlas personal</p>
        <h1>Todo viaje empieza con un lugar donde imaginarlo.</h1>
        <p>Organiza rutas, gastos y lugares pendientes en un cuaderno privado que viaja contigo.</p>
        <span>ruta · planifica con intención</span>
      </div>

      <div class="auth-panel">
        @if (registrationPending()) {
          <section class="pending-card" role="status">
            <p class="eyebrow">Un paso más</p>
            <h2>Revisa tu correo</h2>
            <p>
              Hemos enviado un enlace a <strong>{{ pendingEmail() }}</strong
              >. Debes confirmarlo antes de acceder a tus viajes.
            </p>
            <a class="button coral" routerLink="/acceso">Volver al acceso</a>
            <a class="resend-link" routerLink="/reenviar-verificacion">
              Reenviar la verificación
            </a>
          </section>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <p class="eyebrow">{{ isRegister() ? 'Una cuenta nueva' : 'Bienvenido de vuelta' }}</p>
            <h2>{{ isRegister() ? 'Crea tu espacio' : 'Continúa el camino' }}</h2>
            <p class="lead">
              {{
                isRegister()
                  ? 'Tus viajes serán privados y estarán disponibles al volver.'
                  : 'Accede a tus viajes, ideas y presupuestos.'
              }}
            </p>

            @if (isRegister()) {
              <div class="field">
                <label for="name">Nombre</label>
                <input
                  id="name"
                  autocomplete="name"
                  formControlName="name"
                  placeholder="Cómo quieres que te llamemos"
                />
                @if (form.controls.name.touched && form.controls.name.invalid) {
                  <span class="error">Indica tu nombre.</span>
                }
              </div>
            }
            <div class="field">
              <label for="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autocomplete="email"
                formControlName="email"
                placeholder="tu@correo.com"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="error">Introduce un correo válido.</span>
              }
            </div>
            @if (!isRegister()) {
              <a class="forgot" routerLink="/recuperar-contrasena">
                ¿Has olvidado tu contraseña?
              </a>
            }

            @if (isRegister() && publicConfig.turnstileEnabled()) {
              <app-turnstile
                [siteKey]="publicConfig.turnstileSiteKey()"
                (tokenChange)="turnstileToken.set($event)"
                (loadError)="widgetError.set(true)"
              />
            }
            @if (widgetError()) {
              <p class="error" role="alert">
                No se pudo cargar la comprobación de seguridad. Recarga la página.
              </p>
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
                <span class="error">Debe tener al menos 10 caracteres.</span>
              }
            </div>

            @if (auth.error()) {
              <div class="form-error" role="alert">{{ auth.error() }}</div>
            }
            <button class="button coral submit" type="submit" [disabled]="auth.loading()">
              {{ auth.loading() ? 'Conectando…' : isRegister() ? 'Crear cuenta' : 'Acceder' }}
            </button>

            <div class="divider"><span>o</span></div>
            @if (googleEnabled()) {
              <app-google-sign-in
                [clientId]="publicConfig.googleClientId()"
                (credential)="loginWithGoogle($event)"
                (loadError)="widgetError.set(true)"
              />
            } @else {
              <button
                class="google"
                type="button"
                disabled
                title="Configura GOOGLE_CLIENT_ID para habilitarlo"
              >
                Acceder con Google
                <small>sin configurar</small>
              </button>
            }

            <p class="switch">
              {{ isRegister() ? '¿Ya tienes cuenta?' : '¿Es tu primera ruta?' }}
              <a [routerLink]="isRegister() ? '/acceso' : '/registro'">{{
                isRegister() ? 'Accede' : 'Crea una cuenta'
              }}</a>
            </p>
          </form>
        }
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
        url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=85')
          center/cover;
      color: white;
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
      border-top: 1px solid rgba(255, 255, 255, 0.3);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      margin-top: 2rem;
      padding-top: 1rem;
      text-transform: uppercase;
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
    .pending-card {
      max-width: 460px;
    }
    .pending-card p {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .resend-link {
      color: var(--deep);
      display: block;
      margin-top: 1rem;
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
    .google {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
    }
    .google small {
      display: block;
      font-size: 0.65rem;
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
  readonly registrationPending = signal(false);
  readonly pendingEmail = signal('');
  readonly turnstileToken = signal('');
  readonly widgetError = signal(false);
  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10)]],
  });

  async submit(): Promise<void> {
    if (this.isRegister()) this.form.controls.name.addValidators(Validators.required);
    else this.form.controls.name.clearValidators();
    this.form.controls.name.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, password } = this.form.getRawValue();
    try {
      if (this.isRegister()) {
        if (this.publicConfig.turnstileEnabled() && !this.turnstileToken()) {
          this.widgetError.set(true);
          return;
        }
        await this.auth.register(
          name.trim(),
          email.trim(),
          password,
          this.turnstileToken() || undefined,
        );
        this.pendingEmail.set(email.trim());
        this.registrationPending.set(true);
        return;
      }
      await this.auth.login(email.trim(), password);
      await this.finishAuthentication();
    } catch {
      // AuthStore exposes the safe user-facing error.
    }
  }

  async loginWithGoogle(credential: string): Promise<void> {
    try {
      await this.auth.loginWithGoogle(credential);
      await this.finishAuthentication();
    } catch {
      // AuthStore exposes the safe user-facing error.
    }
  }

  private async finishAuthentication(): Promise<void> {
    await this.trips.load();
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    await this.router.navigateByUrl(requested?.startsWith('/') ? requested : '/');
  }
}
