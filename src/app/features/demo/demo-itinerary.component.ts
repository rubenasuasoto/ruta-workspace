import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ViewChild, inject, output } from '@angular/core';
import { FeedbackService } from '../../core/feedback.service';
import type { TravelMode } from '../../core/models';
import type { DemoActivity } from './demo-snapshot.model';
import { DemoAiDraftComponent } from './demo-ai-draft.component';
import { DemoSandboxStore } from './demo-sandbox.store';

@Component({
  selector: 'app-demo-itinerary',
  imports: [CurrencyPipe, DatePipe, DemoAiDraftComponent],
  template: `
    @if (store.snapshot(); as snapshot) {
      <section id="demo-itinerary" role="tabpanel" aria-label="Itinerario del viaje">
        <div class="heading">
          <div><p class="eyebrow">Itinerario</p><h2>El viaje, día a día.</h2></div>
          <button class="button coral" type="button" (click)="addActivity.emit(snapshot.days[0].id)">
            + Añadir actividad
          </button>
        </div>
        <app-demo-ai-draft />
        <div class="days">
          @for (day of snapshot.days; track day.id; let dayIndex = $index) {
            <article class="day-card">
              <header>
                <span>Día {{ dayIndex + 1 }}</span>
                <div><h3>{{ day.label }}</h3><p>{{ day.date | date: 'EEEE d MMMM' }}</p></div>
                <button
                  type="button"
                  class="add-day"
                  (click)="addActivity.emit(day.id)"
                  [attr.aria-label]="'Añadir actividad al día ' + (dayIndex + 1)"
                >＋</button>
              </header>
              <p class="base"><b>H</b> Salida desde {{ snapshot.base.name }}</p>
              @for (activity of day.activities; track activity.id; let index = $index; let last = $last) {
                <div class="activity" [class.done]="activity.completed">
                  <button
                    type="button"
                    class="check"
                    [attr.aria-pressed]="activity.completed"
                    [attr.aria-label]="(activity.completed ? 'Marcar como pendiente: ' : 'Marcar como completada: ') + activity.title"
                    (click)="store.toggleActivity(activity.id)"
                  >{{ activity.completed ? '✓' : '' }}</button>
                  <time>{{ activity.time }}</time>
                  <div class="activity-copy">
                    <strong>{{ activity.title }}</strong>
                    <small>{{ kindLabel(activity.kind) }} · {{ activity.locationName }}</small>
                    <p>{{ activity.notes }}</p>
                  </div>
                  @if (activity.cost > 0) {
                    <span>{{ activity.cost | currency: 'EUR' : 'symbol' : '1.0-0' }}</span>
                  }
                  <div class="activity-actions" aria-label="Acciones de actividad">
                    <button type="button" (click)="move(day.id, activity.id, -1)" [disabled]="index === 0" aria-label="Mover antes">↑</button>
                    <button type="button" (click)="move(day.id, activity.id, 1)" [disabled]="last" aria-label="Mover después">↓</button>
                    <button type="button" (click)="editActivity.emit({ dayId: day.id, activity })">Editar</button>
                    <button type="button" (click)="remove(day.id, activity)">Eliminar</button>
                  </div>
                </div>
                @if (!last) {
                  <p class="mode">{{ modeIcon(activity.travelModeToNext) }} {{ modeLabel(activity.travelModeToNext) }}</p>
                }
              }
              <p class="base return"><b>H</b> Regreso al hotel</p>
              @if (day.route.source === 'approximate') {
                <p class="route-warning">Este día ha cambiado. El mapa mostrará el orden previsto con una línea aproximada.</p>
              }
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .heading{align-items:end;display:flex;gap:1rem;justify-content:space-between;margin-bottom:1.5rem}.heading h2{font-size:clamp(2.5rem,5vw,4.6rem);line-height:1;margin:.35rem 0}.days{display:grid;gap:1.2rem}.day-card{background:var(--paper);border:1px solid var(--line);border-radius:1rem;padding:1.25rem}.day-card>header{align-items:center;border-bottom:1px solid var(--line);display:grid;gap:1rem;grid-template-columns:auto 1fr auto;padding-bottom:1rem}.day-card>header>span{color:var(--coral);font-size:.72rem;font-weight:800;text-transform:uppercase}.day-card h3{font-size:1.7rem;margin:0}.day-card header p{color:var(--muted);font-size:.78rem;margin:.2rem 0}
    .add-day{background:var(--ink);border:0;border-radius:50%;color:#fff;font-size:1.2rem;height:36px;width:36px}.base{align-items:center;color:var(--muted);display:flex;font-size:.75rem;gap:.5rem;margin:.9rem 0}.base b{align-items:center;background:#765328;border-radius:.35rem;color:#fff;display:flex;height:26px;justify-content:center;width:26px}.return{border-top:1px dashed var(--line);padding-top:.8rem}
    .activity{align-items:start;border-top:1px solid var(--line);display:grid;gap:.8rem;grid-template-columns:auto 3.5rem minmax(0,1fr) auto;padding:1rem 0}.activity.done{opacity:.58}.activity.done strong{text-decoration:line-through}.check{background:#fff;border:1px solid var(--line);border-radius:50%;color:var(--deep);height:28px;width:28px}.activity time{color:var(--coral);font-weight:800}.activity-copy strong{display:block}.activity-copy small,.activity-copy p{color:var(--muted);font-size:.72rem}.activity-copy p{line-height:1.5;margin:.35rem 0}.activity-actions{display:flex;gap:.3rem;grid-column:3/-1;justify-content:flex-end}.activity-actions button{background:transparent;border:1px solid var(--line);border-radius:2rem;font-size:.68rem;padding:.35rem .55rem}.activity-actions button:last-child{color:#9e3423}.mode{color:var(--muted);font-size:.68rem;margin:-.25rem 0 .15rem 5.8rem}.route-warning{background:#f3dfb9;border-radius:.55rem;color:#694c19;font-size:.72rem;padding:.7rem}
    @media(max-width:650px){.heading{align-items:flex-start;flex-direction:column}.activity{grid-template-columns:auto 3rem 1fr}.activity>span{grid-column:3}.activity-actions{grid-column:1/-1}.mode{margin-left:0}}
  `,
})
export class DemoItineraryComponent {
  readonly store = inject(DemoSandboxStore);
  readonly addActivity = output<string>();
  readonly editActivity = output<{ dayId: string; activity: DemoActivity }>();
  private readonly feedback = inject(FeedbackService);
  @ViewChild(DemoAiDraftComponent) private ai?: DemoAiDraftComponent;

  hasPendingChanges(): boolean {
    return !!this.ai?.hasPendingChanges();
  }

  move(dayId: string, activityId: string, direction: -1 | 1): void {
    this.store.moveActivity(dayId, activityId, direction);
    this.feedback.notify('Orden actualizado en esta demo.');
  }

  async remove(dayId: string, activity: DemoActivity): Promise<void> {
    if (
      await this.feedback.confirm({
        title: 'Eliminar actividad',
        message: `${activity.title} se eliminará de tu copia local de la demo.`,
        confirmLabel: 'Eliminar',
        danger: true,
      })
    ) {
      this.store.removeActivity(dayId, activity.id);
      this.feedback.notify('Actividad eliminada.', 'info');
    }
  }

  kindLabel(kind: DemoActivity['kind']): string {
    return { comida:'Comida', cultura:'Cultura', naturaleza:'Naturaleza', traslado:'Traslado', alojamiento:'Alojamiento', otro:'Experiencia' }[kind];
  }
  modeLabel(mode: TravelMode): string {
    return { walking:'A pie', cycling:'En bici', driving:'En coche' }[mode];
  }
  modeIcon(mode: TravelMode): string {
    return { walking:'●', cycling:'◇', driving:'■' }[mode];
  }
}
