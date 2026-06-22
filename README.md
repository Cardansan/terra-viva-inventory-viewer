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
- `/drafts/current` muestra el borrador online mas reciente para revision interna.
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
- `npm run process:catalog-draft`: procesa videos del Inbox y genera un borrador revisable.
- `npm run publish:catalog`: publicador Drive-first para generar catalogos estaticos.

## Publicacion Drive-first

El pipeline operativo evita Supabase y Apps Script. Mama sube videos a:

```text
Terra Viva / Inbox - Videos por publicar
```

El publicador toma todos los videos pendientes que sigan en la carpeta Inbox de Drive, los ordena por `createdTime`/`modifiedTime`, genera `public/catalog/YYYY-MM-DD/catalog.json` y actualiza `public/catalog/current-catalog.json`.

Ahora existe tambien un paso formal de borrador:

```bash
npm run process:catalog-draft -- --use-placeholder-media --dry-run true
```

Ese comando genera un catalogo borrador en `public/catalog-drafts/` sin publicarlo todavia a clientas.

## Nueva arquitectura de Fase A

La Fase A ya no debe pensarse como "la web procesa videos". El reparto correcto de responsabilidades es:

- GitHub Pages: muestra la interfaz publica, el admin y el borrador online.
- Google Drive: guarda videos y despues tambien puede servir como buzon de ordenes.
- Laptop publicadora: descarga videos, corre `ffmpeg`, arma JSON y publica.

Flujo objetivo de Fase A:

```text
Grabar videos -> Drive Inbox -> Procesar borrador -> Revisar borrador online -> Aprobar -> Publicar catalogo
```

Ya existe la base para el paso de revision online:

- `public/catalog-drafts/YYYY-MM-DD/catalog.json`
- `public/catalog-drafts/current-draft.json`
- ruta web `/drafts/current`
- ruta web `/drafts/[date]`

La intencion es que el borrador pueda abrirse desde cualquier telefono antes de tocar el catalogo publico.

En Windows ya existen dos lanzadores listos para Fase A:

- `TerraViva - Procesar borrador.cmd`
- `TerraViva - Publicar catalogo.cmd`

Los accesos directos de escritorio apuntan a esos lanzadores y muestran estado verboso en consola.

### Estado real de Fase A al 2026-06-19

- `ffmpeg` ya esta instalado en la laptop y disponible para generar thumbnails reales.
- Ya existe `terra-viva.publisher.local.json` local con `driveFolderId` configurado para el Inbox real.
- Ya se obtuvo un token temporal de Google Drive y el pipeline autentica correctamente contra la API.
- El pipeline ya puede consultar la carpeta de Drive configurada.
- Ya hubo una corrida real de `Procesar borrador` con Drive + `ffmpeg` + thumbnails reales; se genero un borrador en `public/catalog-drafts/2026-06-19/`.
- La UI ya se esta adaptando para abrir ese borrador en linea sin publicarlo a clientas.
- Bloqueante actual: falta cerrar un build/deploy limpio para que la ruta de borrador online quede visible en GitHub Pages y amarrar el flujo final de aprobacion/publicacion.

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

Los videos mock viven en `lib/mockCatalogData.ts`. El publicador ya puede generar `public/catalog/YYYY-MM-DD/catalog.json` desde Drive Inbox o, en pruebas, desde placeholder media.

Importante sobre Drive:

- La app todavia no descubre por si sola en que carpeta de Drive subio videos tu mama.
- Hay que configurar manualmente `driveFolderId` en `terra-viva.publisher.local.json`.
- Tambien hace falta una credencial local de Drive; por ahora el lanzador acepta `googleDriveAccessToken` en ese archivo o `GOOGLE_DRIVE_ACCESS_TOKEN` en el entorno.
- Si `ffmpeg` esta disponible, `Procesar borrador` ya genera thumbnails reales.
- `Publicar catalogo` exige `catalogInputFile` para no publicar un catalogo no revisado.
- El Inbox debe contener los videos directamente en esa carpeta raiz; si estan dentro de otra subcarpeta, el pipeline actual no los encontrara.
- Despues de una publicacion exitosa, el pipeline mueve esos videos a `Terra Viva/Procesados/YYYY-MM-DD`, dejando el Inbox raiz como la cola real de pendientes.

## Organizacion

- `app/`: rutas Next App Router.
- `components/`: UI del visor, navegacion, miniaturas, WhatsApp y admin.
- `lib/`: tipos, mock data y funciones puras de tiempo, WhatsApp y momentos.
- `public/`: assets placeholder.
- `docs/`: arquitectura, modelo de datos, roadmap, QA, despliegue y handoff para IA.

Documento de despliegue: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Falta para produccion

- Confirmar que produccion use `NEXT_PUBLIC_TERRA_VIVA_WHATSAPP_NUMBER=5212226181133`.
- Publicar el JSON exportado/importado del admin dentro del pipeline para que el estado viaje entre dispositivos automaticamente.
- Login protegido o flujo local controlado para admin.
- Autenticacion Drive robusta para el publicador.
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

## Transferencia de catalogos admin

El admin ya puede exportar el catalogo activo a un archivo JSON e importarlo en otro navegador o laptop.

- `Guardar catalogo` descarga el catalogo activo a un archivo.
- `Abrir catalogo guardado` reemplaza el catalogo activo local por el archivo seleccionado.
- Esto permite mover el trabajo entre dispositivos sin backend pagado.
- El admin ya muestra una etapa de `Aprobar publicacion` cuando el catalogo activo es un borrador.
- El publicador ya puede usar ese catalogo guardado como base de publicacion final.

## Deteccion de momentos y siguiente mejora

La deteccion actual todavia no usa IA ni analiza estabilidad real. En esta fase el pipeline genera momentos candidatos recorriendo la duracion del video con un espaciado configurable.

- Antes estaba fijo en `9` momentos por video, lo que explicaba catalogos incompletos.
- Ahora el borrador reparte momentos a lo largo de casi toda la duracion del video.
- Parametros disponibles en `terra-viva.publisher.local.json`:
  - `momentStartOffsetSeconds`
  - `momentIntervalSeconds`
  - `momentEndBufferSeconds`
  - `minMomentsPerVideo`
  - `maxMomentsPerVideo`

Recomendacion inicial para probar mas arboles en un recorrido largo:

- mantener `momentIntervalSeconds` entre `5` y `7`,
- dejar `maxMomentsPerVideo` entre `24` y `36`,
- revisar el borrador y ocultar lo que no sirva.

Guia de grabacion recomendada: [`docs/VIDEO_CAPTURE_GUIDELINES.md`](docs/VIDEO_CAPTURE_GUIDELINES.md).
