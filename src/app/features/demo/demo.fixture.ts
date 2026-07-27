import { MapLine, MapPoint } from '../../core/models';

export const DEMO_TRIP = {
  destination: 'Valencia',
  country: 'España',
  startDate: '2027-05-12',
  endDate: '2027-05-15',
  description: 'Tres días de arquitectura, mercados y paseos junto al Mediterráneo.',
  budget: 900,
  spent: 462,
  days: [
    {
      id: 'demo-day-1',
      date: '2027-05-12',
      activities: [
        { time: '09:30', title: 'Desayuno en el mercado', kind: 'comida' },
        { time: '11:00', title: 'Paseo por el centro histórico', kind: 'cultura' },
        { time: '17:30', title: 'Jardín junto al antiguo cauce', kind: 'naturaleza' },
      ],
    },
    {
      id: 'demo-day-2',
      date: '2027-05-13',
      activities: [
        { time: '10:00', title: 'Arquitectura contemporánea', kind: 'cultura' },
        { time: '14:00', title: 'Arroz frente al mar', kind: 'comida' },
        { time: '19:00', title: 'Atardecer en la playa', kind: 'naturaleza' },
      ],
    },
  ],
  places: [
    { name: 'Mercado de la Luz', category: 'comida', note: 'Producto local y desayuno temprano.' },
    { name: 'Jardín del Río', category: 'naturaleza', note: 'Recorrerlo en bicicleta.' },
    { name: 'Galería del Mar', category: 'cultura', note: 'Exposición ficticia de diseño.' },
  ],
} as const;

export const DEMO_POINTS: MapPoint[] = [
  {
    id: 'demo-1',
    label: 'Mercado de la Luz',
    subtitle: 'Parada 1',
    latitude: 39.474,
    longitude: -0.378,
    kind: 'comida',
    marker: 'activity',
    dayId: 'demo-day-1',
    position: 0,
  },
  {
    id: 'demo-2',
    label: 'Centro histórico',
    subtitle: 'Parada 2',
    latitude: 39.476,
    longitude: -0.374,
    kind: 'cultura',
    marker: 'activity',
    dayId: 'demo-day-1',
    position: 1,
  },
  {
    id: 'demo-3',
    label: 'Jardín del Río',
    subtitle: 'Parada 3',
    latitude: 39.469,
    longitude: -0.36,
    kind: 'naturaleza',
    marker: 'activity',
    dayId: 'demo-day-1',
    position: 2,
  },
];

export const DEMO_LINES: MapLine[] = [
  {
    id: 'demo-walk',
    mode: 'walking',
    coordinates: [
      [39.474, -0.378],
      [39.476, -0.374],
      [39.469, -0.36],
    ],
  },
];
