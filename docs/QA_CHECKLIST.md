# QA Checklist

## Visual

- [x] Mobile 360px: el visor no se desborda.
- [x] Mobile grande: se puede operar con una mano.
- [x] Desktop: el panel lateral no tapa el visor.
- [x] Botones legibles y de alto contraste.
- [x] Flechas anterior/siguiente muy visibles.
- [x] Número de árbol claro en pantalla.
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

- Navegación: al avanzar de árbol 01 a 02 se actualizó label, timestamp y link de WhatsApp.
- Estado vendido: el árbol 06 mostró `Vendido` y cambió el CTA a `No disponible`.
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
- [x] `admin login` esta en el footer y se ve discreto.
- [x] `Catalogo actualizado` aparece en el footer.
- [x] `Compartir catalogo` aparece abajo y no compite con WhatsApp.
- [x] Momentos `sold` no aparecen en contador publico, navegacion ni galeria.
- [x] Momentos `sold` siguen existiendo para admin.
- [x] La numeracion publica es continua despues de filtrar vendidos.
- [x] Galeria publica no muestra etiquetas de estado ni timestamps.
