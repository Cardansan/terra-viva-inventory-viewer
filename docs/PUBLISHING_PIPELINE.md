# Publishing Pipeline

## Modelo actual

El pipeline vigente es Drive-first y laptop-driven.

```text
Celular/admin
-> Drive Inbox
-> orden web
-> laptop worker
-> borrador o catalogo final
-> GitHub Pages
```

No se usa backend pagado, puertos abiertos ni procesamiento de video en la web.

## Flujo operativo

1. Subir videos al Inbox de Drive.
2. Crear orden `process_draft` desde `/admin`.
3. La laptop procesa el borrador.
4. Revisar el borrador en `/drafts/current/` o `/admin/`.
5. Crear orden `publish_approved`.
6. La laptop publica el catalogo final.
7. GitHub Pages despliega el resultado estatico.

## Flujo web

Desde `/admin` la web ya puede:

- pedir OAuth de Drive cuando haga falta,
- subir videos directo al Inbox,
- dejar ordenes en el mailbox de Drive,
- leer el ultimo estado de proceso/publicacion.

Ordenes soportadas:

- `process_draft`
- `publish_approved`
- `cancel_draft`

## Flujo laptop

La laptop usa:

- `scripts/process-drive-orders.mjs` para escuchar y ejecutar ordenes,
- `scripts/publish-catalog.mjs` para generar borradores y catalogos,
- `ffmpeg` para thumbnails,
- `terra-viva.publisher.local.json` para configuracion local.

## Scripts importantes

- `pnpm process:catalog-draft`
- `pnpm publish:catalog`
- `pnpm watch:drive-orders`
- `pnpm setup:drive-oauth`

## Salidas generadas

Publicado:

```text
public/catalog/YYYY-MM-DD/catalog.json
public/catalog/YYYY-MM-DD/thumbnails/
public/catalog/current-catalog.json
```

Borrador:

```text
public/catalog-drafts/YYYY-MM-DD/catalog.json
public/catalog-drafts/YYYY-MM-DD/thumbnails/
public/catalog-drafts/current-draft.json
```

## Drive

Inbox actual:

- `Terra Viva/Inbox - Videos por publicar`

Procesados:

- `Terra Viva/Procesados/YYYY-MM-DD`

Reglas importantes:

- el Inbox raiz funciona como cola activa,
- `process_draft` toma lo pendiente del Inbox,
- `publish_approved` mueve solo los archivos ya publicados,
- no crear subcarpetas por fecha dentro del Inbox.

## Validaciones ya logradas

- procesamiento real previo con videos reales,
- generacion real de thumbnails,
- publicacion real previa del catalogo `2026-06-22`,
- flujo de ordenes web ya conectado con laptop,
- OAuth web just-in-time desde acciones principales.

## Pendientes reales

- robustecer credenciales/operacion de la laptop,
- mejorar calidad del borrador,
- completar QA rutinario del flujo completo,
- decidir si conviene una automatizacion mas profunda despues de estabilizar Fase A.

## Parametros de calidad del borrador

El generador actual sigue siendo heuristico y configurable.

Parametros principales:

- `momentStartOffsetSeconds`
- `momentIntervalSeconds`
- `momentEndBufferSeconds`
- `minMomentsPerVideo`
- `maxMomentsPerVideo`
- `dedupeSampleSize`
- `dedupeSimilarityThreshold`
- `dedupeMinGapSeconds`

La siguiente mejora deseable es estabilidad/pausas, no deteccion compleja de objetos todavia.
