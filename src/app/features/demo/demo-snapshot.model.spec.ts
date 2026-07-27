import type { DemoSnapshot } from './demo-snapshot.model';
import { demoMapLines } from './demo-snapshot.model';

describe('demoMapLines', () => {
  const snapshot = {
    schemaVersion: 2,
    generatedAt: '',
    source: {
      mode: 'frozen-provider-snapshot',
      geocoding: '',
      routing: '',
      attribution: '',
      disclaimer: '',
    },
    trip: {
      id: 'trip',
      destination: 'Valencia',
      country: 'España',
      startDate: '2027-05-12',
      endDate: '2027-05-14',
      description: '',
      status: 'planned',
      budget: 850,
      coverImage: '',
    },
    base: {
      id: 'hotel',
      name: 'Hotel',
      address: '',
      kind: 'alojamiento',
      latitude: 39,
      longitude: -0.3,
    },
    days: [
      {
        id: 'day',
        date: '2027-05-12',
        label: 'Centro',
        travelModeFromBase: 'walking',
        activities: [
          {
            id: 'activity',
            time: '10:00',
            title: 'Mercado',
            kind: 'comida',
            cost: 10,
            notes: '',
            travelModeToNext: 'walking',
            locationName: 'Mercado',
            address: '',
            latitude: 39.1,
            longitude: -0.4,
            completed: false,
          },
        ],
        route: {
          status: 'complete',
          source: 'approximate',
          totalDistanceMeters: 0,
          totalDurationSeconds: 0,
          legs: [],
        },
      },
    ],
    expenses: [],
    places: [],
  } satisfies DemoSnapshot;

  it('crea una línea discontinua de ida y vuelta desde el hotel para un día modificado', () => {
    const lines = demoMapLines(snapshot);

    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.mode === 'fallback')).toBe(true);
    expect(lines[0].coordinates).toEqual([
      [39, -0.3],
      [39.1, -0.4],
    ]);
    expect(lines[1].coordinates[1]).toEqual([39, -0.3]);
  });
});
