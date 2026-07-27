import { DatePipe } from '@angular/common';
import { Component, ViewChild, input, output, signal } from '@angular/core';
import type { DemoSnapshot } from './demo-snapshot.model';
import { DemoBudgetComponent } from './demo-budget.component';
import { DemoCaseStudyComponent } from './demo-case-study.component';
import { DemoEditorComponent } from './demo-editor.component';
import { DemoItineraryComponent } from './demo-itinerary.component';
import { DemoMapComponent } from './demo-map.component';
import { DemoOverviewComponent } from './demo-overview.component';
import { DemoPlacesComponent } from './demo-places.component';

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
  imports: [
    DatePipe,
    DemoBudgetComponent,
    DemoCaseStudyComponent,
    DemoEditorComponent,
    DemoItineraryComponent,
    DemoMapComponent,
    DemoOverviewComponent,
    DemoPlacesComponent,
  ],
  template: `
    <div class="demo-banner" role="status">
      Demo de portafolio · viaje ficticio con ubicaciones reales · autoguardado local
    </div>

    <article class="trip-cover">
      <img [src]="snapshot().trip.coverImage" alt="" />
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
        >{{ tab.label }}</button>
      }
    </nav>

    <div class="workspace">
      <app-demo-overview
        [hidden]="activeTab() !== 'overview'"
        (editTrip)="editor.openTrip()"
        (showItinerary)="selectTab('itinerary')"
      />
      <app-demo-itinerary
        #itinerary
        [hidden]="activeTab() !== 'itinerary'"
        (addActivity)="editor.openActivity($event)"
        (editActivity)="editor.openActivity($event.dayId, $event.activity)"
      />
      <app-demo-budget
        [hidden]="activeTab() !== 'budget'"
        (addExpense)="editor.openExpense()"
        (editExpense)="editor.openExpense($event)"
      />
      <app-demo-map #map [hidden]="activeTab() !== 'map'" />
      <app-demo-places
        [hidden]="activeTab() !== 'places'"
        (addPlace)="editor.openPlace()"
        (editPlace)="editor.openPlace($event)"
      />
      <section [hidden]="activeTab() !== 'project'" id="demo-project" role="tabpanel" aria-label="Presentación técnica de Ruta">
        <div class="project-heading"><p class="eyebrow">Detrás de Ruta</p><h2>También puedes mirar bajo el capó.</h2></div>
        <app-demo-case-study />
      </section>
    </div>

    <footer class="demo-footer">
      <div><p class="eyebrow">Fin del recorrido</p><h2>Los viajes reales están protegidos por invitación.</h2></div>
      <button class="button coral" type="button" (click)="exitRequested.emit()">Salir de la demo</button>
    </footer>

    <app-demo-editor #editor />
  `,
  styles: `
    :host{display:block}.demo-banner{background:var(--coral);color:#fff;font-size:.73rem;font-weight:800;letter-spacing:.07em;padding:.65rem;text-align:center;text-transform:uppercase}
    .trip-cover{min-height:460px;overflow:hidden;position:relative}.trip-cover:after{background:linear-gradient(90deg,#102c2de8 0%,#102c2da8 42%,transparent 78%);content:'';inset:0;position:absolute}.trip-cover>img{height:100%;inset:0;object-fit:cover;position:absolute;width:100%}.trip-cover>div{color:#fff;max-width:700px;padding:clamp(3rem,8vw,7rem);position:relative;z-index:1}.trip-cover h1{font-size:clamp(4rem,10vw,8rem);line-height:.88;margin:.5rem 0 1rem}.trip-cover>div>p:not(.eyebrow){color:#e3ece9;line-height:1.6}.trip-cover .dates{font-weight:800}.status{background:#f2dfc3;border-radius:2rem;color:var(--deep);display:inline-block;font-size:.7rem;font-weight:800;margin-top:1rem;padding:.55rem .8rem;text-transform:uppercase}
    .trip-tabs{background:var(--paper);border-bottom:1px solid var(--line);display:flex;gap:.3rem;overflow-x:auto;padding:0 max(1rem,calc((100vw - 1240px)/2));position:sticky;top:72px;z-index:20}.trip-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;color:var(--muted);font-weight:800;padding:1rem}.trip-tabs button.active{border-bottom-color:var(--coral);color:var(--deep)}
    .workspace{margin:0 auto;max-width:1240px;padding:clamp(2rem,5vw,4rem) 1rem}.workspace>[hidden]{display:none!important}.project-heading h2{font-size:clamp(2.5rem,5vw,4.6rem);line-height:1;margin:.35rem 0}
    .demo-footer{align-items:center;background:var(--ink);border-radius:1rem;color:#fff;display:flex;gap:2rem;justify-content:space-between;margin:2rem auto;max-width:1240px;padding:clamp(1.5rem,5vw,3.5rem)}.demo-footer .eyebrow{color:#f7c7bd}.demo-footer h2{font-size:clamp(2rem,4vw,3.7rem);margin:.4rem 0}.demo-footer .button{white-space:nowrap}
    @media(max-width:700px){.trip-cover{min-height:410px}.trip-cover:after{background:linear-gradient(90deg,#102c2de8,#102c2d9c)}.trip-cover>div{padding:3rem 1.3rem}.trip-tabs{top:64px}.demo-footer{align-items:flex-start;border-radius:0;flex-direction:column;margin-bottom:0}}
  `,
})
export class DemoWorkspaceComponent {
  readonly snapshot = input.required<DemoSnapshot>();
  readonly exitRequested = output<void>();
  readonly activeTab = signal<DemoTab>('overview');
  readonly availableTabs = tabs;

  @ViewChild('editor') readonly editor!: DemoEditorComponent;
  @ViewChild('itinerary') private itinerary?: DemoItineraryComponent;
  @ViewChild('map') private map?: DemoMapComponent;

  selectTab(tab: DemoTab): void {
    this.activeTab.set(tab);
    if (tab === 'map' && !this.map?.selectedDayId()) this.map?.selectFirstDay();
  }

  hasPendingChanges(): boolean {
    return !!this.editor?.hasPendingChanges() || !!this.itinerary?.hasPendingChanges();
  }
}
