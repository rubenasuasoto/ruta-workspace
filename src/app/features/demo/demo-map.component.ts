import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type { TravelMode } from '../../core/models';
import { TravelMapComponent } from '../map/travel-map.component';
import { demoMapLines, demoMapPoints } from './demo-snapshot.model';
import { DemoSandboxStore } from './demo-sandbox.store';

@Component({
  selector: 'app-demo-map',
  imports: [DecimalPipe, TravelMapComponent],
  template: `
    @if (store.snapshot(); as snapshot) {
      <section id="demo-map" role="tabpanel" aria-label="Mapa y rutas del viaje">
        <div class="heading"><p class="eyebrow">Mapa y rutas</p><h2>Del plan al terreno.</h2></div>
        <div class="filters" aria-label="Filtrar mapa por día">
          <button type="button" [class.active]="selectedDayId() === ''" (click)="selectedDayId.set('')">Todo</button>
          @for (day of snapshot.days; track day.id; let index = $index) {
            <button type="button" [class.active]="selectedDayId() === day.id" (click)="selectedDayId.set(day.id)">Día {{ index + 1 }}</button>
          }
        </div>
        <div class="layout">
          <app-travel-map
            [points]="mapPoints()"
            [lines]="mapLines()"
            [tilesEnabled]="false"
            [localOverlay]="localMapOverlay"
            [directionsEnabled]="true"
            ariaLabel="Mapa local de Valencia con recorridos guardados"
          />
          <aside>
            <p class="eyebrow">Recorrido previsto</p>
            <div class="hotel"><b>H</b><div><small>Base del viaje</small><strong>{{ snapshot.base.name }}</strong></div></div>
            @if (selectedDay(); as day) {
              <h3>{{ day.label }}</h3>
              @if (day.route.source === 'frozen') {
                <strong>{{ day.route.totalDistanceMeters / 1000 | number: '1.1-1' }} km</strong>
                <p>{{ durationLabel(day.route.totalDurationSeconds) }} en movimiento</p>
                @for (leg of day.route.legs; track leg.id) {
                  <div class="leg"><span>{{ modeIcon(leg.mode) }}</span><div><strong>{{ routeStopLabel(leg.fromActivityId) }} → {{ routeStopLabel(leg.toActivityId) }}</strong><small>{{ modeLabel(leg.mode) }} · {{ leg.distanceMeters / 1000 | number:'1.1-1' }} km</small></div></div>
                }
              } @else {
                <p class="approx">Has modificado este día. La línea discontinua muestra el orden previsto desde el hotel, no una ruta de navegación.</p>
                @for (activity of day.activities; track activity.id; let index = $index) {
                  <div class="leg"><span>{{ index + 1 }}</span><div><strong>{{ activity.title }}</strong><small>{{ activity.locationName }}</small></div></div>
                }
              }
            } @else {
              <h3>Los tres días</h3><p>Selecciona un día para consultar el recorrido y sus paradas.</p>
            }
            <small class="attribution">{{ snapshot.source.attribution }}</small>
          </aside>
        </div>
        <p class="estimate">La demo usa un mapa local y geometrías calculadas previamente. Solo se abre Google Maps cuando pulsas voluntariamente un marcador.</p>
      </section>
    }
  `,
  styles: `
    .heading h2{font-size:clamp(2.5rem,5vw,4.6rem);line-height:1;margin:.35rem 0 1.4rem}.filters{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}.filters button{background:transparent;border:1px solid var(--line);border-radius:2rem;padding:.55rem .85rem}.filters button.active{background:var(--ink);color:#fff}.layout{display:grid;gap:1rem;grid-template-columns:minmax(0,1.6fr) minmax(280px,.7fr);min-height:570px}.layout app-travel-map{height:570px}.layout aside{background:var(--paper);border:1px solid var(--line);border-radius:1rem;overflow:auto;padding:1.2rem}.layout aside>h3{font-size:1.7rem;margin:.8rem 0}.hotel{align-items:center;border-bottom:1px solid var(--line);display:flex;gap:.7rem;padding:.7rem 0}.hotel>b{align-items:center;background:#765328;border-radius:.35rem;color:#fff;display:flex;height:34px;justify-content:center;width:34px}.hotel small,.leg small{color:var(--muted);display:block;font-size:.68rem}.leg{align-items:start;border-top:1px solid var(--line);display:grid;gap:.7rem;grid-template-columns:1.4rem 1fr;padding:.75rem 0}.leg>span{color:var(--coral);font-weight:800}.leg strong{font-size:.76rem}.approx{background:#f3dfb9;border-radius:.55rem;color:#694c19;font-size:.72rem;line-height:1.5;padding:.7rem}.attribution,.estimate{color:var(--muted);font-size:.68rem}.attribution{display:block;margin-top:1rem}.estimate{line-height:1.5}
    @media(max-width:850px){.layout{grid-template-columns:1fr}.layout app-travel-map{height:440px}.layout aside{max-height:none}}@media(max-width:520px){.layout app-travel-map{height:360px}}
  `,
})
export class DemoMapComponent {
  readonly store = inject(DemoSandboxStore);
  readonly selectedDayId = signal('');
  readonly selectedDay = computed(() => this.store.snapshot()?.days.find((day) => day.id === this.selectedDayId()) ?? null);
  readonly mapPoints = computed(() => {
    const snapshot = this.store.snapshot();
    return snapshot ? demoMapPoints(snapshot, this.selectedDayId() || undefined) : [];
  });
  readonly mapLines = computed(() => {
    const snapshot = this.store.snapshot();
    return snapshot ? demoMapLines(snapshot, this.selectedDayId() || undefined) : [];
  });
  readonly localMapOverlay = { url:'/assets/demo/valencia-map.svg', bounds:[[39.44,-0.42],[39.5,-0.3]] as [[number,number],[number,number]], attribution:'Mapa esquemático local de Ruta' };

  selectFirstDay(): void {
    this.selectedDayId.set(this.store.snapshot()?.days[0]?.id ?? '');
  }
  routeStopLabel(id: string): string {
    const snapshot = this.store.snapshot();
    if (!snapshot) return 'Parada';
    if (id === snapshot.base.id) return 'Hotel';
    return snapshot.days.flatMap((day) => day.activities).find((item) => item.id === id)?.title ?? 'Parada';
  }
  durationLabel(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
  }
  modeLabel(mode: TravelMode): string { return { walking:'A pie', cycling:'En bici', driving:'En coche' }[mode]; }
  modeIcon(mode: TravelMode): string { return { walking:'●', cycling:'◇', driving:'■' }[mode]; }
}
