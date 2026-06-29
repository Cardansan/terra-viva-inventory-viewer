# AI Handoff

Guia corta para otra IA que retome el repo sin cargar contexto viejo.

## Leer primero

1. `README.md`
2. `docs/PHASE_A_STATUS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/PUBLISHING_PIPELINE.md`
5. `docs/ROADMAP.md`

## Archivos clave del codigo

### Frontend principal

- `components/CatalogViewer.tsx`
- `components/AdminCatalogEditor.tsx`
- `components/AdminDriveWorkflowPanel.tsx`
- `components/AdminVideoUploadPanel.tsx`
- `components/AdminDriveSessionPanel.tsx`

### Helpers y contratos

- `lib/catalogTypes.ts`
- `lib/catalogRepository.ts`
- `lib/browserDriveClient.ts`
- `lib/browserDriveSessionFlow.ts`
- `lib/driveSessionBrowser.ts`

### Pipeline local

- `scripts/publish-catalog.mjs`
- `scripts/process-drive-orders.mjs`
- `scripts/setup-drive-oauth.mjs`

## Modelo mental correcto

No asumir que la web procesa video.

El sistema real es:

- GitHub Pages = interfaz,
- Google Drive = Inbox + mailbox,
- laptop = procesamiento y publicacion.

## Estado actual relevante

- borrador y publicado ya son superficies separadas,
- la web ya puede subir videos al Inbox,
- la web ya puede disparar ordenes de proceso/publicacion,
- OAuth web ya se activa desde los botones principales si hace falta,
- el worker local ya procesa ordenes desde Drive.

## Riesgos importantes

1. La calidad del borrador sigue siendo heuristica.
2. La laptop sigue siendo un punto operativo critico.
3. La sesion web de Drive vive por navegador, no por dispositivo compartido.

## No hacer

- No reintroducir dependencia fuerte en `/api/*` para produccion Pages.
- No meter secretos de larga duracion al frontend.
- No mezclar borrador y publicado como si fueran el mismo estado.
- No saltar directo a IA compleja antes de estabilizar el flujo operativo.

## Siguiente tipo de trabajo recomendado

Si la tarea es operativa:

- empezar por `docs/PHONE_RUNBOOK.md` y `docs/PUBLISHING_PIPELINE.md`.

Si la tarea es de producto/arquitectura:

- empezar por `docs/PHASE_A_STATUS.md` y `docs/ROADMAP.md`.

Si la tarea es de implementacion:

- empezar por `AdminDriveWorkflowPanel`, `AdminVideoUploadPanel`, `browserDriveSessionFlow` y `process-drive-orders.mjs`.
