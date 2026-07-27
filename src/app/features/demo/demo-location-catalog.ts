import type { DemoSnapshot } from './demo-snapshot.model';

export interface DemoLocationOption {
  id: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

const FEATURED_LOCATIONS: readonly DemoLocationOption[] = [
  {
    id: 'featured-cadiz',
    label: 'Plaza de San Juan de Dios',
    address: 'Plaza de San Juan de Dios, Cádiz, España',
    city: 'Cádiz',
    country: 'España',
    latitude: 36.5297,
    longitude: -6.2922,
  },
  {
    id: 'featured-madrid',
    label: 'Puerta del Sol',
    address: 'Puerta del Sol, Madrid, España',
    city: 'Madrid',
    country: 'España',
    latitude: 40.4169,
    longitude: -3.7035,
  },
  {
    id: 'featured-barcelona',
    label: 'Plaça de Catalunya',
    address: 'Plaça de Catalunya, Barcelona, España',
    city: 'Barcelona',
    country: 'España',
    latitude: 41.387,
    longitude: 2.1701,
  },
  {
    id: 'featured-sevilla',
    label: 'Plaza Nueva',
    address: 'Plaza Nueva, Sevilla, España',
    city: 'Sevilla',
    country: 'España',
    latitude: 37.3887,
    longitude: -5.9953,
  },
];

export function searchDemoLocations(
  snapshot: DemoSnapshot,
  query: string,
  limit = 5,
): DemoLocationOption[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  return locationCatalog(snapshot)
    .filter((location) =>
      normalizeSearchText(
        `${location.label} ${location.address} ${location.city} ${location.country}`,
      ).includes(normalizedQuery),
    )
    .slice(0, limit);
}

function locationCatalog(snapshot: DemoSnapshot): DemoLocationOption[] {
  const snapshotLocations: DemoLocationOption[] = [
    {
      id: snapshot.base.id,
      label: snapshot.base.name,
      address: snapshot.base.address,
      city: snapshot.trip.destination,
      country: snapshot.trip.country,
      latitude: snapshot.base.latitude,
      longitude: snapshot.base.longitude,
    },
    ...snapshot.places.map((place) => ({
      id: place.id,
      label: place.name,
      address: place.address,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    })),
    ...snapshot.days.flatMap((day) =>
      day.activities.map((activity) => ({
        id: activity.id,
        label: activity.locationName || activity.title,
        address: activity.address,
        city: snapshot.trip.destination,
        country: snapshot.trip.country,
        latitude: activity.latitude,
        longitude: activity.longitude,
      })),
    ),
  ];

  const unique = new Map<string, DemoLocationOption>();
  for (const location of [...snapshotLocations, ...FEATURED_LOCATIONS]) {
    const key = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
    if (!unique.has(key)) unique.set(key, location);
  }
  return [...unique.values()];
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();
}
