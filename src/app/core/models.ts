export type TripStatus = 'planificando' | 'proximo' | 'completado';
export type ActivityKind = 'comida' | 'cultura' | 'naturaleza' | 'traslado' | 'alojamiento' | 'otro';
export type ExpenseCategory = 'alojamiento' | 'transporte' | 'comida' | 'experiencias' | 'compras' | 'otro';

export interface Trip { id: string; destination: string; country: string; startDate: string; endDate: string; budget: number; status: TripStatus; coverImage: string; description: string; }
export interface Activity { id: string; title: string; time: string; kind: ActivityKind; cost?: number; notes: string; completed: boolean; position?: number; }
export interface ItineraryDay { id: string; tripId: string; date: string; activities: Activity[]; }
export interface Expense { id: string; tripId: string; title: string; category: ExpenseCategory; amount: number; date: string; }
export interface SavedPlace { id: string; name: string; city: string; country: string; category: ActivityKind; image: string; visited: boolean; note: string; }
