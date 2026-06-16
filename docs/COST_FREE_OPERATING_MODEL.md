# Modelo operativo sin suscripciones

## Objetivo

Mantener Terra Viva Inventory Viewer funcionando durante los siguientes anos sin contratar Supabase, Cloudinary, hosting pagado ni otro backend mensual mientras el negocio crece.

## Decisiones base

- Hosting publico: GitHub Pages.
- Codigo y catalogos publicados: GitHub.
- Videos crudos: Google Drive.
- Procesamiento: laptop local con Node.js y ffmpeg.
- Publicacion: script local o GitHub Action con self-hosted runner.
- Metadata publica: archivos JSON estaticos en `public/catalog`.
- Admin MVP: estado local y publicador semi-manual.

## Por que esta arquitectura aguanta mas tiempo

El catalogo publico no necesita servidor siempre encendido. Cada publicacion convierte videos y metadata a archivos estaticos que GitHub Pages puede servir gratis.

La laptop solo trabaja durante la publicacion:

1. lee Drive,
2. genera miniaturas/catalogo,
3. actualiza archivos,
4. empuja a GitHub,
5. se apaga o queda libre.

No hay base de datos online, worker 24/7, bucket pagado ni API propia expuesta a internet.

## Limites aceptados

- Los cambios admin no son multiusuario en tiempo real.
- La publicacion es semi-manual.
- El runner requiere que una laptop este encendida.
- La disponibilidad real se confirma por WhatsApp.
- Si Google Drive cambia politicas o cuota, se reevalua.

Estos limites son aceptables para un negocio chico porque reducen costo fijo y complejidad operativa.

## Que no se debe agregar por ahora

- Supabase Postgres.
- Supabase Storage.
- Cloudinary.
- Servidor propio.
- Apps Script.
- Puertos abiertos en la laptop.
- Login complejo antes de necesitar cambios reales multiusuario.

## Cuando reconsiderar servicios pagados

Revisar backend pagado solo si pasa una de estas cosas:

- varios admins editan inventario al mismo tiempo,
- se necesitan pagos/reservas automaticas,
- se publican muchos catalogos diarios,
- Drive deja de ser suficiente para videos,
- GitHub Pages deja de cubrir el trafico,
- el costo de operacion manual supera claramente una suscripcion.

Hasta entonces, la ruta recomendada es mejorar el publicador local y mantener el sitio estatico.
