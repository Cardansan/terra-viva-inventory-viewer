# Arquitectura

## Modelo actual

La arquitectura vigente de Terra Viva es intencionalmente simple:

- GitHub Pages sirve la app estatica.
- Google Drive recibe videos y guarda el buzon de ordenes/estado.
- La laptop publicadora hace el trabajo pesado.

```text
Admin web
-> OAuth navegador
-> Drive Inbox + mailbox
-> Laptop worker
-> JSON estatico publicado
-> GitHub Pages
```

La web no procesa video ni guarda secretos de larga duracion.

## Capas del repo

- `app/`: rutas App Router para catalogo, borradores, editor y API local/no estatica.
- `components/`: UI publica y editor.
- `lib/`: contratos, repositorios, helpers de frontend y cliente Drive del navegador.
- `scripts/`: pipeline local de procesamiento/publicacion y worker de ordenes.
- `public/`: catalogos generados, borradores generados, thumbnails y fixtures.
- `docs/`: estado, arquitectura, runbooks y direccion del proyecto.

## Flujo publico

1. `lib/catalogRepository.ts` lee catalogos generados desde `public/catalog/`.
2. `/` resuelve el catalogo publicado mas reciente.
3. `/catalog/[date]/` muestra un catalogo publicado por fecha.
4. `CatalogViewer` filtra momentos no publicos y maneja navegacion + seleccion.
5. `SendSelectionWhatsAppButton` arma el mensaje de WhatsApp con IDs/numero publico.

## Flujo de borrador

1. `scripts/publish-catalog.mjs --workflow draft` genera `public/catalog-drafts/YYYY-MM-DD/catalog.json`.
2. Ese paso actualiza `public/catalog-drafts/current-draft.json`.
3. `lib/catalogRepository.ts` resuelve el borrador activo y borradores por fecha.
4. `/drafts/current/` y `/drafts/[date]/` sirven para revision interna.

## Flujo de edicion

`/edicion-catalogo/` integra tres capacidades:

1. revisar/editar momentos del borrador o catalogo activo,
2. cargar videos al Inbox de Drive,
3. disparar ordenes de proceso/publicacion.

Componentes clave:

- `AdminCatalogEditor`: coordinador de la experiencia de edicion.
- `AdminDriveWorkflowPanel`: flujo principal de proceso/publicacion.
- `AdminVideoUploadPanel`: carga de videos al Inbox.
- `AdminDriveSessionPanel`: diagnostico y soporte de la sesion web.
- `AdminGoogleGate`: barrera ligera opcional de identidad si despues se activa el gate.

## Flujo OAuth web

La sesion web de Drive vive solo en el navegador actual.

El helper compartido es:

- `lib/browserDriveSessionFlow.ts`

Comportamiento actual:

- si la sesion existe y no expiro, se reutiliza;
- si falta o expiro, la web abre Google OAuth en la accion principal;
- la sesion se guarda en `localStorage`;
- soporte queda como fallback manual.

## Acceso y exposicion

- La vista publica ya no expone link hacia la pagina de edicion.
- `/edicion-catalogo/`, `/drafts/current/` y `/drafts/[date]/` salen con `noindex`.
- El gate ligero con Google queda preparado pero apagado por default.
- Ese gate no protege server-side; solo agrega una barrera practica en un sitio estatico.

## Buzon de ordenes en Drive

La web y la laptop se coordinan usando la metadata `description` de la carpeta Inbox.

Schema actual:

- `terra-viva-web-publisher/v1`

Acciones ya soportadas:

- `process_draft`
- `publish_approved`
- `cancel_draft`

Estados ya soportados:

- `queued`
- `running`
- `succeeded`
- `failed`

## Worker local

El worker principal es:

- `scripts/process-drive-orders.mjs`

Responsabilidades:

- leer la carpeta Inbox,
- detectar orden pendiente,
- correr el publicador en modo draft o publish,
- escribir resultado de vuelta al mailbox.

## Publicador local

El script principal es:

- `scripts/publish-catalog.mjs`

Responsabilidades:

- leer videos pendientes del Inbox,
- generar thumbnails con `ffmpeg`,
- crear `catalog.json`,
- actualizar `current-draft.json` o `current-catalog.json`,
- mover procesados cuando aplica.

## Decisiones deliberadas

- No backend pagado por ahora.
- No puertos abiertos.
- No secretos de larga duracion en frontend.
- Borrador y publicado son superficies separadas.
- La laptop es el motor del sistema.

## Limites actuales

- La calidad del borrador sigue siendo heuristica.
- El estado web depende de una sesion de navegador, no de identidad compartida.
- El worker local aun necesita mayor robustez operativa.

## Direccion siguiente

La siguiente arquitectura deseada sigue siendo la misma base, pero mas robusta:

- misma web estatica,
- misma coordinacion por Drive,
- mejor worker local,
- mejor calidad de borrador,
- menos friccion operativa para mama.
