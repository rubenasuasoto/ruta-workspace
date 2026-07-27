import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedbackService } from '../../core/feedback.service';
import type { DemoActivity } from './demo-snapshot.model';
import { DemoSandboxStore } from './demo-sandbox.store';

interface DemoDraftActivity extends Omit<DemoActivity, 'id' | 'completed'> {
  id: string;
  dayId: string;
  selected: boolean;
}

@Component({
  selector: 'app-demo-ai-draft',
  imports: [ReactiveFormsModule],
  template: `
    <section class="assistant" aria-labelledby="demo-ai-title">
      <header>
        <div>
          <p class="eyebrow">Simulación local</p>
          <h3 id="demo-ai-title">Prueba el borrador inteligente</h3>
          <p>La experiencia es realista, pero este resultado está preparado y no llama a OpenAI.</p>
        </div>
        <span aria-hidden="true">✦</span>
      </header>

      @if (draft().length === 0) {
        <form [formGroup]="form" (ngSubmit)="generate()">
          <label
            >Intereses
            <input formControlName="interests" placeholder="gastronomía, arquitectura, playa" />
          </label>
          <label
            >Ritmo
            <select formControlName="pace">
              <option value="relajado">Relajado</option>
              <option value="equilibrado">Equilibrado</option>
              <option value="intenso">Intenso</option>
            </select>
          </label>
          <label
            >Presupuesto adicional
            <input type="number" min="0" formControlName="budget" />
          </label>
          <button class="button coral" type="submit" [disabled]="loading()">
            {{ loading() ? 'Preparando borrador…' : 'Generar borrador simulado' }}
          </button>
        </form>
      } @else {
        <div class="draft-heading">
          <div>
            <strong>{{ selectedCount() }} propuestas seleccionadas</strong>
            <p>Edita y elige qué incorporar al itinerario.</p>
          </div>
          <button type="button" class="text-action" (click)="discard()">Descartar</button>
        </div>
        <div class="draft-list">
          @for (activity of draft(); track activity.id; let index = $index) {
            <article [class.unselected]="!activity.selected">
              <label class="select">
                <input
                  type="checkbox"
                  [checked]="activity.selected"
                  (change)="update(index, { selected: !activity.selected })"
                />
                Incluir propuesta
              </label>
              <div class="fields">
                <label
                  >Actividad
                  <input
                    [value]="activity.title"
                    (input)="update(index, { title: $any($event.target).value })"
                  />
                </label>
                <label
                  >Hora
                  <input
                    type="time"
                    [value]="activity.time"
                    (input)="update(index, { time: $any($event.target).value })"
                  />
                </label>
                <label
                  >Coste
                  <input
                    type="number"
                    min="0"
                    [value]="activity.cost"
                    (input)="update(index, { cost: +$any($event.target).value })"
                  />
                </label>
              </div>
              <small>{{ activity.locationName }} · {{ dayLabel(activity.dayId) }}</small>
            </article>
          }
        </div>
        <p class="notice">
          Horarios, costes y recomendaciones son estimaciones que deben comprobarse.
        </p>
        <footer>
          <button type="button" class="button secondary" (click)="discard()">Descartar</button>
          <button
            type="button"
            class="button coral"
            [disabled]="selectedCount() === 0"
            (click)="accept()"
          >
            Guardar selección
          </button>
        </footer>
      }
    </section>
  `,
  styles: `
    .assistant{background:linear-gradient(135deg,#fffdf9,#f3e6d4);border:1px solid var(--line);border-radius:1rem;margin:0 0 1.5rem;padding:1.35rem}
    header{align-items:flex-start;display:flex;justify-content:space-between}header h3{font-size:2rem;margin:.2rem 0}.assistant header p:last-child,.draft-heading p{color:var(--muted);font-size:.78rem;margin:.25rem 0}header>span{align-items:center;background:var(--ink);border-radius:50%;color:#fff;display:flex;font-size:1.2rem;height:42px;justify-content:center;width:42px}
    form{align-items:end;display:grid;gap:.8rem;grid-template-columns:2fr 1fr 1fr auto;margin-top:1.2rem}label{display:grid;font-size:.72rem;font-weight:800;gap:.35rem}input,select{background:#fffdfa;border:1px solid var(--line);border-radius:.55rem;font:inherit;padding:.68rem}
    .draft-heading{align-items:center;border-top:1px solid var(--line);display:flex;justify-content:space-between;margin-top:1rem;padding-top:1rem}.text-action{background:transparent;border:0;color:var(--deep);font-weight:800;text-decoration:underline}
    .draft-list{display:grid;gap:.7rem;margin-top:1rem}.draft-list article{background:#fffdfa;border:1px solid var(--line);border-radius:.7rem;padding:.9rem}.draft-list article.unselected{opacity:.55}.select{align-items:center;display:flex;gap:.45rem;margin-bottom:.65rem}.fields{display:grid;gap:.65rem;grid-template-columns:2fr 1fr 1fr}.draft-list small{color:var(--muted);display:block;margin-top:.55rem}
    .notice{background:#f3dfb9;border-radius:.55rem;color:#694c19;font-size:.74rem;padding:.7rem}footer{display:flex;gap:.7rem;justify-content:flex-end}@media(max-width:850px){form,.fields{grid-template-columns:1fr 1fr}form label:first-child,.fields label:first-child{grid-column:1/-1}}@media(max-width:520px){form,.fields{grid-template-columns:1fr}form label:first-child,.fields label:first-child{grid-column:auto}}
  `,
})
export class DemoAiDraftComponent {
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  readonly store = inject(DemoSandboxStore);
  readonly loading = signal(false);
  readonly draft = signal<DemoDraftActivity[]>([]);
  readonly selectedCount = computed(() => this.draft().filter((item) => item.selected).length);

  readonly form = this.fb.nonNullable.group({
    interests: ['gastronomía, arquitectura y mar', Validators.required],
    pace: ['equilibrado', Validators.required],
    budget: [90, [Validators.required, Validators.min(0)]],
  });

  hasPendingChanges(): boolean {
    return this.draft().length > 0;
  }

  async generate(): Promise<void> {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.loading.set(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const snapshot = this.store.snapshot();
    if (!snapshot || snapshot.days.length < 3 || !snapshot.places.length) {
      this.loading.set(false);
      this.feedback.notify('Añade al menos un lugar o restaura la demo para generar propuestas.', 'info');
      return;
    }
    const [firstDay, secondDay, thirdDay] = snapshot.days;
    const [fallback, second, third, fourth] = snapshot.places;
    const market = snapshot.places.find((place) => place.id === 'demo-place-1') ?? fallback;
    const arts = snapshot.places.find((place) => place.id === 'demo-place-3') ?? second ?? fallback;
    const cabanyal =
      snapshot.places.find((place) => place.id === 'demo-place-2') ?? third ?? fourth ?? fallback;
    this.draft.set([
      this.proposal('Horchata y fartons en el centro', '17:00', 'comida', 12, firstDay.id, market),
      this.proposal(
        'Paseo fotográfico junto al Umbracle',
        '18:15',
        'cultura',
        0,
        secondDay.id,
        arts,
      ),
      this.proposal(
        'Cena tranquila cerca del Cabanyal',
        '20:30',
        'comida',
        28,
        thirdDay.id,
        cabanyal,
      ),
    ]);
    this.loading.set(false);
  }

  update(index: number, patch: Partial<DemoDraftActivity>): void {
    this.draft.update((items) =>
      items.map((item, current) => (current === index ? { ...item, ...patch } : item)),
    );
  }

  discard(): void {
    this.draft.set([]);
  }

  accept(): void {
    const count = this.store.acceptDraft(
      this.draft().map((item) => ({ ...item, completed: false })),
    );
    this.draft.set([]);
    this.feedback.notify(
      `${count} ${count === 1 ? 'actividad añadida' : 'actividades añadidas'} al itinerario.`,
    );
  }

  dayLabel(dayId: string): string {
    return this.store.snapshot()?.days.find((day) => day.id === dayId)?.label ?? '';
  }

  private proposal(
    title: string,
    time: string,
    kind: DemoActivity['kind'],
    cost: number,
    dayId: string,
    place: NonNullable<ReturnType<typeof this.store.snapshot>>['places'][number],
  ): DemoDraftActivity {
    return {
      id: `proposal-${dayId}-${time}`,
      dayId,
      selected: true,
      title,
      time,
      kind,
      cost,
      notes: `Propuesta local basada en ${this.form.controls.interests.value}.`,
      travelModeToNext: 'walking',
      locationName: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    };
  }
}
