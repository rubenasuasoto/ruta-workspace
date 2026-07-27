import { Component, ViewChild, inject, signal } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedbackService } from '../../core/feedback.service';
import type { DemoActivity, DemoExpense, DemoPlace } from './demo-snapshot.model';
import {
  type DemoLocationOption,
  searchDemoLocations,
} from './demo-location-catalog';
import { DemoSandboxStore } from './demo-sandbox.store';

type EditorKind = 'trip' | 'activity' | 'expense' | 'place';

const PLACE_IMAGES: readonly { value: string; label: string }[] = [
  { value: '/assets/demo/photos/generic-food.webp', label: 'Gastronomía' },
  { value: '/assets/demo/photos/generic-culture.webp', label: 'Cultura' },
  { value: '/assets/demo/photos/generic-nature.webp', label: 'Naturaleza' },
  { value: '/assets/demo/photos/generic-transport.webp', label: 'Transporte' },
  { value: '/assets/demo/photos/generic-accommodation.webp', label: 'Alojamiento' },
  { value: '/assets/demo/photos/generic-experience.webp', label: 'Experiencia' },
];

const PLACE_IMAGE_BY_CATEGORY: Record<DemoPlace['category'], string> = {
  comida: '/assets/demo/photos/generic-food.webp',
  cultura: '/assets/demo/photos/generic-culture.webp',
  naturaleza: '/assets/demo/photos/generic-nature.webp',
  traslado: '/assets/demo/photos/generic-transport.webp',
  alojamiento: '/assets/demo/photos/generic-accommodation.webp',
  otro: '/assets/demo/photos/generic-experience.webp',
};

@Component({
  selector: 'app-demo-editor',
  imports: [ReactiveFormsModule],
  template: `
    @if (active(); as editor) {
      <div class="backdrop" (mousedown)="closeFromBackdrop($event)">
        <section
          #dialog
          class="dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'demo-' + editor + '-title'"
          tabindex="-1"
        >
          <header>
            <div>
              <p class="eyebrow">Sandbox local</p>
              <h2 [id]="'demo-' + editor + '-title'">{{ title() }}</h2>
            </div>
            <button type="button" class="close" (click)="close()" aria-label="Cerrar editor">×</button>
          </header>

          @if (editor === 'trip') {
            <form [formGroup]="tripForm" (ngSubmit)="saveTrip()">
              <div class="grid">
                <label>Destino<input formControlName="destination" /></label>
                <label>País<input formControlName="country" /></label>
                <label>Desde<input type="date" formControlName="startDate" /></label>
                <label>Hasta<input type="date" formControlName="endDate" /></label>
                <label>Presupuesto<input type="number" min="1" formControlName="budget" /></label>
                <label class="wide"
                  >Descripción<textarea rows="4" formControlName="description"></textarea>
                </label>
              </div>
              <footer>
                <button type="button" class="button secondary" (click)="close()">Cancelar</button>
                <button type="submit" class="button coral">Guardar cambios</button>
              </footer>
            </form>
          }

          @if (editor === 'activity') {
            <form [formGroup]="activityForm" (ngSubmit)="saveActivity()">
              <div class="grid">
                <label class="wide">Actividad<input formControlName="title" /></label>
                <label>Hora<input type="time" formControlName="time" /></label>
                <label
                  >Tipo
                  <select formControlName="kind">
                    <option value="comida">Comida</option>
                    <option value="cultura">Cultura</option>
                    <option value="naturaleza">Naturaleza</option>
                    <option value="traslado">Traslado</option>
                    <option value="alojamiento">Alojamiento</option>
                    <option value="otro">Experiencia</option>
                  </select>
                </label>
                <label>Coste estimado<input type="number" min="0" formControlName="cost" /></label>
                <label
                  >Después
                  <select formControlName="travelModeToNext">
                    <option value="walking">A pie</option>
                    <option value="cycling">En bici</option>
                    <option value="driving">En coche</option>
                  </select>
                </label>
                <label class="wide"
                  >Ubicación
                  <select formControlName="placeId">
                    @for (place of store.snapshot()?.places ?? []; track place.id) {
                      <option [value]="place.id">{{ place.name }}</option>
                    }
                  </select>
                  <small>La demo utiliza lugares ya ubicados para no consultar geocodificación.</small>
                </label>
                <label class="wide">Notas<textarea rows="3" formControlName="notes"></textarea></label>
              </div>
              <footer>
                <button type="button" class="button secondary" (click)="close()">Cancelar</button>
                <button type="submit" class="button coral">Guardar actividad</button>
              </footer>
            </form>
          }

          @if (editor === 'expense') {
            <form [formGroup]="expenseForm" (ngSubmit)="saveExpense()">
              <div class="grid">
                <label class="wide">Concepto<input formControlName="title" /></label>
                <label
                  >Categoría
                  <select formControlName="category">
                    <option value="accommodation">Alojamiento</option>
                    <option value="food">Comida</option>
                    <option value="transport">Transporte</option>
                    <option value="activities">Actividades</option>
                    <option value="other">Otros</option>
                  </select>
                </label>
                <label>Importe<input type="number" min="0" step="0.01" formControlName="amount" /></label>
              </div>
              <footer>
                <button type="button" class="button secondary" (click)="close()">Cancelar</button>
                <button type="submit" class="button coral">Guardar gasto</button>
              </footer>
            </form>
          }

          @if (editor === 'place') {
            <form [formGroup]="placeForm" (ngSubmit)="savePlace()">
              <div class="grid">
                <label class="wide">Nombre<input formControlName="name" /></label>
                <label
                  >Categoría
                  <select
                    formControlName="category"
                    (change)="onPlaceCategoryChange($any($event.target).value)"
                  >
                    <option value="comida">Comida</option>
                    <option value="cultura">Cultura</option>
                    <option value="naturaleza">Naturaleza</option>
                    <option value="traslado">Transporte</option>
                    <option value="alojamiento">Alojamiento</option>
                    <option value="otro">Experiencia</option>
                  </select>
                </label>
                <label class="check"><input type="checkbox" formControlName="visited" /> Ya visitado</label>

                <section class="location-picker wide" aria-labelledby="demo-location-title">
                  <div class="location-heading">
                    <div>
                      <h3 id="demo-location-title">Ubicación</h3>
                      <p>Búsqueda local de demostración · sin servicios externos.</p>
                    </div>
                    <span class="location-status">
                      {{ selectedLocation() ? 'Dirección seleccionada' : 'Catálogo local' }}
                    </span>
                  </div>

                  <label for="demo-location-query">Buscar una dirección</label>
                  <div class="search-row">
                    <input
                      #locationInput
                      id="demo-location-query"
                      type="search"
                      autocomplete="off"
                      placeholder="Ej. Cádiz, Mercado Central o Puerta del Sol"
                      [value]="locationQuery()"
                      (input)="setLocationQuery($event)"
                      (keydown.enter)="$event.preventDefault(); searchLocation()"
                      [attr.aria-controls]="locationSearched() ? 'demo-location-results' : null"
                    />
                    <button type="button" class="button secondary" (click)="searchLocation()">
                      Buscar
                    </button>
                  </div>

                  @if (locationSearched()) {
                    <div id="demo-location-results" class="location-results" aria-live="polite">
                      @if (locationResults().length) {
                        <p class="results-count">
                          {{ locationResults().length }}
                          {{ locationResults().length === 1 ? 'resultado' : 'resultados' }}
                        </p>
                        <ul>
                          @for (location of locationResults(); track location.id) {
                            <li>
                              <button
                                type="button"
                                (click)="selectLocation(location)"
                                [attr.aria-label]="'Seleccionar ' + location.address"
                              >
                                <span class="pin" aria-hidden="true">⌖</span>
                                <span>
                                  <strong>{{ location.label }}</strong>
                                  <small>{{ location.address }}</small>
                                </span>
                                <span class="choose">Elegir</span>
                              </button>
                            </li>
                          }
                        </ul>
                      } @else {
                        <p class="no-results">
                          No aparece en el catálogo local. Prueba con Valencia, Cádiz, Madrid,
                          Barcelona o Sevilla.
                        </p>
                      }
                    </div>
                  }

                  @if (selectedLocation(); as selected) {
                    <article class="selected-location">
                      <span class="selected-pin" aria-hidden="true">●</span>
                      <div>
                        <small>Ubicación seleccionada</small>
                        <strong>{{ selected.label }}</strong>
                        <span>{{ selected.address }}</span>
                      </div>
                      <button type="button" class="text-button" (click)="clearLocation()">
                        Cambiar
                      </button>
                    </article>
                  } @else {
                    <p class="location-required">Selecciona un resultado para guardar el lugar.</p>
                  }
                </section>

                <label class="wide">Notas<textarea rows="3" formControlName="note"></textarea></label>
                <fieldset class="wide image-picker">
                  <legend>Imagen de ambiente</legend>
                  <p>
                    No representa la dirección exacta: identifica visualmente el tipo de lugar.
                  </p>
                  <div class="image-options">
                    @for (image of placeImageOptions(); track image.value) {
                      <label>
                        <input type="radio" formControlName="image" [value]="image.value" />
                        <img [src]="image.value" [alt]="'Ambiente de ' + image.label" />
                        <span>{{ image.label }}</span>
                      </label>
                    }
                  </div>
                </fieldset>
              </div>
              <footer>
                <button type="button" class="button secondary" (click)="close()">Cancelar</button>
                <button
                  type="submit"
                  class="button coral"
                  [disabled]="placeForm.invalid || !selectedLocation()"
                >
                  Guardar lugar
                </button>
              </footer>
            </form>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .backdrop{align-items:center;background:#12242499;display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:110}
    .dialog{background:var(--paper);border-radius:1rem;box-shadow:0 24px 80px #0005;max-height:calc(100vh - 2rem);max-width:720px;overflow:auto;padding:1.5rem;width:100%}
    .dialog:focus{outline:3px solid #f4b7a9}.dialog header{align-items:flex-start;display:flex;justify-content:space-between}.dialog h2{font-size:2.4rem;margin:.2rem 0 1.2rem}
    .close{background:transparent;border:0;font-size:1.7rem}.grid{display:grid;gap:1rem;grid-template-columns:1fr 1fr}.grid label{display:grid;font-size:.75rem;font-weight:800;gap:.35rem}
    .grid .wide,.grid fieldset{grid-column:1/-1}.grid input,.grid select,.grid textarea{background:#fffdfa;border:1px solid var(--line);border-radius:.55rem;font:inherit;padding:.72rem}
    .grid small{color:var(--muted);font-weight:400}.check{align-items:center;display:flex!important;gap:.5rem!important}.check input{width:auto}
    fieldset,.location-picker{border:1px solid var(--line);border-radius:.8rem;padding:1rem}.location-heading{align-items:flex-start;display:flex;gap:1rem;justify-content:space-between}.location-heading h3{font-family:inherit;font-size:.9rem;margin:0}.location-heading p,.image-picker>p{color:var(--muted);font-size:.78rem;margin:.25rem 0 .85rem}.location-status{background:#e5f2eb;border-radius:99px;color:#225840;font-size:.68rem;font-weight:800;padding:.35rem .55rem;white-space:nowrap}.location-picker>label{font-size:.75rem;font-weight:800}.search-row{display:grid;gap:.55rem;grid-template-columns:1fr auto;margin-top:.35rem}.search-row input{min-width:0}.location-results{margin-top:.7rem}.results-count{color:var(--muted);font-size:.72rem;margin:.2rem 0}.location-results ul{display:grid;gap:.35rem;list-style:none;margin:0;padding:0}.location-results li button{align-items:center;background:#fffdfa;border:1px solid var(--line);border-radius:.65rem;cursor:pointer;display:grid;gap:.65rem;grid-template-columns:auto 1fr auto;padding:.7rem;text-align:left;width:100%}.location-results li button:hover,.location-results li button:focus-visible{border-color:var(--coral);box-shadow:0 0 0 2px #ef735520}.location-results strong,.location-results small{display:block}.location-results small{margin-top:.15rem}.pin{color:var(--coral);font-size:1.35rem}.choose,.text-button{color:var(--ocean);font-size:.72rem;font-weight:800}.selected-location{align-items:center;background:#eef5f2;border:1px solid #b9d6c8;border-radius:.7rem;display:grid;gap:.7rem;grid-template-columns:auto 1fr auto;margin-top:.8rem;padding:.8rem}.selected-location div{display:grid;gap:.1rem}.selected-location small{font-size:.65rem;text-transform:uppercase}.selected-location strong{font-size:.88rem}.selected-location span{font-size:.76rem}.selected-pin{color:#277a55}.text-button{background:transparent;border:0;cursor:pointer}.location-required,.no-results{background:#fff5e9;border-radius:.55rem;color:#704b28;font-size:.76rem;margin:.7rem 0 0;padding:.65rem}.image-picker legend{font-size:.75rem;font-weight:800}.image-options{display:grid;gap:.65rem;grid-template-columns:repeat(3,1fr)}
    .image-options label{cursor:pointer;position:relative}.image-options img{aspect-ratio:3/2;border:3px solid transparent;border-radius:.6rem;display:block;object-fit:cover;width:100%}.image-options input{height:1rem;left:.45rem;position:absolute;top:.45rem;width:1rem;z-index:1}.image-options input:checked+img{border-color:var(--coral);box-shadow:0 0 0 2px #ef735533}.image-options span{font-size:.72rem;margin-top:.3rem}
    footer{display:flex;gap:.7rem;justify-content:flex-end;margin-top:1.4rem}@media(max-width:620px){.grid{grid-template-columns:1fr}.grid .wide,.grid fieldset{grid-column:auto}.image-options{grid-template-columns:1fr 1fr}.dialog{border-radius:.8rem;padding:1rem}.location-heading{display:block}.location-status{display:inline-block;margin:.35rem 0}.search-row{grid-template-columns:1fr}.location-results li button{grid-template-columns:auto 1fr}.choose{grid-column:2;justify-self:start}.selected-location{grid-template-columns:auto 1fr}.selected-location .text-button{grid-column:2;justify-self:start;padding:0}}
  `,
})
export class DemoEditorComponent {
  readonly store = inject(DemoSandboxStore);
  readonly active = signal<EditorKind | null>(null);
  readonly locationQuery = signal('');
  readonly locationResults = signal<DemoLocationOption[]>([]);
  readonly locationSearched = signal(false);
  readonly selectedLocation = signal<DemoLocationOption | null>(null);

  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private activityDayId = '';
  private editingActivityId?: string;
  private editingExpenseId?: string;
  private editingPlaceId?: string;

  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('locationInput') private locationInput?: ElementRef<HTMLInputElement>;

  readonly tripForm = this.fb.nonNullable.group({
    destination: ['', Validators.required],
    country: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    budget: [0, [Validators.required, Validators.min(1)]],
    description: ['', Validators.required],
  });
  readonly activityForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    time: ['10:00', Validators.required],
    kind: ['cultura' as DemoActivity['kind'], Validators.required],
    cost: [0, Validators.min(0)],
    notes: [''],
    placeId: ['', Validators.required],
    travelModeToNext: ['walking' as DemoActivity['travelModeToNext'], Validators.required],
  });
  readonly expenseForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    category: ['food' as DemoExpense['category'], Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
  });
  readonly placeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    category: ['cultura' as DemoPlace['category'], Validators.required],
    note: [''],
    visited: [false],
    address: ['', Validators.required],
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    image: [PLACE_IMAGE_BY_CATEGORY.cultura, Validators.required],
  });

  title(): string {
    return {
      trip: 'Editar el viaje',
      activity: this.editingActivityId ? 'Editar actividad' : 'Añadir actividad',
      expense: this.editingExpenseId ? 'Editar gasto' : 'Añadir gasto',
      place: this.editingPlaceId ? 'Editar lugar' : 'Guardar un lugar',
    }[this.active() ?? 'trip'];
  }

  hasPendingChanges(): boolean {
    if (!this.active()) return false;
    return [this.tripForm, this.activityForm, this.expenseForm, this.placeForm].some(
      (form) => form.dirty,
    );
  }

  openTrip(): void {
    const trip = this.store.snapshot()?.trip;
    if (!trip) return;
    this.tripForm.reset(trip);
    this.open('trip');
  }

  openActivity(dayId: string, activity?: DemoActivity): void {
    const places = this.store.snapshot()?.places ?? [];
    const matchingPlace = activity
      ? places.find(
          (place) =>
            place.latitude === activity.latitude && place.longitude === activity.longitude,
        )
      : places[0];
    this.activityDayId = dayId;
    this.editingActivityId = activity?.id;
    this.activityForm.reset({
      title: activity?.title ?? '',
      time: activity?.time ?? '10:00',
      kind: activity?.kind ?? 'cultura',
      cost: activity?.cost ?? 0,
      notes: activity?.notes ?? '',
      placeId: matchingPlace?.id ?? '',
      travelModeToNext: activity?.travelModeToNext ?? 'walking',
    });
    this.open('activity');
  }

  openExpense(expense?: DemoExpense): void {
    this.editingExpenseId = expense?.id;
    this.expenseForm.reset({
      title: expense?.title ?? '',
      category: expense?.category ?? 'food',
      amount: expense?.amount ?? 0,
    });
    this.open('expense');
  }

  openPlace(place?: DemoPlace): void {
    this.editingPlaceId = place?.id;
    const selected = place
      ? {
          id: place.id,
          label: place.name,
          address: place.address,
          city: place.city,
          country: place.country,
          latitude: place.latitude,
          longitude: place.longitude,
        }
      : null;
    this.placeForm.reset({
      name: place?.name ?? '',
      city: place?.city ?? '',
      country: place?.country ?? '',
      category: place?.category ?? 'cultura',
      note: place?.note ?? '',
      visited: place?.visited ?? false,
      address: place?.address ?? '',
      latitude: place?.latitude ?? 0,
      longitude: place?.longitude ?? 0,
      image: place?.image ?? PLACE_IMAGE_BY_CATEGORY.cultura,
    });
    this.selectedLocation.set(selected);
    this.locationQuery.set(place?.address ?? '');
    this.locationResults.set([]);
    this.locationSearched.set(false);
    this.open('place');
  }

  setLocationQuery(event: Event): void {
    this.locationQuery.set((event.target as HTMLInputElement).value);
  }

  searchLocation(): void {
    const snapshot = this.store.snapshot();
    if (!snapshot) return;
    this.locationResults.set(searchDemoLocations(snapshot, this.locationQuery()));
    this.locationSearched.set(true);
  }

  selectLocation(location: DemoLocationOption): void {
    this.selectedLocation.set(location);
    this.locationQuery.set(location.address);
    this.locationResults.set([]);
    this.locationSearched.set(false);
    this.placeForm.patchValue({
      city: location.city,
      country: location.country,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    this.placeForm.markAsDirty();
  }

  clearLocation(): void {
    this.selectedLocation.set(null);
    this.locationQuery.set('');
    this.locationResults.set([]);
    this.locationSearched.set(false);
    this.placeForm.patchValue({
      city: '',
      country: '',
      address: '',
      latitude: 0,
      longitude: 0,
    });
    this.placeForm.markAsDirty();
    queueMicrotask(() => this.locationInput?.nativeElement.focus());
  }

  onPlaceCategoryChange(category: DemoPlace['category']): void {
    this.placeForm.controls.image.setValue(PLACE_IMAGE_BY_CATEGORY[category]);
    this.placeForm.controls.image.markAsDirty();
  }

  placeImageOptions(): readonly { value: string; label: string }[] {
    const current = this.placeForm.controls.image.value;
    return PLACE_IMAGES.some((image) => image.value === current)
      ? PLACE_IMAGES
      : [{ value: current, label: 'Imagen actual' }, ...PLACE_IMAGES];
  }

  async close(): Promise<void> {
    if (
      this.hasPendingChanges() &&
      !(await this.feedback.confirm({
        title: 'Descartar cambios',
        message: 'Los cambios de este formulario todavía no se han guardado.',
        confirmLabel: 'Descartar',
      }))
    )
      return;
    this.finish();
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) void this.close();
  }

  saveTrip(): void {
    if (this.tripForm.invalid) return this.tripForm.markAllAsTouched();
    this.store.updateTrip(this.tripForm.getRawValue());
    this.saved('Viaje actualizado.');
  }

  saveActivity(): void {
    if (this.activityForm.invalid) return this.activityForm.markAllAsTouched();
    const value = this.activityForm.getRawValue();
    const place = this.store.snapshot()?.places.find((item) => item.id === value.placeId);
    if (!place) return;
    this.store.saveActivity(this.activityDayId, {
      id: this.editingActivityId,
      title: value.title,
      time: value.time,
      kind: value.kind,
      cost: value.cost,
      notes: value.notes,
      travelModeToNext: value.travelModeToNext,
      locationName: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      completed: false,
    });
    this.saved(this.editingActivityId ? 'Actividad actualizada.' : 'Actividad añadida.');
  }

  saveExpense(): void {
    if (this.expenseForm.invalid) return this.expenseForm.markAllAsTouched();
    this.store.saveExpense({ id: this.editingExpenseId, ...this.expenseForm.getRawValue() });
    this.saved(this.editingExpenseId ? 'Gasto actualizado.' : 'Gasto añadido.');
  }

  savePlace(): void {
    if (this.placeForm.invalid || !this.selectedLocation()) {
      return this.placeForm.markAllAsTouched();
    }
    this.store.savePlace({ id: this.editingPlaceId, ...this.placeForm.getRawValue() });
    this.saved(this.editingPlaceId ? 'Lugar actualizado.' : 'Lugar guardado.');
  }

  private open(editor: EditorKind): void {
    this.active.set(editor);
    queueMicrotask(() => this.dialog?.nativeElement.focus());
  }

  private saved(message: string): void {
    this.feedback.notify(message);
    this.finish();
  }

  private finish(): void {
    this.active.set(null);
    this.editingActivityId = undefined;
    this.editingExpenseId = undefined;
    this.editingPlaceId = undefined;
    this.selectedLocation.set(null);
    this.locationQuery.set('');
    this.locationResults.set([]);
    this.locationSearched.set(false);
  }
}
