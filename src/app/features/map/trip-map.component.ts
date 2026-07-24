import {
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Api } from '../../api/api';
import { tripsControllerAttachPlace } from '../../api/fn/trips/trips-controller-attach-place';
import { tripsControllerDetachPlace } from '../../api/fn/trips/trips-controller-detach-place';
import { tripsControllerMap } from '../../api/fn/trips/trips-controller-map';
import { FeedbackService } from '../../core/feedback.service';
import {
  Activity,
  ItineraryDay,
  MapPoint,
  SavedPlace,
} from '../../core/models';
import { TripStore } from '../../core/trip-store.service';
import { TravelMapComponent } from './travel-map.component';

@Component({
  selector: 'app-trip-map',
  imports: [DatePipe, TravelMapComponent],
  template: `
    <section class="map-feature">
      <header class="section-intro">
        <div><p class="eyebrow">Todo en perspectiva</p><h2>Mapa del viaje</h2><p>Ordena visualmente tus paradas sin convertirlas en una ruta de navegación.</p></div>
        <button class="button secondary" type="button" (click)="load()" [disabled]="loading()">{{ loading() ? 'Actualizando…' : 'Actualizar' }}</button>
      </header>
      @if (error()) {
        <div class="empty" role="alert"><p>{{ error() }}</p><button class="button small" type="button" (click)="load()">Reintentar</button></div>
      } @else if (loading() && !loaded()) {
        <div class="map-skeleton" role="status"><span class="sr-only">Cargando mapa</span></div>
      } @else {
        <div class="day-filter" aria-label="Filtrar mapa por día">
          <button type="button" [class.active]="selectedDay()===''" (click)="selectedDay.set('')">Todo</button>
          @for (day of data().days; track day.id; let index = $index) {
            <button type="button" [class.active]="selectedDay()===day.id" (click)="selectedDay.set(day.id)">
              Día {{ index + 1 }} <span>{{ day.date | date:'d MMM' }}</span>
            </button>
          }
        </div>
        <div class="map-layout">
          <app-travel-map
            [points]="visiblePoints()"
            [line]="dayLine()"
            ariaLabel="Lugares y actividades del viaje"
            (pointSelected)="selectedPoint.set($event)"
          />
          <aside class="map-list" aria-label="Elementos visibles en el mapa">
            <p class="map-note">La línea indica el orden previsto de las actividades, no una ruta real.</p>
            @if (visiblePoints().length) {
              @for (point of visiblePoints(); track point.id) {
                <button type="button" [class.selected]="selectedPoint()===point.id" (click)="focus(point.id)">
                  <span class="symbol" [class.place]="point.marker==='place'">{{ point.marker === 'place' ? '◆' : '●' }}</span>
                  <span><strong>{{ point.label }}</strong><small>{{ point.subtitle }}</small></span>
                </button>
              }
            } @else {
              <div class="empty compact"><p>No hay elementos ubicados para este filtro.</p></div>
            }
          </aside>
        </div>
        @if (unlocatedActivities().length) {
          <section class="unlocated card">
            <div><p class="eyebrow">Pendiente</p><h3>Actividades sin ubicar</h3></div>
            <div>
              @for (item of unlocatedActivities(); track item.activity.id) {
                <button type="button" (click)="locateActivity.emit({day:item.day,activity:item.activity})">
                  <span>{{ item.activity.time }}</span><strong>{{ item.activity.title }}</strong><em>Ubicar</em>
                </button>
              }
            </div>
          </section>
        }
        <section class="linked card">
          <header><div><p class="eyebrow">Mi colección</p><h3>Lugares vinculados</h3></div></header>
          @if (data().places.length) {
            <div class="linked-items">
              @for (place of data().places; track place.id) {
                <div><span><strong>{{ place.name }}</strong><small>{{ place.city }}, {{ place.country }} @if(place.latitude==null){ · Sin ubicar}</small></span><button type="button" class="text-button" (click)="detach(place)">Desvincular</button></div>
              }
            </div>
          } @else { <p class="muted">Todavía no has vinculado ningún lugar guardado.</p> }
          @if (availablePlaces().length) {
            <label for="attach-place">Añadir un lugar guardado</label>
            <div class="attach">
              <select id="attach-place" [value]="placeToAttach()" (change)="placeToAttach.set($any($event.target).value)">
                <option value="">Selecciona un lugar</option>
                @for (place of availablePlaces(); track place.id) { <option [value]="place.id">{{ place.name }} · {{ place.city }}</option> }
              </select>
              <button class="button small" type="button" (click)="attach()" [disabled]="!placeToAttach() || mutating()">Vincular</button>
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .map-feature{display:grid;gap:1.2rem}.section-intro p:last-child{color:var(--muted);font-size:.82rem;margin:.3rem 0}.day-filter{display:flex;gap:.5rem;overflow:auto;padding-bottom:.2rem}.day-filter button{background:var(--paper);border:1px solid var(--line);border-radius:999px;color:var(--ink);padding:.55rem .8rem;white-space:nowrap}.day-filter button.active{background:var(--ink);border-color:var(--ink);color:white}.day-filter span{font-size:.68rem;opacity:.75}.map-layout{display:grid;gap:1rem;grid-template-columns:minmax(0,1.6fr) minmax(260px,.65fr);min-height:500px}.map-layout app-travel-map{min-height:500px}.map-list{background:var(--paper);border:1px solid var(--line);border-radius:1rem;max-height:500px;overflow:auto;padding:.7rem}.map-note{background:#f4eadc;border-radius:.55rem;color:#735b39;font-size:.7rem;line-height:1.45;padding:.65rem}.map-list>button{align-items:center;background:transparent;border:0;border-bottom:1px solid var(--line);display:flex;gap:.65rem;padding:.75rem;text-align:left;width:100%}.map-list>button.selected{background:#f6eee3}.map-list strong,.map-list small{display:block}.map-list small{color:var(--muted);font-size:.68rem;margin-top:.15rem}.symbol{color:var(--ink);font-size:.85rem}.symbol.place{color:var(--coral)}.unlocated,.linked{padding:1.2rem}.unlocated{display:grid;gap:1rem;grid-template-columns:220px 1fr}.unlocated h3,.linked h3{font-size:1.55rem;margin:0}.unlocated>div:last-child{display:grid;gap:.3rem}.unlocated button{background:transparent;border:0;border-bottom:1px solid var(--line);display:grid;gap:.6rem;grid-template-columns:45px 1fr auto;padding:.65rem;text-align:left}.unlocated button span{color:var(--muted);font-size:.72rem}.unlocated button em{color:var(--coral);font-size:.72rem;font-style:normal;font-weight:700}.linked-items{display:grid;margin:.6rem 0 1rem}.linked-items>div{align-items:center;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;padding:.65rem 0}.linked-items strong,.linked-items small{display:block}.linked-items small{color:var(--muted);font-size:.7rem;margin-top:.15rem}.linked>label{display:block;font-size:.76rem;font-weight:700;margin-top:1rem}.attach{display:flex;gap:.6rem;margin-top:.45rem}.attach select{background:white;border:1px solid var(--line);border-radius:.55rem;flex:1;padding:.65rem}.map-skeleton{animation:pulse 1.2s infinite alternate;background:#ded8ce;border-radius:1rem;min-height:500px}@keyframes pulse{to{opacity:.55}}@media(max-width:800px){.map-layout{grid-template-columns:1fr}.map-layout app-travel-map{min-height:380px}.map-list{max-height:300px}.unlocated{grid-template-columns:1fr}}@media(max-width:520px){.attach{align-items:stretch;flex-direction:column}.map-layout app-travel-map{min-height:330px}}
  `,
})
export class TripMapComponent {
  readonly tripId = input.required<string>();
  readonly locateActivity = output<{
    day: ItineraryDay;
    activity: Activity;
  }>();
  readonly store = inject(TripStore);
  private readonly api = inject(Api);
  private readonly feedback = inject(FeedbackService);
  readonly data = signal<{ days: ItineraryDay[]; places: SavedPlace[] }>({
    days: [],
    places: [],
  });
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly mutating = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedDay = signal('');
  readonly selectedPoint = signal('');
  readonly placeToAttach = signal('');
  @ViewChild(TravelMapComponent) private map?: TravelMapComponent;

  readonly linkedPlaceIds = computed(
    () => new Set(this.data().places.map((place) => place.id)),
  );
  readonly availablePlaces = computed(() =>
    this.store
      .places()
      .filter((place) => !this.linkedPlaceIds().has(place.id)),
  );
  readonly visiblePoints = computed<MapPoint[]>(() => {
    const dayId = this.selectedDay();
    const activities = this.data().days
      .filter((day) => !dayId || day.id === dayId)
      .flatMap((day) =>
        day.activities
          .filter(
            (activity) =>
              activity.latitude != null && activity.longitude != null,
          )
          .map((activity) => ({
            id: activity.id,
            label: activity.title,
            subtitle: `${activity.time} · ${activity.kind}`,
            latitude: activity.latitude as number,
            longitude: activity.longitude as number,
            kind: activity.kind,
            marker: 'activity' as const,
            dayId: day.id,
            position: activity.position,
          })),
      );
    const places = this.data().places
      .filter((place) => place.latitude != null && place.longitude != null)
      .map((place) => ({
        id: `place:${place.id}`,
        label: place.name,
        subtitle: `${place.city} · lugar guardado`,
        latitude: place.latitude as number,
        longitude: place.longitude as number,
        kind: place.category,
        marker: 'place' as const,
      }));
    return [...places, ...activities];
  });
  readonly dayLine = computed<Array<[number, number]>>(() => {
    if (!this.selectedDay()) return [];
    return this.visiblePoints()
      .filter((point) => point.marker === 'activity')
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((point) => [point.latitude, point.longitude]);
  });
  readonly unlocatedActivities = computed(() =>
    this.data().days
      .filter((day) => !this.selectedDay() || day.id === this.selectedDay())
      .flatMap((day) =>
        day.activities
          .filter(
            (activity) =>
              activity.latitude == null || activity.longitude == null,
          )
          .map((activity) => ({ day, activity })),
      ),
  );

  constructor() {
    effect(() => {
      this.tripId();
      void this.load();
    });
  }

  async load(): Promise<void> {
    const tripId = this.tripId();
    if (!tripId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await this.api.invoke(tripsControllerMap, { tripId });
      this.data.set({
        days: response.days as ItineraryDay[],
        places: response.places as SavedPlace[],
      });
      this.loaded.set(true);
    } catch {
      this.error.set('No se pudo cargar el mapa del viaje.');
    } finally {
      this.loading.set(false);
    }
  }

  focus(id: string): void {
    this.selectedPoint.set(id);
    this.map?.focusPoint(id);
  }

  async attach(): Promise<void> {
    const placeId = this.placeToAttach();
    if (!placeId) return;
    this.mutating.set(true);
    try {
      await this.api.invoke(tripsControllerAttachPlace, {
        tripId: this.tripId(),
        placeId,
      });
      this.placeToAttach.set('');
      await this.load();
      this.feedback.notify('Lugar vinculado al viaje.');
    } catch {
      this.feedback.notify('No se pudo vincular el lugar.', 'error');
    } finally {
      this.mutating.set(false);
    }
  }

  async detach(place: SavedPlace): Promise<void> {
    const accepted = await this.feedback.confirm({
      title: 'Desvincular lugar',
      message: `${place.name} dejará de aparecer como lugar guardado en este viaje. Las actividades no se modificarán.`,
      confirmLabel: 'Desvincular',
    });
    if (!accepted) return;
    this.mutating.set(true);
    try {
      await this.api.invoke(tripsControllerDetachPlace, {
        tripId: this.tripId(),
        placeId: place.id,
      });
      await this.load();
      this.feedback.notify('Lugar desvinculado.', 'info');
    } catch {
      this.feedback.notify('No se pudo desvincular el lugar.', 'error');
    } finally {
      this.mutating.set(false);
    }
  }
}
