import type {
  ApplicationConfig} from '@angular/core';
import {
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideApiConfiguration } from './api/api-configuration';
import { AuthStore } from './auth/auth.store';
import { authInterceptor } from './auth/auth.interceptor';
import { TripStore } from './core/trip-store.service';
import { environment } from '../environments/environment';
import { PublicConfigStore } from './core/public-config.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideApiConfiguration(environment.apiBaseUrl),
    provideAppInitializer(() => {
      if (globalThis.location?.pathname === '/demo') return;
      const publicConfig = inject(PublicConfigStore);
      const auth = inject(AuthStore);
      const trips = inject(TripStore);
      return publicConfig
        .load()
        .then(() => auth.initialize())
        .then(() => (auth.authenticated() ? trips.load() : undefined));
    }),
  ],
};
