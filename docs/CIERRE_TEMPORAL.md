# Cierre temporal de Ruta

Fecha de revisión: 27 de julio de 2026.

## Estado entregable

Ruta queda cerrada temporalmente como una SPA Angular 22 con dos recorridos:

- aplicación privada por invitación, conectada a `ruta-api`;
- demo pública interactiva, editable y persistente solo en el navegador.

La demo utiliza un viaje ficticio a Valencia, recursos locales, mapa local,
rutas congeladas y un borrador de itinerario simulado. No inicializa la sesión
privada ni contacta API, OpenAI, HeiGIT, teselas o Google Identity durante la
navegación normal. Google Maps solo se abre voluntariamente desde un marcador.

## Validación realizada

| Comprobación | Resultado |
| --- | --- |
| Angular ESLint | Correcto |
| Pruebas unitarias | 35 de 35 |
| Cobertura: sentencias | 51,83 % |
| Cobertura: ramas | 47,51 % |
| Cobertura: funciones | 43,23 % |
| Cobertura: líneas | 55,47 % |
| Compilación de producción | Correcta |
| Playwright | 5 de 5 |
| Axe y responsive 390/768/1440 | Correcto |
| Cliente OpenAPI | 69 modelos y 13 servicios, sincronizado |
| Auditoría npm de producción | 0 vulnerabilidades |
| Búsqueda de secretos en fuentes | Sin coincidencias |

Las pruebas de integración cubren el acceso, la demo guiada, persistencia y
restauración del sandbox, creación de actividades/gastos/lugares, borrador
simulado, mapa, apertura voluntaria de Maps y el flujo real con la API.

## Puesta en marcha

Desde `ruta-api`:

```powershell
docker compose up -d --build
```

Desde `Ruta`:

```powershell
npm install
npm start
```

Direcciones locales:

- Angular: `http://localhost:4200`
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Mailpit: `http://localhost:8025`
- MinIO: `http://localhost:9001`

Para detener el entorno sin borrar PostgreSQL ni los objetos de MinIO:

```powershell
docker compose stop
```

No utilizar `docker compose down -v` salvo que se quiera borrar expresamente
todo el estado local.

## Límites aceptados en este cierre

- No hay despliegue público, CI remoto, observabilidad ni ensayo de
  restauración de copias de seguridad.
- Google OAuth permanece sin configurar; el acceso local por invitación es el
  recorrido operativo.
- La búsqueda de direcciones de la demo es un catálogo local deliberadamente
  limitado. La aplicación privada utiliza HeiGIT.
- La cobertura actual es una línea base, no un umbral de calidad obligatorio.
- Colaboración avanzada, PWA, pagos, reservas, tráfico y navegación giro a giro
  permanecen fuera de alcance.

## Cómo retomar el proyecto

1. Arrancar Docker y comprobar `GET /health`.
2. Ejecutar `npm run check:api` en Angular después de cualquier cambio de DTO.
3. Ejecutar lint, unitarias, compilación y E2E en ambos repositorios.
4. Revisar `git status` antes de mezclar cambios o publicar.
5. Abordar primero CI, hosting HTTPS, backups y observabilidad si se decide
   convertir el proyecto en una entrega pública.

No hay credenciales de prueba fijas documentadas. Playwright crea cuentas
temporales y las limpia; las cuentas humanas deben crearse mediante una
invitación administrativa.
