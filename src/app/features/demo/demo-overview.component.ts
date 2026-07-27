import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, output } from '@angular/core';
import { DemoSandboxStore } from './demo-sandbox.store';

@Component({
  selector: 'app-demo-overview',
  imports: [CurrencyPipe, DatePipe],
  template: `
    @if (store.snapshot(); as snapshot) {
      <section id="demo-overview" role="tabpanel" aria-label="Resumen del viaje">
        <div class="heading">
          <div><p class="eyebrow">Vista general</p><h2>Todo el viaje, de un vistazo.</h2></div>
          <button type="button" class="button coral" (click)="editTrip.emit()">Editar viaje</button>
        </div>
        <div class="summary">
          <article>
            <small>Planificación</small><strong>{{ planningProgress() }}%</strong>
            <span class="progress"><i [style.width.%]="planningProgress()"></i></span>
          </article>
          <article>
            <small>Presupuesto usado</small>
            <strong>{{ spent() | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
            <p>de {{ snapshot.trip.budget | currency: 'EUR' : 'symbol' : '1.0-0' }}</p>
          </article>
          <article>
            <small>Itinerario</small><strong>{{ snapshot.days.length }} días</strong>
            <p>{{ activityCount() }} actividades</p>
          </article>
          <article>
            <small>Lugares guardados</small><strong>{{ snapshot.places.length }}</strong>
            <p>{{ locatedCount() }} ubicados</p>
          </article>
        </div>
        <div class="lower">
          <article class="next">
            <p class="eyebrow">Primer día</p>
            <h3>{{ snapshot.days[0].label }}</h3>
            <p>{{ snapshot.days[0].date | date: 'EEEE d MMMM' }}</p>
            @for (activity of snapshot.days[0].activities.slice(0, 3); track activity.id) {
              <div><time>{{ activity.time }}</time><span>{{ activity.title }}</span></div>
            }
            <button type="button" class="text-action" (click)="showItinerary.emit()">
              Ver itinerario completo →
            </button>
          </article>
          <article class="note">
            <span aria-hidden="true">✦</span>
            <div>
              <p class="eyebrow">Tu copia de la demo</p>
              <h3>Explora como si fuera tu viaje.</h3>
              <p>
                Edita el plan, añade gastos y prueba el mapa. Todo se guarda solo en este navegador
                y puede restaurarse cuando quieras.
              </p>
            </div>
          </article>
        </div>
      </section>
    }
  `,
  styles: `
    .heading{align-items:end;display:flex;gap:1rem;justify-content:space-between}.heading h2{font-size:clamp(2.5rem,5vw,4.6rem);line-height:1;margin:.35rem 0}
    .summary{display:grid;gap:1rem;grid-template-columns:repeat(4,1fr);margin:2rem 0}.summary article{background:var(--paper);border:1px solid var(--line);border-radius:.85rem;display:grid;gap:.35rem;padding:1.2rem}.summary small,.summary p{color:var(--muted);font-size:.75rem;margin:0}.summary strong{font-family:var(--font-display);font-size:2rem}
    .progress{background:#ddd8cf;border-radius:1rem;height:6px;margin-top:.35rem;overflow:hidden}.progress i{background:var(--coral);display:block;height:100%}.lower{display:grid;gap:1rem;grid-template-columns:1fr 1fr}.next,.note{border-radius:1rem;padding:1.4rem}.next{background:#fffdfa;border:1px solid var(--line)}.next h3,.note h3{font-size:1.7rem;margin:.2rem 0}.next>p:not(.eyebrow),.note p:last-child{color:var(--muted);line-height:1.6}
    .next>div{border-top:1px solid var(--line);display:grid;gap:.7rem;grid-template-columns:4rem 1fr;padding:.7rem 0}.next time{color:var(--coral);font-weight:800}.text-action{background:transparent;border:0;color:var(--deep);font-weight:800;margin-top:.6rem;padding:0;text-decoration:underline}
    .note{align-items:flex-start;background:var(--ink);color:#fff;display:flex;gap:1rem}.note>span{align-items:center;background:var(--coral);border-radius:50%;display:flex;height:38px;justify-content:center;min-width:38px}.note p:last-child{color:#d4dfdc}
    @media(max-width:850px){.summary{grid-template-columns:1fr 1fr}.lower{grid-template-columns:1fr}}@media(max-width:520px){.heading{align-items:flex-start;flex-direction:column}.summary{grid-template-columns:1fr 1fr}}
  `,
})
export class DemoOverviewComponent {
  readonly store = inject(DemoSandboxStore);
  readonly editTrip = output<void>();
  readonly showItinerary = output<void>();
  readonly spent = computed(
    () => this.store.snapshot()?.expenses.reduce((sum, item) => sum + item.amount, 0) ?? 0,
  );
  readonly activityCount = computed(
    () =>
      this.store.snapshot()?.days.reduce((sum, day) => sum + day.activities.length, 0) ?? 0,
  );
  readonly locatedCount = computed(
    () => this.store.snapshot()?.places.filter((place) => Number.isFinite(place.latitude)).length ?? 0,
  );
  readonly planningProgress = computed(() => {
    const snapshot = this.store.snapshot();
    if (!snapshot) return 0;
    const populatedDays = snapshot.days.filter((day) => day.activities.length > 0).length;
    return Math.min(
      100,
      35 + populatedDays * 12 + Math.min(15, snapshot.places.length * 3) + (snapshot.expenses.length ? 10 : 0),
    );
  });
}
