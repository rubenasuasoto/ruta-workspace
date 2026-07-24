import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Api } from '../../api/api';
import { geocodingControllerSearch } from '../../api/fn/geo/geocoding-controller-search';
import { PublicConfigStore } from '../../core/public-config.store';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  it('performs only the explicit query and exposes stale results', async () => {
    const invoke = vi.fn().mockResolvedValue({
      results: [
        {
          id: 'node:1',
          label: 'Casa Milà',
          category: 'museum',
          latitude: 41.3954,
          longitude: 2.1619,
          bbox: [2.16, 41.39, 2.17, 41.4],
        },
      ],
      stale: true,
      attribution: '© openrouteservice.org by HeiGIT',
    });
    TestBed.configureTestingModule({
      providers: [
        GeocodingService,
        { provide: Api, useValue: { invoke } },
        {
          provide: PublicConfigStore,
          useValue: { geocodingEnabled: vi.fn(() => true) },
        },
      ],
    });
    const service = TestBed.inject(GeocodingService);

    const result = await service.search('  Casa Milà  ');

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith(geocodingControllerSearch, {
      q: 'Casa Milà',
    });
    expect(result[0].latitude).toBe(41.3954);
    expect(service.stale()).toBe(true);
    expect(service.attribution()).toContain('HeiGIT');
  });

  it('turns a provider error into a retryable message', async () => {
    const invoke = vi
      .fn()
      .mockRejectedValue(
        new HttpErrorResponse({ status: 429, error: {} }),
      );
    TestBed.configureTestingModule({
      providers: [
        GeocodingService,
        { provide: Api, useValue: { invoke } },
        {
          provide: PublicConfigStore,
          useValue: { geocodingEnabled: vi.fn(() => true) },
        },
      ],
    });
    const service = TestBed.inject(GeocodingService);

    await expect(service.search('Barcelona')).resolves.toEqual([]);
    expect(service.error()).toContain('Espera');
  });

  it('does not call the API while geocoding is disabled', async () => {
    const invoke = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        GeocodingService,
        { provide: Api, useValue: { invoke } },
        {
          provide: PublicConfigStore,
          useValue: { geocodingEnabled: vi.fn(() => false) },
        },
      ],
    });
    const service = TestBed.inject(GeocodingService);

    await expect(service.search('Barcelona')).resolves.toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
    expect(service.error()).toContain('no está configurado');
  });
});
