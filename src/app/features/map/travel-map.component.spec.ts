import { TestBed } from '@angular/core/testing';
import { TravelMapComponent } from './travel-map.component';

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

    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('.leaflet-container'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.ruta-marker'),
    ).not.toBeNull();
    expect(() => fixture.destroy()).not.toThrow();
  });
});
