import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'acceso',
    title: 'Ruta — Acceder',
    canActivate: [guestGuard],
    data: { mode: 'login' },
    loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'registro',
    title: 'Ruta — Crear cuenta',
    canActivate: [guestGuard],
    data: { mode: 'register' },
    loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'recuperar-contrasena',
    title: 'Ruta — Recuperar contraseña',
    canActivate: [guestGuard],
    data: { mode: 'recovery' },
    loadComponent: () =>
      import('./pages/password-recovery.page').then((m) => m.PasswordRecoveryPage),
  },
  {
    path: 'reenviar-verificacion',
    title: 'Ruta — Reenviar verificación',
    canActivate: [guestGuard],
    data: { mode: 'verification' },
    loadComponent: () =>
      import('./pages/password-recovery.page').then((m) => m.PasswordRecoveryPage),
  },
  {
    path: 'restablecer-contrasena',
    title: 'Ruta — Nueva contraseña',
    loadComponent: () => import('./pages/password-reset.page').then((m) => m.PasswordResetPage),
  },
  {
    path: 'verificar-correo',
    title: 'Ruta — Verificar correo',
    data: { action: 'verify' },
    loadComponent: () => import('./pages/account-token.page').then((m) => m.AccountTokenPage),
  },
  {
    path: 'confirmar-correo',
    title: 'Ruta — Confirmar correo',
    data: { action: 'email-change' },
    loadComponent: () => import('./pages/account-token.page').then((m) => m.AccountTokenPage),
  },
  {
    path: '',
    title: 'Ruta — Tus viajes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'viajes',
    title: 'Ruta — Viajes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/trips.page').then((m) => m.TripsPage),
  },
  {
    path: 'viajes/:id',
    title: 'Ruta — Detalle del viaje',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/trip-detail.page').then((m) => m.TripDetailPage),
  },
  {
    path: 'lugares',
    title: 'Ruta — Lugares guardados',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/places.page').then((m) => m.PlacesPage),
  },
  {
    path: 'cuenta',
    title: 'Ruta — Mi cuenta',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account.page').then((m) => m.AccountPage),
  },
  {
    path: '**',
    title: 'Ruta — Página no encontrada',
    loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage),
  },
];
