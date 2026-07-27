import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  DemoActivity,
  DemoDay,
  DemoExpense,
  DemoPlace,
  DemoSnapshot,
} from './demo-snapshot.model';

export const DEMO_STORAGE_KEY = 'ruta.portfolio-demo.v2';
const LEGACY_STORAGE_KEY = 'ruta.portfolio-demo.v1';
const FIXTURE_URL = '/assets/demo/valencia.snapshot.json';

type ActivityInput = Omit<DemoActivity, 'id'> & { id?: string };
type ExpenseInput = Omit<DemoExpense, 'id'> & { id?: string };
type PlaceInput = Omit<DemoPlace, 'id'> & { id?: string };

@Injectable({ providedIn: 'root' })
export class DemoSandboxStore {
  readonly snapshot = signal<DemoSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastSavedAt = signal<Date | null>(null);
  readonly saved = computed(() => !!this.snapshot() && !this.error());

  private readonly http = inject(HttpClient);
  private seed?: DemoSnapshot;
  private loadPromise?: Promise<void>;

  load(): Promise<void> {
    if (this.snapshot()) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loading.set(true);
    this.error.set(null);
    this.loadPromise = firstValueFrom(this.http.get<DemoSnapshot>(FIXTURE_URL))
      .then((fixture) => {
        this.seed = this.normalize(fixture);
        const stored = this.readStored();
        this.snapshot.set(stored ?? this.clone(this.seed));
        this.persist();
      })
      .catch(() => {
        this.error.set('No se ha podido cargar el viaje de demostración.');
      })
      .finally(() => {
        this.loading.set(false);
        this.loadPromise = undefined;
      });
    return this.loadPromise;
  }

  updateTrip(input: Partial<DemoSnapshot['trip']>): void {
    this.mutate((state) => {
      state.trip = { ...state.trip, ...input };
    });
  }

  toggleActivity(activityId: string): void {
    this.mutate((state) => {
      const activity = this.findActivity(state, activityId);
      if (activity) activity.completed = !activity.completed;
    });
  }

  saveActivity(dayId: string, input: ActivityInput): string {
    const activityId = input.id ?? this.createId('activity');
    this.mutate((state) => {
      const day = state.days.find((item) => item.id === dayId);
      if (!day) return;
      const current = day.activities.find((item) => item.id === activityId);
      if (current) {
        const locationChanged =
          current.latitude !== input.latitude || current.longitude !== input.longitude;
        Object.assign(current, input, { id: activityId });
        if (locationChanged) this.invalidateRoute(day);
      } else {
        day.activities.push({ ...input, id: activityId });
        day.activities.sort((a, b) => a.time.localeCompare(b.time));
        this.invalidateRoute(day);
      }
    });
    return activityId;
  }

  removeActivity(dayId: string, activityId: string): void {
    this.mutate((state) => {
      const day = state.days.find((item) => item.id === dayId);
      if (!day) return;
      const next = day.activities.filter((item) => item.id !== activityId);
      if (next.length === day.activities.length) return;
      day.activities = next;
      this.invalidateRoute(day);
    });
  }

  moveActivity(dayId: string, activityId: string, direction: -1 | 1): void {
    this.mutate((state) => {
      const day = state.days.find((item) => item.id === dayId);
      if (!day) return;
      const index = day.activities.findIndex((item) => item.id === activityId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= day.activities.length) return;
      [day.activities[index], day.activities[target]] = [
        day.activities[target],
        day.activities[index],
      ];
      this.invalidateRoute(day);
    });
  }

  saveExpense(input: ExpenseInput): string {
    const expenseId = input.id ?? this.createId('expense');
    this.mutate((state) => {
      const index = state.expenses.findIndex((item) => item.id === expenseId);
      const expense = { ...input, id: expenseId };
      if (index >= 0) state.expenses[index] = expense;
      else state.expenses.push(expense);
    });
    return expenseId;
  }

  removeExpense(expenseId: string): void {
    this.mutate((state) => {
      state.expenses = state.expenses.filter((item) => item.id !== expenseId);
    });
  }

  savePlace(input: PlaceInput): string {
    const placeId = input.id ?? this.createId('place');
    this.mutate((state) => {
      const index = state.places.findIndex((item) => item.id === placeId);
      const place = { ...input, id: placeId };
      if (index >= 0) state.places[index] = place;
      else state.places.push(place);
    });
    return placeId;
  }

  removePlace(placeId: string): void {
    this.mutate((state) => {
      state.places = state.places.filter((item) => item.id !== placeId);
    });
  }

  acceptDraft(
    activities: readonly (ActivityInput & { dayId: string; selected: boolean })[],
  ): number {
    const selected = activities.filter((item) => item.selected);
    if (!selected.length) return 0;
    this.mutate((state) => {
      for (const item of selected) {
        const day = state.days.find((candidate) => candidate.id === item.dayId);
        if (!day) continue;
        day.activities.push({
          id: this.createId('draft'),
          title: item.title,
          time: item.time,
          kind: item.kind,
          cost: item.cost,
          notes: item.notes,
          completed: item.completed,
          travelModeToNext: item.travelModeToNext,
          locationName: item.locationName,
          address: item.address,
          latitude: item.latitude,
          longitude: item.longitude,
        });
        day.activities.sort((a, b) => a.time.localeCompare(b.time));
        this.invalidateRoute(day);
      }
    });
    return selected.length;
  }

  reset(): void {
    if (!this.seed) return;
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // La demo sigue siendo utilizable aunque el navegador bloquee el almacenamiento.
    }
    this.snapshot.set(this.clone(this.seed));
    this.persist();
  }

  private mutate(change: (state: DemoSnapshot) => void): void {
    const current = this.snapshot();
    if (!current) return;
    const next = this.clone(current);
    change(next);
    next.generatedAt = new Date().toISOString();
    this.snapshot.set(next);
    this.persist();
  }

  private readStored(): DemoSnapshot | null {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DemoSnapshot;
      return this.normalize(parsed);
    } catch {
      try {
        localStorage.removeItem(DEMO_STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // No bloqueamos la carga por un almacenamiento no disponible.
      }
      return null;
    }
  }

  private persist(): void {
    const current = this.snapshot();
    if (!current) return;
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(current));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      this.lastSavedAt.set(new Date());
      this.error.set(null);
    } catch {
      this.error.set('El navegador no ha permitido guardar los cambios de la demo.');
    }
  }

  private normalize(input: DemoSnapshot): DemoSnapshot {
    if (!input?.trip || !Array.isArray(input.days) || !Array.isArray(input.expenses)) {
      throw new Error('Invalid demo snapshot');
    }
    const normalized = this.clone(input);
    normalized.schemaVersion = 2;
    normalized.trip.endDate =
      normalized.trip.endDate === '2027-05-15' ? '2027-05-14' : normalized.trip.endDate;
    normalized.trip.coverImage ||= '/assets/demo/photos/valencia-cover.webp';
    for (const day of normalized.days) {
      day.route.source ||= 'frozen';
    }
    const defaultImages: Record<DemoPlace['category'], string> = {
      comida: '/assets/demo/photos/generic-food.webp',
      cultura: '/assets/demo/photos/generic-culture.webp',
      naturaleza: '/assets/demo/photos/generic-nature.webp',
      traslado: '/assets/demo/photos/generic-transport.webp',
      alojamiento: '/assets/demo/photos/generic-accommodation.webp',
      otro: '/assets/demo/photos/generic-experience.webp',
    };
    normalized.places.forEach((place) => {
      place.image ||= defaultImages[place.category];
    });
    return normalized;
  }

  private invalidateRoute(day: DemoDay): void {
    day.route.source = 'approximate';
  }

  private findActivity(state: DemoSnapshot, activityId: string): DemoActivity | undefined {
    return state.days.flatMap((day) => day.activities).find((item) => item.id === activityId);
  }

  private createId(prefix: string): string {
    const unique =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `demo-${prefix}-${unique}`;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
