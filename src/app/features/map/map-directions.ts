export function googleMapsDirectionsUrl(latitude: number, longitude: number): string {
  const destination = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const parameters = new URLSearchParams({
    api: '1',
    destination,
    dir_action: 'navigate',
  });
  return `https://www.google.com/maps/dir/?${parameters.toString()}`;
}
