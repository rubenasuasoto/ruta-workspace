import { DatePipe } from '@angular/common';
import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { PASSWORD_REQUIREMENTS, PASSWORD_VALIDATORS } from '../auth/password-policy';
import { FeedbackService } from '../core/feedback.service';
import { TripStore } from '../core/trip-store.service';
import { PublicConfigStore } from '../core/public-config.store';
import { AccountService } from '../features/account/account.service';
import { GoogleSignInComponent } from '../features/account/google-sign-in.component';

@Component({
  selector: 'app-account',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, GoogleSignInComponent],
  template: `
    <section class="account-shell">
      <header>
        <p class="eyebrow">Tu espacio privado</p>
        <h1>Mi cuenta</h1>
        <p>Administra tu identidad, tus sesiones y una copia de tus datos.</p>
      </header>

      @if (account.error()) {
        <p class="form-error" role="alert">{{ account.error() }}</p>
      }

      <div class="account-grid">
        <article>
          <h2>Perfil</h2>
          <p class="muted">
            Cuenta verificada ·
            {{ auth.user()?.providers?.join(' + ') }}
          </p>
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
            <div class="field">
              <label for="account-name">Nombre</label>
              <input id="account-name" formControlName="name" />
            </div>
            <button class="button outline" type="submit" [disabled]="account.loading()">
              Guardar nombre
            </button>
          </form>
        </article>

        <article>
          <h2>Confirmar identidad</h2>
          @if (reauthToken()) {
            <p class="verified" role="status">Identidad confirmada. Elige una acción sensible.</p>
          } @else if (hasLocalPassword()) {
            <form [formGroup]="identityForm" (ngSubmit)="reauthenticate()">
              <div class="field">
                <label for="current-password">Contraseña actual</label>
                <input
                  id="current-password"
                  type="password"
                  autocomplete="current-password"
                  formControlName="password"
                />
              </div>
              <button class="button outline" type="submit">Confirmar identidad</button>
            </form>
          } @else if (googleEnabled()) {
            <p class="muted">Confirma de nuevo tu cuenta de Google.</p>
            <app-google-sign-in
              [clientId]="config.googleClientId()"
              (credential)="reauthenticateGoogle($event)"
            />
          } @else {
            <p class="muted">
              <a routerLink="/recuperar-contrasena">Crea una contraseña</a>
              para poder realizar acciones sensibles.
            </p>
          }
        </article>

        <article>
          <h2>Cambiar correo</h2>
          <form [formGroup]="emailForm" (ngSubmit)="changeEmail()">
            <div class="field">
              <label for="new-email">Correo nuevo</label>
              <input id="new-email" type="email" autocomplete="email" formControlName="email" />
            </div>
            <button
              class="button outline"
              type="submit"
              [disabled]="!reauthToken() || account.loading()"
            >
              Enviar confirmación
            </button>
          </form>
        </article>

        <article>
          <h2>Contraseña</h2>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <div class="field">
              <label for="account-password">Contraseña nueva</label>
              <input
                id="account-password"
                type="password"
                autocomplete="new-password"
                formControlName="password"
              />
              <small class="muted">{{ passwordRequirements }}</small>
            </div>
            <div class="field">
              <label for="account-password-repeat">Repetir contraseña</label>
              <input
                id="account-password-repeat"
                type="password"
                autocomplete="new-password"
                formControlName="confirmation"
              />
            </div>
            <button
              class="button outline"
              type="submit"
              [disabled]="!reauthToken() || account.loading()"
            >
              {{ hasLocalPassword() ? 'Cambiar contraseña' : 'Añadir contraseña' }}
            </button>
          </form>
        </article>

        <article class="sessions-card">
          <div class="card-heading">
            <div>
              <h2>Sesiones activas</h2>
              <p class="muted">Cierra accesos que no reconozcas.</p>
            </div>
            <button class="text-button" type="button" (click)="revokeOthers()">
              Cerrar las demás
            </button>
          </div>
          <ul>
            @for (session of account.sessions(); track session.id) {
              <li>
                <div>
                  <strong>{{ session.current ? 'Este dispositivo' : 'Otra sesión' }}</strong>
                  <span>{{ session.userAgent || 'Dispositivo no identificado' }}</span>
                  <small>
                    Último uso:
                    {{ session.lastUsedAt | date: 'medium' }}
                  </small>
                </div>
                @if (!session.current) {
                  <button
                    class="text-button danger"
                    type="button"
                    (click)="revokeSession(session.id)"
                  >
                    Cerrar
                  </button>
                }
              </li>
            } @empty {
              <li class="muted">No hay sesiones activas disponibles.</li>
            }
          </ul>
        </article>

        <article>
          <h2>Tus datos</h2>
          <p class="muted">Descarga un JSON versionado con tu perfil y cuaderno de viaje.</p>
          <button class="button outline" type="button" (click)="downloadExport()">
            Descargar exportación
          </button>
        </article>

        <article class="danger-zone">
          <h2>Eliminar cuenta</h2>
          <p>
            Esta acción elimina de forma inmediata tus viajes, lugares, gastos y sesiones. No se
            puede deshacer.
          </p>
          <div class="field">
            <label for="delete-confirmation"> Escribe ELIMINAR para continuar </label>
            <input
              id="delete-confirmation"
              [value]="deleteConfirmation()"
              (input)="deleteConfirmation.set($any($event.target).value)"
            />
          </div>
          <button
            class="button danger-button"
            type="button"
            [disabled]="!reauthToken() || deleteConfirmation() !== 'ELIMINAR' || account.loading()"
            (click)="deleteAccount()"
          >
            Eliminar mi cuenta
          </button>
        </article>
      </div>
    </section>
  `,
  styles: `
    .account-shell {
      margin: auto;
      max-width: 1180px;
      padding: clamp(2rem, 5vw, 5rem) 1.25rem;
    }
    header {
      margin-bottom: 2.5rem;
    }
    header h1 {
      font-size: clamp(3rem, 7vw, 5.6rem);
      margin: 0.25rem 0 0.6rem;
    }
    header > p:last-child,
    .muted {
      color: var(--muted);
      line-height: 1.55;
    }
    .account-grid {
      display: grid;
      gap: 1.2rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1.1rem;
      padding: clamp(1.4rem, 3vw, 2rem);
    }
    h2 {
      font-size: 1.8rem;
      margin: 0 0 0.8rem;
    }
    .field {
      margin: 1rem 0;
    }
    .verified {
      background: #e8f3ed;
      border-radius: 0.7rem;
      color: #245f44;
      padding: 0.85rem;
    }
    .sessions-card,
    .danger-zone {
      grid-column: 1 / -1;
    }
    .card-heading,
    li {
      align-items: center;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    }
    ul {
      list-style: none;
      margin: 1rem 0 0;
      padding: 0;
    }
    li {
      border-top: 1px solid var(--line);
      padding: 1rem 0;
    }
    li div {
      display: grid;
      gap: 0.25rem;
    }
    li span,
    li small {
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .text-button {
      background: none;
      border: 0;
      color: var(--deep);
      cursor: pointer;
      font-weight: 700;
    }
    .danger,
    .danger-zone h2 {
      color: #9e3423;
    }
    .danger-zone {
      border-color: #efb7aa;
    }
    .danger-zone p {
      color: #793c31;
    }
    .danger-button {
      background: #9e3423;
      color: white;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .form-error {
      background: #fff0ec;
      border: 1px solid #efb7aa;
      border-radius: 0.7rem;
      color: #9e3423;
      padding: 0.8rem;
    }
    @media (max-width: 760px) {
      .account-grid {
        grid-template-columns: 1fr;
      }
      .sessions-card,
      .danger-zone {
        grid-column: auto;
      }
      .card-heading,
      li {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class AccountPage implements OnInit {
  readonly auth = inject(AuthStore);
  readonly account = inject(AccountService);
  readonly config = inject(PublicConfigStore);
  private readonly trips = inject(TripStore);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly reauthToken = signal('');
  readonly deleteConfirmation = signal('');
  readonly hasLocalPassword = signal(false);
  readonly googleEnabled = signal(false);
  readonly identityForm = this.fb.nonNullable.group({
    password: ['', Validators.required],
  });
  readonly profileForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });
  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly passwordForm = this.fb.nonNullable.group({
    password: ['', PASSWORD_VALIDATORS],
    confirmation: ['', Validators.required],
  });
  readonly passwordRequirements = PASSWORD_REQUIREMENTS;

  async ngOnInit(): Promise<void> {
    const user = this.auth.user();
    this.profileForm.controls.name.setValue(user?.name ?? '');
    this.emailForm.controls.email.setValue(user?.email ?? '');
    this.hasLocalPassword.set(user?.providers.includes('LOCAL') ?? false);
    this.googleEnabled.set(
      (user?.providers.includes('GOOGLE') ?? false) && Boolean(this.config.googleClientId()),
    );
    await this.account.loadSessions().catch(() => undefined);
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    try {
      await this.account.updateName(this.profileForm.controls.name.value);
      this.feedback.notify('Nombre actualizado');
    } catch {}
  }

  async reauthenticate(): Promise<void> {
    if (this.identityForm.invalid) return;
    try {
      this.reauthToken.set(
        await this.account.reauthenticate(this.identityForm.controls.password.value),
      );
      this.identityForm.reset();
    } catch {}
  }

  async reauthenticateGoogle(credential: string): Promise<void> {
    try {
      this.reauthToken.set(await this.account.reauthenticateWithGoogle(credential));
    } catch {}
  }

  async changeEmail(): Promise<void> {
    if (this.emailForm.invalid || !this.reauthToken()) return;
    try {
      const message = await this.account.requestEmailChange(
        this.emailForm.controls.email.value,
        this.reauthToken(),
      );
      this.reauthToken.set('');
      this.feedback.notify(message, 'info');
    } catch {}
  }

  async changePassword(): Promise<void> {
    if (
      this.passwordForm.invalid ||
      this.passwordForm.controls.password.value !== this.passwordForm.controls.confirmation.value ||
      !this.reauthToken()
    )
      return;
    try {
      await this.account.changePassword(
        this.passwordForm.controls.password.value,
        this.reauthToken(),
      );
      this.trips.reset();
      this.feedback.notify('Contraseña actualizada. Vuelve a acceder.', 'success');
      await this.router.navigateByUrl('/acceso');
    } catch {}
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.account.revokeSession(sessionId).catch(() => undefined);
  }

  async revokeOthers(): Promise<void> {
    await this.account.revokeOthers().catch(() => undefined);
  }

  async downloadExport(): Promise<void> {
    await this.account.downloadExport().catch(() => undefined);
  }

  async deleteAccount(): Promise<void> {
    const accepted = await this.feedback.confirm({
      title: 'Eliminar definitivamente la cuenta',
      message:
        'Se borrarán todos tus viajes, lugares, gastos y sesiones. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar cuenta',
      danger: true,
    });
    if (!accepted || !this.reauthToken()) return;
    try {
      await this.account.deleteAccount(this.reauthToken());
      this.trips.reset();
      await this.router.navigateByUrl('/registro');
      this.feedback.notify('La cuenta se ha eliminado', 'info');
    } catch {}
  }
}
