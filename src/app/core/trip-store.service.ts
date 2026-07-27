import { Injectable, computed, inject, signal } from '@angular/core';
import { Api } from '../api/api';
import { dataControllerData } from '../api/fn/account/data-controller-data';
import { dataControllerSeedDemo } from '../api/fn/account/data-controller-seed-demo';
import { importsControllerImport } from '../api/fn/imports/imports-controller-import';
import { placesControllerCreate } from '../api/fn/places/places-controller-create';
import { placesControllerRemove } from '../api/fn/places/places-controller-remove';
import { placesControllerUpdate } from '../api/fn/places/places-controller-update';
import { tripsControllerAddActivity } from '../api/fn/trips/trips-controller-add-activity';
import { tripsControllerAddExpense } from '../api/fn/trips/trips-controller-add-expense';
import { tripsControllerCreate } from '../api/fn/trips/trips-controller-create';
import { tripsControllerRemove } from '../api/fn/trips/trips-controller-remove';
import { tripsControllerRemoveActivity } from '../api/fn/trips/trips-controller-remove-activity';
import { tripsControllerRemoveExpense } from '../api/fn/trips/trips-controller-remove-expense';
import { tripsControllerReorder } from '../api/fn/trips/trips-controller-reorder';
import { tripsControllerToggleActivity } from '../api/fn/trips/trips-controller-toggle-activity';
import { tripsControllerUpdate } from '../api/fn/trips/trips-controller-update';
import { tripsControllerUpdateActivity } from '../api/fn/trips/trips-controller-update-activity';
import { tripsControllerUpdateExpense } from '../api/fn/trips/trips-controller-update-expense';
import type { Activity, Expense, ItineraryDay, SavedPlace, Trip } from './models';

const STORE_KEY = 'ruta.travel-journal.v1';

@Injectable({ providedIn: 'root' })
export class TripStore {
  private readonly api = inject(Api);
  readonly trips = signal<Trip[]>([]);
  readonly days = signal<ItineraryDay[]>([]);
  readonly expenses = signal<Expense[]>([]);
  readonly places = signal<SavedPlace[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly initialized = signal(false);
  readonly localImportAvailable = signal(false);
  readonly importDismissed = signal(false);
  readonly totalPlanned = computed(() => this.trips().reduce((sum, trip) => sum + trip.budget, 0));

  trip(id: string): Trip | undefined {
    return this.trips().find((item) => item.id === id);
  }
  daysFor(tripId: string): ItineraryDay[] {
    return this.days()
      .filter((day) => day.tripId === tripId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  expensesFor(tripId: string): Expense[] {
    return this.expenses()
      .filter((expense) => expense.tripId === tripId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  spentFor(tripId: string): number {
    return this.expensesFor(tripId).reduce((sum, expense) => sum + expense.amount, 0);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.api.invoke(dataControllerData);
      this.trips.set(data.trips as Trip[]);
      this.days.set(data.days as ItineraryDay[]);
      this.expenses.set(data.expenses as Expense[]);
      this.places.set(data.places as SavedPlace[]);
      this.localImportAvailable.set(localStorage.getItem(STORE_KEY) !== null);
      this.initialized.set(true);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    this.trips.set([]);
    this.days.set([]);
    this.expenses.set([]);
    this.places.set([]);
    this.initialized.set(false);
    this.error.set(null);
    this.loading.set(false);
    this.localImportAvailable.set(false);
    this.importDismissed.set(false);
  }

  async retry(): Promise<void> {
    await this.load();
  }

  async createTrip(input: Omit<Trip, 'id'>): Promise<Trip> {
    return this.mutate(async () => {
      const {
        destination,
        country,
        startDate,
        endDate,
        budget,
        status,
        coverImage,
        coverAssetId,
        description,
      } = input;
      const trip = await this.api.invoke(tripsControllerCreate, {
        body: {
          destination,
          country,
          startDate,
          endDate,
          budget,
          status,
          coverImage: coverImage || undefined,
          coverAssetId,
          description,
        },
      });
      this.trips.update((items) => [trip as Trip, ...items]);
      await this.load();
      return trip as Trip;
    });
  }

  async updateTrip(trip: Trip): Promise<void> {
    await this.mutate(async () => {
      const {
        id,
        destination,
        country,
        startDate,
        endDate,
        budget,
        status,
        coverImage,
        coverAssetId,
        description,
      } = trip;
      const updated = await this.api.invoke(tripsControllerUpdate, {
        tripId: id,
        body: {
          destination,
          country,
          startDate,
          endDate,
          budget,
          status,
          coverImage: coverImage || undefined,
          coverAssetId,
          description,
        },
      });
      this.trips.update((items) =>
        items.map((item) => (item.id === trip.id ? (updated as Trip) : item)),
      );
      await this.load();
    });
  }

  async removeTrip(tripId: string): Promise<void> {
    await this.mutate(async () => {
      await this.api.invoke(tripsControllerRemove, { tripId });
      this.trips.update((items) => items.filter((item) => item.id !== tripId));
      this.days.update((items) => items.filter((item) => item.tripId !== tripId));
      this.expenses.update((items) => items.filter((item) => item.tripId !== tripId));
    });
  }

  async addActivity(dayId: string, input: Omit<Activity, 'id'>): Promise<void> {
    await this.mutate(async () => {
      const {
        title,
        time,
        kind,
        cost,
        notes,
        completed,
        savedPlaceId,
        locationName,
        address,
        latitude,
        longitude,
        travelModeToNext,
      } = input;
      const activity = await this.api.invoke(tripsControllerAddActivity, {
        dayId,
        body: {
          title,
          time,
          kind,
          cost,
          notes,
          completed,
          savedPlaceId,
          locationName,
          address,
          latitude,
          longitude,
          travelModeToNext,
        },
      });
      this.days.update((items) =>
        items.map((day) =>
          day.id === dayId
            ? {
                ...day,
                activities: [...day.activities, activity as Activity].sort(
                  (a, b) => (a.position ?? 0) - (b.position ?? 0),
                ),
              }
            : day,
        ),
      );
    });
  }

  async updateActivity(dayId: string, activity: Activity): Promise<void> {
    await this.mutate(async () => {
      const {
        title,
        time,
        kind,
        cost,
        notes,
        completed,
        savedPlaceId,
        locationName,
        address,
        latitude,
        longitude,
        travelModeToNext,
      } = activity;
      const updated = await this.api.invoke(tripsControllerUpdateActivity, {
        activityId: activity.id,
        body: {
          title,
          time,
          kind,
          cost,
          notes,
          completed,
          savedPlaceId,
          locationName,
          address,
          latitude,
          longitude,
          travelModeToNext,
        },
      });
      this.days.update((items) =>
        items.map((day) =>
          day.id === dayId
            ? {
                ...day,
                activities: day.activities.map((item) =>
                  item.id === activity.id ? (updated as Activity) : item,
                ),
              }
            : day,
        ),
      );
    });
  }

  async toggleActivity(dayId: string, activityId: string): Promise<void> {
    await this.mutate(async () => {
      const updated = await this.api.invoke(tripsControllerToggleActivity, { activityId });
      this.days.update((items) =>
        items.map((day) =>
          day.id === dayId
            ? {
                ...day,
                activities: day.activities.map((item) =>
                  item.id === activityId ? (updated as Activity) : item,
                ),
              }
            : day,
        ),
      );
    });
  }

  async removeActivity(dayId: string, activityId: string): Promise<void> {
    await this.mutate(async () => {
      await this.api.invoke(tripsControllerRemoveActivity, { activityId });
      this.days.update((items) =>
        items.map((day) =>
          day.id === dayId
            ? {
                ...day,
                activities: day.activities.filter((activity) => activity.id !== activityId),
              }
            : day,
        ),
      );
    });
  }

  async moveActivity(dayId: string, activityId: string, direction: -1 | 1): Promise<void> {
    const day = this.days().find((item) => item.id === dayId);
    if (!day) return;
    const ids = day.activities.map((activity) => activity.id);
    const index = ids.indexOf(activityId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await this.mutate(async () => {
      const updated = await this.api.invoke(tripsControllerReorder, {
        dayId,
        body: { activityIds: ids },
      });
      this.days.update((items) =>
        items.map((item) => (item.id === dayId ? (updated as ItineraryDay) : item)),
      );
    });
  }

  async addExpense(input: Omit<Expense, 'id'>): Promise<void> {
    await this.mutate(async () => {
      const { title, category, amount, date } = input;
      const expense = await this.api.invoke(tripsControllerAddExpense, {
        tripId: input.tripId,
        body: { title, category, amount, date },
      });
      this.expenses.update((items) => [expense as Expense, ...items]);
    });
  }

  async removeExpense(expenseId: string): Promise<void> {
    await this.mutate(async () => {
      await this.api.invoke(tripsControllerRemoveExpense, { expenseId });
      this.expenses.update((items) => items.filter((expense) => expense.id !== expenseId));
    });
  }

  async updateExpense(expense: Expense): Promise<void> {
    await this.mutate(async () => {
      const { id } = expense;
      const body = {
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
      };
      const updated = await this.api.invoke(tripsControllerUpdateExpense, { expenseId: id, body });
      this.expenses.update((items) =>
        items.map((item) => (item.id === id ? (updated as Expense) : item)),
      );
    });
  }

  async addPlace(input: Omit<SavedPlace, 'id'>): Promise<void> {
    await this.mutate(async () => {
      const {
        name,
        city,
        country,
        category,
        image,
        imageAssetId,
        visited,
        note,
        address,
        latitude,
        longitude,
      } = input;
      const place = await this.api.invoke(placesControllerCreate, {
        body: {
          name,
          city,
          country,
          category,
          image: image || undefined,
          imageAssetId,
          visited,
          note,
          address,
          latitude,
          longitude,
        },
      });
      this.places.update((items) => [place as SavedPlace, ...items]);
    });
  }

  async updatePlace(place: SavedPlace): Promise<void> {
    await this.mutate(async () => {
      const {
        id,
        name,
        city,
        country,
        category,
        image,
        imageAssetId,
        visited,
        note,
        address,
        latitude,
        longitude,
      } = place;
      const updated = await this.api.invoke(placesControllerUpdate, {
        placeId: id,
        body: {
          name,
          city,
          country,
          category,
          image: image || undefined,
          imageAssetId,
          visited,
          note,
          address,
          latitude,
          longitude,
        },
      });
      this.places.update((items) =>
        items.map((item) => (item.id === id ? (updated as SavedPlace) : item)),
      );
    });
  }

  async togglePlace(placeId: string): Promise<void> {
    const current = this.places().find((place) => place.id === placeId);
    if (!current) return;
    await this.mutate(async () => {
      const place = await this.api.invoke(placesControllerUpdate, {
        placeId,
        body: { visited: !current.visited },
      });
      this.places.update((items) =>
        items.map((item) => (item.id === placeId ? (place as SavedPlace) : item)),
      );
    });
  }

  async removePlace(placeId: string): Promise<void> {
    await this.mutate(async () => {
      await this.api.invoke(placesControllerRemove, { placeId });
      this.places.update((items) => items.filter((place) => place.id !== placeId));
    });
  }

  async importLocalData(): Promise<boolean> {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    return this.mutate(async () => {
      const payload = JSON.parse(raw);
      await this.api.invoke(importsControllerImport, { body: payload });
      localStorage.removeItem(STORE_KEY);
      this.localImportAvailable.set(false);
      await this.load();
      return true;
    });
  }

  dismissImport(): void {
    this.importDismissed.set(true);
  }

  async seedDemo(): Promise<void> {
    await this.mutate(async () => {
      await this.api.invoke(dataControllerSeedDemo);
      await this.load();
    });
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    this.error.set(null);
    try {
      return await operation();
    } catch (error) {
      this.error.set(this.message(error));
      throw error;
    }
  }

  private message(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const message = (error as { error?: { message?: string | string[] } }).error?.message;
      if (Array.isArray(message)) return message.join('. ');
      if (message) return message;
    }
    return 'No se pudo conectar con Ruta API. Comprueba Docker e inténtalo de nuevo.';
  }
}
