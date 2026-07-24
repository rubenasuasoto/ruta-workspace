import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Api } from '../../api/api';
import { aiControllerGenerate } from '../../api/fn/ai/ai-controller-generate';
import { tripsControllerBatch } from '../../api/fn/trips/trips-controller-batch';
import { AiItineraryDraftDto } from '../../api/models/ai-itinerary-draft-dto';
import { DraftActivityDto } from '../../api/models/draft-activity-dto';
import { GenerateItineraryDto } from '../../api/models/generate-itinerary-dto';
import { TripStore } from '../../core/trip-store.service';

@Injectable()
export class ItineraryAiService {
  private readonly api = inject(Api);
  private readonly trips = inject(TripStore);

  readonly draft = signal<AiItineraryDraftDto | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedCount = computed(() => this.draft()?.days
    .flatMap((day) => day.activities)
    .filter((activity) => activity.selected).length ?? 0);

  async generate(tripId: string, input: GenerateItineraryDto): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const draft = await this.api.invoke(aiControllerGenerate, { tripId, body: input });
      this.draft.set(structuredClone(draft));
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  updateActivity(dayIndex: number, activityIndex: number, patch: Partial<DraftActivityDto>): void {
    this.draft.update((current) => {
      if (!current) return current;
      return {
        ...current,
        days: current.days.map((day, currentDay) => currentDay !== dayIndex ? day : {
          ...day,
          activities: day.activities.map((activity, currentActivity) =>
            currentActivity === activityIndex ? { ...activity, ...patch } : activity),
        }),
      };
    });
  }

  discard(): void {
    this.draft.set(null);
    this.error.set(null);
  }

  async acceptSelected(tripId: string): Promise<number> {
    const activities = this.draft()?.days.flatMap((day) => day.activities
      .filter((activity) => activity.selected)
      .map((activity) => ({
        date: day.date,
        title: activity.title.trim(),
        time: activity.time,
        kind: activity.kind,
        cost: activity.estimatedCost,
        notes: activity.notes.trim(),
        completed: false,
        savedPlaceId: activity.savedPlaceId ?? null,
      }))) ?? [];
    if (!activities.length) {
      this.error.set('Selecciona al menos una actividad para guardarla.');
      return 0;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.invoke(tripsControllerBatch, { tripId, body: { activities } });
      await this.trips.load();
      this.draft.set(null);
      return activities.length;
    } catch (error) {
      this.error.set(this.message(error));
      return 0;
    } finally {
      this.saving.set(false);
    }
  }

  private message(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (Array.isArray(message)) return message.join('. ');
      if (typeof message === 'string') return message;
      if (error.status === 429) return 'Has alcanzado temporalmente el límite de borradores.';
    }
    return 'No se pudo generar el borrador. Comprueba la API e inténtalo de nuevo.';
  }
}
