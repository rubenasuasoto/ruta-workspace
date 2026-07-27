import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MapPoint } from '../../core/models';
import { GeocodingService } from './geocoding.service';
import { TravelMapComponent } from './travel-map.component';

export interface LocationSelection {
  address: string;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-location-picker',
  imports: [FormsModule, TravelMapComponent],
  template: `
    <section class="picker" aria-labelledby="location-title">
      <div class="search-row">
        <div>
          <label id="location-title" for="location-query">Ubicación</label>
          <small>Busca al pulsar el botón; no enviamos búsquedas mientras escribes.</small>
        </div>
        <div class="search">
          <input id="location-query" [(ngModel)]="query" [ngModelOptions]="{standalone:true}" placeholder="Ej. Casa Milà, Barcelona" minlength="3" maxlength="200">
          <button class="button small secondary" type="button" (click)="search()" [disabled]="!geo.enabled() || geo.loading() || query.trim().length < 3">
            {{ geo.loading() ? 'Buscando…' : 'Buscar' }}
          </button>
        </div>
      </div>
      @if (!geo.enabled()) {
        <p class="notice" role="status">La búsqueda geográfica estará disponible cuando se configure el servicio de mapas.</p>
      }
      @if (geo.error()) { <p class="error" role="alert">{{ geo.error() }}</p> }
      @if (geo.stale()) { <p class="notice" role="status">Mostramos un resultado guardado porque el proveedor no respondió.</p> }
      @if (results().length) {
        <ul class="results" aria-label="Resultados de ubicación">
          @for (result of results(); track result.id) {
            <li><button type="button" (click)="choose(result.label, result.latitude, result.longitude)">
              <strong>{{ result.label }}</strong><span>{{ result.category }}</span>
            </button></li>
          }
        </ul>
      }
      @if (geo.attribution()) {
        <p class="attribution">{{ geo.attribution() }}</p>
      }
      @if (selection(); as selected) {
        <div class="selected">
          <div><strong>{{ selected.address }}</strong><small>{{ selected.latitude }}, {{ selected.longitude }}</small></div>
          <button type="button" class="text-button" (click)="clear()">Quitar ubicación</button>
        </div>
        <app-travel-map
          [points]="mapPoints()"
          [editable]="true"
          ariaLabel="Ajustar la ubicación seleccionada"
          (locationChanged)="move($event)"
        />
        <small class="hint">Arrastra el marcador o pulsa otro punto del mapa para ajustarlo.</small>
      }
    </section>
  `,
  styles: `
    .picker{border-top:1px solid var(--line);grid-column:1/-1;margin-top:.3rem;padding-top:1rem}.search-row>div:first-child{display:flex;flex-direction:column}.search-row label{font-size:.78rem;font-weight:700}.search-row small,.hint,.attribution{color:var(--muted);font-size:.7rem}.search{display:flex;gap:.55rem;margin-top:.6rem}.search input{background:#fffdfa;border:1px solid var(--line);border-radius:.55rem;flex:1;min-width:0;padding:.65rem .75rem}.results{border:1px solid var(--line);border-radius:.7rem;list-style:none;margin:.7rem 0;padding:.25rem}.results button{background:transparent;border:0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;padding:.65rem;text-align:left;width:100%}.results li:last-child button{border:0}.results span{color:var(--muted);font-size:.7rem}.selected{align-items:center;display:flex;justify-content:space-between;margin:.8rem 0}.selected small{color:var(--muted);display:block;font-size:.7rem}.notice{background:#f5ead6;border-radius:.5rem;font-size:.73rem;padding:.6rem}.attribution{margin:.45rem 0}.picker app-travel-map{height:280px}@media(max-width:600px){.search{align-items:stretch;flex-direction:column}.selected{align-items:flex-start;flex-direction:column;gap:.4rem}}
  `,
})
export class LocationPickerComponent {
  readonly value = input<LocationSelection | null>(null);
  readonly valueChange = output<LocationSelection | null>();
  readonly geo = inject(GeocodingService);
  readonly results = signal<
    {
      id: string;
      label: string;
      category: string;
      latitude: number;
      longitude: number;
    }[]
  >([]);
  readonly selection = signal<LocationSelection | null>(null);
  readonly mapPoints = signal<MapPoint[]>([]);
  query = '';

  constructor() {
    effect(() => this.setSelection(this.value(), false));
  }

  async search(): Promise<void> {
    if (this.query.trim().length < 3) return;
    this.results.set(await this.geo.search(this.query));
  }

  choose(address: string, latitude: number, longitude: number): void {
    this.setSelection({ address, latitude, longitude });
    this.results.set([]);
  }

  move(position: { latitude: number; longitude: number }): void {
    const current = this.selection();
    if (current) this.setSelection({ ...current, ...position });
  }

  clear(): void {
    this.setSelection(null);
  }

  private setSelection(
    selection: LocationSelection | null,
    emit = true,
  ): void {
    this.selection.set(selection);
    this.mapPoints.set(
      selection
        ? [
            {
              id: 'selected-location',
              label: selection.address,
              latitude: selection.latitude,
              longitude: selection.longitude,
              kind: 'lugar',
              marker: 'place',
            },
          ]
        : [],
    );
    if (emit) this.valueChange.emit(selection);
  }
}
