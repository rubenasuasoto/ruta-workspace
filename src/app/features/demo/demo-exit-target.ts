import { InjectionToken } from '@angular/core';

export interface DemoExitTarget {
  readonly url: string;
  readonly label: string;
  readonly external: boolean;
}

export const DEMO_EXIT_TARGET = new InjectionToken<DemoExitTarget>('DEMO_EXIT_TARGET', {
  providedIn: 'root',
  factory: () => ({
    url: '/acceso',
    label: 'Volver al acceso',
    external: false,
  }),
});
