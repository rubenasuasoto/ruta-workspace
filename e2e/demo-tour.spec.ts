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

test('la guía recorre la app realista y puede saltarse sin usar servicios externos', async ({
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

  await page.goto('/demo?tour=1');

  await expect(
    page.getByText('Demo de portafolio · viaje realista · cambios solo durante esta visita'),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Paso 1 de 6')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Empieza con el viaje completo.' })).toBeVisible();
  await expect(page.locator('#demo-overview')).toHaveClass(/demo-tour-focus/);

  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText('Paso 2 de 6')).toBeVisible();
  await expect(page.locator('#demo-itinerary')).toHaveClass(/demo-tour-focus/);

  await page.getByRole('button', { name: 'Saltar guía' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.demo-tour-focus')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Valencia' })).toBeVisible();
  await page.getByRole('tab', { name: 'Mapa' }).click();
  await expect(page.getByLabel('Mapa local de Valencia con recorridos reales guardados')).toBeVisible();
  await expect(page.locator('.leaflet-image-layer')).toHaveAttribute(
    'src',
    /assets\/demo\/valencia-map\.svg/,
  );
  await expect(page.getByText('Base del viaje')).toBeVisible();
  await expect(page.getByText(/Hotel →/).first()).toBeVisible();
  await expect(page.getByText('© openrouteservice.org by HeiGIT')).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).include('main').analyze();
  expect(accessibility.violations).toEqual([]);
  expect(requests).toEqual([]);
  expect(googleMapsLaunches).toEqual([]);

  const mapsWindowPromise = page.waitForEvent('popup');
  await page.locator('.ruta-marker').first().click();
  const mapsWindow = await mapsWindowPromise;
  await expect.poll(() => googleMapsLaunches.length).toBe(1);
  expect(googleMapsLaunches[0]).toContain(
    'https://www.google.com/maps/dir/?api=1&destination=',
  );
  await mapsWindow.close();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page
    .getByRole('button', { name: 'Iniciar guía' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.setViewportSize({ width: 768, height: 1024 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
