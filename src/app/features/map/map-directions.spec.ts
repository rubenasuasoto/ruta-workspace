import { googleMapsDirectionsUrl } from './map-directions';

describe('googleMapsDirectionsUrl', () => {
  it('crea una ruta hacia el destino y deja que Maps use la ubicación actual', () => {
    const url = new URL(googleMapsDirectionsUrl(39.4699, -0.3763));

    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('39.469900,-0.376300');
    expect(url.searchParams.get('dir_action')).toBe('navigate');
    expect(url.searchParams.has('origin')).toBe(false);
  });
});
