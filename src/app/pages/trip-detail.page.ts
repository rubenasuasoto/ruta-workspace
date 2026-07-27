import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  Activity,
  ActivityKind,
  Expense,
  ExpenseCategory,
  ItineraryDay,
  Trip,
} from '../core/models';
import { TripStore } from '../core/trip-store.service';
import { ItineraryAssistantComponent } from '../features/itinerary-ai/itinerary-assistant.component';
import { TripMapComponent } from '../features/map/trip-map.component';
import type {
  LocationSelection} from '../features/map/location-picker.component';
import {
  LocationPickerComponent
} from '../features/map/location-picker.component';
import { FeedbackService } from '../core/feedback.service';

type Tab = 'resumen' | 'itinerario' | 'presupuesto' | 'mapa';
@Component({
  selector: 'app-trip-detail',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    ItineraryAssistantComponent,
    TripMapComponent,
    LocationPickerComponent,
  ],
  template: `
    @if (trip(); as t) {
      <section
        class="cover"
        [style.background-image]="
          'linear-gradient(90deg, rgba(14,37,38,.84), rgba(14,37,38,.18)), url(' +
          (t.coverImage || '') +
          ')'
        "
      >
        <a routerLink="/viajes">← Todos los viajes</a>
        <a class="share-link" [routerLink]="['/viajes', t.id, 'compartir']">Compartir viaje</a>
        <div>
          <span class="status" [class]="'status ' + t.status">{{ t.status }}</span>
          <h1>{{ t.destination }}</h1>
          <p>
            {{ t.country }} · {{ t.startDate | date: 'd MMM yyyy' }} —
            {{ t.endDate | date: 'd MMM yyyy' }}
          </p>
        </div>
        <button class="delete-link" (click)="deleteTrip(t)">Eliminar viaje</button>
      </section>
      <section class="page detail">
        <nav class="tabs" aria-label="Secciones del viaje">
          @for (tab of tabList; track tab) {
            <button [class.active]="activeTab() === tab" (click)="activeTab.set(tab)">
              {{ tab }}
            </button>
          }
        </nav>
        @if (store.error()) {
          <p class="detail-error" role="alert">{{ store.error() }}</p>
        }
        @if (activeTab() === 'resumen') {
          <div class="overview">
            <div>
              <p class="eyebrow">La intención</p>
              <h2>{{ t.description }}</h2>
              <div class="facts">
                <article>
                  <span>Duración</span><strong>{{ daysFor(t.id).length }} días</strong>
                </article>
                <article>
                  <span>Actividades</span><strong>{{ activityCount(t.id) }}</strong>
                </article>
                <article>
                  <span>Presupuesto</span
                  ><strong>{{ t.budget | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
                </article>
              </div>
            </div>
            <aside class="progress-card">
              <p class="eyebrow">Planificación</p>
              <div class="ring" [style.--progress]="completion(t.id) + '%'">
                <strong>{{ completion(t.id) }}%</strong>
              </div>
              <h3>Tu itinerario toma forma</h3>
              <p>Añade actividades para que cada día tenga su propia historia.</p>
              <button class="button" (click)="activeTab.set('itinerario')">Ver itinerario</button>
            </aside>
          </div>
        }
        @if (activeTab() === 'itinerario') {
          <div class="section-intro">
            <div>
              <p class="eyebrow">Un día cada vez</p>
              <h2>Itinerario</h2>
            </div>
            <button class="button coral" (click)="openActivity(daysFor(t.id)[0])">
              + Añadir actividad
            </button>
          </div>
          <app-itinerary-assistant [tripId]="t.id" />
          <div class="days">
            @for (day of daysFor(t.id); track day.id; let index = $index) {
              <article class="day">
                <div class="day-title">
                  <span>Día {{ index + 1 }}</span>
                  <h3>{{ day.date | date: 'EEEE, d MMMM' }}</h3>
                  <button
                    class="icon-button"
                    (click)="openActivity(day)"
                    aria-label="Añadir actividad"
                  >
                    ＋
                  </button>
                </div>
                @if (day.activities.length) {
                  <div class="activities">
                    @for (
                      activity of day.activities;
                      track activity.id;
                      let first = $first;
                      let last = $last
                    ) {
                      <div class="activity" [class.done]="activity.completed">
                        <button
                          class="check"
                          (click)="store.toggleActivity(day.id, activity.id)"
                          [attr.aria-label]="'Marcar ' + activity.title"
                        >
                          <span>{{ activity.completed ? '✓' : '' }}</span></button
                        ><time>{{ activity.time }}</time>
                        <div>
                          <strong>{{ activity.title }}</strong>
                          <p>
                            {{ activity.kind }}
                            @if (activity.locationName) {
                              · ⌖ {{ activity.locationName }}
                            }
                            @if (activity.notes) {
                              · {{ activity.notes }}
                            }
                          </p>
                        </div>
                        @if (activity.cost) {
                          <em>{{ activity.cost | currency: 'EUR' : 'symbol' : '1.0-0' }}</em>
                        }
                        <div class="activity-actions">
                          <button
                            (click)="store.moveActivity(day.id, activity.id, -1)"
                            [disabled]="first"
                            aria-label="Subir actividad"
                          >
                            ↑</button
                          ><button
                            (click)="store.moveActivity(day.id, activity.id, 1)"
                            [disabled]="last"
                            aria-label="Bajar actividad"
                          >
                            ↓</button
                          ><button
                            (click)="openActivity(day, activity)"
                            aria-label="Editar actividad"
                          >
                            ✎</button
                          ><button
                            (click)="removeActivity(day, activity)"
                            aria-label="Eliminar actividad"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="empty compact">
                    Aún no hay planes para este día.
                    <button class="text-button" (click)="openActivity(day)">Añadir uno</button>
                  </div>
                }
              </article>
            }
          </div>
        }
        @if (activeTab() === 'presupuesto') {
          <div class="section-intro">
            <div>
              <p class="eyebrow">Viajar con calma</p>
              <h2>Presupuesto</h2>
            </div>
            <button class="button coral" (click)="openExpense()">+ Añadir gasto</button>
          </div>
          <div class="budget-summary">
            <article>
              <span>Presupuesto total</span
              ><strong>{{ t.budget | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
            </article>
            <article>
              <span>Gastado hasta ahora</span
              ><strong>{{ spent(t.id) | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
            </article>
            <article>
              <span>Disponible</span
              ><strong [class.negative]="t.budget - spent(t.id) < 0">{{
                t.budget - spent(t.id) | currency: 'EUR' : 'symbol' : '1.0-0'
              }}</strong>
            </article>
          </div>
          <div class="budget-grid">
            <section class="card chart">
              <h3>Reparto de gastos</h3>
              @if (categoryTotals(t.id).length) {
                <svg viewBox="0 0 42 42" role="img" aria-label="Gráfico de reparto de gastos">
                  @for (item of categoryTotals(t.id); track item.category) {
                    <circle
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      [attr.stroke]="item.color"
                      stroke-width="5"
                      [attr.stroke-dasharray]="item.percent + ' ' + (100 - item.percent)"
                      [attr.stroke-dashoffset]="-item.offset"
                      transform="rotate(-90 21 21)"
                    />
                  }
                </svg>
                <div class="legend">
                  @for (item of categoryTotals(t.id); track item.category) {
                    <p>
                      <i [style.background]="item.color"></i>{{ item.category }}
                      <strong>{{ item.amount | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
                    </p>
                  }
                </div>
              } @else {
                <p class="muted">Añade gastos para ver el reparto.</p>
              }
            </section>
            <section class="card expense-list">
              <h3>Movimientos</h3>
              @if (store.expensesFor(t.id).length) {
                @for (expense of store.expensesFor(t.id); track expense.id) {
                  <div class="expense">
                    <div>
                      <strong>{{ expense.title }}</strong>
                      <p>{{ expense.category }} · {{ expense.date | date: 'd MMM' }}</p>
                    </div>
                    <b>{{ expense.amount | currency: 'EUR' : 'symbol' : '1.0-0' }}</b>
                    <div class="expense-actions">
                      <button
                        class="icon-button"
                        (click)="openExpense(expense)"
                        [attr.aria-label]="'Editar ' + expense.title"
                      >
                        ✎</button
                      ><button
                        class="icon-button"
                        (click)="removeExpense(expense)"
                        [attr.aria-label]="'Eliminar ' + expense.title"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                }
              } @else {
                <p class="muted">Aún no has registrado gastos.</p>
              }
            </section>
          </div>
        }
        @if (activeTab() === 'mapa') {
          <app-trip-map
            [tripId]="t.id"
            (locateActivity)="openActivity($event.day, $event.activity)"
          />
        }
      </section>
    } @else {
      <section class="page">
        <div class="empty">
          <h1>Este viaje se ha perdido</h1>
          <p>No existe o ya fue eliminado.</p>
          <a class="button" routerLink="/viajes">Volver a mis viajes</a>
        </div>
      </section>
    }
    @if (showActivity()) {
      <div
        class="modal-backdrop"
        tabindex="-1"
        (click)="closeActivityFromBackdrop($event)"
        (keydown.escape)="closeActivity()"
      >
        <form
          class="modal wide"
          [formGroup]="activityForm"
          (ngSubmit)="saveActivity()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-dialog-title"
        >
          <header>
            <div>
              <p class="eyebrow">Itinerario</p>
              <h2 id="activity-dialog-title">
                {{ editingActivity() ? 'Editar actividad' : 'Añadir actividad' }}
              </h2>
            </div>
            <button type="button" class="icon-button" (click)="closeActivity()" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div class="form-grid">
            <div class="field full">
              <label for="activity-title">Título</label
              ><input
                id="activity-title"
                formControlName="title"
                placeholder="Ej. Cena con vistas al Tajo"
              />
            </div>
            <div class="field">
              <label for="activity-time">Hora</label
              ><input id="activity-time" type="time" formControlName="time" />
            </div>
            <div class="field">
              <label for="activity-kind">Tipo</label
              ><select id="activity-kind" formControlName="kind">
                <option value="comida">Comida</option>
                <option value="cultura">Cultura</option>
                <option value="naturaleza">Naturaleza</option>
                <option value="traslado">Traslado</option>
                <option value="alojamiento">Alojamiento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div class="field">
              <label for="activity-cost">Coste opcional (€)</label
              ><input id="activity-cost" type="number" min="0" formControlName="cost" />
            </div>
            <div class="field full">
              <label for="activity-notes">Notas</label
              ><textarea id="activity-notes" formControlName="notes"></textarea>
            </div>
            <div class="field full">
              <label for="activity-place">Usar un lugar guardado</label
              ><select
                id="activity-place"
                formControlName="savedPlaceId"
                (change)="selectSavedPlace($any($event.target).value)"
              >
                <option value="">Ubicación manual o pendiente</option>
                @for (place of store.places(); track place.id) {
                  <option [value]="place.id">{{ place.name }} · {{ place.city }}</option>
                }
              </select>
            </div>
            @if (!activityForm.controls.savedPlaceId.value) {
              <app-location-picker
                [value]="activityLocation()"
                (valueChange)="activityLocation.set($event)"
              />
            }
          </div>
          <footer>
            <button type="button" class="button secondary" (click)="closeActivity()">
              Cancelar</button
            ><button class="button coral" [disabled]="savingActivity()">
              {{ savingActivity() ? 'Guardando…' : 'Guardar actividad' }}
            </button>
          </footer>
        </form>
      </div>
    }
    @if (showExpense()) {
      <div
        class="modal-backdrop"
        tabindex="-1"
        (click)="closeExpenseFromBackdrop($event)"
        (keydown.escape)="closeExpense()"
      >
        <form
          class="modal"
          [formGroup]="expenseForm"
          (ngSubmit)="saveExpense()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-dialog-title"
        >
          <header>
            <div>
              <p class="eyebrow">Presupuesto</p>
              <h2 id="expense-dialog-title">
                {{ editingExpense() ? 'Editar gasto' : 'Registrar gasto' }}
              </h2>
            </div>
            <button type="button" class="icon-button" (click)="closeExpense()" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div class="form-grid">
            <div class="field full">
              <label for="expense-title">Concepto</label
              ><input
                id="expense-title"
                formControlName="title"
                placeholder="Ej. Comida en Time Out Market"
              />
            </div>
            <div class="field">
              <label for="expense-category">Categoría</label
              ><select id="expense-category" formControlName="category">
                <option value="alojamiento">Alojamiento</option>
                <option value="transporte">Transporte</option>
                <option value="comida">Comida</option>
                <option value="experiencias">Experiencias</option>
                <option value="compras">Compras</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div class="field">
              <label for="expense-amount">Importe (€)</label
              ><input id="expense-amount" type="number" min="0" formControlName="amount" />
            </div>
            <div class="field">
              <label for="expense-date">Fecha</label
              ><input id="expense-date" type="date" formControlName="date" />
            </div>
          </div>
          <footer>
            <button type="button" class="button secondary" (click)="closeExpense()">Cancelar</button
            ><button class="button coral" [disabled]="savingExpense()">
              {{ savingExpense() ? 'Guardando…' : 'Guardar gasto' }}
            </button>
          </footer>
        </form>
      </div>
    }
  `,
  styles: `
    .cover {
      background-color: var(--ink);
      background-position: center;
      background-size: cover;
      color: white;
      display: flex;
      flex-direction: column;
      min-height: 380px;
      padding: 2rem clamp(1.25rem, 5vw, 5rem);
      position: relative;
    }
    .cover > a {
      color: #fff;
      text-decoration: none;
    }
    .cover > div {
      margin: auto 0;
    }
    .cover h1 {
      font-size: clamp(3.7rem, 8vw, 7rem);
      line-height: 0.9;
      margin: 0.5rem 0;
    }
    .cover p {
      font-size: 1rem;
    }
    .delete-link {
      background: transparent;
      border: 0;
      color: #f8d4cc;
      font-size: 0.78rem;
      position: absolute;
      right: clamp(1.25rem, 5vw, 5rem);
      top: 4.4rem;
    }
    .share-link {
      position: absolute;
      right: clamp(1.25rem, 5vw, 5rem);
      top: 2rem;
    }
    .detail {
      padding-top: 2.5rem;
    }
    .tabs {
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 1.8rem;
      margin-bottom: 3rem;
    }
    .tabs button {
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      padding: 0.7rem 0.1rem;
      text-transform: capitalize;
    }
    .tabs button.active {
      border-color: var(--coral);
      color: var(--ink);
      font-weight: 700;
    }
    .detail-error {
      background: #fff0ec;
      border: 1px solid #efb7aa;
      border-radius: 0.6rem;
      color: #9e3423;
      font-size: 0.8rem;
      margin-top: -2rem;
      padding: 0.8rem;
    }
    .overview {
      display: grid;
      gap: 3rem;
      grid-template-columns: 1.3fr 0.7fr;
    }
    .overview h2 {
      font-size: clamp(2.25rem, 4vw, 3.6rem);
      line-height: 1.08;
      max-width: 760px;
    }
    .facts {
      border-top: 1px solid var(--line);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      margin-top: 3rem;
      padding-top: 1rem;
    }
    .facts span,
    .budget-summary span {
      color: var(--muted);
      display: block;
      font-size: 0.74rem;
    }
    .facts strong {
      font-family: var(--font-display);
      font-size: 1.4rem;
    }
    .progress-card {
      background: var(--sand);
      padding: 1.75rem;
    }
    .progress-card h3 {
      font-size: 1.7rem;
      margin-bottom: 0.35rem;
    }
    .progress-card p {
      color: #50605b;
      font-size: 0.85rem;
      line-height: 1.55;
    }
    .ring {
      align-items: center;
      background: conic-gradient(var(--coral) var(--progress), rgba(24, 58, 60, 0.16) 0);
      border-radius: 50%;
      display: flex;
      height: 118px;
      justify-content: center;
      margin: 1.3rem 0;
      position: relative;
      width: 118px;
    }
    .ring:before {
      background: var(--sand);
      border-radius: 50%;
      content: '';
      inset: 10px;
      position: absolute;
    }
    .ring strong {
      font-family: var(--font-display);
      font-size: 1.8rem;
      position: relative;
    }
    .section-intro {
      align-items: end;
      display: flex;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .section-intro h2 {
      font-size: 3rem;
      margin: 0;
    }
    .days {
      display: grid;
      gap: 1rem;
    }
    .day {
      background: var(--paper);
      border: 1px solid var(--line);
      display: grid;
      grid-template-columns: 180px 1fr;
      padding: 1.3rem;
    }
    .day-title {
      border-right: 1px solid var(--line);
      padding-right: 1rem;
    }
    .day-title span {
      color: var(--coral);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .day-title h3 {
      font-size: 1.25rem;
      line-height: 1.25;
      margin: 0.3rem 0;
    }
    .day-title .icon-button {
      display: inline-flex;
      margin-top: 0.35rem;
    }
    .activities {
      padding-left: 1.3rem;
    }
    .activity {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: grid;
      gap: 0.75rem;
      grid-template-columns: 25px 50px 1fr auto auto;
      padding: 0.65rem 0;
    }
    .activity:last-child {
      border: 0;
    }
    .check {
      background: transparent;
      border: 1px solid #a2aba8;
      border-radius: 50%;
      height: 19px;
      padding: 0;
      width: 19px;
    }
    .done .check {
      background: var(--ink);
      border-color: var(--ink);
      color: white;
    }
    .done strong {
      text-decoration: line-through;
    }
    .activity time {
      color: var(--muted);
      font-size: 0.78rem;
    }
    .activity strong {
      font-size: 0.9rem;
    }
    .activity p {
      color: var(--muted);
      font-size: 0.73rem;
      margin: 0.15rem 0;
    }
    .activity em {
      color: var(--coral);
      font-size: 0.75rem;
      font-style: normal;
      font-weight: 700;
    }
    .activity-actions {
      display: flex;
    }
    .activity-actions button {
      background: transparent;
      border: 0;
      color: var(--muted);
      padding: 0.2rem;
    }
    .activity-actions button:disabled {
      opacity: 0.25;
    }
    .compact {
      padding: 1rem;
    }
    .text-button {
      background: transparent;
      border: 0;
      color: var(--coral);
      font-weight: 700;
    }
    .budget-summary {
      display: grid;
      gap: 1px;
      grid-template-columns: repeat(3, 1fr);
      margin-bottom: 1.5rem;
    }
    .budget-summary article {
      background: var(--ink);
      color: white;
      padding: 1.4rem;
    }
    .budget-summary strong {
      font-family: var(--font-display);
      font-size: 2rem;
    }
    .budget-summary span {
      color: #c5d1cd;
    }
    .negative {
      color: #ffc8bb;
    }
    .budget-grid {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: 0.8fr 1.2fr;
    }
    .budget-grid .card {
      padding: 1.4rem;
    }
    .budget-grid h3 {
      font-size: 1.5rem;
    }
    .chart {
      display: grid;
      grid-template-columns: 135px 1fr;
      align-items: center;
    }
    .chart svg {
      height: 135px;
      width: 135px;
    }
    .chart circle {
      fill: none;
    }
    .legend p {
      align-items: center;
      display: flex;
      font-size: 0.78rem;
      gap: 0.4rem;
      justify-content: space-between;
      margin: 0.5rem 0;
    }
    .legend i {
      border-radius: 50%;
      height: 9px;
      width: 9px;
    }
    .legend strong {
      margin-left: auto;
    }
    .expense {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: grid;
      gap: 0.5rem;
      grid-template-columns: 1fr auto auto;
      padding: 0.8rem 0;
    }
    .expense:last-child {
      border: 0;
    }
    .expense strong {
      font-size: 0.88rem;
    }
    .expense p {
      color: var(--muted);
      font-size: 0.73rem;
      margin: 0.18rem 0;
    }
    .expense b {
      font-family: var(--font-display);
    }
    @media (max-width: 720px) {
      .overview,
      .budget-grid {
        grid-template-columns: 1fr;
      }
      .day {
        grid-template-columns: 1fr;
      }
      .day-title {
        align-items: center;
        border-bottom: 1px solid var(--line);
        border-right: 0;
        display: flex;
        justify-content: space-between;
        padding: 0 0 0.7rem;
      }
      .day-title h3 {
        margin: 0;
      }
      .day-title .icon-button {
        display: inline-flex;
        margin-top: 0;
      }
      .activities {
        padding: 0;
      }
      .activity {
        grid-template-columns: 22px 42px 1fr auto;
      }
      .activity-actions {
        grid-column: 3 / -1;
        justify-content: flex-end;
      }
      .budget-summary {
        grid-template-columns: 1fr;
      }
      .chart {
        grid-template-columns: 1fr;
      }
      .tabs {
        gap: 1rem;
      }
      .cover {
        min-height: 330px;
      }
    }
  `,
})
export class TripDetailPage {
  readonly store = inject(TripStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  @ViewChild(TripMapComponent) private tripMap?: TripMapComponent;
  readonly id = signal(this.route.snapshot.paramMap.get('id') ?? '');
  readonly trip = computed(() => this.store.trip(this.id()));
  readonly activeTab = signal<Tab>('resumen');
  readonly tabList: Tab[] = ['resumen', 'itinerario', 'presupuesto', 'mapa'];
  readonly showActivity = signal(false);
  readonly showExpense = signal(false);
  readonly selectedDay = signal<ItineraryDay | null>(null);
  readonly editingActivity = signal<Activity | null>(null);
  readonly editingExpense = signal<Expense | null>(null);
  readonly activityLocation = signal<LocationSelection | null>(null);
  readonly savingActivity = signal(false);
  readonly savingExpense = signal(false);
  readonly activityForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    time: ['09:00', Validators.required],
    kind: ['otro' as ActivityKind],
    cost: [0, Validators.min(0)],
    notes: [''],
    savedPlaceId: [''],
  });
  readonly expenseForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    category: ['comida' as ExpenseCategory],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  daysFor(id: string) {
    return this.store.daysFor(id);
  }
  spent(id: string) {
    return this.store.spentFor(id);
  }
  activityCount(id: string) {
    return this.daysFor(id).reduce((sum, day) => sum + day.activities.length, 0);
  }
  completion(id: string) {
    const all = this.daysFor(id).flatMap((day) => day.activities);
    return all.length
      ? Math.round((all.filter((activity) => activity.completed).length / all.length) * 100)
      : 0;
  }

  async deleteTrip(trip: Trip): Promise<void> {
    const accepted = await this.feedback.confirm({
      title: `Eliminar ${trip.destination}`,
      message: 'Se eliminarán su itinerario, gastos y vínculos. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar viaje',
      danger: true,
    });
    if (!accepted) return;
    try {
      await this.store.removeTrip(trip.id);
      this.feedback.notify('Viaje eliminado.', 'info');
      await this.router.navigateByUrl('/viajes');
    } catch {
      this.feedback.notify('No se pudo eliminar el viaje.', 'error');
    }
  }

  openActivity(day: ItineraryDay, activity?: Activity): void {
    if (!day) return;
    this.selectedDay.set(day);
    this.editingActivity.set(activity ?? null);
    this.activityForm.reset({
      title: activity?.title ?? '',
      time: activity?.time ?? '09:00',
      kind: activity?.kind ?? 'otro',
      cost: activity?.cost ?? 0,
      notes: activity?.notes ?? '',
      savedPlaceId: activity?.savedPlaceId ?? '',
    });
    this.activityLocation.set(
      activity?.latitude != null && activity.longitude != null
        ? {
            address: activity.address ?? activity.locationName ?? activity.title,
            latitude: activity.latitude,
            longitude: activity.longitude,
          }
        : null,
    );
    this.showActivity.set(true);
  }

  selectSavedPlace(placeId: string): void {
    if (placeId) this.activityLocation.set(null);
  }

  closeActivity(): void {
    if (this.savingActivity()) return;
    this.showActivity.set(false);
    this.selectedDay.set(null);
    this.editingActivity.set(null);
  }

  closeActivityFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeActivity();
  }

  async saveActivity(): Promise<void> {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }
    const day = this.selectedDay();
    if (!day) return;
    const value = this.activityForm.getRawValue();
    const existing = this.editingActivity();
    const location = this.activityLocation();
    const savedPlaceId = value.savedPlaceId || null;
    const activity: Omit<Activity, 'id'> = {
      title: value.title,
      time: value.time,
      kind: value.kind,
      cost: value.cost || undefined,
      notes: value.notes,
      completed: existing?.completed ?? false,
      savedPlaceId,
      locationName: savedPlaceId ? undefined : (location?.address ?? null),
      address: savedPlaceId ? undefined : (location?.address ?? null),
      latitude: savedPlaceId ? undefined : (location?.latitude ?? null),
      longitude: savedPlaceId ? undefined : (location?.longitude ?? null),
      position: existing?.position,
      travelModeToNext: existing?.travelModeToNext ?? 'walking',
    };
    this.savingActivity.set(true);
    try {
      if (existing)
        await this.store.updateActivity(day.id, {
          ...activity,
          id: existing.id,
        });
      else await this.store.addActivity(day.id, activity);
      this.closeActivity();
      await this.tripMap?.load();
      this.feedback.notify(existing ? 'Actividad actualizada.' : 'Actividad añadida.');
    } catch {
      this.feedback.notify('No se pudo guardar la actividad.', 'error');
    } finally {
      this.savingActivity.set(false);
      if (!this.store.error()) this.closeActivity();
    }
  }

  async removeActivity(day: ItineraryDay, activity: Activity): Promise<void> {
    const accepted = await this.feedback.confirm({
      title: 'Eliminar actividad',
      message: `${activity.title} se eliminará del itinerario.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    try {
      await this.store.removeActivity(day.id, activity.id);
      await this.tripMap?.load();
      this.feedback.notify('Actividad eliminada.', 'info');
    } catch {}
  }

  openExpense(expense?: Expense): void {
    this.editingExpense.set(expense ?? null);
    this.expenseForm.reset(
      expense ?? {
        title: '',
        category: 'comida',
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
      },
    );
    this.showExpense.set(true);
  }

  closeExpense(): void {
    if (!this.savingExpense()) {
      this.showExpense.set(false);
      this.editingExpense.set(null);
    }
  }

  closeExpenseFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeExpense();
  }

  async saveExpense(): Promise<void> {
    const trip = this.trip();
    if (!trip || this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }
    const current = this.editingExpense();
    this.savingExpense.set(true);
    try {
      const expense = {
        ...this.expenseForm.getRawValue(),
        tripId: trip.id,
      };
      if (current) await this.store.updateExpense({ ...expense, id: current.id });
      else await this.store.addExpense(expense);
      this.feedback.notify(current ? 'Gasto actualizado.' : 'Gasto añadido.');
    } catch {
      this.feedback.notify('No se pudo guardar el gasto.', 'error');
    } finally {
      this.savingExpense.set(false);
      if (!this.store.error()) this.closeExpense();
    }
  }

  async removeExpense(expense: Expense): Promise<void> {
    const accepted = await this.feedback.confirm({
      title: 'Eliminar gasto',
      message: `${expense.title} dejará de contar en el presupuesto.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    try {
      await this.store.removeExpense(expense.id);
      this.feedback.notify('Gasto eliminado.', 'info');
    } catch {}
  }

  categoryTotals(tripId: string) {
    const colors = ['#e56b51', '#183a3c', '#b5c4ad', '#d6aa63', '#9b7d68', '#8798a4'];
    const total = this.spent(tripId) || 1;
    let offset = 0;
    return Object.entries(
      this.store.expensesFor(tripId).reduce(
        (accumulator, expense) => {
          accumulator[expense.category] = (accumulator[expense.category] ?? 0) + expense.amount;
          return accumulator;
        },
        {} as Record<string, number>,
      ),
    ).map(([category, amount], index) => {
      const percent = (amount / total) * 100;
      const item = {
        category,
        amount,
        percent,
        offset,
        color: colors[index % colors.length],
      };
      offset += percent;
      return item;
    });
  }
}
