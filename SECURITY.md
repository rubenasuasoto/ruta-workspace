# Seguridad del cliente Ruta

El cliente no almacena tokens de acceso en almacenamiento persistente ni
contiene claves privadas. La sesiÃ³n renovable pertenece a una cookie `HttpOnly`
de la API. Las operaciones HTTP a la API incluyen `X-Ruta-Client`, y las rutas
de retorno y scripts externos se validan mediante listas permitidas.

## PublicaciÃ³n

- Servir exclusivamente por HTTPS y aplicar las cabeceras incluidas en
  `public/_headers` desde el proveedor real. El archivo debe verificarse sobre
  la respuesta desplegada: no todos los hostings lo interpretan.
- Mantener la API bajo el mismo sitio cuando sea posible y limitar
  `connect-src`, `script-src`, `frame-src` e `img-src` a los proveedores
  realmente utilizados.
- No introducir secretos en `environment*.ts`, el bundle, logs, source maps ni
  acciones de CI. Google y Turnstile solo usan identificadores pÃºblicos.
- Desactivar source maps de producciÃ³n, conservar dependencias bloqueadas y
  ejecutar compilaciÃ³n, pruebas y auditorÃ­a antes de desplegar.
- Verificar que enlaces externos usen `rel="noopener noreferrer"` cuando abran
  otra pestaÃ±a y que ningÃºn contenido de usuario se renderice como HTML.

Las imÃ¡genes y teselas externas revelan al proveedor la direcciÃ³n IP del
navegador. Antes de usuarios reales se debe documentar este tratamiento,
minimizar proveedores y valorar un servicio de imÃ¡genes propio.
