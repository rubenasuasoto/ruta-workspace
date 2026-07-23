# Ruta

SPA Angular 22 para diseñar viajes, itinerarios, presupuestos y lugares guardados. Utiliza signals y formularios reactivos, y consume un cliente tipado generado desde el contrato de `ruta-api`.

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

Playwright utiliza la API y PostgreSQL reales, intercepta únicamente la generación de IA y elimina sus propias cuentas `e2e-browser-*` antes y después del flujo.
