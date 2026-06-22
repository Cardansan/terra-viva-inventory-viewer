# Fase A Status

Ultima actualizacion: 2026-06-21 14:02:00 -06:00

## Resumen ejecutivo

La Fase A esta avanzada, pero no cerrada todavia. Ya existe procesamiento real de borrador con Google Drive + `ffmpeg`, ya existe borrador online separado del catalogo publicado y ya existe un camino asistido para aprobar y preparar la publicacion desde un archivo compartido. Hoy ya se cerro el build/export estatico con una estrategia anti-cuelgue robusta, pero la fase sigue abierta porque la publicacion final vigente no deja un `catalog.json` util en `public/catalog/2026-06-15/`, asi que la vista cliente publicada real sigue incompleta.

## Avances confirmados

### 1. Borrador online estable

- Existe `public/catalog-drafts/2026-06-19/catalog.json`.
- Existe `public/catalog-drafts/current-draft.json`.
- Existen rutas de borrador:
  - `/drafts/current`
  - `/drafts/[date]`
- El export estatico ya genero salida para estas rutas en `.next-pages/`.

### 2. Procesamiento real de video

- El flujo de `Procesar borrador` ya corrio con un video real.
- Se descargaron videos desde Drive.
- Se generaron thumbnails reales con `ffmpeg`.
- La arquitectura robusta actual en Windows es:
  - Node arma catalogo y manifest.
  - PowerShell ejecuta `ffmpeg` y escribe thumbnails.

### 3. Aprobacion asistida para publicar

- El admin ya expone un CTA de aprobacion:
  - `Guardar aprobacion para publicar`
- Ese paso genera un archivo pensado para el flujo asistido:
  - `terra-viva-aprobacion-YYYY-MM-DD.json`
- Existe script nuevo:
  - `scripts/stage-approved-catalog.mjs`
- Ese script prepara el artefacto compartido:
  - `catalog-approvals/current-approved-catalog.json`
- Tambien deja historial en:
  - `catalog-approvals/history/`

### 4. Publicacion menos dependiente del navegador

- El launcher de publicacion ya no requiere que `catalogInputFile` viva fijo en config.
- En modo `publish`, ahora prepara primero la aprobacion estandar y luego publica usandola.
- La vista publica ya no debe depender del `localStorage` del admin como fuente de verdad. El catalogo publicado se toma del JSON generado.

### 5. Export estatico ya estabilizado

- Ya existe un runner dedicado:
  - `scripts/run-next-pages-build.mjs`
- En Windows, el build estable ahora se ejecuta con:
  - Node 20 portable en ruta corta temporal
  - sin limpiar `PATH` antes de lanzar Next
- Tambien existe servidor minimo para QA del export:
  - `scripts/windows/serve-static-export.ps1`

## Validaciones ya hechas

- TypeScript paso (`tsc --noEmit`).
- `publish-catalog` en `dry-run` ya confirmo que la publicacion final consume:
  - `catalog-approvals/current-approved-catalog.json`
- El export de GitHub Pages ya paso con el runner nuevo y sin procesos colgados.
- Se confirmo salida exportada para:
  - `.next-pages/admin/index.html`
  - `.next-pages/drafts/current/index.html`
  - `.next-pages/drafts/2026-06-19/index.html`
  - `.next-pages/catalog/2026-06-15/index.html`
- El staging de aprobacion ya genero:
  - `catalog-approvals/current-approved-catalog.json`
- Se hicieron capturas moviles de QA para:
  - admin
  - borrador online
  - catalogo cliente no disponible (ruta publicada incompleta)

## Incidente operativo corregido hoy

- Habia procesos colgados de `next build`.
- Se detecto y cerro el `node` del runtime principal con CPU anormalmente alta.
- Estado despues de limpieza:
  - no hay `localhost:3000` activo
  - no hay build util corriendo en segundo plano

## Pendientes para cerrar Fase A

1. Corregir la publicacion final para que `public/catalog/YYYY-MM-DD/` incluya `catalog.json` junto con sus thumbnails y media.
2. Volver a exportar Pages y repetir QA visual de la ruta cliente realmente publicada.
3. Confirmar que el flujo asistido quede claro para tu mama:
   - subir videos
   - procesar borrador
   - revisar borrador online
   - guardar aprobacion
   - publicar
4. Actualizar la documentacion final segun el comportamiento exacto despues de esa validacion completa.

## Blockers absolutos encontrados hasta ahora

No hay blocker absoluto de arquitectura para el flujo asistido de Fase A, pero si hay blockers reproducibles para declararla cerrada hoy:

1. **Publicacion final incompleta en `public/catalog/2026-06-15/`**
   - La carpeta existe, pero no contiene `catalog.json`.
   - Consecuencia: la ruta cliente exportada para `2026-06-15` abre como catalogo no disponible.

2. **QA cliente publicado no puede cerrarse sobre la fecha nueva**
   - Admin y borrador online ya tienen evidencia visual.
   - La vista cliente real del dia no puede validarse como correcta mientras falte el JSON publicado.

3. **El build de Next solo fue estable al ejecutarlo con el runner nuevo**
   - Causa raiz confirmada:
     - dentro del sandbox, Next fallaba con `spawn EPERM`
     - con limpieza agresiva de `PATH`, los workers fallaban con `spawn ENOENT`
   - Resolucion aplicada:
     - Node 20 portable en ruta corta temporal
     - build fuera del sandbox
     - runner `scripts/run-next-pages-build.mjs`
