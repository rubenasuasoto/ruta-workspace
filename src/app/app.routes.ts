import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'acceso', title: 'Ruta — Acceder', canActivate: [guestGuard], data: { mode: 'login' }, loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage) },
  { path: 'registro', title: 'Ruta — Crear cuenta', canActivate: [guestGuard], data: { mode: 'register' }, loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage) },
  { path: '', title: 'Ruta — Tus viajes', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage) },
  { path: 'viajes', title: 'Ruta — Viajes', canActivate: [authGuard], loadComponent: () => import('./pages/trips.page').then((m) => m.TripsPage) },
  { path: 'viajes/:id', title: 'Ruta — Detalle del viaje', canActivate: [authGuard], loadComponent: () => import('./pages/trip-detail.page').then((m) => m.TripDetailPage) },
  { path: 'lugares', title: 'Ruta — Lugares guardados', canActivate: [authGuard], loadComponent: () => import('./pages/places.page').then((m) => m.PlacesPage) },
  { path: '**', title: 'Ruta — Página no encontrada', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) }
];
