import { TestBed } from '@angular/core/testing';
import { TravelMapComponent } from './travel-map.component';
import { PublicConfigStore } from '../../core/public-config.store';

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe('TravelMapComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('renders points and releases the Leaflet map on destroy', async () => {
    await TestBed.configureTestingModule({
      imports: [TravelMapComponent],
      providers: [
        {
          provide: PublicConfigStore,
          useValue: {
            mapTiles: () => ({
              url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              attribution: 'OpenStreetMap',
              maxZoom: 19,
              provider: 'openstreetmap',
            }),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TravelMapComponent);
    fixture.componentRef.setInput('points', [
      {
        id: 'place-1',
        label: 'Casa Milà',
        latitude: 41.3954,
        longitude: 2.1619,
        kind: 'cultura',
        marker: 'place',
      },
    ]);
    fixture.componentRef.setInput('lines', [
      {
        id: 'walking-leg',
        mode: 'walking',
        coordinates: [
          [41.3954, 2.1619],
          [41.4, 2.17],
        ],
      },
    ]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.leaflet-container')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.ruta-marker')).not.toBeNull();
    expect(() => fixture.destroy()).not.toThrow();
  });
});
