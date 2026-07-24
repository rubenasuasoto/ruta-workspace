import { TestBed } from '@angular/core/testing';
import { Api } from '../api/api';
import { dataControllerData } from '../api/fn/account/data-controller-data';
import { importsControllerImport } from '../api/fn/imports/imports-controller-import';
import { tripsControllerAddExpense } from '../api/fn/trips/trips-controller-add-expense';
import { tripsControllerUpdateActivity } from '../api/fn/trips/trips-controller-update-activity';
import { TripStore } from './trip-store.service';

const emptyData = { trips: [], days: [], expenses: [], places: [] };

describe('TripStore HTTP repository', () => {
  let invoke: ReturnType<typeof vi.fn>;
  let store: TripStore;

  beforeEach(() => {
    localStorage.clear();
    invoke = vi.fn();
    TestBed.configureTestingModule({
      providers: [TripStore, { provide: Api, useValue: { invoke } }],
    });
    store = TestBed.inject(TripStore);
  });

  it('loads typed account data and exposes the existing selectors', async () => {
    invoke.mockResolvedValue({
      trips: [
        {
          id: 'porto',
          destination: 'Oporto',
          country: 'Portugal',
          startDate: '2026-09-01',
          endDate: '2026-09-03',
          budget: 500,
          status: 'planificando',
          coverImage: 'cover',
          description: 'Prueba',
        },
      ],
      days: [{ id: 'day-1', tripId: 'porto', date: '2026-09-01', activities: [] }],
      expenses: [],
      places: [],
    });

    await store.load();

    expect(invoke).toHaveBeenCalledWith(dataControllerData);
    expect(store.trip('porto')?.destination).toBe('Oporto');
    expect(store.daysFor('porto')).toHaveLength(1);
    expect(store.initialized()).toBe(true);
  });

  it('sends only the expense DTO fields and updates after confirmation', async () => {
    invoke.mockImplementation((operation: unknown) => {
      if (operation === tripsControllerAddExpense) {
        return Promise.resolve({
          id: 'expense-1',
          tripId: 'porto',
          title: 'Café',
          category: 'comida',
          amount: 5.5,
          date: '2026-09-01',
        });
      }
      return Promise.resolve(emptyData);
    });

    await store.addExpense({
      tripId: 'porto',
      title: 'Café',
      category: 'comida',
      amount: 5.5,
      date: '2026-09-01',
    });

    expect(invoke).toHaveBeenCalledWith(tripsControllerAddExpense, {
      tripId: 'porto',
      body: { title: 'Café', category: 'comida', amount: 5.5, date: '2026-09-01' },
    });
    expect(store.spentFor('porto')).toBe(5.5);
  });

  it('preserves localStorage when the transactional import fails', async () => {
    const raw = JSON.stringify({ version: 1, trips: [], days: [], expenses: [], places: [] });
    localStorage.setItem('ruta.travel-journal.v1', raw);
    invoke.mockImplementation((operation: unknown) =>
      operation === importsControllerImport
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(emptyData),
    );

    await expect(store.importLocalData()).rejects.toThrow('offline');

    expect(localStorage.getItem('ruta.travel-journal.v1')).toBe(raw);
    expect(store.error()).toContain('Ruta API');
  });

  it('persists the selected transport mode in the activity DTO', async () => {
    const activity = {
      id: 'activity-1',
      title: 'Museo',
      time: '10:00',
      kind: 'cultura' as const,
      notes: '',
      completed: false,
      travelModeToNext: 'cycling' as const,
    };
    store.days.set([
      {
        id: 'day-1',
        tripId: 'trip-1',
        date: '2026-09-01',
        activities: [activity],
      },
    ]);
    invoke.mockResolvedValue(activity);

    await store.updateActivity('day-1', activity);

    expect(invoke).toHaveBeenCalledWith(tripsControllerUpdateActivity, {
      activityId: 'activity-1',
      body: expect.objectContaining({ travelModeToNext: 'cycling' }),
    });
    expect(store.days()[0].activities[0].travelModeToNext).toBe('cycling');
  });

  it('removes localStorage only after a confirmed import and reload', async () => {
    localStorage.setItem(
      'ruta.travel-journal.v1',
      JSON.stringify({ version: 1, trips: [], days: [], expenses: [], places: [] }),
    );
    invoke.mockImplementation((operation: unknown) =>
      operation === importsControllerImport
        ? Promise.resolve({ imported: true })
        : Promise.resolve(emptyData),
    );

    await expect(store.importLocalData()).resolves.toBe(true);

    expect(localStorage.getItem('ruta.travel-journal.v1')).toBeNull();
    expect(invoke).toHaveBeenCalledWith(dataControllerData);
  });
});
