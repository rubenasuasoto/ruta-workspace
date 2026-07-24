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

## Mapas y rutas

La configuración pública se obtiene desde `/config/public`. El acceso con Google permanece deshabilitado mientras `GOOGLE_CLIENT_ID` esté vacío en `ruta-api/.env`.

El mapa conserva Leaflet y utiliza teselas de OpenStreetMap. Al seleccionar un día calcula rutas por tramo con los medios guardados en cada actividad y muestra distancia, duración, atribución y conflictos horarios. No incluye navegación giro a giro, tráfico en directo ni optimización del orden.

Para activar rutas y búsqueda geográfica crea una clave gratuita de HeiGIT, guárdala como `OPENROUTESERVICE_API_KEY` en `ruta-api/.env` y define `ROUTING_PROVIDER=openrouteservice` y `GEOCODING_PROVIDER=openrouteservice`. La clave permanece siempre en NestJS.

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

Playwright utiliza la API y PostgreSQL reales, simula la generación de IA, las rutas y la búsqueda geográfica, bloquea las teselas externas y elimina sus propias cuentas `e2e-browser-*` antes y después del flujo.
