# Seguridad del cliente Ruta

[English](SECURITY.en.md)

El cliente no almacena tokens de acceso en almacenamiento persistente ni
contiene claves privadas. El token de acceso vive únicamente en memoria y la
sesión renovable pertenece a una cookie `HttpOnly` de la API. Las operaciones
HTTP de escritura incluyen `X-Ruta-Client`; las rutas de retorno y los scripts
externos se validan mediante listas permitidas.

La única persistencia del navegador ajena a la sesión es el sandbox público de
la demo, aislado bajo `ruta.portfolio-demo.v2`. Contiene exclusivamente datos
ficticios y puede restaurarse desde la propia interfaz. La navegación normal de
la demo no llama a la API ni a proveedores externos. Google Maps solo se abre
después de una acción explícita sobre un marcador.

## Publicación

- Servir exclusivamente por HTTPS y aplicar las cabeceras incluidas en
  `public/_headers` desde el proveedor real. El archivo debe verificarse sobre
  la respuesta desplegada: no todos los hostings lo interpretan.
- Mantener la API bajo el mismo sitio cuando sea posible y limitar
  `connect-src`, `script-src`, `frame-src` e `img-src` a los proveedores
  realmente utilizados.
- No introducir secretos en `environment*.ts`, el bundle, los logs, los source
  maps ni las acciones de CI. Google y Turnstile solo utilizan identificadores
  públicos.
- Desactivar source maps de producción, conservar dependencias bloqueadas y
  ejecutar compilación, pruebas y auditoría antes de desplegar.
- Verificar que los enlaces externos usen `rel="noopener noreferrer"` cuando
  abran otra pestaña y que ningún contenido de usuario se renderice como HTML.
- Mantener `/demo` como única ruta pública de producto; el resto de la
  aplicación debe continuar protegido por sesión e invitación.

Las imágenes, teselas y servicios externos pueden revelar al proveedor la
dirección IP del navegador. Antes de admitir usuarios reales se debe documentar
este tratamiento, minimizar proveedores y revisar la política de seguridad de
contenido en el hosting final.
