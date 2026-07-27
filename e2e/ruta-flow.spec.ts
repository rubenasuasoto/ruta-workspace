import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

test('la demo pública usa datos ficticios sin API ni teselas externas', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.route('https://*.tile.openstreetmap.org/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/demo');
  await expect(page.getByText('Demo de portafolio · datos ficticios · solo lectura')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Valencia' })).toBeVisible();
  await expect(page.getByLabel('Mapa ficticio de la demo, sin teselas externas')).toBeVisible();
  expect(requests).toEqual([]);
});

function seedAdmin(email: string, password: string): void {
  const apiDirectory = resolve(__dirname, '../../ruta-api');
  const passwordHash = execFileSync(
    process.execPath,
    [
      '-e',
      `require('argon2').hash(${JSON.stringify(password)}).then((value) => process.stdout.write(value))`,
    ],
    { cwd: apiDirectory, encoding: 'utf8' },
  ).trim();
  const userId = randomUUID();
  const identityId = randomUUID();
  const sql = `
    INSERT INTO "User" ("id","email","name","emailVerifiedAt","systemRole","createdAt","updatedAt")
    VALUES ('${userId}','${email}','Admin Browser',CURRENT_TIMESTAMP,'admin',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO "AuthIdentity" ("id","userId","provider","providerSubject","passwordHash","createdAt")
    VALUES ('${identityId}','${userId}','LOCAL','${email}','${passwordHash}',CURRENT_TIMESTAMP);
  `;
  execFileSync(
    'docker',
    [
      'compose',
      '-f',
      'compose.yaml',
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'ruta',
      '-d',
      'ruta',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    { cwd: apiDirectory, stdio: 'ignore' },
  );
}

test('registro, viaje, borrador IA, gasto y persistencia tras recargar', async ({ page }) => {
  test.setTimeout(90_000);
  const email = `e2e-browser-${Date.now()}@ruta.local`;
  const adminEmail = `e2e-browser-admin-${Date.now()}@ruta.local`;
  const adminPassword = 'Ruta-admin-browser-2026!';
  seedAdmin(adminEmail, adminPassword);
  let mappedActivities: Array<{ id: string; travelModeToNext?: string }> = [];
  await page.addInitScript(() => {
    localStorage.setItem(
      'ruta.travel-journal.v1',
      JSON.stringify({
        version: 1,
        trips: [],
        days: [],
        expenses: [],
        places: [],
      }),
    );
  });
  await page.route('**/api/trips/*/ai-itinerary', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        disclaimer: 'Las sugerencias, horarios y costes son estimaciones. Compruébalos.',
        days: [
          {
            date: '2026-09-01',
            activities: [
              {
                id: 'draft-e2e',
                title: 'Paseo sugerido',
                time: '10:00',
                kind: 'cultura',
                estimatedCost: 12,
                notes: 'Sugerencia simulada para E2E',
                selected: true,
              },
            ],
          },
        ],
      }),
    });
  });
  await page.route('**/api/geo/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stale: false,
        attribution: '© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
        results: [
          {
            id: 'node:123',
            label: 'Casa Milà, Barcelona, España',
            category: 'museum',
            latitude: 41.3954,
            longitude: 2.1619,
            bbox: [2.16, 41.39, 2.17, 41.4],
          },
        ],
      }),
    });
  });
  await page.route('**/api/config/public', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessMode: 'invite_only',
        registrationEnabled: false,
        portfolioDemoEnabled: true,
        googleClientId: '',
        turnstileEnabled: false,
        turnstileSiteKey: '',
        routingEnabled: true,
        geocodingEnabled: true,
        mapTiles: {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: 'OpenStreetMap',
          maxZoom: 19,
          provider: 'openstreetmap',
        },
      }),
    });
  });
  await page.route('**/api/trips/*/map', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    mappedActivities = body.days.flatMap(
      (day: { activities: Array<{ id: string; travelModeToNext?: string }> }) => day.activities,
    );
    await route.fulfill({ response, body: JSON.stringify(body) });
  });
  await page.route('**/api/trips/*/days/*/route', async (route) => {
    const [from, to] = mappedActivities;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tripId: 'browser-trip',
        dayId: 'browser-day',
        status: 'complete',
        totalDistanceMeters: 1200,
        totalDurationSeconds: 600,
        unlocatedActivityIds: [],
        generatedAt: new Date().toISOString(),
        provider: 'mock',
        attribution: 'Ruta — proveedor simulado para pruebas',
        disclaimer: 'Ruta simulada: comprueba tiempos y señalización.',
        legs:
          from && to
            ? [
                {
                  fromActivityId: from.id,
                  toActivityId: to.id,
                  mode: 'cycling',
                  distanceMeters: 1200,
                  durationSeconds: 600,
                  availableSeconds: 300,
                  scheduleStatus: 'conflict',
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [2.1619, 41.3954],
                      [2.17, 41.4],
                    ],
                  },
                },
              ]
            : [],
      }),
    });
  });
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());

  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(adminEmail);
  await page.getByLabel('Contraseña').fill(adminPassword);
  await page.getByRole('button', { name: 'Acceder', exact: true }).click();
  await page.getByRole('link', { name: 'Invitaciones' }).click();
  await page.getByLabel('Correo de tu amigo').fill(email);
  await page.getByRole('button', { name: 'Crear invitación' }).click();

  let invitationToken = '';
  await expect
    .poll(
      async () => {
        const list = await page.request.get('http://localhost:8025/api/v1/messages');
        if (!list.ok()) return '';
        const body = (await list.json()) as {
          messages?: Array<{
            ID: string;
            To?: Array<{ Address?: string }>;
          }>;
        };
        const summary = body.messages?.find((message) =>
          message.To?.some((recipient) => recipient.Address === email),
        );
        if (!summary) return '';
        const detail = await page.request.get(`http://localhost:8025/api/v1/message/${summary.ID}`);
        if (!detail.ok()) return '';
        const message = (await detail.json()) as { Text?: string };
        invitationToken = message.Text?.match(/registro\?invite=([^\s]+)/)?.[1] ?? '';
        return invitationToken;
      },
      { timeout: 15_000 },
    )
    .not.toBe('');
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.goto(`/registro?invite=${encodeURIComponent(decodeURIComponent(invitationToken))}`);
  await expect(page.getByLabel('Correo invitado')).toHaveValue(email);
  await page.getByLabel('Nombre').fill('Ruta Browser E2E');
  await page.getByLabel('Contraseña').fill('Ruta-browser-password-2026!');
  await page.getByRole('button', { name: 'Aceptar invitación' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Encontramos tu cuaderno anterior')).toBeVisible();
  await page.getByRole('button', { name: 'Más tarde' }).click();

  await page.goto('/lugares');
  await expect(page).toHaveURL('/lugares');
  await page.getByRole('button', { name: '+ Guardar lugar' }).click();
  await page.getByLabel('Nombre').fill('Casa Milà E2E');
  await page.getByLabel('Ciudad').fill('Barcelona');
  await page.getByLabel('País').fill('España');
  await page.getByRole('textbox', { name: 'Ubicación' }).fill('Casa Milà Barcelona');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByRole('button', { name: /Casa Milà, Barcelona/ }).click();
  await page.getByRole('button', { name: 'Guardar lugar', exact: true }).click();
  await expect(page.getByText('Casa Milà E2E').first()).toBeVisible();

  await page.getByRole('link', { name: 'Mis viajes', exact: true }).click();
  await page.getByRole('button', { name: '+ Nuevo viaje' }).click();
  await page.getByLabel('Destino').fill('Oporto E2E');
  await page.getByLabel('País').fill('Portugal');
  await page.getByLabel('Salida').fill('2026-09-01');
  await page.getByLabel('Regreso').fill('2026-09-02');
  await page.getByLabel('Presupuesto (€)').fill('500');
  await page.getByLabel('Una nota sobre el viaje').fill('Flujo completo de navegador');
  await page.getByRole('button', { name: 'Crear viaje' }).click();

  const tripCard = page.locator('article.trip').filter({ hasText: 'Oporto E2E' });
  await expect(tripCard).toBeVisible();
  await tripCard.getByRole('link', { name: 'Abrir' }).click();
  await page.getByRole('button', { name: 'itinerario', exact: true }).click();
  await page.getByLabel('Intereses').fill('arquitectura, gastronomía');
  await page.getByRole('button', { name: 'Generar borrador' }).click();
  await page.getByRole('textbox', { name: 'Actividad', exact: true }).fill('Paseo E2E editado');
  await page.getByRole('button', { name: 'Guardar selección' }).click();
  await expect(page.getByText('Paseo E2E editado')).toBeVisible();

  await page.getByRole('button', { name: 'mapa', exact: true }).click();
  await page
    .getByLabel('Añadir un lugar guardado')
    .selectOption({ label: 'Casa Milà E2E · Barcelona' });
  await page.getByRole('button', { name: 'Vincular', exact: true }).click();
  await expect(page.getByText('Casa Milà E2E').first()).toBeVisible();
  await page.getByRole('button', { name: /Paseo E2E editado.*Ubicar/ }).click();
  await page
    .getByLabel('Usar un lugar guardado')
    .selectOption({ label: 'Casa Milà E2E · Barcelona' });
  await page.getByRole('button', { name: 'Guardar actividad' }).click();
  await expect(page.getByText('Paseo E2E editado')).toBeVisible();

  await page.getByRole('button', { name: 'itinerario', exact: true }).click();
  await page.getByRole('button', { name: '+ Añadir actividad' }).click();
  await page.getByLabel('Título').fill('Almuerzo E2E');
  await page.getByLabel('Hora').fill('10:05');
  await page
    .getByLabel('Usar un lugar guardado')
    .selectOption({ label: 'Casa Milà E2E · Barcelona' });
  await page.getByRole('button', { name: 'Guardar actividad' }).click();

  await page.getByRole('button', { name: 'mapa', exact: true }).click();
  await page.getByRole('button', { name: /Día 1/ }).click();
  await expect(page.getByText('Ruta calculada')).toBeVisible();
  await expect(page.getByText('1.2 km', { exact: true })).toBeVisible();
  const modeUpdate = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' && response.url().includes('/api/activities/'),
  );
  await page.getByLabel('Hasta Almuerzo E2E').selectOption('cycling');
  expect((await (await modeUpdate).json()).travelModeToNext).toBe('cycling');
  await expect(page.getByText('Medio de transporte actualizado.')).toBeVisible();
  await expect(page.getByText('El trayecto supera el tiempo disponible.')).toBeVisible();

  await page.getByRole('button', { name: 'presupuesto', exact: true }).click();
  await page.getByRole('button', { name: '+ Añadir gasto' }).click();
  await page.getByLabel('Concepto').fill('Café E2E');
  await page.getByLabel('Importe (€)').fill('5.55');
  await page.getByLabel('Fecha').fill('2026-09-01');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.getByText('Café E2E')).toBeVisible();
  await page.getByRole('button', { name: 'Editar Café E2E' }).click();
  await page.getByLabel('Importe (€)').fill('6.25');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();

  await page.reload();
  await page.getByRole('button', { name: 'itinerario', exact: true }).click();
  await expect(page.getByText('Paseo E2E editado')).toBeVisible();
  await page.getByRole('button', { name: 'presupuesto', exact: true }).click();
  await expect(page.getByText('Café E2E')).toBeVisible();
  await expect(page.locator('.expense').filter({ hasText: 'Café E2E' })).toContainText('6');
  await page.getByRole('button', { name: 'mapa', exact: true }).click();
  await expect(page.getByText('Casa Milà E2E').first()).toBeVisible();
  await expect(page.getByText('Paseo E2E editado')).toBeVisible();
  await page.getByRole('button', { name: /Día 1/ }).click();
  expect(mappedActivities[0]?.travelModeToNext).toBe('cycling');
  await expect(page.getByLabel('Hasta Almuerzo E2E')).toHaveValue('cycling');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('link', { name: 'Mis viajes', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);

  await page.setViewportSize({ width: 768, height: 1024 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
