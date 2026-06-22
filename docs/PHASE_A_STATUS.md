# Fase A Status

Ultima actualizacion: 2026-06-22 01:18:00 -06:00

## Estado

Fase A no debe considerarse cerrada todavia.

La base operativa ya existe y la app ya soporta el flujo principal:

1. Procesar un borrador desde videos del Inbox.
2. Revisar ese borrador en la web.
3. Aprobar el borrador desde admin.
4. Publicar el catalogo final.
5. Ver el catalogo publicado en GitHub Pages.

Pero siguen existiendo temas abiertos antes de declarar Fase A como realmente terminada:

- robustecer el feedback web cuando el token temporal de Drive expira,
- mejorar la cobertura del detector de momentos para videos con muchos arboles,
- y dar una pasada final de QA pensando ya en operacion menos asistida.

## Que ya quedo bien

### 1. Separacion entre borrador y publicado

- Existe `public/catalog-drafts/current-draft.json`.
- Existe `public/catalog/current-catalog.json`.
- `/drafts/current/` funciona como ruta de revision.
- `/catalog/[date]/` funciona como ruta publica.
- La vista publicada ya no debe mostrar copy interna de revision.
- La vista de borrador si conserva el mensaje de revision interna.

### 2. Flujo admin/publicado mas coherente

- El admin ya no usa un header sticky grande que tape la lista principal.
- `Vista de Cliente` ya no vive arriba; ahora queda abajo como accion normal.
- `Guardar/Abrir catalogo` ya no dominan la pantalla; ahora son herramientas manuales secundarias.
- La lista de arboles vuelve a ser la pieza principal del admin en celular.

### 3. Publicacion sin backend pagado sigue en pie

- GitHub Pages sigue siendo la superficie publica.
- Google Drive sigue siendo la entrada de videos.
- La laptop sigue siendo el motor que procesa y publica.
- El modelo `draft -> aprobacion -> published` sigue vigente.

### 4. El flujo web -> Drive -> laptop ya quedo probado

Ya existe una ruta semi-automatizada desde la web:

- la vista admin puede crear una orden `process_draft`,
- la vista admin puede crear una orden `publish_approved`,
- la orden queda guardada en la metadata de la carpeta Inbox de Drive,
- la laptop con `scripts/process-drive-orders.mjs` la detecta,
- procesa o publica segun la accion,
- y la app queda actualizada con el resultado.

Prueba real verificada el `2026-06-22`:

- la orden web de procesamiento fue recogida por la laptop,
- se reprocesaron los 3 videos reales del Inbox,
- el borrador `2026-06-22` quedo con `15` momentos y `15` thumbnails reales,
- despues se ejecuto una orden web de publicacion,
- y el catalogo publicado `2026-06-22` quedo actualizado con esos mismos `15` momentos.

### 5. La causa de los 9 momentos ya esta identificada

- El problema no era Drive ni `ffmpeg`.
- El pipeline inicial estaba hardcodeado a `9` momentos por video.
- Ademas, esos timestamps solo cubrian una parte del video.
- Ya se reemplazo por una generacion temporal configurable basada en duracion.

### 6. El pipeline ahora usa duracion real y limpia thumbnails viejos

Ademas del muestreo configurable, ya quedaron resueltos dos bugs concretos:

- antes se asumian duraciones por defecto; ahora se leen duraciones reales con `ffprobe`,
- antes podian quedar thumbnails viejos mezclados entre corridas; ahora la carpeta se limpia antes de regenerar.

Resultado actual validado:

- `public/catalog-drafts/2026-06-22/catalog.json` tiene `15` momentos,
- `public/catalog/2026-06-22/catalog.json` tiene `15` momentos,
- ambos lados tienen `15` thumbnails reales consistentes.

### 7. El pipeline ahora es mas configurable para la siguiente prueba

El publicador ya acepta estos parametros:

- `momentStartOffsetSeconds`
- `momentIntervalSeconds`
- `momentEndBufferSeconds`
- `minMomentsPerVideo`
- `maxMomentsPerVideo`

Eso permite subir la cobertura del borrador antes de implementar deteccion por estabilidad real.

## Que sigue pendiente en Fase A

### 1. Medir si el nuevo muestreo realmente mejora cobertura

Hace falta una nueva corrida con video real para responder:

- cuantas miniaturas candidatas salen ahora,
- si ya se acerca a los `20+` arboles esperados,
- y que parametros conviene ajustar para la siguiente prueba.

El estado actual mejoro de `9` a `15`, pero sigue corto frente a la expectativa visual del video.

### 2. Resolver la fragilidad del token temporal en la web

La capa web hoy depende de un access token temporal pegado en el navegador.

Ya se vio un fallo real:

- el worker local pudo completar proceso/publicacion,
- pero luego el panel web de estado mostro `401 UNAUTHENTICATED` al expirar el token.

Eso no rompe el pipeline local, pero si ensucia la UX del feedback.

### 3. Validar la operacion completa con menos asistencia manual

La operacion ya puede hacerse con ayuda de Carlos, pero todavia falta dejar mas redondo:

- como renovar el token temporal sin friccion,
- como explicar mejor el estado de exito/error en la web,
- y como empaquetar esto para la futura laptop de mama.

## Verificacion conocida al cierre de esta actualizacion

### Build y estructura

- `next build` paso correctamente.
- La app sigue generando rutas para:
  - `/admin`
  - `/catalog/[date]`
  - `/drafts/current`
  - `/drafts/[date]`

### Separacion draft/public

Verificado localmente:

- la ruta publicada no muestra copy de borrador;
- la ruta de borrador si muestra el mensaje de revision interna.

### Generacion de momentos

Verificado con video real:

- el pipeline ya no queda limitado a `9` momentos;
- la corrida real del `2026-06-22` genero `15` momentos candidatos;
- el catalogo draft y el catalogo published quedaron alineados en `15` momentos;
- el flujo publico muestra `Árbol 01 de 15` y no muestra copy de borrador en la ruta publicada.

## Riesgos abiertos

1. El siguiente borrador real todavia puede requerir calibracion fina.
2. El algoritmo actual sigue siendo muestreo temporal, no deteccion por estabilidad.
3. El panel web de ordenes necesita una historia mas robusta para expiracion/renovacion del token temporal.

## Criterio real para cerrar Fase A

Fase A debe considerarse terminada solo cuando se cumplan estas tres cosas al mismo tiempo:

1. el flujo web de proceso y publicacion tenga feedback confiable incluso con expiracion de token resuelta;
2. el borrador generado para un video real tenga cobertura suficientemente util para mama;
3. la experiencia publica y admin queden validadas en una ronda final de QA visual ya sin dudas operativas grandes.

## Archivos clave

- `components/AdminCatalogEditor.tsx`
- `components/CatalogViewer.tsx`
- `scripts/lib/catalogBuilder.mjs`
- `scripts/publish-catalog.mjs`
- `lib/catalogRepository.ts`
- `public/catalog-drafts/current-draft.json`
- `public/catalog/current-catalog.json`
- `terra-viva.publisher.example.json`
- `docs/PUBLISHING_PIPELINE.md`
- `docs/VIDEO_CAPTURE_GUIDELINES.md`
