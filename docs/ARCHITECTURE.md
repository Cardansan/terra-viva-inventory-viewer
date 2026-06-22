# Arquitectura

## Capas principales

- `app/`: rutas publicas y admin usando Next.js App Router.
- `components/`: componentes de presentacion e interaccion. Mantienen estado local solo cuando es propio del MVP.
- `lib/`: contratos de datos y funciones puras. Aqui deben vivir las reglas reutilizables antes de pasar a backend.
- `public/`: placeholders locales, catalogos generados, borradores y assets estaticos.

## Modelo operativo de Fase A

La Fase A ya no debe pensarse como "la web procesa videos". El modelo correcto es:

- GitHub Pages: interfaz publica y admin.
- Google Drive: entrada de videos y futuro buzon de ordenes.
- Laptop publicadora: motor que descarga, procesa y publica.

```text
GitHub Pages -> muestra catalogo/admin
Google Drive -> guarda videos y archivos compartidos
Laptop -> ejecuta ffmpeg, arma JSON y publica
```

Esto evita backend pagado, evita exponer la laptop a internet y prepara mejor la futura Fase B.

## Flujo publico

1. `/` busca el catalogo publicado mas reciente en `lib/catalogRepository.ts`.
2. `/catalog/[date]` carga un catalogo generado desde `public/catalog/YYYY-MM-DD/catalog.json` o cae al mock por fecha.
3. `CatalogViewer` filtra momentos ocultos y mantiene el momento seleccionado.
4. `VideoMomentPlayer` ejecuta `seekToMoment` al cambiar de momento.
5. `MomentNavigator` cambia al árbol anterior o siguiente.
6. `SendSelectionWhatsAppButton` genera el link `wa.me` con todos los arboles seleccionados.

## Flujo de borrador online

1. `scripts/publish-catalog.mjs --workflow draft` genera `public/catalog-drafts/YYYY-MM-DD/catalog.json`.
2. Ese paso actualiza `public/catalog-drafts/current-draft.json`.
3. `lib/catalogRepository.ts` lee tanto borradores por fecha como el borrador actual.
4. `/drafts/[date]` muestra un borrador especifico.
5. `/drafts/current` muestra el borrador vigente para revision rapida.
6. `CatalogViewer` en modo `draftReview` oculta compartir y WhatsApp para que el borrador sirva como revision interna antes de publicar.

## Flujo admin

1. `/admin` carga el catalogo publicado mas reciente y prioriza un borrador si ya existe en `public/catalog-drafts/`.
2. `AdminCatalogEditor` mantiene una copia local editable.
3. `AdminMomentList` permite cambiar numero, timestamp, seccion, estado y notas.
4. El admin ya puede guardar el catalogo en un archivo y volverlo a abrir en otro navegador o laptop.
5. El admin debe enlazar claramente al borrador online para revisarlo desde cualquier telefono.
6. La siguiente evolucion correcta es que el admin deje una orden de `procesar` o `publicar` y que la laptop la recoja.

## Estrategia sin suscripciones

El plan base evita servicios pagados durante los siguientes anos mientras el volumen sea manejable:

- GitHub Pages sirve la web publica.
- Google Drive guarda videos crudos y procesados.
- La laptop local corre el publicador y ffmpeg solo cuando se necesita publicar.
- Los catalogos publicados son JSON estaticos en `public/catalog`.
- Los borradores revisables viven en `public/catalog-drafts`.
- Git history y Drive Procesados funcionan como respaldo operativo.

Esta decision reduce costo fijo y evita operar un backend 24/7. La consecuencia aceptada es que la publicacion sigue siendo semi-manual.

## Integracion futura

- Google Drive es la carpeta de entrada gratuita para videos crudos del dia.
- `scripts/publish-catalog.mjs` reemplaza por ahora la necesidad de backend.
- Un worker local procesara videos, extraera frames con `ffmpeg` y creara candidatos de `TreeMoment`.
- La siguiente pieza de integracion es usar Drive tambien como buzon de ordenes (`procesar`, `publicar`) para que `/admin` pueda disparar acciones sin puertos abiertos.
- Supabase, Cloudinary u otro backend quedan fuera del plan base y solo se reconsideran si el negocio necesita multiusuario real, pagos, reservas automaticas o volumen alto.
- La deteccion inicial debe enfocarse en pausas o estabilidad de video, no en deteccion perfecta de objetos.

## Estrategia de videos

El repositorio no debe ser la bodega de videos reales. Para el MVP se permite un video proto como fixture temporal, pero el flujo real sera:

1. Mama sube videos a Google Drive en `Terra Viva/Inbox - Videos por publicar`.
2. Carlos prende la laptop y corre un procesamiento de borrador local o el workflow self-hosted.
3. El worker local descarga/procesa video con `ffmpeg`.
4. El sistema genera miniaturas y candidatos de momentos.
5. El borrador se publica en una ruta separada para revision online.
6. Admin revisa el borrador, corrige estados y aprueba la publicacion.
7. `scripts/publish-catalog.mjs` publica el catalogo final aprobado.

Se mantendran activo + dos backups funcionales para controlar almacenamiento y mantener costo cero.

## Decisiones tecnicas

- Next.js App Router para rutas publicas y admin simples.
- TypeScript estricto para facilitar migracion a backend real.
- Tailwind CSS para iterar rapido y mantener una UI mobile-first.
- Datos mock separados para evitar hardcodear reglas en componentes.
- WhatsApp y formato de tiempo viven en `/lib` para ser probables puntos de prueba.
- `getPublicMoments` vive en `lib/videoMoments.ts` y centraliza la regla de vista publica: excluir `hidden` y `sold`.
- `CatalogViewer` calcula la numeracion publica por posicion visible, no por `treeNumber` interno.
- `ShareCatalogButton` usa Web Share API si existe y cae a clipboard si no esta disponible.
- `catalogRepository.ts` permite que Next lea catalogos generados sin romper el mock actual.
- `catalogRepository.ts` ahora tambien distingue entre catalogo publicado, borradores por fecha y borrador actual.
- El pipeline Drive-first vive en `scripts/` para no acoplar credenciales ni procesamiento a la UI.
- En Windows/Fase B, el camino robusto es: Node arma el borrador y un manifest; PowerShell ejecuta `ffmpeg` y escribe thumbnails reales.

## Iteracion UX publica

- La vista publica muestra imagen/momento, navegacion, WhatsApp, accion secundaria de video y galeria.
- El reproductor ya no muestra un boton principal de Play sobre el video.
- `Ver video de este arbol` dispara reproduccion del clip del momento como accion secundaria.
- El acceso `/admin` se conserva, pero el link publico ahora es `admin login` al fondo.
## Seleccion multiple publica

- `lib/selection.ts` concentra helpers puros para agregar, quitar, podar IDs no visibles y construir URLs compartibles.
- `CatalogViewer` mantiene `selectedMomentIds` y los sincroniza con `localStorage`.
- La URL compartible usa `?selection=moment-03,moment-08` con IDs estables de `TreeMoment`.
- Si la URL trae `selection`, tiene prioridad sobre `localStorage`.
- Si no hay query param, la app restaura `localStorage` con llave `selection:terra-viva:YYYY-MM-DD`.
- `pruneSelectionToPublicMoments` evita que momentos `sold` o `hidden` entren a la seleccion publica.
- `SendSelectionWhatsAppButton` genera un mensaje unico con todos los arboles seleccionados.
