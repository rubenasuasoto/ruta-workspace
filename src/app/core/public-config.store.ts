import { Injectable, inject, signal } from '@angular/core';
import { Api } from '../api/api';
import { publicConfigControllerGetPublicConfig } from '../api/fn/system/public-config-controller-get-public-config';
import { environment } from '../../environments/environment';

export interface MapTilesConfig {
  url: string;
  attribution: string;
  maxZoom: number;
  provider: 'openstreetmap';
}

@Injectable({ providedIn: 'root' })
export class PublicConfigStore {
  private readonly api = inject(Api);
  readonly googleClientId = signal('');
  readonly turnstileEnabled = signal(false);
  readonly turnstileSiteKey = signal('');
  readonly routingEnabled = signal(false);
  readonly geocodingEnabled = signal(false);
  readonly mapTiles = signal<MapTilesConfig>({
    ...environment.mapTiles,
    maxZoom: 19,
    provider: 'openstreetmap',
  });

  async load(): Promise<void> {
    try {
      const config = await this.api.invoke(publicConfigControllerGetPublicConfig);
      this.googleClientId.set(config.googleClientId);
      this.turnstileEnabled.set(config.turnstileEnabled);
      this.turnstileSiteKey.set(config.turnstileSiteKey);
      this.routingEnabled.set(config.routingEnabled);
      this.geocodingEnabled.set(config.geocodingEnabled);
      this.mapTiles.set(config.mapTiles);
    } catch {
      // The static OpenStreetMap fallback keeps the map usable while the API starts.
    }
  }
}
