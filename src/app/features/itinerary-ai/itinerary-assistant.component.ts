import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivityKind } from '../../core/models';
import { TripStore } from '../../core/trip-store.service';
import { ItineraryAiService } from './itinerary-ai.service';

@Component({
  selector: 'app-itinerary-assistant',
  imports: [ReactiveFormsModule, DatePipe],
  providers: [ItineraryAiService],
  template: `
    <section class="assistant card" aria-labelledby="assistant-title">
      <header>
        <div>
          <p class="eyebrow">Copiloto de viaje</p>
          <h3 id="assistant-title">Propón una primera ruta</h3>
          <p>Genera ideas a partir de tus intereses y decide después cuáles incorporar.</p>
        </div>
        <span class="ai-mark" aria-hidden="true">✦</span>
      </header>

      @if (!ai.draft()) {
        <form [formGroup]="form" (ngSubmit)="generate()">
          <div class="form-grid">
            <div class="field full">
              <label for="interests">Intereses</label>
              <input id="interests" formControlName="interests" placeholder="Gastronomía, arquitectura, naturaleza">
              <small>Sepáralos con comas. No incluyas información personal.</small>
              @if (form.controls.interests.touched && form.controls.interests.invalid) { <span class="error">Añade al menos un interés.</span> }
            </div>
            <div class="field">
              <label for="pace">Ritmo</label>
              <select id="pace" formControlName="pace">
                <option value="relajado">Relajado</option>
                <option value="equilibrado">Equilibrado</option>
                <option value="intenso">Intenso</option>
              </select>
            </div>
            <div class="field">
              <label for="ai-budget">Presupuesto orientativo (€)</label>
              <input id="ai-budget" type="number" min="0" formControlName="budget" placeholder="Opcional">
            </div>
          </div>

          @if (store.places().length) {
            <fieldset>
              <legend>Lugares guardados que quieres considerar</legend>
              <div class="places">
                @for (place of store.places(); track place.id) {
                  <label>
                    <input type="checkbox" [checked]="selectedPlaces().has(place.id)" (change)="togglePlace(place.id)">
                    <span><strong>{{ place.name }}</strong><small>{{ place.city }} · {{ place.category }}</small></span>
                  </label>
                }
              </div>
            </fieldset>
          }

          @if (ai.error()) { <p class="assistant-error" role="alert">{{ ai.error() }}</p> }
          <div class="actions">
            <p>La generación está limitada para proteger tu cuenta.</p>
            <button class="button coral" type="submit" [disabled]="ai.loading()">
              {{ ai.loading() ? 'Imaginando la ruta…' : 'Generar borrador' }}
            </button>
          </div>
        </form>
      } @else if (ai.draft(); as draft) {
        <div class="draft-head">
          <div><strong>{{ ai.selectedCount() }} actividades seleccionadas</strong><p>Edita los detalles antes de guardar.</p></div>
          <button class="text-button" type="button" (click)="ai.discard()">Descartar borrador</button>
        </div>

        <div class="draft-days">
          @for (day of draft.days; track day.date; let dayIndex = $index) {
            <article>
              <h4>{{ day.date | date:'EEEE, d MMMM' }}</h4>
              @for (activity of day.activities; track activity.id; let activityIndex = $index) {
                <div class="draft-activity" [class.unselected]="!activity.selected">
                  <label class="select-activity">
                    <input type="checkbox" [checked]="activity.selected" (change)="ai.updateActivity(dayIndex, activityIndex, { selected: !activity.selected })">
                    Incluir
                  </label>
                  <div class="edit-grid">
                    <div class="field title">
                      <label [for]="'draft-title-'+activity.id">Actividad</label>
                      <input [id]="'draft-title-'+activity.id" [value]="activity.title" (input)="ai.updateActivity(dayIndex, activityIndex, { title: $any($event.target).value })">
                    </div>
                    <div class="field">
                      <label [for]="'draft-time-'+activity.id">Hora</label>
                      <input [id]="'draft-time-'+activity.id" type="time" [value]="activity.time" (input)="ai.updateActivity(dayIndex, activityIndex, { time: $any($event.target).value })">
                    </div>
                    <div class="field">
                      <label [for]="'draft-kind-'+activity.id">Tipo</label>
                      <select [id]="'draft-kind-'+activity.id" [value]="activity.kind" (change)="updateKind(dayIndex, activityIndex, $any($event.target).value)">
                        <option value="comida">Comida</option><option value="cultura">Cultura</option>
                        <option value="naturaleza">Naturaleza</option><option value="traslado">Traslado</option>
                        <option value="alojamiento">Alojamiento</option><option value="otro">Otro</option>
                      </select>
                    </div>
                    <div class="field">
                      <label [for]="'draft-cost-'+activity.id">Coste estimado</label>
                      <input [id]="'draft-cost-'+activity.id" type="number" min="0" [value]="activity.estimatedCost ?? ''" (input)="updateCost(dayIndex, activityIndex, $any($event.target).value)">
                    </div>
                    <div class="field notes">
                      <label [for]="'draft-notes-'+activity.id">Notas</label>
                      <textarea [id]="'draft-notes-'+activity.id" [value]="activity.notes" (input)="ai.updateActivity(dayIndex, activityIndex, { notes: $any($event.target).value })"></textarea>
                    </div>
                  </div>
                </div>
              }
            </article>
          }
        </div>

        <p class="disclaimer">⚠ {{ draft.disclaimer }}</p>
        @if (ai.error()) { <p class="assistant-error" role="alert">{{ ai.error() }}</p> }
        @if (savedMessage()) { <p class="saved" role="status">{{ savedMessage() }}</p> }
        <div class="actions">
          <button class="button secondary" type="button" (click)="ai.discard()">Descartar</button>
          <button class="button coral" type="button" (click)="accept()" [disabled]="ai.saving() || ai.selectedCount() === 0">
            {{ ai.saving() ? 'Guardando…' : 'Guardar selección' }}
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .assistant{background:linear-gradient(135deg,#fffdf9,#f4e9db);margin-bottom:2rem;padding:1.5rem}.assistant>header{align-items:flex-start;display:flex;justify-content:space-between}.assistant h3{font-size:2rem;margin:.2rem 0}.assistant header p:not(.eyebrow){color:var(--muted);font-size:.84rem}.ai-mark{align-items:center;background:var(--ink);border-radius:50%;color:white;display:flex;font-size:1.3rem;height:44px;justify-content:center;width:44px}.field small{color:var(--muted);font-size:.7rem}fieldset{border:0;border-top:1px solid var(--line);margin:1.4rem 0 0;padding:1.2rem 0 0}legend{font-size:.78rem;font-weight:700;padding-right:.7rem}.places{display:grid;gap:.55rem;grid-template-columns:repeat(3,1fr)}.places label{align-items:flex-start;background:rgba(255,255,255,.65);border:1px solid var(--line);border-radius:.6rem;display:flex;font-size:.77rem;gap:.5rem;padding:.65rem}.places small{color:var(--muted);display:block;margin-top:.1rem}.actions{align-items:center;display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.3rem}.actions p{color:var(--muted);font-size:.72rem;margin:0 auto 0 0}.draft-head{align-items:center;border-top:1px solid var(--line);display:flex;justify-content:space-between;padding-top:1rem}.draft-head p{color:var(--muted);font-size:.76rem;margin:.15rem 0}.draft-days{display:grid;gap:1rem;margin-top:1rem}.draft-days>article{background:rgba(255,255,255,.68);border:1px solid var(--line);border-radius:.8rem;padding:1rem}.draft-days h4{font-family:var(--font-display);font-size:1.2rem;margin:.1rem 0 .8rem;text-transform:capitalize}.draft-activity{border-top:1px solid var(--line);padding:1rem 0}.draft-activity.unselected{opacity:.55}.select-activity{display:block;font-size:.75rem;font-weight:700;margin-bottom:.7rem}.edit-grid{display:grid;gap:.7rem;grid-template-columns:1.7fr repeat(3,1fr)}.edit-grid .notes{grid-column:1/-1}.edit-grid textarea{min-height:3.7rem}.assistant-error,.saved,.disclaimer{border-radius:.55rem;font-size:.78rem;padding:.75rem}.assistant-error{background:#fff0ec;color:#9e3423}.saved{background:#dce9d8}.disclaimer{background:#f2e4c9;color:#6f521d;margin-top:1rem}@media(max-width:800px){.places{grid-template-columns:1fr}.edit-grid{grid-template-columns:1fr 1fr}.edit-grid .title,.edit-grid .notes{grid-column:1/-1}.actions{align-items:stretch;flex-direction:column}.actions p{margin:0}.draft-head{align-items:flex-start;flex-direction:column;gap:.5rem}}
  `,
})
export class ItineraryAssistantComponent {
  readonly tripId = input.required<string>();
  readonly ai = inject(ItineraryAiService);
  readonly store = inject(TripStore);
  private readonly fb = inject(FormBuilder);

  readonly selectedPlaces = signal(new Set<string>());
  readonly savedMessage = signal('');
  readonly form = this.fb.group({
    interests: ['', Validators.required],
    pace: this.fb.nonNullable.control<'relajado' | 'equilibrado' | 'intenso'>('equilibrado'),
    budget: this.fb.control<number | null>(null, Validators.min(0)),
  });

  togglePlace(placeId: string): void {
    this.selectedPlaces.update((current) => {
      const next = new Set(current);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  async generate(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const interests = [...new Set((value.interests ?? '').split(',').map((item) => item.trim()).filter(Boolean))];
    if (!interests.length) {
      this.form.controls.interests.setErrors({ required: true });
      return;
    }
    this.savedMessage.set('');
    await this.ai.generate(this.tripId(), {
      interests,
      pace: value.pace,
      budget: value.budget ?? undefined,
      savedPlaceIds: [...this.selectedPlaces()],
    });
  }

  updateKind(dayIndex: number, activityIndex: number, kind: ActivityKind): void {
    this.ai.updateActivity(dayIndex, activityIndex, { kind });
  }

  updateCost(dayIndex: number, activityIndex: number, raw: string): void {
    const value = raw.trim() === '' ? undefined : Number(raw);
    this.ai.updateActivity(dayIndex, activityIndex, { estimatedCost: value });
  }

  async accept(): Promise<void> {
    const count = await this.ai.acceptSelected(this.tripId());
    if (count) this.savedMessage.set(`${count} actividades incorporadas al itinerario.`);
  }
}
