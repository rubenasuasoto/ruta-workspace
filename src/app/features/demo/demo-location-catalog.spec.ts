import type { DemoSnapshot } from './demo-snapshot.model';
import { searchDemoLocations } from './demo-location-catalog';

describe('searchDemoLocations', () => {
  const snapshot = {
    trip: { destination: 'Valencia', country: 'España' },
    base: {
      id: 'hotel',
      name: 'Hotel de la demo',
      address: 'Carrer de la Pau, Valencia, España',
      latitude: 39.472,
      longitude: -0.372,
    },
    places: [
      {
        id: 'mercado',
        name: 'Mercado Central',
        address: 'Plaça de la Ciutat de Bruges, Valencia, España',
        city: 'Valencia',
        country: 'España',
        latitude: 39.4736,
        longitude: -0.3791,
      },
    ],
    days: [],
  } as unknown as DemoSnapshot;

  it('encuentra direcciones sin depender de acentos', () => {
    const results = searchDemoLocations(snapshot, 'cadiz');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        label: 'Plaza de San Juan de Dios',
        city: 'Cádiz',
        latitude: 36.5297,
        longitude: -6.2922,
      }),
    );
  });

  it('incluye las ubicaciones congeladas del viaje y limita resultados', () => {
    expect(searchDemoLocations(snapshot, 'mercado', 1)).toEqual([
      expect.objectContaining({ id: 'mercado', city: 'Valencia' }),
    ]);
    expect(searchDemoLocations(snapshot, 'a')).toEqual([]);
  });
});
