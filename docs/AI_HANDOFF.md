# AI Handoff

## Que hace la app

Terra Viva Inventory Viewer convierte videos de inventario de arboles de cuarzo en un catalogo navegable por momentos. La clienta no tiene que pausar manualmente: elige por numero de arbol, arma `Mi seleccion` y manda un mensaje de WhatsApp con todos los arboles elegidos.

## Archivos para leer primero

1. `README.md`
2. `lib/catalogTypes.ts`
3. `lib/mockCatalogData.ts`
4. `components/CatalogViewer.tsx`
5. `components/AdminCatalogEditor.tsx`
6. `docs/ROADMAP.md`

## Convenciones

- Mantener TypeScript estricto.
- Componentes pequeños y claros.
- Reglas puras en `/lib`.
- No mezclar datos mock con UI.
- UI mobile-first, botones grandes, texto legible.
- La selección principal es `Árbol #`, no timestamp.

## Data mock

La data mock esta en `lib/mockCatalogData.ts`. Ahi se cambian videos, momentos, estados y miniaturas mientras no exista backend.

## Tipos

Los contratos principales estan en `lib/catalogTypes.ts`:

- `CatalogDay`
- `CatalogVideo`
- `TreeMoment`
- `CatalogStatus`
- `TreeMomentStatus`

## Donde agregar integracion real sin suscripciones

- Catalogos generados: `lib/catalogRepository.ts` ya lee `public/catalog/YYYY-MM-DD/catalog.json`.
- Google Drive como entrada inicial de videos: crear `lib/driveInput.ts`.
- Media futura: mantener Drive + assets estaticos antes de considerar Storage pagado.
- Worker de video: crear carpeta futura `workers/` o servicio externo.
- WhatsApp: mantener `lib/whatsapp.ts`.
- Extraccion y deteccion de momentos: crear `lib/videoProcessing/` cuando existan videos reales.

## Estrategia de video actual

El repo incluye `public/videos/terra-viva-proto-inventory.mp4` solo como fixture temporal. Los videos reales futuros no deben subirse a Git. La fuente gratuita inicial sera Google Drive usando un Inbox raiz para pendientes y una carpeta `Procesados/YYYY-MM-DD` para lo ya publicado.

## Que NO hacer todavia

No implementar IA compleja de detección de objetos ni prometer detección perfecta de árboles. La fase actual es por timestamps, pausas y estabilidad del video. Esperar videos reales y dataset antes de entrenar, evaluar o integrar modelos de visión.

## Como continuar rapido

Para una nueva sesion, lee `lib/mockCatalogData.ts` y `components/CatalogViewer.tsx` para entender el flujo publico. Si el trabajo es de admin, lee `components/AdminCatalogEditor.tsx` y `components/AdminMomentList.tsx`. Si el trabajo es backend, empieza por `lib/catalogTypes.ts` y reemplaza gradualmente el mock con un repositorio.

## Arquitectura vigente de Fase A

Pensar el sistema asi:

- GitHub Pages = interfaz
- Google Drive = entrada de videos y futuro buzon de ordenes
- Laptop = motor de procesamiento/publicacion

No asumir que GitHub Pages "ejecuta" procesos. La web solo muestra UI y mas adelante dejara ordenes compartidas; la laptop es quien corre `ffmpeg`, arma borradores y publica.

## Iteracion UX vigente

- La vista publica usa `getPublicMoments` en `lib/videoMoments.ts`.
- `sold` y `hidden` no aparecen para clientas; admin conserva todos los momentos.
- La numeracion publica se calcula por posicion visible.
- WhatsApp se envia desde la seleccion multiple y recibe todos los numeros publicos elegidos.
- `Ver video de este arbol` es una accion secundaria debajo de WhatsApp.
- `ShareCatalogButton` maneja Web Share API y fallback a clipboard.
- `admin login` debe permanecer discreto al fondo mientras no exista login real.
- La revision previa a publicacion debe ocurrir en un borrador online separado, no sobre `/catalog/[date]` publicado.
## Seleccion multiple vigente

- La vista publica usa seleccion multiple: `Mi seleccion`, `Agregar a mi seleccion`, `Quitar de mi seleccion` y `Enviar seleccion por WhatsApp`.
- `lib/selection.ts` contiene helpers para URL `selection`, localStorage, poda de IDs y numeracion publica.
- La URL `?selection=moment-03,moment-08` precarga una seleccion compartida y tiene prioridad sobre localStorage.
- WhatsApp recibe todos los numeros publicos seleccionados y un link a la seleccion.
- Cuando se abre una URL con `selection`, la vista queda en modo revision: banner `Seleccion actual del cliente/a`, solo miniaturas seleccionadas y sin controles para modificar o reenviar la seleccion.
- Leer `docs/TREE_IDENTIFICATION.md` antes de cambiar como se numeran o identifican arboles en links/WhatsApp.
- No usar la palabra `carrito`; la convencion del producto es `Mi seleccion`.

## Persistencia admin MVP

- `lib/adminCatalogPersistence.ts` guarda el historial admin en `localStorage`.
- El admin conserva catalogo activo + backups mock y permite restaurar un backup localmente.
- `AdminCatalogEditor` ya puede guardar el catalogo activo en un archivo y abrirlo en otro navegador/laptop.
- Esto sobrevive refresh y permite mover trabajo entre dispositivos, pero todavia no reemplaza la publicacion automatica del estado admin al catalogo publico.

## Carga de videos admin MVP

- `AdminVideoUploadPanel` permite seleccionar hasta 3 videos localmente y validar tipo/tamano.
- El panel queda colapsado por defecto para no distraer de la lista de arboles.
- Todavia no sube archivos a Google Drive; es preparacion UI para la siguiente fase.
- `lib/drivePaths.ts` centraliza la convencion `Terra Viva/Inbox - Videos por publicar` y `Terra Viva/Procesados/YYYY-MM-DD`.

## Pipeline Drive-first por cola de pendientes

- El prompt vigente cambio el flujo a `Terra Viva / Inbox - Videos por publicar`.
- Mama no crea carpetas por dia.
- El flujo correcto de Fase A ya no es "subir y publicar directo"; primero debe existir procesamiento de borrador y luego aprobacion.
- `scripts/publish-catalog.mjs` toma todos los videos pendientes del Inbox raiz y los ordena por `createdTime`/`modifiedTime`.
- `npm run process:catalog-draft` usa el mismo script con `--workflow draft` y escribe a `public/catalog-drafts/`.
- El borrador actual debe abrirse en `/drafts/current`; borradores por fecha van en `/drafts/[date]`.
- `CatalogViewer` ya tiene modo `draftReview` para ocultar acciones de clienta en rutas de borrador.
- `CatalogViewer` no debe reutilizar `localStorage` admin en rutas publicadas ni de borrador; el catalogo compartido debe venir del JSON generado.
- El publicador ya puede usar un catalogo guardado del admin como base de publicacion final.
- Salidas generadas: `public/catalog/YYYY-MM-DD/catalog.json`, `public/catalog/YYYY-MM-DD/thumbnails/` y `public/catalog/current-catalog.json`.
- Salidas de borrador: `public/catalog-drafts/YYYY-MM-DD/catalog.json` y `public/catalog-drafts/current-draft.json`.
- IDs estables nuevos: `moment-YYYY-MM-DD-001`.
- `CatalogVideo` ahora puede guardar `driveFileId` y `driveFileName` para que la publicacion final sepa exactamente que archivos mover a `Procesados/YYYY-MM-DD`.
- `lib/catalogRepository.ts` lee catalogos generados en build time y cae a `mockCatalogData` si no existen.
- `lib/catalogRepository.ts` tambien detecta borradores procesados y hace que admin los priorice.
- Workflow manual: `.github/workflows/publish-catalog.yml`, pensado para runner self-hosted con etiqueta `terra-viva-publisher`.
- Config local futura: `terra-viva.publisher.local.json`, ignorado por git; ejemplo en `terra-viva.publisher.example.json`.
- Retencion: activo + dos backups funcionales; depuracion real debe empezar con `--trash-old false` y dry-run.
- No implementar Supabase, Apps Script, laptop expuesta a internet ni puertos abiertos para este flujo.
- La direccion de producto es operar sin suscripciones mientras GitHub Pages + Drive + laptop publisher sean suficientes.
- Avance real al 2026-06-19: `ffmpeg` ya esta instalado, el token temporal de Drive ya se obtuvo, la carpeta Inbox real ya esta configurada, la consulta a Drive funciona y ya hubo una corrida real que produjo `public/catalog-drafts/2026-06-19/` con thumbnails.
- Bloqueante real al 2026-06-19: falta completar un build/deploy limpio para que el borrador online quede visible en GitHub Pages y cerrar el flujo de aprobacion/publicacion final.
- Shortcuts actuales en escritorio: `Terra Viva - Procesar borrador` y `Terra Viva - Publicar catalogo`.
- Pendiente real: disparar la publicacion final desde un flujo mas amigable, credenciales Drive robustas de larga duracion y una corrida real con videos disponibles en Inbox.
- La explicacion de por que solo salieron 9 momentos en la primera corrida ya esta documentada en `docs/PUBLISHING_PIPELINE.md`: el limite era hardcoded y no habia deteccion de estabilidad.
- Los parametros nuevos de borrador viven en `terra-viva.publisher.example.json` y `scripts/publish-catalog.mjs`:
  - `momentStartOffsetSeconds`
  - `momentIntervalSeconds`
  - `momentEndBufferSeconds`
  - `minMomentsPerVideo`
  - `maxMomentsPerVideo`
- Antes de tocar deteccion avanzada, leer `docs/VIDEO_CAPTURE_GUIDELINES.md`.
