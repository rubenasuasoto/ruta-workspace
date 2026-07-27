export type TripStatus = 'planificando' | 'proximo' | 'completado';
export type ActivityKind =
  'comida' | 'cultura' | 'naturaleza' | 'traslado' | 'alojamiento' | 'otro';
export type ExpenseCategory =
  'alojamiento' | 'transporte' | 'comida' | 'experiencias' | 'compras' | 'otro';
export type TravelMode = 'walking' | 'cycling' | 'driving';

export interface LocationFields {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Trip {
  id: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: TripStatus;
  coverImage?: string | null;
  coverAssetId?: string | null;
  coverVerified?: boolean;
  description: string;
}
export interface Activity extends LocationFields {
  id: string;
  title: string;
  time: string;
  kind: ActivityKind;
  cost?: number;
  notes: string;
  completed: boolean;
  position?: number;
  savedPlaceId?: string | null;
  locationName?: string | null;
  travelModeToNext?: TravelMode;
}
export interface ItineraryDay {
  id: string;
  tripId: string;
  date: string;
  activities: Activity[];
}
export interface Expense {
  id: string;
  tripId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
}
export interface SavedPlace extends LocationFields {
  id: string;
  name: string;
  city: string;
  country: string;
  category: ActivityKind;
  image?: string | null;
  imageAssetId?: string | null;
  imageVerified?: boolean;
  visited: boolean;
  note: string;
}
export interface MapPoint {
  id: string;
  label: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  kind: ActivityKind | 'lugar';
  marker: 'activity' | 'place' | 'base';
  dayId?: string;
  position?: number;
}
export interface MapLine {
  id: string;
  coordinates: [number, number][];
  mode: TravelMode | 'fallback';
}
