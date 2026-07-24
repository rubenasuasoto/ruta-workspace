import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Api } from '../../api/api';
import { routingControllerDayRoute } from '../../api/fn/routing/routing-controller-day-route';
import { tripsControllerMap } from '../../api/fn/trips/trips-controller-map';
import { FeedbackService } from '../../core/feedback.service';
import { PublicConfigStore } from '../../core/public-config.store';
import { TripStore } from '../../core/trip-store.service';
import { TripMapComponent } from './trip-map.component';

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

const activities = [
  {
    id: 'a',
    title: 'Museo',
    time: '09:00',
    kind: 'cultura' as const,
    notes: '',
    completed: false,
    position: 0,
    latitude: 40,
    longitude: -3,
    travelModeToNext: 'walking' as const,
  },
  {
    id: 'b',
    title: 'Mercado',
    time: '10:00',
    kind: 'comida' as const,
    notes: '',
    completed: false,
    position: 1,
    latitude: 40.01,
    longitude: -3.01,
    travelModeToNext: 'walking' as const,
  },
];

describe('TripMapComponent', () => {
  beforeAll(() => vi.stubGlobal('ResizeObserver', ResizeObserverStub));
  afterAll(() => vi.unstubAllGlobals());

  it('calculates automatically for a selected day and ignores stale responses', async () => {
    let resolveFirst!: (value: any) => void;
    const firstRoute = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondRoute = {
      tripId: 'trip-1',
      dayId: 'day-2',
      status: 'complete' as const,
      totalDistanceMeters: 1000,
      totalDurationSeconds: 600,
      unlocatedActivityIds: [],
      generatedAt: new Date().toISOString(),
      provider: 'mock' as const,
      attribution: 'Ruta test',
      disclaimer: 'Estimación',
      legs: [],
    };
    const invoke = vi.fn((operation: unknown, params: any) => {
      if (operation === tripsControllerMap)
        return Promise.resolve({
          days: [
            {
              id: 'day-1',
              tripId: 'trip-1',
              date: '2026-09-01',
              activities,
            },
            {
              id: 'day-2',
              tripId: 'trip-1',
              date: '2026-09-02',
              activities: activities.map((item) => ({
                ...item,
                id: `${item.id}-2`,
              })),
            },
          ],
          places: [],
        });
      if (operation === routingControllerDayRoute)
        return params.dayId === 'day-1'
          ? firstRoute
          : Promise.resolve(secondRoute);
      return Promise.resolve(undefined);
    });
    const store = {
      places: signal([]),
      updateActivity: vi.fn().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [TripMapComponent],
      providers: [
        { provide: Api, useValue: { invoke } },
        { provide: TripStore, useValue: store },
        {
          provide: PublicConfigStore,
          useValue: {
            routingEnabled: signal(true),
            mapTiles: signal({
              url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              attribution: 'OpenStreetMap',
              maxZoom: 19,
              provider: 'openstreetmap',
            }),
          },
        },
        {
          provide: FeedbackService,
          useValue: { notify: vi.fn(), confirm: vi.fn() },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TripMapComponent);
    fixture.componentRef.setInput('tripId', 'trip-1');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectedDay.set('day-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.selectedDay.set('day-2');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(invoke).toHaveBeenCalledWith(routingControllerDayRoute, {
      tripId: 'trip-1',
      dayId: 'day-2',
    });
    expect(fixture.componentInstance.routeData()?.dayId).toBe('day-2');

    resolveFirst({ ...secondRoute, dayId: 'day-1' });
    await fixture.whenStable();
    expect(fixture.componentInstance.routeData()?.dayId).toBe('day-2');
    fixture.destroy();
  });
});
