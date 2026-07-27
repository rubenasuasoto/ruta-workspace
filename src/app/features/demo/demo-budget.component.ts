import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, output } from '@angular/core';
import { FeedbackService } from '../../core/feedback.service';
import type { DemoExpense, DemoExpenseCategory } from './demo-snapshot.model';
import { DemoSandboxStore } from './demo-sandbox.store';

@Component({
  selector: 'app-demo-budget',
  imports: [CurrencyPipe],
  template: `
    @if (store.snapshot(); as snapshot) {
      <section id="demo-budget" role="tabpanel" aria-label="Presupuesto del viaje">
        <div class="heading">
          <div><p class="eyebrow">Presupuesto</p><h2>Gastar con contexto.</h2></div>
          <button type="button" class="button coral" (click)="addExpense.emit()">+ Añadir gasto</button>
        </div>
        <div class="layout">
          <article class="total">
            <small>Total previsto</small>
            <strong>{{ spent() | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
            <p>
              Quedan {{ snapshot.trip.budget - spent() | currency: 'EUR' : 'symbol' : '1.0-0' }}
              de margen
            </p>
            <div class="ring" role="img" [attr.aria-label]="percent() + '% del presupuesto utilizado'" [style.--value]="percent() + '%'">
              <span>{{ percent() }}%</span>
            </div>
          </article>
          <div class="expenses">
            @for (expense of snapshot.expenses; track expense.id) {
              <article>
                <span class="icon" aria-hidden="true">{{ expenseIcon(expense.category) }}</span>
                <div><strong>{{ expense.title }}</strong><small>{{ expenseLabel(expense.category) }}</small></div>
                <b>{{ expense.amount | currency: 'EUR' : 'symbol' : '1.0-0' }}</b>
                <div class="actions">
                  <button type="button" (click)="editExpense.emit(expense)">Editar</button>
                  <button type="button" (click)="remove(expense)">Eliminar</button>
                </div>
              </article>
            } @empty {
              <div class="empty"><h3>Aún no hay gastos</h3><p>Añade el primero para probar el resumen.</p></div>
            }
          </div>
        </div>
        <div class="categories" aria-label="Gasto por categorías">
          @for (category of categoryTotals(); track category.category) {
            <div>
              <span>{{ expenseLabel(category.category) }}</span>
              <i><b [style.width.%]="category.percent"></b></i>
              <strong>{{ category.amount | currency: 'EUR' : 'symbol' : '1.0-0' }}</strong>
            </div>
          }
        </div>
        <p class="estimate">Los importes son ficticios y se incluyen únicamente para mostrar el funcionamiento del presupuesto.</p>
      </section>
    }
  `,
  styles: `
    .heading{align-items:end;display:flex;justify-content:space-between;margin-bottom:1.5rem}.heading h2{font-size:clamp(2.5rem,5vw,4.6rem);line-height:1;margin:.35rem 0}.layout{display:grid;gap:1.2rem;grid-template-columns:minmax(260px,.7fr) 1.3fr}.total{align-items:center;background:var(--ink);border-radius:1rem;color:#fff;display:flex;flex-direction:column;justify-content:center;min-height:360px;padding:1.5rem;text-align:center}.total>small,.total>p{color:#d1dedb}.total>strong{font-family:var(--font-display);font-size:4.5rem}.ring{align-items:center;background:conic-gradient(var(--coral) var(--value),#ffffff24 0);border-radius:50%;display:flex;height:130px;justify-content:center;margin-top:1rem;width:130px}.ring:before{background:var(--ink);border-radius:50%;content:'';height:98px;position:absolute;width:98px}.ring span{font-weight:800;position:relative}
    .expenses{display:grid;gap:.7rem}.expenses>article{align-items:center;background:var(--paper);border:1px solid var(--line);border-radius:.75rem;display:grid;gap:.8rem;grid-template-columns:auto 1fr auto;padding:1rem}.icon{align-items:center;background:#f0dfd0;border-radius:50%;display:flex;height:38px;justify-content:center;width:38px}.expenses small{color:var(--muted);display:block;font-size:.7rem}.actions{display:flex;gap:.4rem;grid-column:2/-1;justify-content:flex-end}.actions button{background:transparent;border:0;font-size:.68rem;text-decoration:underline}.actions button:last-child{color:#9e3423}.empty{border:1px dashed var(--line);border-radius:.8rem;padding:2rem;text-align:center}.empty p{color:var(--muted)}
    .categories{background:#fffdfa;border:1px solid var(--line);border-radius:1rem;display:grid;gap:.8rem;margin-top:1.2rem;padding:1.2rem}.categories>div{align-items:center;display:grid;gap:.8rem;grid-template-columns:8rem 1fr 5rem}.categories span{font-size:.72rem}.categories i{background:#e4ded4;border-radius:2rem;height:8px;overflow:hidden}.categories i b{background:var(--coral);display:block;height:100%}.categories>div>strong{text-align:right}.estimate{color:var(--muted);font-size:.72rem}
    @media(max-width:760px){.heading{align-items:flex-start;flex-direction:column;gap:1rem}.layout{grid-template-columns:1fr}.total{min-height:310px}}@media(max-width:480px){.categories>div{grid-template-columns:1fr auto}.categories i{grid-column:1/-1;grid-row:2}.expenses>article{grid-template-columns:auto 1fr}.expenses>article>b{grid-column:2}.actions{grid-column:1/-1}}
  `,
})
export class DemoBudgetComponent {
  readonly store = inject(DemoSandboxStore);
  readonly addExpense = output<void>();
  readonly editExpense = output<DemoExpense>();
  private readonly feedback = inject(FeedbackService);
  readonly spent = computed(() => this.store.snapshot()?.expenses.reduce((sum, item) => sum + item.amount, 0) ?? 0);
  readonly percent = computed(() => Math.min(100, Math.round((this.spent() / Math.max(1, this.store.snapshot()?.trip.budget ?? 1)) * 100)));
  readonly categoryTotals = computed(() => {
    const expenses = this.store.snapshot()?.expenses ?? [];
    const maximum = Math.max(1, ...expenses.map((item) => item.amount));
    return (['accommodation','food','transport','activities','other'] as DemoExpenseCategory[])
      .map((category) => ({ category, amount: expenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0) }))
      .filter((item) => item.amount > 0)
      .map((item) => ({ ...item, percent: Math.round((item.amount / maximum) * 100) }));
  });

  async remove(expense: DemoExpense): Promise<void> {
    if (await this.feedback.confirm({ title:'Eliminar gasto', message:`${expense.title} se eliminará de la demo.`, confirmLabel:'Eliminar', danger:true })) {
      this.store.removeExpense(expense.id);
      this.feedback.notify('Gasto eliminado.', 'info');
    }
  }
  expenseLabel(category: DemoExpenseCategory): string {
    return { accommodation:'Alojamiento', food:'Comida', transport:'Transporte', activities:'Actividades', other:'Otros' }[category];
  }
  expenseIcon(category: DemoExpenseCategory): string {
    return { accommodation:'⌂', food:'○', transport:'↗', activities:'◇', other:'+' }[category];
  }
}
