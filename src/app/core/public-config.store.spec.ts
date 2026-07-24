import { TestBed } from '@angular/core/testing';
import { Api } from '../api/api';
import { publicConfigControllerGetPublicConfig } from '../api/fn/system/public-config-controller-get-public-config';
import { PublicConfigStore } from './public-config.store';

describe('PublicConfigStore', () => {
  it('loads the public map configuration from the API', async () => {
    const invoke = vi.fn().mockResolvedValue({
      googleClientId: 'google-client',
      turnstileEnabled: true,
      turnstileSiteKey: 'turnstile-site',
      routingEnabled: true,
      geocodingEnabled: true,
      mapTiles: {
        url: 'https://tiles.example/{z}/{x}/{y}',
        attribution: 'OpenStreetMap',
        maxZoom: 18,
        provider: 'openstreetmap',
      },
    });
    TestBed.configureTestingModule({
      providers: [PublicConfigStore, { provide: Api, useValue: { invoke } }],
    });
    const store = TestBed.inject(PublicConfigStore);

    await store.load();

    expect(invoke).toHaveBeenCalledWith(publicConfigControllerGetPublicConfig);
    expect(store.routingEnabled()).toBe(true);
    expect(store.geocodingEnabled()).toBe(true);
    expect(store.turnstileEnabled()).toBe(true);
    expect(store.turnstileSiteKey()).toBe('turnstile-site');
    expect(store.mapTiles().provider).toBe('openstreetmap');
  });

  it('keeps the OpenStreetMap fallback when the API is unavailable', async () => {
    TestBed.configureTestingModule({
      providers: [
        PublicConfigStore,
        { provide: Api, useValue: { invoke: vi.fn().mockRejectedValue(new Error('offline')) } },
      ],
    });
    const store = TestBed.inject(PublicConfigStore);

    await expect(store.load()).resolves.toBeUndefined();

    expect(store.mapTiles().provider).toBe('openstreetmap');
    expect(store.routingEnabled()).toBe(false);
    expect(store.geocodingEnabled()).toBe(false);
  });
});
