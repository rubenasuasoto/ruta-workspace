import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('el acceso ofrece la aplicación privada y la demo guiada', async ({ page }) => {
  await page.goto('/acceso');

  await expect(page.getByText('Opción 1 · Demo guiada')).toBeVisible();
  await expect(page.getByText('Opción 2 · Acceso privado')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explorar la demo guiada' })).toHaveAttribute(
    'href',
    '/demo?tour=1',
  );
  await expect(page.getByRole('button', { name: 'Acceder', exact: true })).toBeVisible();
});

test('la guía puede completarse, saltarse y abrir la presentación técnica', async ({ page }) => {
  await page.goto('/demo?tour=1');

  await expect(page.getByText(/Demo de portafolio · viaje ficticio/)).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Paso 1 de 6')).toBeVisible();
  await expect(page.locator('#demo-overview')).toHaveClass(/demo-tour-focus/);

  for (let step = 2; step <= 6; step += 1) {
    await page.getByRole('button', { name: step === 6 ? 'Siguiente' : 'Siguiente' }).click();
    await expect(page.getByText(`Paso ${step} de 6`)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByRole('heading', { name: 'Ahora la demo es tuya.' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver el proyecto' }).click();
  await expect(page.getByRole('heading', { name: 'Un producto completo, contado sin ruido.' })).toBeVisible();

  await page.getByRole('button', { name: 'Iniciar guía' }).click();
  await page.getByRole('button', { name: 'Saltar guía' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.demo-tour-focus')).toHaveCount(0);
});

test('el sandbox guarda actividades, gastos, lugares y un borrador simulado', async ({ page }) => {
  const externalRequests: string[] = [];
  await page.route('**/api/**', (route) => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await page.route('https://*.tile.openstreetmap.org/**', (route) => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await page.route('https://api.heigit.org/**', (route) => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await page.route('https://api.openai.com/**', (route) => {
    externalRequests.push(route.request().url());
    return route.abort();
  });

  await page.goto('/demo');
  await page.getByRole('tab', { name: 'Itinerario' }).click();
  await page.getByRole('button', { name: /Añadir actividad/ }).first().click();
  const activityDialog = page.getByRole('dialog');
  await activityDialog.getByLabel('Actividad').fill('Cena de prueba en Ruzafa');
  await activityDialog.getByLabel('Hora').fill('21:15');
  await activityDialog.getByRole('button', { name: 'Guardar actividad' }).click();
  await expect(page.getByText('Cena de prueba en Ruzafa')).toBeVisible();
  await expect(page.getByText(/línea aproximada/)).toBeVisible();

  await page.getByRole('button', { name: 'Generar borrador simulado' }).click();
  await expect(page.getByText('3 propuestas seleccionadas')).toBeVisible();
  await page.getByRole('button', { name: 'Salir de la demo' }).first().click();
  await expect(page.getByRole('heading', { name: 'Salir con cambios pendientes' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByLabel('Incluir propuesta').last().uncheck();
  await page.getByRole('button', { name: 'Guardar selección' }).click();
  await expect(page.getByText('Horchata y fartons en el centro')).toBeVisible();
  await expect(page.getByText('Cena tranquila cerca del Cabanyal')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Presupuesto' }).click();
  await page.getByRole('button', { name: /Añadir gasto/ }).click();
  const expenseDialog = page.getByRole('dialog');
  await expenseDialog.getByLabel('Concepto').fill('Seguro de viaje de prueba');
  await expenseDialog.getByLabel('Importe').fill('37');
  await expenseDialog.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.getByText('Seguro de viaje de prueba')).toBeVisible();

  await page.getByRole('tab', { name: 'Lugares' }).click();
  await page.getByRole('button', { name: /Guardar lugar/ }).click();
  const placeDialog = page.getByRole('dialog');
  await placeDialog.getByLabel('Nombre').fill('Mirador de prueba');
  await placeDialog.getByLabel('Buscar una dirección').fill('cadiz');
  await placeDialog.getByRole('button', { name: 'Buscar', exact: true }).click();
  await placeDialog
    .getByRole('button', { name: /Seleccionar Plaza de San Juan de Dios/ })
    .click();
  await expect(placeDialog.getByText('Plaza de San Juan de Dios, Cádiz, España')).toBeVisible();
  await placeDialog.getByLabel('Categoría').selectOption('otro');
  await expect(placeDialog.getByLabel('Experiencia', { exact: true })).toBeChecked();
  const placeDialogAccessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(placeDialogAccessibility.violations).toEqual([]);
  await placeDialog.getByRole('button', { name: 'Guardar lugar' }).click();
  await expect(page.getByRole('heading', { name: 'Mirador de prueba' })).toBeVisible();
  await expect(page.getByText('Plaza de San Juan de Dios, Cádiz, España')).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Itinerario' }).click();
  await expect(page.getByText('Cena de prueba en Ruzafa')).toBeVisible();
  await page.getByRole('tab', { name: 'Presupuesto' }).click();
  await expect(page.getByText('Seguro de viaje de prueba')).toBeVisible();
  await page.getByRole('tab', { name: 'Lugares' }).click();
  await expect(page.getByRole('heading', { name: 'Mirador de prueba' })).toBeVisible();
  expect(externalRequests).toEqual([]);

  await page.getByRole('button', { name: 'Restaurar viaje' }).click();
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await page.getByRole('tab', { name: 'Lugares' }).click();
  await expect(page.getByRole('heading', { name: 'Mirador de prueba' })).toHaveCount(0);
});

test('el mapa local abre Maps solo por acción y la demo es accesible y responsive', async ({
  page,
}) => {
  const requests: string[] = [];
  const googleMapsLaunches: string[] = [];
  await page.route('**/api/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.route('https://*.tile.openstreetmap.org/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.route('https://api.heigit.org/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.context().route('https://www.google.com/maps/**', (route) => {
    googleMapsLaunches.push(route.request().url());
    return route.fulfill({ contentType: 'text/html', body: '<title>Google Maps simulado</title>' });
  });

  await page.goto('/demo');
  await page.getByRole('tab', { name: 'Mapa' }).click();
  await expect(page.getByLabel('Mapa local de Valencia con recorridos guardados')).toBeVisible();
  await expect(page.locator('.leaflet-image-layer')).toHaveAttribute('src', /valencia-map\.svg/);
  await expect(page.getByText('Base del viaje')).toBeVisible();
  expect(requests).toEqual([]);
  expect(googleMapsLaunches).toEqual([]);

  const popupPromise = page.waitForEvent('popup');
  await page.locator('.ruta-marker').first().click();
  const popup = await popupPromise;
  await expect.poll(() => googleMapsLaunches.length).toBe(1);
  expect(googleMapsLaunches[0]).toContain('https://www.google.com/maps/dir/?api=1&destination=');
  await popup.close();

  const accessibility = await new AxeBuilder({ page }).include('main').analyze();
  expect(accessibility.violations).toEqual([]);

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});
