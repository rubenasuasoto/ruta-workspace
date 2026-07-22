import { Injectable, computed, signal } from '@angular/core';
import { Activity, Expense, ExpenseCategory, ItineraryDay, SavedPlace, Trip, TripStatus } from './models';

interface RutaData { version: 1; trips: Trip[]; days: ItineraryDay[]; expenses: Expense[]; places: SavedPlace[]; }
const STORE_KEY = 'ruta.travel-journal.v1';
const id = () => crypto.randomUUID();
const dateRange = (start: string, end: string): string[] => { const dates: string[] = []; const cursor = new Date(`${start}T12:00:00`); const last = new Date(`${end}T12:00:00`); while (cursor <= last) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setDate(cursor.getDate() + 1); } return dates; };

const demo: RutaData = {
  version: 1,
  trips: [
    { id: 'lisboa', destination: 'Lisboa', country: 'Portugal', startDate: '2026-08-18', endDate: '2026-08-23', budget: 950, status: 'proximo', coverImage: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=85', description: 'Azulejos, miradores y tardes lentas junto al Tajo.' },
    { id: 'kioto', destination: 'Kioto', country: 'Japón', startDate: '2026-11-04', endDate: '2026-11-10', budget: 2200, status: 'planificando', coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85', description: 'Una semana entre jardines, mercados y pequeños rituales.' },
    { id: 'napoles', destination: 'Nápoles', country: 'Italia', startDate: '2026-04-10', endDate: '2026-04-14', budget: 780, status: 'completado', coverImage: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=1200&q=85', description: 'Un viaje de sabores intensos y calles con vida propia.' }
  ],
  days: [
    { id: 'lisboa-18', tripId: 'lisboa', date: '2026-08-18', activities: [{ id: 'a1', title: 'Llegada y paseo por Alfama', time: '17:30', kind: 'naturaleza', notes: 'Empezar en el mirador Portas do Sol.', completed: false }] },
    { id: 'lisboa-19', tripId: 'lisboa', date: '2026-08-19', activities: [{ id: 'a2', title: 'Desayuno en Baixa', time: '09:00', kind: 'comida', cost: 12, notes: '', completed: false }, { id: 'a3', title: 'Museo del Azulejo', time: '12:00', kind: 'cultura', cost: 10, notes: 'Reservar con antelación.', completed: false }] }
  ],
  expenses: [
    { id: 'e1', tripId: 'lisboa', title: 'Apartamento en Alfama', category: 'alojamiento', amount: 470, date: '2026-08-18' }, { id: 'e2', tripId: 'lisboa', title: 'Vuelos ida y vuelta', category: 'transporte', amount: 180, date: '2026-07-10' }, { id: 'e3', tripId: 'lisboa', title: 'Museo del Azulejo', category: 'experiencias', amount: 10, date: '2026-08-19' },
    { id: 'e4', tripId: 'napoles', title: 'Hotel Piazza Bellini', category: 'alojamiento', amount: 390, date: '2026-04-10' }, { id: 'e5', tripId: 'napoles', title: 'Tren y vuelos', category: 'transporte', amount: 205, date: '2026-03-10' }
  ],
  places: [
    { id: 'p1', name: 'LX Factory', city: 'Lisboa', country: 'Portugal', category: 'cultura', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=800&q=75', visited: false, note: 'Librerías, diseño y café.' }, { id: 'p2', name: 'Fushimi Inari', city: 'Kioto', country: 'Japón', category: 'naturaleza', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=800&q=75', visited: false, note: 'Ir a primera hora.' }, { id: 'p3', name: 'Pio Monte della Misericordia', city: 'Nápoles', country: 'Italia', category: 'cultura', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=75', visited: true, note: 'Una joya silenciosa.' }
  ]
};

@Injectable({ providedIn: 'root' })
export class TripStore {
  readonly trips = signal<Trip[]>([]); readonly days = signal<ItineraryDay[]>([]); readonly expenses = signal<Expense[]>([]); readonly places = signal<SavedPlace[]>([]);
  readonly totalPlanned = computed(() => this.trips().reduce((sum, trip) => sum + trip.budget, 0));
  constructor() { this.hydrate(); }
  trip(idValue: string): Trip | undefined { return this.trips().find((item) => item.id === idValue); }
  daysFor(tripId: string): ItineraryDay[] { return this.days().filter((day) => day.tripId === tripId).sort((a, b) => a.date.localeCompare(b.date)); }
  expensesFor(tripId: string): Expense[] { return this.expenses().filter((expense) => expense.tripId === tripId).sort((a, b) => b.date.localeCompare(a.date)); }
  spentFor(tripId: string): number { return this.expensesFor(tripId).reduce((sum, expense) => sum + expense.amount, 0); }
  createTrip(input: Omit<Trip, 'id'>): Trip { const trip = { ...input, id: id() }; this.trips.update((items) => [trip, ...items]); this.days.update((items) => [...items, ...dateRange(trip.startDate, trip.endDate).map((date) => ({ id: id(), tripId: trip.id, date, activities: [] }))]); this.save(); return trip; }
  updateTrip(trip: Trip): void { this.trips.update((items) => items.map((item) => item.id === trip.id ? trip : item)); const existing = this.daysFor(trip.id); const dates = new Set(existing.map((day) => day.date)); const added = dateRange(trip.startDate, trip.endDate).filter((date) => !dates.has(date)).map((date) => ({ id: id(), tripId: trip.id, date, activities: [] })); this.days.update((items) => [...items.filter((day) => day.tripId !== trip.id || day.date >= trip.startDate && day.date <= trip.endDate), ...added]); this.save(); }
  removeTrip(tripId: string): void { this.trips.update((items) => items.filter((item) => item.id !== tripId)); this.days.update((items) => items.filter((item) => item.tripId !== tripId)); this.expenses.update((items) => items.filter((item) => item.tripId !== tripId)); this.save(); }
  addActivity(dayId: string, input: Omit<Activity, 'id'>): void { this.days.update((items) => items.map((day) => day.id === dayId ? { ...day, activities: [...day.activities, { ...input, id: id() }].sort((a, b) => a.time.localeCompare(b.time)) } : day)); this.save(); }
  updateActivity(dayId: string, activity: Activity): void { this.days.update((items) => items.map((day) => day.id === dayId ? { ...day, activities: day.activities.map((item) => item.id === activity.id ? activity : item).sort((a, b) => a.time.localeCompare(b.time)) } : day)); this.save(); }
  toggleActivity(dayId: string, activityId: string): void { this.days.update((items) => items.map((day) => day.id === dayId ? { ...day, activities: day.activities.map((activity) => activity.id === activityId ? { ...activity, completed: !activity.completed } : activity) } : day)); this.save(); }
  removeActivity(dayId: string, activityId: string): void { this.days.update((items) => items.map((day) => day.id === dayId ? { ...day, activities: day.activities.filter((activity) => activity.id !== activityId) } : day)); this.save(); }
  moveActivity(dayId: string, activityId: string, direction: -1 | 1): void { this.days.update((items) => items.map((day) => { if (day.id !== dayId) return day; const index = day.activities.findIndex((activity) => activity.id === activityId); const target = index + direction; if (index < 0 || target < 0 || target >= day.activities.length) return day; const activities = [...day.activities]; [activities[index], activities[target]] = [activities[target], activities[index]]; return { ...day, activities }; })); this.save(); }
  addExpense(input: Omit<Expense, 'id'>): void { this.expenses.update((items) => [{ ...input, id: id() }, ...items]); this.save(); }
  removeExpense(expenseId: string): void { this.expenses.update((items) => items.filter((expense) => expense.id !== expenseId)); this.save(); }
  addPlace(input: Omit<SavedPlace, 'id'>): void { this.places.update((items) => [{ ...input, id: id() }, ...items]); this.save(); }
  togglePlace(placeId: string): void { this.places.update((items) => items.map((place) => place.id === placeId ? { ...place, visited: !place.visited } : place)); this.save(); }
  private hydrate(): void { try { const value = localStorage.getItem(STORE_KEY); const data: RutaData = value ? JSON.parse(value) : demo; if (data.version !== 1) throw new Error('Versión incompatible'); this.trips.set(data.trips); this.days.set(data.days); this.expenses.set(data.expenses); this.places.set(data.places); if (!value) this.save(); } catch { this.trips.set(demo.trips); this.days.set(demo.days); this.expenses.set(demo.expenses); this.places.set(demo.places); } }
  private save(): void { localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, trips: this.trips(), days: this.days(), expenses: this.expenses(), places: this.places() } satisfies RutaData)); }
}
