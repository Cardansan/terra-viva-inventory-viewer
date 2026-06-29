# QA Checklist

## Visual

- [x] Mobile 360px: el visor no se desborda.
- [x] Mobile grande: se puede operar con una mano.
- [x] Desktop: el panel lateral no tapa el visor.
- [x] Botones legibles y de alto contraste.
- [x] Flechas anterior/siguiente muy visibles.
- [x] Numero de arbol claro en pantalla.
- [x] Boton de WhatsApp prominente.
- [x] Estados disponible/vendido/apartado se entienden.
- [x] Miniatura seleccionada destaca.
- [x] No hay layout roto con textos largos.
- [x] La app se siente como catalogo asistido, no como reproductor tecnico.

## Funcional

- [x] Flecha anterior funciona.
- [x] Flecha siguiente funciona.
- [x] Seleccionar miniatura cambia el momento actual.
- [x] Cambio de momento actualiza timestamp.
- [x] Video salta al timestamp cuando hay video disponible.
- [x] Video placeholder no rompe la app.
- [x] WhatsApp genera mensaje correcto.
- [x] Momentos vendidos se ven claramente y no permiten pedir por WhatsApp.
- [x] Momentos ocultos no aparecen en vista publica.
- [x] Admin muestra momentos.
- [x] Admin edita numero, timestamp, seccion, estado y notas.
- [x] Admin puede agregar un momento local.
- [x] Catalogo sin datos no truena.

## Resultado de QA del MVP

Revisado en Browser con viewport movil `390x844` y desktop `1280x800`.

- Navegacion: al avanzar de arbol 01 a 02 se actualizo label, timestamp y link de WhatsApp.
- Estado vendido: el arbol 06 mostro `Vendido` y cambio el CTA a `No disponible`.
- Admin: cargo 27 momentos; editar el numero del primer momento actualizo el encabezado local.
- Build: `next build` compilo correctamente.
- Nota: la captura bitmap del navegador agoto tiempo en el entorno, asi que la revision se hizo con DOM, medidas de controles y pruebas interactivas.

## Resultado de QA con proto-video

Revisado despues de cargar `public/videos/terra-viva-proto-inventory.mp4`.

- [x] Video real de referencia carga en el visor.
- [x] 27 miniaturas JPG fueron extraidas con `ffmpeg`.
- [x] El carrusel usa frames reales en lugar del SVG placeholder.
- [x] Capturas guardadas en `docs/screenshots/`.
- [x] Layout movil sin overflow horizontal.
- [x] CTA de WhatsApp visible cerca de la seleccion principal en movil.

Nota: los momentos siguen siendo timestamps mock distribuidos manualmente. No son deteccion automatica ni revision precisa de disponibilidad.

## Checks UX publico actuales

- [x] WhatsApp es la accion mas prominente.
- [x] `Ver video de este arbol` se ve como accion secundaria.
- [x] El boton grande de Play ya no aparece sobre el visor.
- [x] El catalogo publico no muestra link al panel de edicion.
- [x] `Catalogo actualizado` aparece en el footer.
- [x] `Compartir catalogo` aparece abajo y no compite con WhatsApp.
- [x] Momentos `sold` no aparecen en contador publico, navegacion ni galeria.
- [x] Momentos `sold` siguen existiendo para admin.
- [x] La numeracion publica es continua despues de filtrar vendidos.
- [x] Galeria publica no muestra etiquetas de estado ni timestamps.

## Checks draft/public separation y admin mobile

- [x] `/drafts/current` muestra mensaje de revision interna.
- [x] `/catalog/[date]` publicado no muestra mensajes de borrador.
- [x] `/drafts/current` y `/drafts/[date]` usan `noindex`.
- [x] `/edicion-catalogo/` usa `noindex`.
- [x] El header admin ya no es sticky en mobile.
- [x] `Vista de Cliente` ya no vive en la parte superior del admin.
- [x] Las herramientas manuales de respaldo quedaron relegadas a una seccion secundaria.
- [x] La lista de arboles vuelve a ser el centro del admin en celular.
- [x] La ruta principal del panel es `/edicion-catalogo/`.
- [x] El gate ligero con Google existe y queda apagado por default.

## Checks seleccion multiple

- [x] `Agregar a mi seleccion` agrega el arbol actual.
- [x] `Quitar de mi seleccion` remueve el arbol actual.
- [x] El contador muestra singular y plural correctamente.
- [x] `Enviar seleccion por WhatsApp` aparece solo con seleccion no vacia.
- [x] El mensaje de WhatsApp lista uno o varios arboles seleccionados.
- [x] El mensaje de WhatsApp incluye un solo link de seleccion compartible.
- [x] Abrir `?selection=moment-03,moment-08` precarga la seleccion.
- [x] La URL compartida tiene prioridad sobre `localStorage`.
- [x] La seleccion local persiste por fecha de catalogo.
- [x] IDs vendidos, ocultos o inexistentes se ignoran en seleccion publica.
- [x] `Mi seleccion` permite quitar arboles sin romper el momento actual.

## Checks pipeline Drive-first

- [ ] `npm run process:catalog-draft` genera un borrador sin publicar a clientas.
- [ ] El borrador se escribe en `public/catalog-drafts/YYYY-MM-DD/catalog.json`.
- [ ] El borrador actualiza `public/catalog-drafts/current-draft.json`.
- [ ] El admin prioriza el borrador procesado mas reciente sobre estado local viejo.
- [ ] El admin muestra una pantalla de aprobacion antes de publicar.
- [ ] En modo `draft` no se mueven archivos a `Procesados`.
- [ ] Con dry-run, lista todos los videos pendientes del Inbox raiz sin modificar Drive.
- [ ] No depende de ventana de 24 horas ni de `lookbackHours`.
- [ ] Ordena videos por `createdTime` ascendente.
- [ ] Usa `modifiedTime` si falta `createdTime`.
- [ ] Genera IDs estables `moment-YYYY-MM-DD-001`.
- [ ] Genera `public/catalog/YYYY-MM-DD/catalog.json` valido.
- [ ] Actualiza `public/catalog/current-catalog.json`.
- [ ] La app puede leer catalogo generado y caer al mock si no existe.
- [ ] No mueve archivos si falla publicacion.
- [ ] Mueve solo archivos usados si publicacion fue exitosa.
- [ ] Crea `Procesados/YYYY-MM-DD` si no existe.
- [ ] Despues de publicar, el Inbox raiz queda solo con videos aun no publicados.
- [ ] No manda nada a papelera si `trash_old=false`.
- [ ] En dry-run muestra que mandaria a papelera.
- [ ] No depura activo ni dos backups.
- [x] `/admin` ya no es la ruta operativa normal y puede quedar fuera del flujo habitual.
- [ ] No se guardan credenciales en frontend.
- [ ] No se exponen puertos.
- [ ] El flujo operativo no requiere Supabase, Apps Script, Cloudinary ni servidor propio.

