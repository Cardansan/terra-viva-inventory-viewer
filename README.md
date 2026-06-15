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

## Video proto y miniaturas

La maqueta actual usa un video real de referencia copiado en:

- `public/videos/terra-viva-proto-inventory.mp4`

Tambien incluye 27 miniaturas extraidas con `ffmpeg` en:

- `public/thumbnails/proto/tree-01.jpg` a `tree-27.jpg`

Estas miniaturas son solo una prueba de experiencia: los timestamps están distribuidos manualmente y no representan detección perfecta de árboles.

## Estrategia de almacenamiento de videos

Para mantener el costo mensual en cero durante el MVP, los videos reales diarios no deben subirse al repositorio. La estrategia inicial es:

- Google Drive como carpeta de entrada temporal para videos crudos.
- Maximo 3 dias de videos activos.
- GitHub solo para codigo, documentacion, screenshots y fixtures temporales.
- `ffmpeg` para extraer miniaturas y frames desde los videos descargados.
- Supabase queda como siguiente paso para metadata, login admin, catalogos publicados y estados persistentes.

Convencion propuesta de Drive:

```text
Terra Viva/
  Catalogos/
    YYYY-MM-DD/
      videos/
```

El archivo `public/videos/terra-viva-proto-inventory.mp4` se mantiene solo como fixture temporal para que el demo funcione sin pasos externos. Los videos reales futuros deben vivir en Drive o, mas adelante, en Supabase Storage.

## Reemplazar videos placeholder

Los videos mock viven en `lib/mockCatalogData.ts`. Cambia `protoInventoryVideoUrl` o las URLs dentro de `videos` por archivos reales publicados en Supabase Storage, Cloudinary, Drive exportado o `public/videos/...`.

Mas adelante las miniaturas deben extraerse automaticamente con `ffmpeg` y guardarse en Storage.

## Organizacion

- `app/`: rutas Next App Router.
- `components/`: UI del visor, navegacion, miniaturas, WhatsApp y admin.
- `lib/`: tipos, mock data y funciones puras de tiempo, WhatsApp y momentos.
- `public/`: assets placeholder.
- `docs/`: arquitectura, modelo de datos, roadmap, QA, despliegue y handoff para IA.

Documento de despliegue: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Falta para produccion

- Persistencia real con Supabase Postgres.
- Login protegido para admin.
- Subida o registro de videos desde Google Drive.
- Extraccion real de miniaturas con `ffmpeg`.
- Publicacion/despublicacion persistente.
- Telefono real de WhatsApp en `.env`.
- QA con videos reales y dispositivos moviles.
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
