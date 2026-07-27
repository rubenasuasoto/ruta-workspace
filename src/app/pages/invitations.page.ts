import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api } from '../api/api';
import { invitationsControllerCreate } from '../api/fn/invitations/invitations-controller-create';
import { invitationsControllerList } from '../api/fn/invitations/invitations-controller-list';
import { invitationsControllerRenew } from '../api/fn/invitations/invitations-controller-renew';
import { invitationsControllerRevoke } from '../api/fn/invitations/invitations-controller-revoke';
import type { InvitationResponseDto } from '../api/models/invitation-response-dto';
import { FeedbackService } from '../core/feedback.service';

@Component({
  selector: 'app-invitations',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <section class="page invitations">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Acceso privado</p>
          <h1>Invitaciones</h1>
          <p>Solo las personas que invites podrán crear una cuenta en Ruta.</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="create()">
        <label for="invite-email">Correo de tu amigo</label>
        <div>
          <input
            id="invite-email"
            type="email"
            autocomplete="off"
            formControlName="email"
            placeholder="amigo@correo.com"
          />
          <button class="button coral" [disabled]="busy()">
            {{ busy() ? 'Creando…' : 'Crear invitación' }}
          </button>
        </div>
        <small>El enlace caduca en 7 días y solo se puede utilizar una vez.</small>
      </form>

      @if (loading()) {
        <p role="status">Cargando invitaciones…</p>
      } @else {
        <div class="list">
          @for (invitation of invitations(); track invitation.id) {
            <article>
              <div>
                <strong>{{ invitation.email }}</strong>
                <p>
                  @if (invitation.consumed) {
                    Utilizada
                  } @else if (invitation.active) {
                    Activa hasta {{ invitation.expiresAt | date: 'd MMM yyyy, HH:mm' }}
                  } @else {
                    Caducada o revocada
                  }
                </p>
                @if (invitation.delivered === false) {
                  <small>El correo no estaba configurado; copia el enlace manualmente.</small>
                }
              </div>
              <div class="actions">
                @if (invitation.url) {
                  <button class="button secondary small" (click)="copy(invitation.url)">
                    Copiar enlace
                  </button>
                }
                @if (!invitation.consumed) {
                  <button class="button secondary small" (click)="renew(invitation)">
                    Renovar
                  </button>
                  @if (invitation.active) {
                    <button class="danger" (click)="revoke(invitation)">Revocar</button>
                  }
                }
              </div>
            </article>
          } @empty {
            <div class="empty">
              <h2>Aún no hay invitaciones</h2>
              <p>Crea la primera cuando quieras dar acceso a un amigo.</p>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .invitations > form {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      display: grid;
      gap: 0.55rem;
      margin-bottom: 2rem;
      padding: 1.2rem;
    }
    .invitations > form > div {
      display: grid;
      gap: 0.7rem;
      grid-template-columns: 1fr auto;
    }
    .invitations > form small,
    .list p,
    .list small {
      color: var(--muted);
    }
    .list {
      display: grid;
      gap: 0.7rem;
    }
    .list article {
      align-items: center;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      display: flex;
      justify-content: space-between;
      padding: 1rem 1.2rem;
    }
    .list p {
      font-size: 0.78rem;
      margin: 0.3rem 0;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .danger {
      background: transparent;
      border: 0;
      color: #a33a2c;
      font-weight: 700;
    }
    @media (max-width: 700px) {
      .invitations > form > div {
        grid-template-columns: 1fr;
      }
      .list article {
        align-items: flex-start;
        flex-direction: column;
        gap: 1rem;
      }
    }
  `,
})
export class InvitationsPage {
  private readonly api = inject(Api);
  private readonly feedback = inject(FeedbackService);
  private readonly fb = inject(FormBuilder);
  readonly invitations = signal<InvitationResponseDto[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.invitations.set(await this.api.invoke(invitationsControllerList));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const invitation = await this.api.invoke(invitationsControllerCreate, {
        body: { email: this.form.controls.email.value.trim() },
      });
      this.invitations.update((items) => [invitation, ...items]);
      this.form.reset();
      this.feedback.notify(
        invitation.delivered
          ? 'Invitación enviada.'
          : 'Invitación creada. Copia el enlace para enviarlo.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  async renew(invitation: InvitationResponseDto): Promise<void> {
    const renewed = await this.api.invoke(invitationsControllerRenew, {
      invitationId: invitation.id,
    });
    this.invitations.update((items) =>
      items.map((item) => (item.id === renewed.id ? renewed : item)),
    );
    this.feedback.notify('Invitación renovada.');
  }

  async revoke(invitation: InvitationResponseDto): Promise<void> {
    await this.api.invoke(invitationsControllerRevoke, {
      invitationId: invitation.id,
    });
    this.invitations.update((items) =>
      items.map((item) => (item.id === invitation.id ? { ...item, active: false } : item)),
    );
    this.feedback.notify('Invitación revocada.');
  }

  async copy(url: string): Promise<void> {
    await navigator.clipboard.writeText(url);
    this.feedback.notify('Enlace de invitación copiado.');
  }
}
