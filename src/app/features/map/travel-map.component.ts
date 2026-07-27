import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import * as L from 'leaflet';
import { MapLine, MapPoint } from '../../core/models';
import { PublicConfigStore } from '../../core/public-config.store';

@Component({
  selector: 'app-travel-map',
  template: `<div
    #mapElement
    class="map"
    role="region"
    tabindex="0"
    [attr.aria-label]="ariaLabel()"
  ></div>`,
  styles: `
    :host {
      display: block;
    }
    .map {
      background: #e8e2d9;
      border-radius: 1rem;
      height: 100%;
      min-height: 320px;
      overflow: hidden;
      width: 100%;
    }
    :host ::ng-deep .ruta-marker {
      background: transparent;
      border: 0;
    }
    :host ::ng-deep .ruta-pin {
      align-items: center;
      background: var(--ink);
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      box-shadow: 0 3px 10px #183a3c55;
      color: white;
      display: flex;
      font-size: 12px;
      font-weight: 700;
      height: 32px;
      justify-content: center;
      transform: rotate(-45deg);
      width: 32px;
    }
    :host ::ng-deep .ruta-pin span {
      transform: rotate(45deg);
    }
    :host ::ng-deep .ruta-pin.place {
      background: var(--coral);
    }
    :host ::ng-deep .leaflet-tooltip {
      font-family: var(--font-body);
      font-size: 0.76rem;
    }
  `,
})
export class TravelMapComponent implements AfterViewInit {
  readonly points = input<MapPoint[]>([]);
  readonly lines = input<MapLine[]>([]);
  readonly editable = input(false);
  readonly tilesEnabled = input(true);
  readonly ariaLabel = input('Mapa del viaje');
  readonly pointSelected = output<string>();
  readonly locationChanged = output<{ latitude: number; longitude: number }>();

  @ViewChild('mapElement', { static: true })
  private mapElement!: ElementRef<HTMLElement>;
  private map?: L.Map;
  private layer = L.layerGroup();
  private resizeObserver?: ResizeObserver;
  private readonly destroyRef = inject(DestroyRef);
  private readonly publicConfig = inject(PublicConfigStore);

  constructor() {
    effect(() => {
      this.points();
      this.lines();
      this.editable();
      queueMicrotask(() => this.render());
    });
    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.map?.remove();
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([40.1, -3.7], 5);
    if (this.tilesEnabled()) {
      const tiles = this.publicConfig.mapTiles();
      L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        maxZoom: tiles.maxZoom,
      }).addTo(this.map);
    }
    this.layer.addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      if (this.editable())
        this.locationChanged.emit({
          latitude: Number(event.latlng.lat.toFixed(6)),
          longitude: Number(event.latlng.lng.toFixed(6)),
        });
    });
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ animate: false }));
    this.resizeObserver.observe(this.mapElement.nativeElement);
    this.render();
  }

  focusPoint(id: string): void {
    const point = this.points().find((item) => item.id === id);
    if (point) this.map?.setView([point.latitude, point.longitude], 15);
  }

  private render(): void {
    if (!this.map) return;
    this.layer.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    for (const point of this.points()) {
      const marker = L.marker([point.latitude, point.longitude], {
        draggable: this.editable(),
        icon: L.divIcon({
          className: 'ruta-marker',
          html: `<span class="ruta-pin ${point.marker === 'place' ? 'place' : ''}"><span>${point.marker === 'place' ? '◆' : '●'}</span></span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 31],
        }),
      });
      const tooltip = document.createElement('span');
      tooltip.textContent = point.subtitle ? `${point.label} · ${point.subtitle}` : point.label;
      marker.bindTooltip(tooltip);
      marker.on('click', () => this.pointSelected.emit(point.id));
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        this.locationChanged.emit({
          latitude: Number(position.lat.toFixed(6)),
          longitude: Number(position.lng.toFixed(6)),
        });
      });
      marker.addTo(this.layer);
      bounds.push([point.latitude, point.longitude]);
    }
    const lineStyles: Record<MapLine['mode'], L.PolylineOptions> = {
      walking: { color: '#e56b51', weight: 5, opacity: 0.88 },
      cycling: {
        color: '#2f6f91',
        weight: 5,
        opacity: 0.9,
        dashArray: '10 5',
      },
      driving: { color: '#183a3c', weight: 6, opacity: 0.9 },
      fallback: {
        color: '#776f65',
        weight: 3,
        opacity: 0.72,
        dashArray: '7 7',
      },
    };
    for (const line of this.lines()) {
      if (line.coordinates.length > 1)
        L.polyline(line.coordinates, lineStyles[line.mode]).addTo(this.layer);
    }
    if (bounds.length === 1) this.map.setView(bounds[0], 14);
    else if (bounds.length > 1)
      this.map.fitBounds(L.latLngBounds(bounds), {
        padding: [30, 30],
        maxZoom: 14,
      });
  }
}
