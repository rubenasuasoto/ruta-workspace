# Ruta

SPA Angular 22 para diseñar viajes, itinerarios, presupuestos, lugares guardados y mapas personales. Utiliza signals, formularios reactivos y Leaflet, y consume un cliente tipado generado desde el contrato de `ruta-api`.

## Desarrollo local

1. Inicia `ruta-api` y PostgreSQL desde el repositorio hermano:

```bash
docker compose up --build
```

2. Instala dependencias e inicia Angular:

```bash
npm install
npm start
```

Abre `http://localhost:4200`. El proxy local envía `/api` a NestJS.

El acceso con Google permanece deshabilitado hasta añadir el identificador público en `src/environments/environment.ts`. Las claves privadas nunca pertenecen al repositorio Angular.

La URL y atribución de teselas se configuran en los archivos de entorno mediante `mapTiles`. El mapa dibuja marcadores y el orden previsto de las actividades, no rutas reales, navegación, disponibilidad ni tiempos de viaje.

## Cliente OpenAPI

El cliente de `src/app/api` es código generado y versionado. Para actualizar contrato y cliente desde ambos repositorios:

```bash
npm run api:sync
```

No edites manualmente los archivos generados.

## Verificación

```bash
npm run build
npm test -- --watch=false
npm run test:e2e
```

Playwright utiliza la API y PostgreSQL reales, simula la generación de IA y la búsqueda geográfica, bloquea las teselas externas y elimina sus propias cuentas `e2e-browser-*` antes y después del flujo.
