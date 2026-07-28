import type { Routes } from '@angular/router';
import { demoExitGuard } from './features/demo/demo-exit.guard';

export const demoRoutes: Routes = [
  {
    path: 'demo',
    title: 'Ruta — Demo pública',
    canDeactivate: [demoExitGuard],
    loadComponent: () => import('./pages/demo.page').then((module) => module.DemoPage),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'demo',
  },
  {
    path: '**',
    redirectTo: 'demo',
  },
];
