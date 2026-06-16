# Terra Viva Inventory Viewer

Web app mobile-first para convertir videos de inventario de arboles de cuarzo Terra Viva en un catalogo navegable por momentos. El MVP usa datos mock y video proto: la clienta navega por "Arbol #", agrega uno o varios arboles a `Mi seleccion` y envia la seleccion por WhatsApp.

## Como correr localmente

```bash
npm install
npm run dev
```

Despues abre `http://localhost:3000`.

Rutas principales:

- `/` redirige al catalogo publicado mas reciente.
- `/catalog/2026-06-14` muestra la vista publica mock.
- `/admin` muestra el editor local mock.

## Flujo publico actual

- La clienta puede agregar uno o varios arboles a `Mi seleccion`.
- `Agregar a mi seleccion` es la accion principal al revisar cada arbol.
- `Enviar seleccion por WhatsApp` aparece cuando hay al menos un arbol elegido.
- El mensaje de WhatsApp incluye todos los numeros publicos seleccionados y un link compartible.
- Las selecciones compartidas usan `?selection=moment-03,moment-08` y se cargan al abrir el link.
- La seleccion local se guarda en `localStorage` con la llave `selection:terra-viva:YYYY-MM-DD`.
- `Ver video de este arbol` es una accion secundaria debajo de WhatsApp.
- La galeria publica filtra momentos `sold` y `hidden`.
- La numeracion publica es continua para la clienta aunque existan vendidos internos.
- El footer muestra `Catalogo actualizado`, `Compartir catalogo` y el link discreto `admin login`.

## Scripts

- `npm run dev`: servidor local de desarrollo.
- `npm run build`: build de produccion.
- `npm run start`: sirve el build.
- `npm run lint`: lint con Next.
- `npm run typecheck`: validacion TypeScript estricta.
- `npm run publish:catalog`: publicador Drive-first para generar catalogos estaticos.

## Publicacion Drive-first

El pipeline operativo evita Supabase y Apps Script. Mama sube videos a:

```text
Terra Viva / Inbox - Videos por publicar
```

El publicador toma los videos subidos en las ultimas 24 horas, los ordena por `createdTime`/`modifiedTime`, genera `public/catalog/YYYY-MM-DD/catalog.json` y actualiza `public/catalog/current-catalog.json`.

Prueba local segura:

```bash
npm run publish:catalog -- --use-placeholder-media --dry-run true
```

Documentos relacionados:

- [`docs/PUBLISHING_PIPELINE.md`](docs/PUBLISHING_PIPELINE.md)
- [`docs/DRIVE_INBOX_WORKFLOW.md`](docs/DRIVE_INBOX_WORKFLOW.md)
- [`docs/SELF_HOSTED_RUNNER.md`](docs/SELF_HOSTED_RUNNER.md)
- [`docs/RETENTION_POLICY.md`](docs/RETENTION_POLICY.md)
- [`docs/COST_FREE_OPERATING_MODEL.md`](docs/COST_FREE_OPERATING_MODEL.md)

## Video proto y miniaturas

La maqueta actual usa un video real de referencia copiado en:

- `public/videos/terra-viva-proto-inventory.mp4`

Tambien incluye 27 miniaturas extraidas con `ffmpeg` en:

- `public/thumbnails/proto/tree-01.jpg` a `tree-27.jpg`

Estas miniaturas son solo una prueba de experiencia: los timestamps están distribuidos manualmente y no representan detección perfecta de árboles.

## Estrategia sin suscripciones

Para mantener el costo mensual en cero durante los siguientes anos, los videos reales diarios no deben subirse al repositorio. La estrategia base es:

- Google Drive como carpeta de entrada temporal para videos crudos.
- GitHub Pages como hosting publico gratis.
- GitHub como historial de codigo y catalogos JSON publicados.
- Laptop local como worker temporal para publicar.
- Activo + dos backups funcionales en Drive.
- `ffmpeg` para extraer miniaturas y frames desde los videos descargados.
- Sin Supabase, Apps Script, Cloudinary ni servidor propio como plan base.

Convencion vigente de Drive:

```text
Terra Viva/
  Inbox - Videos por publicar/
  Procesados/
    YYYY-MM-DD/
```

El archivo `public/videos/terra-viva-proto-inventory.mp4` se mantiene solo como fixture temporal para que el demo funcione sin pasos externos. Los videos reales futuros deben vivir en Drive.

## Reemplazar videos placeholder

Los videos mock viven en `lib/mockCatalogData.ts`. El publicador futuro generara `public/catalog/YYYY-MM-DD/catalog.json` desde Drive Inbox.

Mas adelante las miniaturas deben extraerse automaticamente con `ffmpeg` y guardarse como assets estaticos o en Drive segun convenga.

## Organizacion

- `app/`: rutas Next App Router.
- `components/`: UI del visor, navegacion, miniaturas, WhatsApp y admin.
- `lib/`: tipos, mock data y funciones puras de tiempo, WhatsApp y momentos.
- `public/`: assets placeholder.
- `docs/`: arquitectura, modelo de datos, roadmap, QA, despliegue y handoff para IA.

Documento de despliegue: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Falta para produccion

- Confirmar que produccion use `NEXT_PUBLIC_TERRA_VIVA_WHATSAPP_NUMBER=5212226181133`.
- Export/import de catalogos JSON para persistencia compartible sin backend.
- Login protegido o flujo local controlado para admin.
- Autenticacion Drive robusta para el publicador.
- Extraccion real de miniaturas con `ffmpeg`.
- Publicacion/despublicacion persistente.
- QA con videos reales y dispositivos moviles.
- Reconsiderar backend pagado solo cuando el volumen lo justifique.
## Seleccion multiple

La vista publica permite que una clienta elija varios arboles antes de escribir por WhatsApp.

- `Agregar a mi seleccion` agrega el arbol visible.
- `Quitar de mi seleccion` lo remueve.
- `Mi seleccion` muestra la lista elegida y permite quitar piezas.
- `Enviar seleccion por WhatsApp` aparece solo cuando hay al menos un arbol elegido.
- El mensaje incluye todos los numeros publicos seleccionados y un link compartible.
- El link compartible usa `?selection=moment-03,moment-08`.
- La seleccion local se guarda por fecha en `localStorage` con la llave `selection:terra-viva:YYYY-MM-DD`.
- Si una URL trae `selection`, esa seleccion tiene prioridad sobre `localStorage`.
