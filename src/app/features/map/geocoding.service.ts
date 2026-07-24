import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Api } from '../../api/api';
import { geocodingControllerSearch } from '../../api/fn/geo/geocoding-controller-search';
import { GeocodeResultDto } from '../../api/models/geocode-result-dto';
import { PublicConfigStore } from '../../core/public-config.store';

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly api = inject(Api);
  private readonly publicConfig = inject(PublicConfigStore);
  readonly enabled = this.publicConfig.geocodingEnabled;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly stale = signal(false);
  readonly attribution = signal('');

  async search(query: string): Promise<GeocodeResultDto[]> {
    if (!this.enabled()) {
      this.error.set('El servicio de búsqueda geográfica todavía no está configurado.');
      return [];
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await this.api.invoke(geocodingControllerSearch, {
        q: query.trim(),
      });
      this.stale.set(response.stale);
      this.attribution.set(response.attribution);
      return response.results;
    } catch (error) {
      this.error.set(this.message(error));
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  private message(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (typeof message === 'string') return message;
      if (error.status === 429)
        return 'Hay varias búsquedas en curso. Espera unos segundos.';
    }
    return 'No se pudo buscar la ubicación. Inténtalo de nuevo.';
  }
}
