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

Abre `http://localhost:4200`. El proxy local envía `/api` a NestJS. Los
correos de verificación y recuperación aparecen en Mailpit:
`http://localhost:8025`.

La pantalla de acceso ofrece dos recorridos:

- **Demo guiada:** abre `/demo?tour=1` como si fuera un viaje de la aplicación.
  Incluye resumen, itinerario, presupuesto, mapa, lugares y presentación
  técnica; la guía puede avanzarse, retrocederse o saltarse.
- **Acceso privado:** inicia sesión en el cuaderno real, disponible únicamente
  para cuentas creadas mediante una invitación personal.

La demo carga una instantánea versionada de Valencia desde
`public/assets/demo/valencia.snapshot.json`. Sus lugares son reales y sus
geometrías se prepararon con HeiGIT/openrouteservice, pero los horarios, costes
y recomendaciones son estimaciones de demostración. No contiene datos de
usuarios.

Al abrirla no inicializa la sesión, no utiliza `localStorage`, no solicita datos
a la API privada y no contacta teselas, geocodificación ni rutas externas. Las
interacciones se conservan únicamente durante la visita. El mapa utiliza el
fondo vectorial local `public/assets/demo/valencia-map.svg`; cada jornada parte
del hotel de la demo y termina de nuevo en él.

Los marcadores de la demo abren una URL universal de Google Maps únicamente
después de pulsarlos. Se envía la coordenada del destino, se omite el origen
para que Maps pueda utilizar la ubicación actual del dispositivo y no se
necesita una clave de Google Maps.

La instantánea solo se regenera manualmente desde `ruta-api`, consumiendo una
pequeña parte de la cuota del proveedor:

```bash
npm run demo:snapshot
```

El generador lee `OPENROUTESERVICE_API_KEY` desde el `.env` local de la API y
nunca la incorpora al JSON.

## Cuentas privadas

- El registro abierto está deshabilitado. El administrador crea invitaciones
  personales desde `/administracion/invitaciones`.
- La invitación fija el correo, caduca a los siete días y solo puede utilizarse
  una vez; completar el registro confirma ese correo.
- Se incluyen recuperación de contraseña, reenvío de verificación y cambio de
  correo.
- Google Identity Services se activa automáticamente cuando
  `/config/public` entrega un `GOOGLE_CLIENT_ID`.
- Turnstile aparece cuando la API entrega una clave pública y lo declara
  habilitado.
- “Mi cuenta” permite editar el perfil, reautenticarse, cambiar o añadir una
  contraseña, revisar sesiones, exportar los datos y eliminar la cuenta.
- Los tokens de acceso permanecen únicamente en memoria; la renovación usa la
  cookie `HttpOnly` de la API.

## Mapas y rutas

La configuración pública se obtiene desde `/config/public`. Google permanece
deshabilitado mientras `GOOGLE_CLIENT_ID` esté vacío en `ruta-api/.env`.

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
npm run lint
npm run build
npm test -- --watch=false
npm run test:coverage
npm run test:e2e
```

Playwright utiliza la API, PostgreSQL y Mailpit reales. Simula la generación de
IA, las rutas y la búsqueda geográfica, bloquea las teselas externas, verifica
el correo desde Mailpit y elimina sus cuentas `e2e-browser-*` antes y después
del flujo. La prueba específica de `/demo` bloquea también HeiGIT y `/api`,
ejecuta Axe, comprueba la guía con teclado y valida escritorio, móvil y tableta.
