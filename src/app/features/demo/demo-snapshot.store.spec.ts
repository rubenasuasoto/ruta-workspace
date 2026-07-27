import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { DemoSnapshot } from './demo-snapshot.model';
import { DemoSnapshotStore } from './demo-snapshot.store';

describe('DemoSnapshotStore', () => {
  const snapshot: DemoSnapshot = {
    schemaVersion: 1,
    generatedAt: '2026-07-27T00:00:00.000Z',
    source: {
      mode: 'frozen-provider-snapshot',
      geocoding: 'HeiGIT Pelias',
      routing: 'openrouteservice',
      attribution: 'HeiGIT y OpenStreetMap',
      disclaimer: 'Estimaciones',
    },
    trip: {
      id: 'demo',
      destination: 'Valencia',
      country: 'España',
      startDate: '2027-05-12',
      endDate: '2027-05-15',
      description: 'Viaje de demostración',
      status: 'planned',
      budget: 850,
    },
    base: {
      id: 'demo-hotel',
      name: 'Hotel de la demo',
      address: 'Valencia',
      kind: 'alojamiento',
      latitude: 39.4699,
      longitude: -0.3763,
    },
    days: [],
    expenses: [],
    places: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('carga el archivo estático una sola vez durante la sesión', async () => {
    const store = TestBed.inject(DemoSnapshotStore);
    const http = TestBed.inject(HttpTestingController);

    const firstLoad = store.load();
    const concurrentLoad = store.load();
    http.expectOne('/assets/demo/valencia.snapshot.json').flush(snapshot);
    await Promise.all([firstLoad, concurrentLoad]);

    expect(store.snapshot()?.trip.destination).toBe('Valencia');
    await store.load();
    http.expectNone('/assets/demo/valencia.snapshot.json');
  });

  it('muestra un error controlado si la instantánea no está disponible', async () => {
    const store = TestBed.inject(DemoSnapshotStore);
    const http = TestBed.inject(HttpTestingController);

    const load = store.load();
    http
      .expectOne('/assets/demo/valencia.snapshot.json')
      .flush('No disponible', { status: 404, statusText: 'Not found' });
    await load;

    expect(store.snapshot()).toBeNull();
    expect(store.error()).toBe('No se ha podido cargar el viaje de demostración.');
  });
});
