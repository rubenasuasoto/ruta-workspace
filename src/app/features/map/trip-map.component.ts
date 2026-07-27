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
import { routingControllerDayRoute } from '../../api/fn/routing/routing-controller-day-route';
import { tripsControllerAttachPlace } from '../../api/fn/trips/trips-controller-attach-place';
import { tripsControllerDetachPlace } from '../../api/fn/trips/trips-controller-detach-place';
import { tripsControllerMap } from '../../api/fn/trips/trips-controller-map';
import type { DayRouteResponseDto } from '../../api/models/day-route-response-dto';
import type { RouteLegResponseDto } from '../../api/models/route-leg-response-dto';
import { FeedbackService } from '../../core/feedback.service';
import type {
  Activity,
  ItineraryDay,
  MapLine,
  MapPoint,
  SavedPlace,
  TravelMode,
} from '../../core/models';
import { PublicConfigStore } from '../../core/public-config.store';
import { TripStore } from '../../core/trip-store.service';
import { TravelMapComponent } from './travel-map.component';

const modes: { value: TravelMode; label: string; icon: string }[] = [
  { value: 'walking', label: 'A pie', icon: '●' },
  { value: 'cycling', label: 'Bici', icon: '◆' },
  { value: 'driving', label: 'Coche', icon: '■' },
];

@Component({
  selector: 'app-trip-map',
  imports: [DatePipe, TravelMapComponent],
  template: `
    <section class="map-feature">
      <header class="section-intro">
        <div>
          <p class="eyebrow">Todo en perspectiva</p>
          <h2>Mapa del viaje</h2>
          <p>Compara el orden previsto con trayectos reales a pie, en bici o en coche.</p>
        </div>
        <button class="button secondary" type="button" (click)="load()" [disabled]="loading()">
          {{ loading() ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </header>

      @if (error()) {
        <div class="empty" role="alert">
          <p>{{ error() }}</p>
          <button class="button small" type="button" (click)="load()">Reintentar</button>
        </div>
      } @else if (loading() && !loaded()) {
        <div class="map-skeleton" role="status"><span class="sr-only">Cargando mapa</span></div>
      } @else {
        <div class="day-filter" aria-label="Filtrar mapa por día">
          <button type="button" [class.active]="selectedDay() === ''" (click)="selectedDay.set('')">
            Todo
          </button>
          @for (day of data().days; track day.id; let index = $index) {
            <button
              type="button"
              [class.active]="selectedDay() === day.id"
              (click)="selectedDay.set(day.id)"
            >
              Día {{ index + 1 }} <span>{{ day.date | date: 'd MMM' }}</span>
            </button>
          }
        </div>

        <div class="map-layout">
          <app-travel-map
            [points]="visiblePoints()"
            [lines]="mapLines()"
            ariaLabel="Lugares, actividades y rutas del viaje"
            (pointSelected)="selectedPoint.set($event)"
          />
          <aside class="map-list" aria-label="Resumen del mapa">
            @if (!selectedDay()) {
              <p class="map-note">
                Selecciona un día para calcular sus trayectos. La vista general no consume
                solicitudes.
              </p>
            } @else if (routeLoading()) {
              <p class="map-note" role="status" aria-live="polite">
                Calculando rutas reales… Mientras tanto se muestra el orden previsto.
              </p>
            } @else if (routeError()) {
              <div class="route-error" role="alert">
                <strong>Mostrando el orden previsto</strong>
                <p>{{ routeError() }}</p>
                <button class="text-button" type="button" (click)="retryRoute()">Reintentar</button>
              </div>
            } @else if (routeData(); as route) {
              <div class="route-summary" aria-live="polite">
                <span>{{ route.status === 'partial' ? 'Ruta parcial' : 'Ruta calculada' }}</span>
                <strong>{{ formatDistance(route.totalDistanceMeters) }}</strong>
                <strong>{{ formatDuration(route.totalDurationSeconds) }}</strong>
              </div>
              <p class="map-note">{{ route.disclaimer }}</p>
              <p class="route-attribution">{{ route.attribution }}</p>
            }

            <div class="legend" aria-label="Leyenda de rutas">
              @for (mode of modeOptions; track mode.value) {
                <span [class]="mode.value"><i></i>{{ mode.icon }} {{ mode.label }}</span>
              }
              <span class="fallback"><i></i>Orden previsto</span>
            </div>

            @if (visiblePoints().length) {
              @for (point of visiblePoints(); track point.id) {
                <button
                  type="button"
                  [class.selected]="selectedPoint() === point.id"
                  (click)="focus(point.id)"
                >
                  <span class="symbol" [class.place]="point.marker === 'place'">{{
                    point.marker === 'place' ? '◆' : '●'
                  }}</span>
                  <span
                    ><strong>{{ point.label }}</strong
                    ><small>{{ point.subtitle }}</small></span
                  >
                </button>
              }
            } @else {
              <div class="empty compact"><p>No hay elementos ubicados para este filtro.</p></div>
            }
          </aside>
        </div>

        @if (selectedDayData(); as day) {
          <section class="route-plan card" aria-labelledby="route-plan-title">
            <header>
              <div>
                <p class="eyebrow">Trayectos del día</p>
                <h3 id="route-plan-title">Cómo moverte entre planes</h3>
              </div>
              @if (routeData()?.status === 'partial') {
                <span class="partial">Ruta incompleta</span>
              }
            </header>
            @for (
              activity of day.activities;
              track activity.id;
              let index = $index;
              let last = $last
            ) {
              <div class="route-stop">
                <span class="stop-time">{{ activity.time }}</span>
                <strong>{{ activity.title }}</strong>
                @if (activity.latitude === null || activity.longitude === null) {
                  <button
                    class="text-button"
                    type="button"
                    (click)="locateActivity.emit({ day, activity })"
                  >
                    Ubicar
                  </button>
                }
              </div>
              @if (!last) {
                <div
                  class="leg-control"
                  [class.unavailable]="
                    activity.latitude === null || day.activities[index + 1].latitude === null
                  "
                >
                  <label [for]="'mode-' + activity.id"
                    >Hasta {{ day.activities[index + 1].title }}</label
                  >
                  <select
                    [id]="'mode-' + activity.id"
                    [value]="activity.travelModeToNext ?? 'walking'"
                    [disabled]="savingModeId() === activity.id"
                    (change)="changeMode(day, activity, $any($event.target).value)"
                  >
                    @for (mode of modeOptions; track mode.value) {
                      <option
                        [value]="mode.value"
                        [selected]="(activity.travelModeToNext ?? 'walking') === mode.value"
                      >{{ mode.icon }} {{ mode.label }}</option>
                    }
                  </select>
                  @if (legFor(activity.id, day.activities[index + 1].id); as leg) {
                    <span
                      >{{ formatDistance(leg.distanceMeters) }} ·
                      {{ formatDuration(leg.durationSeconds) }}</span
                    >
                    @if (leg.scheduleStatus === 'conflict') {
                      <em role="status">El trayecto supera el tiempo disponible.</em>
                    } @else if (leg.scheduleStatus === 'invalid-order') {
                      <em role="status">Revisa el orden de las horas.</em>
                    }
                  } @else if (
                    activity.latitude === null || day.activities[index + 1].latitude === null
                  ) {
                    <span>Ubica ambas actividades para calcularlo.</span>
                  }
                </div>
              }
            } @empty {
              <div class="empty compact">Añade actividades para empezar a construir la ruta.</div>
            }
          </section>
        }

        @if (unlocatedActivities().length) {
          <section class="unlocated card">
            <div>
              <p class="eyebrow">Pendiente</p>
              <h3>Actividades sin ubicar</h3>
            </div>
            <div>
              @for (item of unlocatedActivities(); track item.activity.id) {
                <button
                  type="button"
                  (click)="locateActivity.emit({ day: item.day, activity: item.activity })"
                >
                  <span>{{ item.activity.time }}</span
                  ><strong>{{ item.activity.title }}</strong
                  ><em>Ubicar</em>
                </button>
              }
            </div>
          </section>
        }

        <section class="linked card">
          <header>
            <div>
              <p class="eyebrow">Mi colección</p>
              <h3>Lugares vinculados</h3>
            </div>
          </header>
          @if (data().places.length) {
            <div class="linked-items">
              @for (place of data().places; track place.id) {
                <div>
                  <span
                    ><strong>{{ place.name }}</strong
                    ><small
                      >{{ place.city }}, {{ place.country }}
                      @if (place.latitude === null) {
                        · Sin ubicar
                      }
                    </small></span
                  >
                  <button type="button" class="text-button" (click)="detach(place)">
                    Desvincular
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="muted">Todavía no has vinculado ningún lugar guardado.</p>
          }
          @if (availablePlaces().length) {
            <label for="attach-place">Añadir un lugar guardado</label>
            <div class="attach">
              <select
                id="attach-place"
                [value]="placeToAttach()"
                (change)="placeToAttach.set($any($event.target).value)"
              >
                <option value="">Selecciona un lugar</option>
                @for (place of availablePlaces(); track place.id) {
                  <option [value]="place.id">{{ place.name }} · {{ place.city }}</option>
                }
              </select>
              <button
                class="button small"
                type="button"
                (click)="attach()"
                [disabled]="!placeToAttach() || mutating()"
              >
                Vincular
              </button>
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .map-feature {
      display: grid;
      gap: 1.2rem;
    }
    .section-intro p:last-child {
      color: var(--muted);
      font-size: 0.82rem;
      margin: 0.3rem 0;
    }
    .day-filter {
      display: flex;
      gap: 0.5rem;
      overflow: auto;
      padding-bottom: 0.2rem;
    }
    .day-filter button {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--ink);
      padding: 0.55rem 0.8rem;
      white-space: nowrap;
    }
    .day-filter button.active {
      background: var(--ink);
      border-color: var(--ink);
      color: white;
    }
    .day-filter span {
      font-size: 0.68rem;
      opacity: 0.75;
    }
    .map-layout {
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.65fr);
      min-height: 500px;
    }
    .map-layout app-travel-map {
      min-height: 500px;
    }
    .map-list {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      max-height: 500px;
      overflow: auto;
      padding: 0.7rem;
    }
    .map-note,
    .route-error {
      background: #f4eadc;
      border-radius: 0.55rem;
      color: #735b39;
      font-size: 0.7rem;
      line-height: 1.45;
      padding: 0.65rem;
    }
    .route-attribution {
      color: var(--muted);
      font-size: 0.68rem;
      margin: 0.45rem 0;
    }
    .route-error {
      background: #fff0ec;
      color: #8f3829;
    }
    .route-error p {
      margin: 0.2rem 0;
    }
    .route-summary {
      display: grid;
      gap: 0.2rem;
      grid-template-columns: 1fr auto auto;
      padding: 0.4rem;
    }
    .route-summary span {
      color: var(--coral);
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .route-summary strong {
      font-family: var(--font-display);
      font-size: 1.1rem;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0.6rem 0;
    }
    .legend span {
      align-items: center;
      color: var(--muted);
      display: flex;
      font-size: 0.62rem;
      gap: 0.25rem;
    }
    .legend i {
      background: #e56b51;
      height: 3px;
      width: 18px;
    }
    .legend .cycling i {
      background: repeating-linear-gradient(90deg, #2f6f91 0 6px, transparent 6px 9px);
    }
    .legend .driving i {
      background: #183a3c;
      height: 5px;
    }
    .legend .fallback i {
      background: repeating-linear-gradient(90deg, #776f65 0 4px, transparent 4px 7px);
    }
    .map-list > button {
      align-items: center;
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 0.65rem;
      padding: 0.75rem;
      text-align: left;
      width: 100%;
    }
    .map-list > button.selected {
      background: #f6eee3;
    }
    .map-list strong,
    .map-list small {
      display: block;
    }
    .map-list small {
      color: var(--muted);
      font-size: 0.68rem;
      margin-top: 0.15rem;
    }
    .symbol {
      color: var(--ink);
      font-size: 0.85rem;
    }
    .symbol.place {
      color: var(--coral);
    }
    .route-plan,
    .unlocated,
    .linked {
      padding: 1.2rem;
    }
    .route-plan > header,
    .linked > header {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }
    .route-plan h3,
    .unlocated h3,
    .linked h3 {
      font-size: 1.55rem;
      margin: 0;
    }
    .partial {
      background: #f4eadc;
      border-radius: 999px;
      color: #735b39;
      font-size: 0.68rem;
      padding: 0.35rem 0.55rem;
    }
    .route-stop {
      align-items: center;
      border-top: 1px solid var(--line);
      display: grid;
      gap: 0.65rem;
      grid-template-columns: 55px 1fr auto;
      margin-top: 0.8rem;
      padding-top: 0.75rem;
    }
    .stop-time {
      color: var(--muted);
      font-size: 0.75rem;
    }
    .leg-control {
      align-items: center;
      background: #f7f2ea;
      border-left: 3px solid var(--coral);
      display: grid;
      gap: 0.5rem;
      grid-template-columns: 1fr 130px auto;
      margin: 0.35rem 0 0.35rem 26px;
      padding: 0.6rem 0.75rem;
    }
    .leg-control label {
      font-size: 0.7rem;
      font-weight: 700;
    }
    .leg-control select {
      background: white;
      border: 1px solid var(--line);
      border-radius: 0.45rem;
      padding: 0.4rem;
    }
    .leg-control span {
      color: var(--muted);
      font-size: 0.68rem;
    }
    .leg-control em {
      color: #a13e2c;
      font-size: 0.68rem;
      font-style: normal;
      font-weight: 700;
      grid-column: 1/-1;
    }
    .leg-control.unavailable {
      border-left-color: #aaa;
    }
    .unlocated {
      display: grid;
      gap: 1rem;
      grid-template-columns: 220px 1fr;
    }
    .unlocated > div:last-child {
      display: grid;
      gap: 0.3rem;
    }
    .unlocated button {
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--line);
      display: grid;
      gap: 0.6rem;
      grid-template-columns: 45px 1fr auto;
      padding: 0.65rem;
      text-align: left;
    }
    .unlocated button span,
    .unlocated button em {
      font-size: 0.72rem;
    }
    .unlocated button span {
      color: var(--muted);
    }
    .unlocated button em {
      color: var(--coral);
      font-style: normal;
      font-weight: 700;
    }
    .linked-items {
      display: grid;
      margin: 0.6rem 0 1rem;
    }
    .linked-items > div {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      padding: 0.65rem 0;
    }
    .linked-items strong,
    .linked-items small {
      display: block;
    }
    .linked-items small {
      color: var(--muted);
      font-size: 0.7rem;
      margin-top: 0.15rem;
    }
    .linked > label {
      display: block;
      font-size: 0.76rem;
      font-weight: 700;
      margin-top: 1rem;
    }
    .attach {
      display: flex;
      gap: 0.6rem;
      margin-top: 0.45rem;
    }
    .attach select {
      background: white;
      border: 1px solid var(--line);
      border-radius: 0.55rem;
      flex: 1;
      padding: 0.65rem;
    }
    .map-skeleton {
      animation: pulse 1.2s infinite alternate;
      background: #ded8ce;
      border-radius: 1rem;
      min-height: 500px;
    }
    @keyframes pulse {
      to {
        opacity: 0.55;
      }
    }
    @media (max-width: 800px) {
      .map-layout {
        grid-template-columns: 1fr;
      }
      .map-layout app-travel-map {
        min-height: 380px;
      }
      .map-list {
        max-height: 350px;
      }
      .unlocated {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 560px) {
      .attach {
        align-items: stretch;
        flex-direction: column;
      }
      .map-layout app-travel-map {
        min-height: 330px;
      }
      .leg-control {
        grid-template-columns: 1fr auto;
        margin-left: 10px;
      }
      .leg-control span {
        grid-column: 1/-1;
      }
      .route-plan > header {
        align-items: start;
        gap: 0.5rem;
      }
    }
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
  private readonly publicConfig = inject(PublicConfigStore);
  readonly modeOptions = modes;
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
  readonly routeData = signal<DayRouteResponseDto | null>(null);
  readonly routeLoading = signal(false);
  readonly routeError = signal<string | null>(null);
  readonly savingModeId = signal('');
  @ViewChild(TravelMapComponent) private map?: TravelMapComponent;
  private routeRequest = 0;
  private readonly routeCache = new Map<string, DayRouteResponseDto>();

  readonly selectedDayData = computed(() =>
    this.data().days.find((day) => day.id === this.selectedDay()),
  );
  readonly routeFingerprint = computed(() => {
    const day = this.selectedDayData();
    if (!day) return '';
    return JSON.stringify(
      day.activities.map((activity) => [
        activity.id,
        activity.position,
        activity.time,
        activity.latitude,
        activity.longitude,
        activity.travelModeToNext ?? 'walking',
      ]),
    );
  });
  readonly linkedPlaceIds = computed(() => new Set(this.data().places.map((place) => place.id)));
  readonly availablePlaces = computed(() =>
    this.store.places().filter((place) => !this.linkedPlaceIds().has(place.id)),
  );
  readonly visiblePoints = computed<MapPoint[]>(() => {
    const dayId = this.selectedDay();
    const activities = this.data()
      .days.filter((day) => !dayId || day.id === dayId)
      .flatMap((day) =>
        day.activities
          .filter((activity) => activity.latitude != null && activity.longitude != null)
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
    const places = this.data()
      .places.filter((place) => place.latitude != null && place.longitude != null)
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
  readonly fallbackLine = computed<[number, number][]>(() => {
    if (!this.selectedDay()) return [];
    return this.visiblePoints()
      .filter((point) => point.marker === 'activity')
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((point) => [point.latitude, point.longitude]);
  });
  readonly mapLines = computed<MapLine[]>(() => {
    const route = this.routeData();
    if (!route)
      return this.fallbackLine().length > 1
        ? [
            {
              id: 'fallback',
              coordinates: this.fallbackLine(),
              mode: 'fallback',
            },
          ]
        : [];
    return route.legs.map((leg, index) => ({
      id: `${leg.fromActivityId}:${leg.toActivityId}:${index}`,
      mode: leg.mode,
      coordinates: leg.geometry.coordinates.map(
        ([longitude, latitude]) => [latitude, longitude] as [number, number],
      ),
    }));
  });
  readonly unlocatedActivities = computed(() =>
    this.data()
      .days.filter((day) => !this.selectedDay() || day.id === this.selectedDay())
      .flatMap((day) =>
        day.activities
          .filter((activity) => activity.latitude == null || activity.longitude == null)
          .map((activity) => ({ day, activity })),
      ),
  );

  constructor() {
    effect(() => {
      this.tripId();
      void this.load();
    });
    effect(() => {
      const day = this.selectedDayData();
      const fingerprint = this.routeFingerprint();
      if (!day) {
        this.routeRequest += 1;
        this.routeData.set(null);
        this.routeError.set(null);
        this.routeLoading.set(false);
        return;
      }
      void this.calculateRoute(day.id, fingerprint);
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

  async calculateRoute(dayId: string, fingerprint: string): Promise<void> {
    const key = `${dayId}:${fingerprint}`;
    const cached = this.routeCache.get(key);
    const request = ++this.routeRequest;
    this.routeError.set(null);
    if (cached) {
      this.routeData.set(cached);
      this.routeLoading.set(false);
      return;
    }
    if (!this.publicConfig.routingEnabled()) {
      this.routeData.set(null);
      this.routeLoading.set(false);
      this.routeError.set('El servicio de rutas todavía no está configurado.');
      return;
    }
    this.routeLoading.set(true);
    this.routeData.set(null);
    try {
      const route = await this.api.invoke(routingControllerDayRoute, {
        tripId: this.tripId(),
        dayId,
      });
      if (request !== this.routeRequest) return;
      this.routeCache.set(key, route);
      this.routeData.set(route);
    } catch (error) {
      if (request !== this.routeRequest) return;
      this.routeError.set(this.apiMessage(error));
    } finally {
      if (request === this.routeRequest) this.routeLoading.set(false);
    }
  }

  retryRoute(): void {
    const day = this.selectedDayData();
    if (!day) return;
    this.routeCache.delete(`${day.id}:${this.routeFingerprint()}`);
    void this.calculateRoute(day.id, this.routeFingerprint());
  }

  async changeMode(day: ItineraryDay, activity: Activity, mode: TravelMode): Promise<void> {
    if (!['walking', 'cycling', 'driving'].includes(mode)) return;
    if ((activity.travelModeToNext ?? 'walking') === mode) return;
    this.savingModeId.set(activity.id);
    try {
      await this.store.updateActivity(day.id, {
        ...activity,
        travelModeToNext: mode,
      });
      this.data.update((current) => ({
        ...current,
        days: current.days.map((item) =>
          item.id === day.id
            ? {
                ...item,
                activities: item.activities.map((entry) =>
                  entry.id === activity.id ? { ...entry, travelModeToNext: mode } : entry,
                ),
              }
            : item,
        ),
      }));
      this.feedback.notify('Medio de transporte actualizado.');
    } catch {
      this.feedback.notify('No se pudo actualizar el trayecto.', 'error');
    } finally {
      this.savingModeId.set('');
    }
  }

  legFor(fromActivityId: string, toActivityId: string): RouteLegResponseDto | undefined {
    return this.routeData()?.legs.find(
      (leg) => leg.fromActivityId === fromActivityId && leg.toActivityId === toActivityId,
    );
  }

  focus(id: string): void {
    this.selectedPoint.set(id);
    this.map?.focusPoint(id);
  }

  formatDistance(meters: number): string {
    return meters < 1000
      ? `${Math.round(meters)} m`
      : `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours ? `${hours} h${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`;
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

  private apiMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const message = (error as { error?: { message?: string | string[] } }).error?.message;
      if (Array.isArray(message)) return message.join('. ');
      if (message) return message;
    }
    return 'No se pudo calcular la ruta real. Puedes reintentarlo.';
  }
}
