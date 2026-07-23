import { TestBed } from '@angular/core/testing';
import { Api } from '../../api/api';
import { aiControllerGenerate } from '../../api/fn/ai/ai-controller-generate';
import { tripsControllerBatch } from '../../api/fn/trips/trips-controller-batch';
import { TripStore } from '../../core/trip-store.service';
import { ItineraryAiService } from './itinerary-ai.service';

describe('ItineraryAiService', () => {
  it('keeps the draft local and persists only selected edited activities', async () => {
    const invoke = vi.fn().mockImplementation((operation: unknown) => {
      if (operation === aiControllerGenerate) {
        return Promise.resolve({
          disclaimer: 'Comprueba las sugerencias.',
          days: [{
            date: '2026-08-18',
            activities: [
              { id: 'a', title: 'Original', time: '10:00', kind: 'cultura', notes: '', selected: true },
              { id: 'b', title: 'No guardar', time: '12:00', kind: 'comida', notes: '', selected: true },
            ],
          }],
        });
      }
      if (operation === tripsControllerBatch) return Promise.resolve([]);
      return Promise.reject(new Error('Unexpected operation'));
    });
    const trips = { load: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [
        ItineraryAiService,
        { provide: Api, useValue: { invoke } },
        { provide: TripStore, useValue: trips },
      ],
    });
    const service = TestBed.inject(ItineraryAiService);

    await service.generate('trip-1', { interests: ['arte'], pace: 'equilibrado', savedPlaceIds: [] });
    expect(invoke).toHaveBeenCalledTimes(1);
    service.updateActivity(0, 0, { title: 'Editada' });
    service.updateActivity(0, 1, { selected: false });
    await expect(service.acceptSelected('trip-1')).resolves.toBe(1);

    expect(invoke).toHaveBeenLastCalledWith(tripsControllerBatch, {
      tripId: 'trip-1',
      body: {
        activities: [{
          date: '2026-08-18',
          title: 'Editada',
          time: '10:00',
          kind: 'cultura',
          cost: undefined,
          notes: '',
          completed: false,
        }],
      },
    });
    expect(trips.load).toHaveBeenCalledOnce();
    expect(service.draft()).toBeNull();
  });
});
