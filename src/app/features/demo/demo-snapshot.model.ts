import type { ActivityKind, MapLine, MapPoint, TravelMode } from '../../core/models';

export interface DemoActivity {
  id: string;
  time: string;
  title: string;
  kind: ActivityKind;
  cost: number;
  notes: string;
  travelModeToNext: TravelMode;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  completed: boolean;
}

export type DemoExpenseCategory =
  'accommodation' | 'food' | 'transport' | 'activities' | 'other';

export interface DemoRouteLeg {
  id: string;
  fromActivityId: string;
  toActivityId: string;
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
}

export interface DemoDay {
  id: string;
  date: string;
  label: string;
  travelModeFromBase: TravelMode;
  activities: DemoActivity[];
  route: {
    status: 'complete' | 'partial';
    source: 'frozen' | 'approximate';
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    legs: DemoRouteLeg[];
  };
}

export interface DemoExpense {
  id: string;
  title: string;
  category: DemoExpenseCategory;
  amount: number;
}

export interface DemoPlace {
  id: string;
  name: string;
  city: string;
  country: string;
  category: ActivityKind;
  note: string;
  visited: boolean;
  address: string;
  latitude: number;
  longitude: number;
  image: string;
}

export interface DemoSnapshot {
  schemaVersion: number;
  generatedAt: string;
  source: {
    mode: 'frozen-provider-snapshot';
    geocoding: string;
    routing: string;
    attribution: string;
    disclaimer: string;
  };
  trip: {
    id: string;
    destination: string;
    country: string;
    startDate: string;
    endDate: string;
    description: string;
    status: 'planned';
    budget: number;
    coverImage: string;
  };
  base: {
    id: string;
    name: string;
    address: string;
    kind: 'alojamiento';
    latitude: number;
    longitude: number;
  };
  days: DemoDay[];
  expenses: DemoExpense[];
  places: DemoPlace[];
}

export function demoMapPoints(snapshot: DemoSnapshot, dayId?: string): MapPoint[] {
  const activities = snapshot.days
    .filter((day) => !dayId || day.id === dayId)
    .flatMap((day) =>
      day.activities.map((activity, position) => ({
        id: activity.id,
        label: activity.title,
        subtitle: `${activity.time} · ${day.label}`,
        latitude: activity.latitude,
        longitude: activity.longitude,
        kind: activity.kind,
        marker: 'activity' as const,
        dayId: day.id,
        position,
      })),
    );
  return [
    {
      id: snapshot.base.id,
      label: snapshot.base.name,
      subtitle: 'Punto de salida y regreso',
      latitude: snapshot.base.latitude,
      longitude: snapshot.base.longitude,
      kind: snapshot.base.kind,
      marker: 'base',
    },
    ...activities,
  ];
}

export function demoMapLines(snapshot: DemoSnapshot, dayId?: string): MapLine[] {
  return snapshot.days
    .filter((day) => !dayId || day.id === dayId)
    .flatMap((day) =>
      day.route.source === 'frozen'
        ? day.route.legs.map((leg) => ({
            id: leg.id,
            mode: leg.mode,
            coordinates: leg.coordinates,
          }))
        : approximateDayLines(snapshot, day),
    );
}

function approximateDayLines(snapshot: DemoSnapshot, day: DemoDay): MapLine[] {
  const stops = [
    {
      id: snapshot.base.id,
      latitude: snapshot.base.latitude,
      longitude: snapshot.base.longitude,
    },
    ...day.activities,
    {
      id: snapshot.base.id,
      latitude: snapshot.base.latitude,
      longitude: snapshot.base.longitude,
    },
  ];
  return stops.slice(0, -1).map((stop, index) => ({
    id: `approx-${day.id}-${stop.id}-${index}`,
    mode: 'fallback',
    coordinates: [
      [stop.latitude, stop.longitude],
      [stops[index + 1].latitude, stops[index + 1].longitude],
    ],
  }));
}
