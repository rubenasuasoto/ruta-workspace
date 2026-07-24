export const environment = {
  production: true,
  apiBaseUrl: '/api',
  googleClientId: '',
  mapTiles: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
} as const;
