import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TravelMapComponent } from '../map/travel-map.component';
import { DemoCaseStudyComponent } from './demo-case-study.component';
import {
  demoMapLines,
  demoMapPoints,
  type DemoActivity,
  type DemoSnapshot,
} from './demo-snapshot.model';

export type DemoTab = 'overview' | 'itinerary' | 'budget' | 'map' | 'places' | 'project';

const tabs: readonly { id: DemoTab; label: string }[] = [
  { id: 'overview', label: 'Resumen' },
  { id: 'itinerary', label: 'Itinerario' },
  { id: 'budget', label: 'Presupuesto' },
  { id: 'map', label: 'Mapa' },
  { id: 'places', label: 'Lugares' },
  { id: 'project', label: 'El proyecto' },
];

@Component({
  selector: 'app-demo-workspace',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, TravelMapComponent, DemoCaseStudyComponent],
  template: `
    <div class="demo-banner" role="status">
      Demo de portafolio · viaje realista · cambios solo durante esta visita
    </div>

    <article class="trip-cover">
      <img src="/assets/editorial/ruta-auth-hero.png" alt="" />
      <div>
        <p class="eyebrow">Escapada mediterránea</p>
        <h1>{{ snapshot().trip.destination }}</h1>
        <p class="dates">
          {{ snapshot().trip.country }} · {{ snapshot().trip.startDate | date: 'd MMM' }} —
          {{ snapshot().trip.endDate | date: 'd MMM yyyy' }}
        </p>
        <p>{{ snapshot().trip.description }}</p>
        <span class="status">En planificación</span>
      </div>
    </article>

    <nav class="trip-tabs" role="tablist" aria-label="Secciones del viaje de demostración">
      @for (tab of availableTabs; track tab.id) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="activeTab() === tab.id"
          [attr.aria-controls]="'demo-' + tab.id"
          [class.active]="activeTab() === tab.id"
          (click)="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </nav>

    <div class="workspace">
      @switch (activeTab()) {
        @case ('overview') {
          <section id="demo-overview" role="tabpanel" aria-label="Resumen del viaje">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Vista general</p>
                <h2>Todo el viaje, de un vistazo.</h2>
              </div>
              <button type="button" class="button coral" disabled title="Disponible con una cuenta">
                Editar viaje
              </button>
            </div>
            <div class="summary-grid">
              <article>
                <small>Planificación</small>
                <strong>{{ planningProgress() }}%</strong>
                <span class="progress"><i [style.width.%]="planningProgress()"></i></span>
              </article>
              <article>
                <small>Presupuesto usado</small>
                <strong>{{ spent() | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
                <p>de {{ snapshot().trip.budget | currency: 'EUR' : 'symbol' : '1.0-0' }}</p>
              </article>
              <article>
                <small>Itinerario</small>
                <strong>{{ snapshot().days.length }} días</strong>
                <p>{{ activityCount() }} actividades</p>
              </article>
              <article>
                <small>Lugares guardados</small>
                <strong>{{ snapshot().places.length }}</strong>
                <p>todos ubicados</p>
              </article>
            </div>
            <div class="overview-grid">
              <article class="next-day">
                <p class="eyebrow">Próximo día</p>
                <h3>{{ snapshot().days[0].label }}</h3>
                <p>{{ snapshot().days[0].date | date: 'EEEE d MMMM' }}</p>
                @for (activity of snapshot().days[0].activities.slice(0, 3); track activity.id) {
                  <div class="compact-activity">
                    <time>{{ activity.time }}</time>
                    <span>{{ activity.title }}</span>
                  </div>
                }
                <button type="button" class="text-action" (click)="selectTab('itinerary')">
                  Ver itinerario completo →
                </button>
              </article>
              <article class="demo-note">
                <span aria-hidden="true">✦</span>
                <div>
                  <p class="eyebrow">Cómo funciona esta demo</p>
                  <h3>Explora como si fuera tu viaje.</h3>
                  <p>
                    Puedes cambiar de pestaña, filtrar días y marcar actividades. Los cambios viven
                    solo durante esta visita y nunca se envían al servidor.
                  </p>
                </div>
              </article>
            </div>
          </section>
        }
        @case ('itinerary') {
          <section id="demo-itinerary" role="tabpanel" aria-label="Itinerario del viaje">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Itinerario</p>
                <h2>El viaje, día a día.</h2>
              </div>
              <button type="button" class="button coral" disabled title="Disponible con una cuenta">
                Añadir actividad
              </button>
            </div>
            <p class="interaction-note">
              Prueba la interacción: marca una actividad como completada. No se guardará al salir.
            </p>
            <div class="days">
              @for (day of snapshot().days; track day.id; let dayIndex = $index) {
                <article class="day-card">
                  <header>
                    <span>Día {{ dayIndex + 1 }}</span>
                    <div>
                      <h3>{{ day.label }}</h3>
                      <p>{{ day.date | date: 'EEEE d MMMM' }}</p>
                    </div>
                    <small>
                      {{ day.route.totalDistanceMeters / 1000 | number: '1.1-1' }} km previstos
                    </small>
                  </header>
                  <p class="base-route">
                    <span aria-hidden="true">H</span>
                    Salida desde {{ snapshot().base.name }} ·
                    {{ modeLabel(day.travelModeFromBase) }}
                  </p>
                  @for (activity of day.activities; track activity.id; let last = $last) {
                    <div class="activity" [class.done]="isCompleted(activity.id)">
                      <button
                        type="button"
                        class="check"
                        [attr.aria-pressed]="isCompleted(activity.id)"
                        [attr.aria-label]="
                          (isCompleted(activity.id) ? 'Marcar como pendiente: ' : 'Marcar como completada: ') +
                          activity.title
                        "
                        (click)="toggleCompleted(activity.id)"
                      >
                        {{ isCompleted(activity.id) ? '✓' : '' }}
                      </button>
                      <time>{{ activity.time }}</time>
                      <div>
                        <strong>{{ activity.title }}</strong>
                        <small>{{ kindLabel(activity.kind) }} · {{ activity.locationName }}</small>
                        <p>{{ activity.notes }}</p>
                      </div>
                      @if (activity.cost > 0) {
                        <span>{{ activity.cost | currency: 'EUR' : 'symbol' : '1.0-0' }}</span>
                      }
                    </div>
                    @if (!last) {
                      <p class="travel-mode">
                        {{ modeIcon(activity.travelModeToNext) }}
                        {{ modeLabel(activity.travelModeToNext) }}
                      </p>
                    }
                  }
                  <p class="base-route return">
                    <span aria-hidden="true">H</span>
                    Regreso al hotel ·
                    {{ modeLabel(day.activities[day.activities.length - 1].travelModeToNext) }}
                  </p>
                </article>
              }
            </div>
          </section>
        }
        @case ('budget') {
          <section id="demo-budget" role="tabpanel" aria-label="Presupuesto del viaje">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Presupuesto</p>
                <h2>Gastar con contexto.</h2>
              </div>
              <button type="button" class="button coral" disabled title="Disponible con una cuenta">
                Añadir gasto
              </button>
            </div>
            <div class="budget-layout">
              <article class="budget-total">
                <small>Total previsto</small>
                <strong>{{ spent() | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
                <p>
                  Quedan
                  {{ snapshot().trip.budget - spent() | currency: 'EUR' : 'symbol' : '1.0-0' }}
                  de margen
                </p>
                <div
                  class="budget-ring"
                  role="img"
                  [attr.aria-label]="budgetPercent() + '% del presupuesto utilizado'"
                  [style.--value]="budgetPercent() + '%'"
                >
                  <span>{{ budgetPercent() }}%</span>
                </div>
              </article>
              <div class="expense-list">
                @for (expense of snapshot().expenses; track expense.id) {
                  <article>
                    <span class="expense-icon" aria-hidden="true">
                      {{ expenseIcon(expense.category) }}
                    </span>
                    <div>
                      <strong>{{ expense.title }}</strong>
                      <small>{{ expenseLabel(expense.category) }}</small>
                    </div>
                    <b>{{ expense.amount | currency: 'EUR' : 'symbol' : '1.0-0' }}</b>
                  </article>
                }
              </div>
            </div>
            <p class="estimate">
              Los importes son orientativos y se incluyen únicamente para mostrar el funcionamiento
              del presupuesto.
            </p>
          </section>
        }
        @case ('map') {
          <section id="demo-map" role="tabpanel" aria-label="Mapa y rutas del viaje">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Mapa y rutas</p>
                <h2>Del plan al terreno.</h2>
              </div>
            </div>
            <div class="day-filter" aria-label="Filtrar mapa por día">
              <button
                type="button"
                [class.active]="selectedDayId() === ''"
                (click)="selectedDayId.set('')"
              >
                Todo
              </button>
              @for (day of snapshot().days; track day.id; let index = $index) {
                <button
                  type="button"
                  [class.active]="selectedDayId() === day.id"
                  (click)="selectedDayId.set(day.id)"
                >
                  Día {{ index + 1 }}
                </button>
              }
            </div>
            <div class="map-layout">
              <app-travel-map
                [points]="mapPoints()"
                [lines]="mapLines()"
                [tilesEnabled]="false"
                [localOverlay]="localMapOverlay"
                [directionsEnabled]="true"
                ariaLabel="Mapa local de Valencia con recorridos reales guardados"
              />
              <aside>
                <p class="eyebrow">Recorrido guardado</p>
                <div class="hotel-base">
                  <span aria-hidden="true">H</span>
                  <div>
                    <small>Base del viaje</small>
                    <strong>{{ snapshot().base.name }}</strong>
                  </div>
                </div>
                @if (selectedDay(); as day) {
                  <h3>{{ day.label }}</h3>
                  <strong>{{ day.route.totalDistanceMeters / 1000 | number: '1.1-1' }} km</strong>
                  <p>{{ durationLabel(day.route.totalDurationSeconds) }} en movimiento</p>
                  @for (leg of day.route.legs; track leg.id) {
                    <div class="route-leg">
                      <span>{{ modeIcon(leg.mode) }}</span>
                      <div>
                        <strong>
                          {{ routeStopLabel(leg.fromActivityId) }} →
                          {{ routeStopLabel(leg.toActivityId) }}
                        </strong>
                        <small>
                          {{ modeLabel(leg.mode) }} ·
                          {{ leg.distanceMeters / 1000 | number: '1.1-1' }} km ·
                          {{ durationLabel(leg.durationSeconds) }}
                        </small>
                      </div>
                    </div>
                  }
                } @else {
                  <h3>Los tres días</h3>
                  <p>Selecciona un día para consultar sus tramos, medios y duración estimada.</p>
                }
                <small class="attribution">{{ snapshot().source.attribution }}</small>
              </aside>
            </div>
            <p class="estimate">
              La geometría se calculó una sola vez al preparar la demo. Este mapa no consulta
              teselas, geocodificación ni rutas al abrirse. Pulsa un marcador para abrir Google
              Maps con ese punto como destino desde tu ubicación actual.
            </p>
          </section>
        }
        @case ('places') {
          <section id="demo-places" role="tabpanel" aria-label="Lugares guardados">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Lugares guardados</p>
                <h2>Ideas que ya tienen sitio.</h2>
              </div>
              <button type="button" class="button coral" disabled title="Disponible con una cuenta">
                Guardar lugar
              </button>
            </div>
            <div class="places-grid">
              @for (place of snapshot().places; track place.id) {
                <article>
                  <div class="place-placeholder" aria-hidden="true">
                    <span>{{ kindIcon(place.category) }}</span>
                  </div>
                  <div>
                    <small>{{ kindLabel(place.category) }}</small>
                    <h3>{{ place.name }}</h3>
                    <p>{{ place.note }}</p>
                    <address>{{ place.address }}</address>
                  </div>
                </article>
              }
            </div>
          </section>
        }
        @case ('project') {
          <section id="demo-project" role="tabpanel" aria-label="Presentación técnica de Ruta">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Detrás de Ruta</p>
                <h2>También puedes mirar bajo el capó.</h2>
              </div>
            </div>
            <app-demo-case-study />
          </section>
        }
      }
    </div>

    <footer class="demo-footer">
      <div>
        <p class="eyebrow">¿Quieres volver a la parte privada?</p>
        <h2>Los viajes reales están protegidos por invitación.</h2>
      </div>
      <a class="button coral" routerLink="/acceso">Ir al acceso privado</a>
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }
    .demo-banner {
      background: var(--coral);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 0.7rem 1rem;
      text-align: center;
      text-transform: uppercase;
    }
    .trip-cover,
    .workspace,
    .trip-tabs,
    .demo-footer {
      margin-inline: auto;
      max-width: 1280px;
    }
    .trip-cover {
      background: var(--deep);
      border-radius: 1.2rem 1.2rem 0 0;
      color: #fff;
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
      margin-top: 2rem;
      overflow: hidden;
    }
    .trip-cover img {
      height: 100%;
      max-height: 420px;
      min-height: 360px;
      object-fit: cover;
      width: 100%;
    }
    .trip-cover > div {
      align-self: center;
      padding: clamp(2rem, 5vw, 4rem);
    }
    h1 {
      font-size: clamp(4rem, 9vw, 7rem);
      line-height: 0.85;
      margin: 0.6rem 0 1rem;
    }
    .dates {
      color: #dce6e2;
      font-weight: 700;
    }
    .trip-cover .eyebrow,
    .demo-footer .eyebrow {
      color: var(--coral-on-dark);
    }
    .status {
      background: #ffffff1f;
      border: 1px solid #ffffff4f;
      border-radius: 2rem;
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      margin-top: 1rem;
      padding: 0.5rem 0.75rem;
      text-transform: uppercase;
    }
    .trip-tabs {
      background: var(--paper);
      border: 1px solid var(--line);
      border-top: 0;
      display: flex;
      overflow-x: auto;
      padding: 0 1rem;
      position: sticky;
      top: 0;
      z-index: 35;
    }
    .trip-tabs button {
      background: transparent;
      border: 0;
      border-bottom: 3px solid transparent;
      color: var(--muted);
      flex: 0 0 auto;
      font-weight: 800;
      padding: 1rem;
    }
    .trip-tabs button.active {
      border-bottom-color: var(--coral);
      color: var(--deep);
    }
    .workspace {
      min-height: 620px;
      padding: clamp(2rem, 5vw, 4rem) 1.25rem 5rem;
    }
    .section-heading {
      align-items: end;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-bottom: 2rem;
    }
    .section-heading h2,
    .demo-footer h2 {
      font-size: clamp(2.5rem, 6vw, 5rem);
      line-height: 0.95;
      margin: 0.4rem 0 0;
      max-width: 800px;
    }
    .summary-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(4, 1fr);
    }
    .summary-grid article,
    .next-day,
    .demo-note,
    .day-card,
    .budget-total,
    .expense-list article,
    .map-layout aside,
    .places-grid article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
    }
    .summary-grid article {
      padding: 1.35rem;
    }
    .summary-grid small,
    .budget-total small {
      color: var(--muted);
      display: block;
      font-size: 0.72rem;
      font-weight: 800;
      margin-bottom: 1rem;
      text-transform: uppercase;
    }
    .summary-grid strong,
    .budget-total > strong {
      display: block;
      font-family: var(--font-display);
      font-size: 2.4rem;
    }
    .summary-grid p {
      color: var(--muted);
      margin: 0.35rem 0 0;
    }
    .progress {
      background: var(--sand);
      border-radius: 1rem;
      display: block;
      height: 6px;
      margin-top: 1rem;
      overflow: hidden;
    }
    .progress i {
      background: var(--coral);
      display: block;
      height: 100%;
    }
    .overview-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1.25fr 0.75fr;
      margin-top: 1rem;
    }
    .next-day,
    .demo-note {
      padding: 1.5rem;
    }
    .next-day h3,
    .demo-note h3,
    .day-card h3,
    .map-layout h3,
    .places-grid h3 {
      font-family: var(--font-display);
      font-size: 2rem;
      margin: 0.25rem 0;
    }
    .compact-activity {
      border-top: 1px solid var(--line);
      display: grid;
      gap: 1rem;
      grid-template-columns: 4rem 1fr;
      padding: 0.85rem 0;
    }
    .compact-activity time,
    .activity time {
      color: var(--coral);
      font-weight: 800;
    }
    .text-action {
      background: transparent;
      border: 0;
      color: var(--deep);
      font-weight: 800;
      padding: 0.75rem 0 0;
      text-decoration: underline;
    }
    .demo-note {
      align-items: start;
      background: var(--deep);
      color: #fff;
      display: grid;
      gap: 1rem;
      grid-template-columns: auto 1fr;
    }
    .demo-note > span {
      color: var(--coral-light);
      font-size: 1.6rem;
    }
    .demo-note p:last-child {
      color: #dce6e2;
      line-height: 1.6;
    }
    .interaction-note,
    .estimate {
      background: #f5e7dd;
      border-left: 4px solid var(--coral);
      border-radius: 0.4rem;
      color: var(--deep);
      padding: 0.9rem 1rem;
    }
    .days {
      display: grid;
      gap: 1rem;
    }
    .day-card {
      overflow: hidden;
    }
    .day-card > header {
      align-items: center;
      background: var(--sand);
      display: grid;
      gap: 1rem;
      grid-template-columns: auto 1fr auto;
      padding: 1.2rem 1.4rem;
    }
    .day-card > header > span {
      color: var(--coral);
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .day-card > header p,
    .day-card > header small {
      color: var(--muted);
      margin: 0;
    }
    .activity {
      align-items: start;
      display: grid;
      gap: 1rem;
      grid-template-columns: 2rem 4rem 1fr auto;
      padding: 1.25rem 1.4rem;
      transition: opacity 160ms ease;
    }
    .activity + .activity {
      border-top: 1px solid var(--line);
    }
    .activity.done {
      opacity: 0.55;
    }
    .activity.done strong {
      text-decoration: line-through;
    }
    .activity div > small {
      color: var(--muted);
      display: block;
      margin-top: 0.2rem;
    }
    .activity p {
      color: var(--muted);
      margin: 0.5rem 0 0;
    }
    .check {
      align-items: center;
      background: #fff;
      border: 2px solid var(--coral);
      border-radius: 50%;
      color: var(--coral);
      display: flex;
      height: 1.6rem;
      justify-content: center;
      width: 1.6rem;
    }
    .travel-mode {
      color: var(--muted);
      font-size: 0.75rem;
      font-weight: 700;
      margin: -0.4rem 0 -0.4rem 7.4rem;
    }
    .base-route {
      align-items: center;
      background: #f6eee2;
      color: var(--deep);
      display: flex;
      font-size: 0.76rem;
      font-weight: 800;
      gap: 0.6rem;
      margin: 0;
      padding: 0.7rem 1.4rem;
    }
    .base-route span,
    .hotel-base > span {
      align-items: center;
      background: #765328;
      border-radius: 0.35rem;
      color: #fff;
      display: inline-flex;
      height: 1.7rem;
      justify-content: center;
      width: 1.7rem;
    }
    .base-route.return {
      border-top: 1px solid var(--line);
    }
    .budget-layout {
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(280px, 0.7fr) 1.3fr;
    }
    .budget-total {
      padding: 2rem;
    }
    .budget-total > p {
      color: var(--muted);
    }
    .budget-ring {
      align-items: center;
      background: conic-gradient(var(--coral) var(--value), var(--sand) 0);
      border-radius: 50%;
      display: flex;
      height: 160px;
      justify-content: center;
      margin: 2rem auto 0;
      position: relative;
      width: 160px;
    }
    .budget-ring::after {
      background: var(--paper);
      border-radius: 50%;
      content: '';
      inset: 18px;
      position: absolute;
    }
    .budget-ring span {
      font-family: var(--font-display);
      font-size: 2rem;
      position: relative;
      z-index: 1;
    }
    .expense-list {
      display: grid;
      gap: 0.75rem;
    }
    .expense-list article {
      align-items: center;
      display: grid;
      gap: 1rem;
      grid-template-columns: auto 1fr auto;
      padding: 1rem 1.25rem;
    }
    .expense-icon {
      align-items: center;
      background: var(--sand);
      border-radius: 50%;
      display: flex;
      height: 2.75rem;
      justify-content: center;
      width: 2.75rem;
    }
    .expense-list small {
      color: var(--muted);
      display: block;
    }
    .day-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .day-filter button {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 2rem;
      color: var(--deep);
      font-weight: 800;
      padding: 0.65rem 1rem;
    }
    .day-filter button.active {
      background: var(--deep);
      color: #fff;
    }
    .map-layout {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1.45fr 0.55fr;
      min-height: 520px;
    }
    .map-layout app-travel-map {
      min-height: 520px;
    }
    .map-layout aside {
      padding: 1.4rem;
    }
    .map-layout aside > strong {
      display: block;
      font-family: var(--font-display);
      font-size: 2rem;
      margin-top: 1rem;
    }
    .hotel-base {
      align-items: center;
      background: #f6eee2;
      border-radius: 0.75rem;
      display: grid;
      gap: 0.75rem;
      grid-template-columns: auto 1fr;
      margin: 1rem 0;
      padding: 0.85rem;
    }
    .hotel-base small,
    .hotel-base strong {
      display: block;
    }
    .hotel-base small {
      color: var(--muted);
      margin-bottom: 0.15rem;
    }
    .route-leg {
      align-items: center;
      border-top: 1px solid var(--line);
      display: grid;
      gap: 0.75rem;
      grid-template-columns: auto 1fr;
      padding: 0.85rem 0;
    }
    .route-leg small,
    .attribution {
      color: var(--muted);
      display: block;
    }
    .attribution {
      line-height: 1.4;
      margin-top: 1rem;
    }
    .places-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(2, 1fr);
    }
    .places-grid article {
      display: grid;
      grid-template-columns: 170px 1fr;
      overflow: hidden;
    }
    .place-placeholder {
      align-items: center;
      background:
        radial-gradient(circle at 30% 30%, #ffffff4f 0 3px, transparent 4px),
        linear-gradient(145deg, var(--deep), #315d5f);
      color: var(--coral-light);
      display: flex;
      font-size: 2.5rem;
      justify-content: center;
      min-height: 220px;
    }
    .places-grid article > div:last-child {
      padding: 1.35rem;
    }
    .places-grid small {
      color: var(--coral);
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .places-grid p,
    address {
      color: var(--muted);
      font-style: normal;
      line-height: 1.55;
    }
    .demo-footer {
      align-items: center;
      background: var(--deep);
      border-radius: 1.2rem;
      color: #fff;
      display: flex;
      gap: 2rem;
      justify-content: space-between;
      margin-bottom: 4rem;
      padding: clamp(2rem, 5vw, 4rem);
    }
    .demo-footer h2 {
      font-size: clamp(2rem, 5vw, 4rem);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    @media (max-width: 900px) {
      .trip-cover,
      .summary-grid,
      .overview-grid,
      .budget-layout,
      .map-layout,
      .places-grid {
        grid-template-columns: 1fr 1fr;
      }
      .trip-cover {
        margin-top: 1rem;
      }
      .trip-cover img,
      .trip-cover > div,
      .map-layout app-travel-map,
      .map-layout aside {
        grid-column: 1 / -1;
      }
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 640px) {
      .trip-cover,
      .summary-grid,
      .overview-grid,
      .budget-layout,
      .map-layout,
      .places-grid {
        grid-template-columns: 1fr;
      }
      .trip-cover {
        border-radius: 0;
        margin-top: 0;
      }
      .trip-cover img {
        min-height: 240px;
      }
      .trip-tabs {
        padding: 0;
      }
      .section-heading,
      .demo-footer {
        align-items: stretch;
        flex-direction: column;
      }
      .activity {
        grid-template-columns: 2rem 3.5rem 1fr;
        padding: 1rem;
      }
      .activity > span:last-child {
        grid-column: 3;
      }
      .travel-mode {
        margin-left: 6.5rem;
      }
      .day-card > header {
        grid-template-columns: 1fr;
      }
      .places-grid article {
        grid-template-columns: 1fr;
      }
      .place-placeholder {
        min-height: 150px;
      }
      .demo-footer {
        border-radius: 0;
        margin-bottom: 0;
      }
    }
  `,
})
export class DemoWorkspaceComponent {
  readonly snapshot = input.required<DemoSnapshot>();
  readonly activeTab = signal<DemoTab>('overview');
  readonly selectedDayId = signal('');
  readonly completedIds = signal(new Set<string>());
  readonly availableTabs = tabs;
  readonly localMapOverlay = {
    url: '/assets/demo/valencia-map.svg',
    bounds: [
      [39.44, -0.42],
      [39.5, -0.3],
    ] as [[number, number], [number, number]],
    attribution: 'Mapa esquemático local de Ruta',
  };

  readonly spent = computed(() =>
    this.snapshot().expenses.reduce((total, expense) => total + expense.amount, 0),
  );
  readonly activityCount = computed(() =>
    this.snapshot().days.reduce((total, day) => total + day.activities.length, 0),
  );
  readonly planningProgress = computed(() => 82);
  readonly budgetPercent = computed(() =>
    Math.min(100, Math.round((this.spent() / this.snapshot().trip.budget) * 100)),
  );
  readonly selectedDay = computed(
    () => this.snapshot().days.find((day) => day.id === this.selectedDayId()) ?? null,
  );
  readonly mapPoints = computed(() =>
    demoMapPoints(this.snapshot(), this.selectedDayId() || undefined),
  );
  readonly mapLines = computed(() =>
    demoMapLines(this.snapshot(), this.selectedDayId() || undefined),
  );

  selectTab(tab: DemoTab): void {
    this.activeTab.set(tab);
    if (tab === 'map' && !this.selectedDayId()) {
      this.selectedDayId.set(this.snapshot().days[0]?.id ?? '');
    }
  }

  toggleCompleted(activityId: string): void {
    this.completedIds.update((current) => {
      const next = new Set(current);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  }

  isCompleted(activityId: string): boolean {
    return this.completedIds().has(activityId);
  }

  kindLabel(kind: DemoActivity['kind']): string {
    return {
      comida: 'Comida',
      cultura: 'Cultura',
      naturaleza: 'Naturaleza',
      traslado: 'Traslado',
      alojamiento: 'Alojamiento',
      otro: 'Experiencia',
    }[kind];
  }

  kindIcon(kind: DemoActivity['kind']): string {
    return {
      comida: '◌',
      cultura: '◇',
      naturaleza: '⌁',
      traslado: '↗',
      alojamiento: '⌂',
      otro: '✦',
    }[kind];
  }

  modeLabel(mode: DemoActivity['travelModeToNext']): string {
    return { walking: 'A pie', cycling: 'En bicicleta', driving: 'En coche' }[mode];
  }

  modeIcon(mode: DemoActivity['travelModeToNext']): string {
    return { walking: '🚶', cycling: '🚲', driving: '🚗' }[mode];
  }

  routeStopLabel(id: string): string {
    if (id === this.snapshot().base.id) return 'Hotel';
    return (
      this.snapshot()
        .days.flatMap((day) => day.activities)
        .find((activity) => activity.id === id)?.title ?? 'Parada'
    );
  }

  durationLabel(seconds: number): string {
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
  }

  expenseLabel(category: DemoSnapshot['expenses'][number]['category']): string {
    return {
      accommodation: 'Alojamiento',
      food: 'Comida',
      transport: 'Transporte',
      activities: 'Experiencias',
      other: 'Otros',
    }[category];
  }

  expenseIcon(category: DemoSnapshot['expenses'][number]['category']): string {
    return {
      accommodation: '⌂',
      food: '◌',
      transport: '↗',
      activities: '✦',
      other: '◇',
    }[category];
  }
}
