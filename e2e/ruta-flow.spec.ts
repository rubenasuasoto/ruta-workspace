import { expect, test } from '@playwright/test';

test('registro, viaje, borrador IA, gasto y persistencia tras recargar', async ({ page }) => {
  const email = `e2e-browser-${Date.now()}@ruta.local`;
  await page.addInitScript(() => {
    localStorage.setItem('ruta.travel-journal.v1', JSON.stringify({
      version: 1,
      trips: [],
      days: [],
      expenses: [],
      places: [],
    }));
  });
  await page.route('**/api/trips/*/ai-itinerary', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        disclaimer: 'Las sugerencias, horarios y costes son estimaciones. Compruébalos.',
        days: [{
          date: '2026-09-01',
          activities: [{
            id: 'draft-e2e',
            title: 'Paseo sugerido',
            time: '10:00',
            kind: 'cultura',
            estimatedCost: 12,
            notes: 'Sugerencia simulada para E2E',
            selected: true,
          }],
        }],
      }),
    });
  });

  await page.goto('/registro');
  await page.getByLabel('Nombre').fill('Ruta Browser E2E');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill('Ruta-browser-password-2026');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Encontramos tu cuaderno anterior')).toBeVisible();
  await page.getByRole('button', { name: 'Más tarde' }).click();

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

  await page.getByRole('button', { name: 'presupuesto', exact: true }).click();
  await page.getByRole('button', { name: '+ Añadir gasto' }).click();
  await page.getByLabel('Concepto').fill('Café E2E');
  await page.getByLabel('Importe (€)').fill('5.55');
  await page.getByLabel('Fecha').fill('2026-09-01');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.getByText('Café E2E')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'itinerario', exact: true }).click();
  await expect(page.getByText('Paseo E2E editado')).toBeVisible();
  await page.getByRole('button', { name: 'presupuesto', exact: true }).click();
  await expect(page.getByText('Café E2E')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('link', { name: 'Mis viajes', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
