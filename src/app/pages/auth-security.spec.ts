import { describe, expect, it } from 'vitest';
import { isAllowedExternalScript } from '../features/account/external-script.service';
import { safeReturnUrl } from './auth.page';

describe('controles de navegaciÃ³n y scripts externos', () => {
  it('solo permite rutas internas como destino tras iniciar sesiÃ³n', () => {
    expect(safeReturnUrl('/viajes/123')).toBe('/viajes/123');
    expect(safeReturnUrl('//evil.example')).toBe('/');
    expect(safeReturnUrl('/\\evil.example')).toBe('/');
    expect(safeReturnUrl('https://evil.example')).toBe('/');
    expect(safeReturnUrl(null)).toBe('/');
  });

  it('limita los scripts dinÃ¡micos a los proveedores aprobados', () => {
    expect(isAllowedExternalScript('https://accounts.google.com/gsi/client')).toBe(true);
    expect(
      isAllowedExternalScript(
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      ),
    ).toBe(true);
    expect(isAllowedExternalScript('https://evil.example/script.js')).toBe(false);
  });
});
