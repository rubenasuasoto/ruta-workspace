import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TripStore } from '../core/trip-store.service';

@Component({
  selector: 'app-account-token',
  imports: [RouterLink],
  template: `
    <section class="token-shell">
      <article>
        <p class="eyebrow">Seguridad de la cuenta</p>
        @if (loading()) {
          <h1>Comprobando el enlace…</h1>
          <p role="status">Espera un momento.</p>
        } @else if (error()) {
          <h1>El enlace no se pudo usar</h1>
          <p role="alert">{{ error() }}</p>
          <a class="button coral" routerLink="/acceso">Volver al acceso</a>
        } @else {
          <h1>{{ title() }}</h1>
          <p>Tu cuenta está preparada y la sesión se ha iniciado de forma segura.</p>
          <button class="button coral" type="button" (click)="continue()">Ir a mis viajes</button>
        }
      </article>
    </section>
  `,
  styles: `
    .token-shell {
      display: grid;
      min-height: calc(100vh - 72px);
      padding: 2rem 1.25rem;
      place-items: center;
    }
    article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1.4rem;
      max-width: 620px;
      padding: clamp(2rem, 6vw, 4.5rem);
      text-align: center;
    }
    h1 {
      font-size: clamp(2.4rem, 6vw, 4.2rem);
      margin: 0.5rem 0 1rem;
    }
    p {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
  `,
})
export class AccountTokenPage implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly trips = inject(TripStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly title = signal('Correo confirmado');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    const action = this.route.snapshot.data['action'] as 'verify' | 'email-change';
    this.title.set(
      action === 'email-change' ? 'Tu nuevo correo está confirmado' : 'Tu correo está confirmado',
    );
    try {
      if (!token) throw new Error('Falta el token');
      if (action === 'email-change') await this.auth.confirmEmailChange(token);
      else await this.auth.verifyEmail(token);
      await this.trips.load();
    } catch (error) {
      this.error.set(
        error instanceof Error && error.message === 'Falta el token'
          ? 'El enlace está incompleto.'
          : this.auth.error() || 'El enlace no es válido o ha caducado.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  continue(): Promise<boolean> {
    return this.router.navigateByUrl('/');
  }
}
