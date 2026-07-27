import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TripStore } from '../core/trip-store.service';
import { FeedbackService } from '../core/feedback.service';
import { SharingApi, TripShare } from '../features/sharing/sharing-api.service';

@Component({
  selector: 'app-share-builder',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <section class="page share-page">
      <a [routerLink]="['/viajes', tripId]">← Volver al viaje</a>
      <div class="page-heading">
        <div>
          <p class="eyebrow">Solo entre cuentas invitadas</p>
          <h1>Compartir viaje</h1>
          <p>
            Elige quién podrá verlo y qué contenido se mostrará. Nunca incluimos gastos,
            presupuesto, notas privadas ni estados completados.
          </p>
        </div>
      </div>
      <div class="builder">
        <form (ngSubmit)="create()">
          <h2>Contenido visible</h2>
          <label class="recipient">
            Correos destinatarios
            <textarea
              [(ngModel)]="recipientEmails"
              name="recipientEmails"
              rows="3"
              placeholder="amigo@correo.com&#10;otra@correo.com"
              required
            ></textarea>
            <small>Una dirección por línea. Cada persona debe tener ya una cuenta invitada.</small>
          </label>
          <label
            ><input type="checkbox" [(ngModel)]="showSummary" name="summary" /> Resumen y
            descripción</label
          >
          <label
            ><input type="checkbox" [(ngModel)]="showDates" name="dates" /> Fechas del viaje</label
          >
          <label
            ><input type="checkbox" [(ngModel)]="showMap" name="map" /> Direcciones y mapa</label
          >
          <fieldset>
            <legend>Días</legend>
            @for (day of days(); track day.id) {
              <label
                ><input
                  type="checkbox"
                  [checked]="dayIds().has(day.id)"
                  (change)="toggleDay(day.id)"
                />
                {{ day.date | date: 'EEEE d MMMM' }}</label
              >
            }
          </fieldset>
          <fieldset>
            <legend>Lugares</legend>
            @for (place of places(); track place.id) {
              <label
                ><input
                  type="checkbox"
                  [checked]="placeIds().has(place.id)"
                  (change)="togglePlace(place.id)"
                />
                {{ place.name }} · {{ place.city }}</label
              >
            }
          </fieldset>
          <div class="warning">
            <strong>Revisa antes de compartir.</strong>
            <p>
              Las fechas futuras, domicilios y fotografías con personas pueden revelar información
              sensible. Las imágenes heredadas no se mostrarán.
            </p>
          </div>
          <button class="button coral" [disabled]="busy() || !parsedRecipients().length">
            {{ busy() ? 'Creando…' : 'Compartir durante 30 días' }}
          </button>
        </form>
        <aside>
          <h2>Previsualización</h2>
          @if (showSummary && trip()) {
            <h3>{{ trip()!.destination }}</h3>
            <p>{{ trip()!.description }}</p>
          }
          @if (showDates && trip()) {
            <p>{{ trip()!.startDate }} — {{ trip()!.endDate }}</p>
          }
          <p>{{ dayIds().size }} días · {{ placeIds().size }} lugares</p>
          @if (showMap) {
            <span class="badge">Mapa y direcciones visibles</span>
          }
        </aside>
      </div>
      <section class="links">
        <h2>Comparticiones creadas</h2>
        @for (share of shares(); track share.id) {
          <article>
            <div>
              <strong>{{ share.active ? 'Activa' : 'Inactiva' }}</strong>
              <p>Caduca {{ share.expiresAt | date: 'd MMM yyyy, HH:mm' }}</p>
              <small>{{ recipientLabel(share) }}</small>
            </div>
            <div>
              <a class="button secondary small" [routerLink]="['/compartidos', share.id]">Abrir</a>
              <button class="button secondary small" (click)="renew(share)">Renovar</button>
              @if (share.active) {
                <button class="text-danger" (click)="revoke(share)">Revocar</button>
              }
            </div>
          </article>
        } @empty {
          <div class="empty compact"><p>Todavía no has compartido este viaje.</p></div>
        }
      </section>
    </section>
  `,
  styles: `
    .share-page > a {
      color: var(--deep);
    }
    .builder {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: 1fr 0.7fr;
    }
    .builder form,
    .builder aside,
    .links article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      padding: 1.25rem;
    }
    .builder form {
      display: grid;
      gap: 0.8rem;
    }
    .builder label {
      align-items: flex-start;
      display: flex;
      gap: 0.55rem;
    }
    .builder label.recipient {
      display: grid;
    }
    .recipient small,
    .links small {
      color: var(--muted);
      font-size: 0.72rem;
    }
    .builder fieldset {
      border: 1px solid var(--line);
      display: grid;
      gap: 0.5rem;
      max-height: 220px;
      overflow: auto;
      padding: 1rem;
    }
    .builder aside {
      align-self: start;
      position: sticky;
      top: 90px;
    }
    .warning {
      background: #fff4df;
      border-left: 3px solid #c9892c;
      padding: 0.8rem;
    }
    .warning p {
      color: var(--muted);
      font-size: 0.78rem;
    }
    .badge {
      background: var(--sand);
      border-radius: 999px;
      font-size: 0.72rem;
      padding: 0.4rem 0.7rem;
    }
    .links {
      margin-top: 2rem;
    }
    .links article {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin: 0.7rem 0;
    }
    .links article p {
      color: var(--muted);
      font-size: 0.75rem;
      margin: 0.25rem 0;
    }
    .links article > div:last-child {
      display: flex;
      gap: 0.5rem;
    }
    .text-danger {
      background: transparent;
      border: 0;
      color: #a33a2c;
    }
    @media (max-width: 760px) {
      .builder {
        grid-template-columns: 1fr;
      }
      .builder aside {
        position: static;
      }
      .links article {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.8rem;
      }
    }
  `,
})
export class ShareBuilderPage {
  readonly store = inject(TripStore);
  private readonly sharing = inject(SharingApi);
  private readonly feedback = inject(FeedbackService);
  readonly tripId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  readonly trip = computed(() => this.store.trips().find((item) => item.id === this.tripId));
  readonly days = computed(() => this.store.days().filter((item) => item.tripId === this.tripId));
  readonly places = this.store.places;
  readonly dayIds = signal(new Set<string>());
  readonly placeIds = signal(new Set<string>());
  readonly shares = signal<TripShare[]>([]);
  readonly busy = signal(false);
  showSummary = true;
  showDates = false;
  showMap = false;
  recipientEmails = '';

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    await this.store.load();
    this.shares.set(await this.sharing.list(this.tripId));
  }

  toggleDay(id: string): void {
    this.dayIds.update((current) => this.toggle(current, id));
  }

  togglePlace(id: string): void {
    this.placeIds.update((current) => this.toggle(current, id));
  }

  async create(): Promise<void> {
    this.busy.set(true);
    try {
      const share = await this.sharing.create(this.tripId, {
        showSummary: this.showSummary,
        showDates: this.showDates,
        showMap: this.showMap,
        dayIds: [...this.dayIds()],
        placeIds: [...this.placeIds()],
        recipientEmails: this.parsedRecipients(),
      });
      this.shares.update((items) => [share, ...items]);
      this.feedback.notify('Viaje compartido durante 30 días.');
    } finally {
      this.busy.set(false);
    }
  }

  async renew(share: TripShare): Promise<void> {
    const renewed = await this.sharing.renew(this.tripId, share.id);
    this.shares.update((items) => items.map((item) => (item.id === share.id ? renewed : item)));
    this.feedback.notify('Compartición renovada.');
  }

  async revoke(share: TripShare): Promise<void> {
    await this.sharing.revoke(this.tripId, share.id);
    this.shares.update((items) =>
      items.map((item) =>
        item.id === share.id
          ? { ...item, active: false, revokedAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  parsedRecipients(): string[] {
    return [
      ...new Set(
        this.recipientEmails
          .split(/[\n,;]+/)
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  recipientLabel(share: TripShare): string {
    return share.recipients.map((recipient) => recipient.name || recipient.email).join(', ');
  }

  private toggle(current: Set<string>, id: string): Set<string> {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }
}
