import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivityKind, MapPoint, SavedPlace } from '../core/models';
import { FeedbackService } from '../core/feedback.service';
import { TripStore } from '../core/trip-store.service';
import {
  LocationPickerComponent,
  LocationSelection,
} from '../features/map/location-picker.component';
import { TravelMapComponent } from '../features/map/travel-map.component';
import {
  MediaPickerComponent,
  MediaSelection,
} from '../features/media/media-picker.component';

@Component({
  selector: 'app-places',
  imports: [
    ReactiveFormsModule,
    LocationPickerComponent,
    TravelMapComponent,
    MediaPickerComponent,
  ],
  template: `
    <section class="page">
      <div class="page-heading">
        <div><p class="eyebrow">Pequeñas semillas</p><h1>Lugares guardados</h1><p>Una colección de direcciones que todavía no has vivido, pero ya imaginas.</p></div>
        <button class="button coral" (click)="openCreate()">+ Guardar lugar</button>
      </div>
      <div class="toolbar">
        <div class="filters">
          <input type="search" placeholder="Buscar por lugar o ciudad" [value]="query()" (input)="query.set($any($event.target).value)">
          <select [value]="category()" (change)="category.set($any($event.target).value)"><option value="todas">Todas las categorías</option><option value="cultura">Cultura</option><option value="comida">Comida</option><option value="naturaleza">Naturaleza</option><option value="alojamiento">Alojamiento</option><option value="otro">Otro</option></select>
          <select [value]="visited()" (change)="visited.set($any($event.target).value)"><option value="todos">Por visitar y visitados</option><option value="pendiente">Por visitar</option><option value="visitado">Ya visitados</option></select>
        </div>
        <div class="view-switch" aria-label="Vista de lugares">
          <button type="button" [class.active]="viewMode()==='lista'" (click)="viewMode.set('lista')" [attr.aria-pressed]="viewMode()==='lista'">Lista</button>
          <button type="button" [class.active]="viewMode()==='mapa'" (click)="viewMode.set('mapa')" [attr.aria-pressed]="viewMode()==='mapa'">Mapa</button>
        </div>
      </div>
      @if (filtered().length) {
        @if (viewMode()==='lista') {
          <div class="places">
            @for (place of filtered(); track place.id) {
              <article class="place" [class.visited]="place.visited">
                @if(place.image){<img [src]="place.image" [alt]="place.name">}
                @else{<div class="place-placeholder" aria-hidden="true"><span>◇</span></div>}
                <div>
                  <span class="place-category">{{place.category}}</span>
                  <h2>{{place.name}}</h2><p>{{place.city}}, {{place.country}}</p>
                  @if(place.address){<p class="address">⌖ {{place.address}}</p>}
                  <blockquote>{{place.note || 'Sin notas todavía.'}}</blockquote>
                  <div class="place-actions">
                    <button class="visit" (click)="toggleVisited(place)"><span>{{place.visited?'✓':''}}</span>{{place.visited?'Visitado':'Marcar como visitado'}}</button>
                    <span><button class="icon-button" (click)="openEdit(place)" [attr.aria-label]="'Editar '+place.name">✎</button><button class="icon-button danger" (click)="remove(place)" [attr.aria-label]="'Eliminar '+place.name">×</button></span>
                  </div>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="map-view">
            <app-travel-map #placesMap [points]="mapPoints()" ariaLabel="Mapa de lugares guardados" (pointSelected)="focusPlace($event)" />
            <aside>
              @if(mapPoints().length){
                @for(point of mapPoints();track point.id){<button type="button" (click)="focusPlace(point.id)"><strong>{{point.label}}</strong><small>{{point.subtitle}}</small></button>}
              } @else {<div class="empty compact"><p>Ninguno de estos lugares tiene ubicación. Edítalos para añadirla.</p></div>}
              @if(unlocatedCount()){<p class="unlocated">{{unlocatedCount()}} {{unlocatedCount()===1?'lugar pendiente':'lugares pendientes'}} de ubicar.</p>}
            </aside>
          </div>
        }
      } @else {
        <div class="empty"><h2>Ningún lugar por aquí</h2><p>Prueba otro filtro o guarda una nueva dirección.</p></div>
      }
    </section>
    @if(showForm()){
      <div class="modal-backdrop" (click)="closeForm()">
        <form class="modal" [formGroup]="form" (ngSubmit)="save()" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="place-form-title">
          <header><div><p class="eyebrow">Para otro día</p><h2 id="place-form-title">{{editing()?'Editar lugar':'Guardar un lugar'}}</h2></div><button class="icon-button" type="button" (click)="closeForm()" aria-label="Cerrar">×</button></header>
          <div class="form-grid">
            <div class="field"><label for="place-name">Nombre</label><input id="place-name" formControlName="name" placeholder="Ej. Casa Milà">@if(form.controls.name.touched&&form.controls.name.invalid){<span class="error">Indica un nombre.</span>}</div>
            <div class="field"><label for="place-city">Ciudad</label><input id="place-city" formControlName="city" placeholder="Ej. Barcelona"></div>
            <div class="field"><label for="place-country">País</label><input id="place-country" formControlName="country" placeholder="Ej. España"></div>
            <div class="field"><label for="place-category">Categoría</label><select id="place-category" formControlName="category"><option value="cultura">Cultura</option><option value="comida">Comida</option><option value="naturaleza">Naturaleza</option><option value="alojamiento">Alojamiento</option><option value="traslado">Traslado</option><option value="otro">Otro</option></select></div>
            <div class="field full">
              <app-media-picker
                [initialUrl]="editing()?.image || null"
                [initialAssetId]="editing()?.imageAssetId || null"
                [defaultQuery]="imageQuery()"
                (selectionChange)="imageSelection.set($event)"
              />
            </div>
            <div class="field full"><label for="place-note">Nota</label><textarea id="place-note" formControlName="note" placeholder="¿Por qué quieres ir?"></textarea></div>
            <app-location-picker [value]="location()" (valueChange)="location.set($event)" />
          </div>
          @if(store.error()){<p class="error" role="alert">{{store.error()}}</p>}
          <footer><button class="button secondary" type="button" (click)="closeForm()">Cancelar</button><button class="button coral" [disabled]="saving()">{{saving()?'Guardando…':editing()?'Guardar cambios':'Guardar lugar'}}</button></footer>
        </form>
      </div>
    }
  `,
  styles: `
    .toolbar{align-items:flex-start;display:flex;gap:1rem;justify-content:space-between}.view-switch{background:var(--paper);border:1px solid var(--line);border-radius:999px;display:flex;padding:.2rem}.view-switch button{background:transparent;border:0;border-radius:999px;color:var(--muted);padding:.45rem .7rem}.view-switch button.active{background:var(--ink);color:white}.places{display:grid;gap:1.25rem;grid-template-columns:repeat(3,1fr)}.place{background:var(--paper);border:1px solid var(--line);overflow:hidden}.place>img,.place-placeholder{aspect-ratio:1.15;display:block;width:100%}.place>img{filter:saturate(.9);object-fit:cover}.place-placeholder{align-items:center;background:linear-gradient(135deg,#efe4d4,#dce8e4);color:var(--deep);display:flex;font-size:3rem;justify-content:center}.place>div:not(.place-placeholder){padding:1.2rem}.place-category{color:var(--coral);font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.place h2{font-size:1.75rem;margin:.55rem 0 .1rem}.place p{color:var(--muted);font-size:.8rem;margin:0}.place .address{font-size:.7rem;margin-top:.45rem}.place blockquote{border-left:2px solid var(--sand);color:var(--muted);font-family:var(--font-display);font-size:.95rem;font-style:italic;margin:1rem 0;padding-left:.7rem}.place-actions{align-items:center;display:flex;justify-content:space-between}.visit{background:transparent;border:0;color:var(--ink);font-size:.76rem;font-weight:700;padding:0}.visit span{border:1px solid var(--ink);border-radius:50%;display:inline-block;height:15px;line-height:13px;margin-right:.35rem;text-align:center;width:15px}.visited{opacity:.72}.visited img{filter:grayscale(.55)}.visited .visit span{background:var(--ink);color:white}.icon-button.danger{color:#a33a2c}.map-view{display:grid;gap:1rem;grid-template-columns:minmax(0,1.7fr) minmax(240px,.6fr);min-height:560px}.map-view app-travel-map{min-height:560px}.map-view aside{background:var(--paper);border:1px solid var(--line);border-radius:1rem;max-height:560px;overflow:auto;padding:.7rem}.map-view aside>button{background:transparent;border:0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;padding:.75rem;text-align:left;width:100%}.map-view small{color:var(--muted);margin-top:.2rem}.unlocated{color:var(--muted);font-size:.72rem;padding:.7rem}.modal{max-width:760px}@media(max-width:850px){.places{grid-template-columns:repeat(2,1fr)}.map-view{grid-template-columns:1fr}.map-view app-travel-map{min-height:400px}.map-view aside{max-height:260px}}@media(max-width:600px){.toolbar{align-items:stretch;flex-direction:column}.view-switch{align-self:flex-start}.places{grid-template-columns:1fr}}
  `,
})
export class PlacesPage {
  readonly store = inject(TripStore);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  @ViewChild('placesMap') private map?: TravelMapComponent;
  readonly query = signal('');
  readonly category = signal('todas');
  readonly visited = signal('todos');
  readonly viewMode = signal<'lista' | 'mapa'>('lista');
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<SavedPlace | null>(null);
  readonly location = signal<LocationSelection | null>(null);
  readonly imageSelection = signal<MediaSelection>({
    assetId: null,
    url: null,
  });
  readonly imageQuery = computed(
    () =>
      `${this.form.controls.name.value} ${this.form.controls.city.value} ${this.form.controls.country.value}`.trim(),
  );
  readonly filtered = computed(() =>
    this.store.places().filter(
      (place) =>
        (this.category() === 'todas' || place.category === this.category()) &&
        (this.visited() === 'todos' ||
          (this.visited() === 'visitado' && place.visited) ||
          (this.visited() === 'pendiente' && !place.visited)) &&
        `${place.name} ${place.city} ${place.country}`
          .toLowerCase()
          .includes(this.query().toLowerCase()),
    ),
  );
  readonly mapPoints = computed<MapPoint[]>(() =>
    this.filtered()
      .filter((place) => place.latitude != null && place.longitude != null)
      .map((place) => ({
        id: place.id,
        label: place.name,
        subtitle: `${place.city}, ${place.country}`,
        latitude: place.latitude as number,
        longitude: place.longitude as number,
        kind: place.category,
        marker: 'place',
      })),
  );
  readonly unlocatedCount = computed(
    () =>
      this.filtered().length -
      this.mapPoints().length,
  );
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    category: ['cultura' as ActivityKind],
    note: [''],
  });

  openCreate(): void {
    this.editing.set(null);
    this.location.set(null);
    this.imageSelection.set({ assetId: null, url: null });
    this.form.reset({
      name: '',
      city: '',
      country: '',
      category: 'cultura',
      note: '',
    });
    this.showForm.set(true);
  }

  openEdit(place: SavedPlace): void {
    this.editing.set(place);
    this.imageSelection.set({
      assetId: place.imageAssetId ?? null,
      url: place.image ?? null,
    });
    this.form.reset(place);
    this.location.set(
      place.latitude != null && place.longitude != null
        ? {
            address: place.address ?? place.name,
            latitude: place.latitude,
            longitude: place.longitude,
          }
        : null,
    );
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
    const location = this.location();
    const value = {
      ...this.form.getRawValue(),
      imageAssetId: this.imageSelection().assetId,
      visited: current?.visited ?? false,
      address: location?.address ?? null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    };
    this.saving.set(true);
    try {
      if (current)
        await this.store.updatePlace({ ...value, id: current.id });
      else await this.store.addPlace(value);
      this.showForm.set(false);
      this.feedback.notify(
        current ? 'Lugar actualizado.' : 'Lugar guardado.',
      );
    } catch {
      this.feedback.notify('No se pudo guardar el lugar.', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleVisited(place: SavedPlace): Promise<void> {
    try {
      await this.store.togglePlace(place.id);
      this.feedback.notify(
        place.visited ? 'Marcado como pendiente.' : 'Marcado como visitado.',
        'info',
      );
    } catch {}
  }

  async remove(place: SavedPlace): Promise<void> {
    const accepted = await this.feedback.confirm({
      title: 'Eliminar lugar',
      message: `${place.name} se eliminará de tu colección y de los viajes vinculados. Las actividades conservarán su ubicación.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    try {
      await this.store.removePlace(place.id);
      this.feedback.notify('Lugar eliminado.', 'info');
    } catch {
      this.feedback.notify('No se pudo eliminar el lugar.', 'error');
    }
  }

  focusPlace(id: string): void {
    this.map?.focusPoint(id);
  }
}
