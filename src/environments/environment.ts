export const environment = {
  production: false,
  apiBaseUrl: '/api',
  googleClientId: '',
  mapTiles: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
} as const;
