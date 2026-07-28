import { provideHttpClient } from '@angular/common/http';
import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DemoApp } from './app/demo-app';
import { demoRoutes } from './app/demo.routes';
import { DEMO_EXIT_TARGET } from './app/features/demo/demo-exit-target';

const demoConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(demoRoutes),
    provideHttpClient(),
    {
      provide: DEMO_EXIT_TARGET,
      useValue: {
        url: 'https://rubenasua.vercel.app/projects/ruta',
        label: 'Volver al portfolio',
        external: true,
      },
    },
  ],
};

bootstrapApplication(DemoApp, demoConfig)
  .catch((error: unknown) => console.error(error));
