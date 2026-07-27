import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Trip, TripStatus } from '../core/models';
import { TripStore } from '../core/trip-store.service';
import {
  MediaPickerComponent,
  MediaSelection,
} from '../features/media/media-picker.component';

@Component({
  selector: 'app-trips',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MediaPickerComponent,
  ],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Mi atlas personal</p>
          <h1>Mis viajes</h1>
          <p>Ideas que maduran, salidas que se acercan y recuerdos que ya forman parte de ti.</p>
        </div>
        <button class="button coral" (click)="openCreate()">+ Nuevo viaje</button>
      </div>
      <div class="filters">
        <input type="search" placeholder="Buscar destino" [value]="query()" (input)="query.set($any($event.target).value)" />
        <select [value]="status()" (change)="status.set($any($event.target).value)">
          <option value="todos">Todos los estados</option>
          <option value="planificando">Planificando</option>
          <option value="proximo">Próximos</option>
          <option value="completado">Completados</option>
        </select>
      </div>
      @if (filtered().length) {
        <div class="trips">
          @for (trip of filtered(); track trip.id) {
            <article class="trip">
              @if (trip.coverImage) {
                <img [src]="trip.coverImage" [alt]="trip.destination" />
              } @else {
                <div class="trip-placeholder" aria-hidden="true"><span>◇</span></div>
              }
              <div class="trip-copy">
                <span class="status" [class]="'status ' + trip.status">{{ trip.status }}</span>
                <h2>{{ trip.destination }}</h2>
                <p class="country">
                  {{ trip.country }} · {{ trip.startDate | date: 'd MMM yyyy' }} —
                  {{ trip.endDate | date: 'd MMM yyyy' }}
                </p>
                <p>{{ trip.description }}</p>
                <div class="trip-footer">
                  <strong>{{ trip.budget | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
                  <div>
                    <button class="icon-button" (click)="openEdit(trip)" [attr.aria-label]="'Editar ' + trip.destination">✎</button>
                    <a class="button small" [routerLink]="['/viajes', trip.id]">Abrir →</a>
                  </div>
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="empty"><h2>No encontramos ese viaje</h2><p>Prueba con otro filtro o crea una nueva escapada.</p></div>
      }
    </section>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <form class="modal" [formGroup]="form" (ngSubmit)="save()" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <header>
            <div><p class="eyebrow">{{ editing() ? 'Actualizar viaje' : 'Una nueva historia' }}</p><h2>{{ editing() ? 'Editar viaje' : 'Crear un viaje' }}</h2></div>
            <button class="icon-button" type="button" (click)="closeForm()" aria-label="Cerrar">×</button>
          </header>
          <div class="form-grid">
            <div class="field"><label for="destination">Destino</label><input id="destination" formControlName="destination" placeholder="Ej. Lisboa" /></div>
            <div class="field"><label for="country">País</label><input id="country" formControlName="country" placeholder="Ej. Portugal" /></div>
            <div class="field"><label for="start">Salida</label><input id="start" type="date" formControlName="startDate" /></div>
            <div class="field"><label for="end">Regreso</label><input id="end" type="date" formControlName="endDate" /></div>
            <div class="field"><label for="budget">Presupuesto (€)</label><input id="budget" type="number" min="0" formControlName="budget" /></div>
            <div class="field"><label for="status">Estado</label><select id="status" formControlName="status"><option value="planificando">Planificando</option><option value="proximo">Próximo</option><option value="completado">Completado</option></select></div>
            <div class="field full">
              <app-media-picker
                [initialUrl]="editing()?.coverImage || null"
                [initialAssetId]="editing()?.coverAssetId || null"
                [defaultQuery]="imageQuery()"
                (selectionChange)="imageSelection.set($event)"
              />
            </div>
            <div class="field full"><label for="desc">Una nota sobre el viaje</label><textarea id="desc" formControlName="description"></textarea></div>
          </div>
          @if (store.error()) { <p class="error" role="alert">{{ store.error() }}</p> }
          <footer><button class="button secondary" type="button" (click)="closeForm()">Cancelar</button><button class="button coral" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : editing() ? 'Guardar cambios' : 'Crear viaje' }}</button></footer>
        </form>
      </div>
    }
  `,
  styles: `
    .trips{display:grid;gap:1.25rem;grid-template-columns:repeat(2,minmax(0,1fr))}.trip{background:var(--paper);border:1px solid var(--line);display:grid;grid-template-columns:42% 1fr;min-height:300px}.trip>img,.trip-placeholder{height:100%;width:100%}.trip>img{object-fit:cover}.trip-placeholder{align-items:center;background:linear-gradient(135deg,#efe4d4,#dce8e4);color:var(--deep);display:flex;font-size:4rem;justify-content:center}.trip-copy{padding:1.45rem}.trip h2{font-size:2rem;margin:.75rem 0 .15rem}.trip p{color:var(--muted);font-size:.88rem;line-height:1.5}.trip .country{font-size:.75rem}.trip-footer{align-items:center;border-top:1px solid var(--line);display:flex;justify-content:space-between;margin-top:1.4rem;padding-top:1rem}.trip-footer strong{font-family:var(--font-display);font-size:1.35rem}.modal{max-width:820px}@media(max-width:850px){.trips{grid-template-columns:1fr}}@media(max-width:440px){.trip{grid-template-columns:1fr}.trip>img,.trip-placeholder{aspect-ratio:1.6;height:auto}}
  `,
})
export class TripsPage {
  readonly store = inject(TripStore);
  private readonly fb = inject(FormBuilder);
  readonly query = signal('');
  readonly status = signal('todos');
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Trip | null>(null);
  readonly imageSelection = signal<MediaSelection>({ assetId: null, url: null });
  readonly filtered = computed(() =>
    this.store
      .trips()
      .filter(
        (trip) =>
          (this.status() === 'todos' || trip.status === this.status()) &&
          `${trip.destination} ${trip.country}`
            .toLowerCase()
            .includes(this.query().toLowerCase()),
      ),
  );
  readonly form = this.fb.nonNullable.group({
    destination: ['', Validators.required],
    country: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    budget: [0, [Validators.required, Validators.min(0)]],
    status: ['planificando' as TripStatus],
    description: [''],
  });
  readonly imageQuery = computed(
    () => `${this.form.controls.destination.value} ${this.form.controls.country.value}`.trim(),
  );

  openCreate(): void {
    this.editing.set(null);
    this.imageSelection.set({ assetId: null, url: null });
    this.form.reset({
      destination: '',
      country: '',
      startDate: '',
      endDate: '',
      budget: 0,
      status: 'planificando',
      description: '',
    });
    this.showForm.set(true);
  }

  openEdit(trip: Trip): void {
    this.editing.set(trip);
    this.imageSelection.set({
      assetId: trip.coverAssetId ?? null,
      url: trip.coverImage ?? null,
    });
    this.form.reset(trip);
    this.showForm.set(true);
  }

  closeForm(): void {
    if (!this.saving()) this.showForm.set(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const current = this.editing();
    const value = {
      ...this.form.getRawValue(),
      coverImage: this.imageSelection().assetId
        ? null
        : this.imageSelection().url,
      coverAssetId: this.imageSelection().assetId,
    };
    this.saving.set(true);
    try {
      if (current) await this.store.updateTrip({ ...value, id: current.id });
      else await this.store.createTrip(value);
      this.showForm.set(false);
    } catch {
      // TripStore exposes the accessible error.
    } finally {
      this.saving.set(false);
    }
  }
}
