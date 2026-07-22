import { TripStore } from './trip-store.service';

describe('TripStore', () => {
  beforeEach(() => localStorage.clear());

  it('creates an itinerary day for every date of a new trip', () => {
    const store = new TripStore();
    const trip = store.createTrip({ destination: 'Oporto', country: 'Portugal', startDate: '2026-09-01', endDate: '2026-09-03', budget: 500, status: 'planificando', coverImage: 'cover', description: 'Prueba' });

    expect(store.daysFor(trip.id)).toHaveLength(3);
    expect(store.trip(trip.id)?.destination).toBe('Oporto');
  });

  it('updates the spending summary and survives a fresh store instance', () => {
    const store = new TripStore();
    store.addExpense({ tripId: 'lisboa', title: 'Café', category: 'comida', amount: 5.5, date: '2026-08-18' });

    expect(store.spentFor('lisboa')).toBe(665.5);
    const restored = new TripStore();
    expect(restored.expensesFor('lisboa').some((expense) => expense.title === 'Café')).toBe(true);
  });

  it('reorders activities without losing either activity', () => {
    const store = new TripStore();
    const day = store.daysFor('lisboa')[1];
    const first = day.activities[0];
    const second = day.activities[1];
    store.moveActivity(day.id, second.id, -1);

    expect(store.daysFor('lisboa')[1].activities.map((activity) => activity.id)).toEqual([second.id, first.id]);
  });
});
