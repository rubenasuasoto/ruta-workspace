import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Ruta — Tus viajes', loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage) },
  { path: 'viajes', title: 'Ruta — Viajes', loadComponent: () => import('./pages/trips.page').then((m) => m.TripsPage) },
  { path: 'viajes/:id', title: 'Ruta — Detalle del viaje', loadComponent: () => import('./pages/trip-detail.page').then((m) => m.TripDetailPage) },
  { path: 'lugares', title: 'Ruta — Lugares guardados', loadComponent: () => import('./pages/places.page').then((m) => m.PlacesPage) },
  { path: '**', title: 'Ruta — Página no encontrada', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) }
];
