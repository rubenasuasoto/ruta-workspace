import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { DemoSnapshot } from './demo-snapshot.model';
import { DEMO_STORAGE_KEY, DemoSandboxStore } from './demo-sandbox.store';

describe('DemoSandboxStore', () => {
  const snapshot: DemoSnapshot = {
    schemaVersion: 2,
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
      endDate: '2027-05-14',
      description: 'Viaje de demostración',
      status: 'planned',
      budget: 850,
      coverImage: '/assets/demo/photos/valencia-cover.webp',
    },
    base: {
      id: 'demo-hotel',
      name: 'Hotel de la demo',
      address: 'Valencia',
      kind: 'alojamiento',
      latitude: 39.4699,
      longitude: -0.3763,
    },
    days: [
      {
        id: 'day-1',
        date: '2027-05-12',
        label: 'Centro',
        travelModeFromBase: 'walking',
        activities: [
          {
            id: 'activity-1',
            time: '10:00',
            title: 'Mercado',
            kind: 'comida',
            cost: 10,
            notes: '',
            travelModeToNext: 'walking',
            locationName: 'Mercado',
            address: 'Mercado',
            latitude: 39.47,
            longitude: -0.37,
            completed: false,
          },
        ],
        route: {
          status: 'complete',
          source: 'frozen',
          totalDistanceMeters: 1000,
          totalDurationSeconds: 700,
          legs: [],
        },
      },
    ],
    expenses: [],
    places: [
      {
        id: 'place-1',
        name: 'Mercado',
        city: 'Valencia',
        country: 'España',
        category: 'comida',
        note: '',
        visited: false,
        address: 'Mercado',
        latitude: 39.47,
        longitude: -0.37,
        image: '/assets/demo/photos/mercado-central.webp',
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('carga el fixture una vez y crea una copia versionada en el navegador', async () => {
    const store = TestBed.inject(DemoSandboxStore);
    const http = TestBed.inject(HttpTestingController);

    const firstLoad = store.load();
    const concurrentLoad = store.load();
    http.expectOne('/assets/demo/valencia.snapshot.json').flush(snapshot);
    await Promise.all([firstLoad, concurrentLoad]);

    expect(store.snapshot()?.trip.destination).toBe('Valencia');
    expect(JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).schemaVersion).toBe(2);
    await store.load();
    http.expectNone('/assets/demo/valencia.snapshot.json');
  });

  it('recupera la copia guardada y migra de forma segura el esquema anterior', async () => {
    const previous = structuredClone(snapshot) as DemoSnapshot;
    previous.schemaVersion = 1;
    previous.trip.destination = 'Mi Valencia';
    previous.trip.endDate = '2027-05-15';
    delete (previous.trip as Partial<DemoSnapshot['trip']>).coverImage;
    delete (previous.days[0].route as Partial<DemoSnapshot['days'][number]['route']>).source;
    localStorage.setItem('ruta.portfolio-demo.v1', JSON.stringify(previous));

    const store = TestBed.inject(DemoSandboxStore);
    const load = store.load();
    TestBed.inject(HttpTestingController)
      .expectOne('/assets/demo/valencia.snapshot.json')
      .flush(snapshot);
    await load;

    expect(store.snapshot()?.trip.destination).toBe('Mi Valencia');
    expect(store.snapshot()?.trip.endDate).toBe('2027-05-14');
    expect(store.snapshot()?.days[0].route.source).toBe('frozen');
    expect(localStorage.getItem('ruta.portfolio-demo.v1')).toBeNull();
  });

  it('persiste CRUD y degrada la geometría al cambiar el orden del día', async () => {
    const store = TestBed.inject(DemoSandboxStore);
    const load = store.load();
    TestBed.inject(HttpTestingController)
      .expectOne('/assets/demo/valencia.snapshot.json')
      .flush(snapshot);
    await load;

    const expenseId = store.saveExpense({ title: 'Museo', category: 'activities', amount: 18 });
    const activityId = store.saveActivity('day-1', {
      title: 'Lonja',
      time: '11:00',
      kind: 'cultura',
      cost: 2,
      notes: '',
      travelModeToNext: 'walking',
      locationName: 'Mercado',
      address: 'Mercado',
      latitude: 39.47,
      longitude: -0.37,
      completed: false,
    });
    store.toggleActivity('activity-1');

    expect(store.snapshot()?.expenses).toHaveLength(1);
    expect(store.snapshot()?.days[0].activities).toHaveLength(2);
    expect(store.snapshot()?.days[0].activities[0].completed).toBe(true);
    expect(store.snapshot()?.days[0].route.source).toBe('approximate');
    expect(JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).expenses).toHaveLength(1);

    const placeId = store.savePlace({
      name: 'Mirador',
      city: 'Valencia',
      country: 'España',
      category: 'cultura',
      note: '',
      visited: false,
      address: 'Valencia',
      latitude: 39.48,
      longitude: -0.38,
      image: '/assets/demo/photos/cabanyal.webp',
    });
    store.removeActivity('day-1', activityId);
    store.removeExpense(expenseId);
    store.removePlace(placeId);
    expect(store.snapshot()?.days[0].activities).toHaveLength(1);
    expect(store.snapshot()?.expenses).toHaveLength(0);
    expect(store.snapshot()?.places).toHaveLength(1);
  });

  it('restaura exclusivamente el viaje original de la demo', async () => {
    const store = TestBed.inject(DemoSandboxStore);
    const load = store.load();
    TestBed.inject(HttpTestingController)
      .expectOne('/assets/demo/valencia.snapshot.json')
      .flush(snapshot);
    await load;
    store.updateTrip({ destination: 'Cambiado' });

    store.reset();

    expect(store.snapshot()?.trip.destination).toBe('Valencia');
    expect(JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).trip.destination).toBe('Valencia');
  });

  it('muestra un error controlado si la instantánea no está disponible', async () => {
    const store = TestBed.inject(DemoSandboxStore);
    const load = store.load();
    TestBed.inject(HttpTestingController)
      .expectOne('/assets/demo/valencia.snapshot.json')
      .flush('No disponible', { status: 404, statusText: 'Not found' });
    await load;

    expect(store.snapshot()).toBeNull();
    expect(store.error()).toBe('No se ha podido cargar el viaje de demostración.');
  });
});
