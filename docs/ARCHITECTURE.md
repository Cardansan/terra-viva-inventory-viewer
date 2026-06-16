# Arquitectura

## Capas principales

- `app/`: rutas publicas y admin usando Next.js App Router.
- `components/`: componentes de presentacion e interaccion. Mantienen estado local solo cuando es propio del MVP.
- `lib/`: contratos de datos y funciones puras. Aqui deben vivir las reglas reutilizables antes de pasar a backend.
- `public/`: placeholders locales para miniaturas o assets estaticos.

## Flujo publico

1. `/` busca el catalogo publicado mas reciente en `lib/catalogRepository.ts`.
2. `/catalog/[date]` carga un catalogo generado desde `public/catalog/YYYY-MM-DD/catalog.json` o cae al mock por fecha.
3. `CatalogViewer` filtra momentos ocultos y mantiene el momento seleccionado.
4. `VideoMomentPlayer` ejecuta `seekToMoment` al cambiar de momento.
5. `MomentNavigator` cambia al árbol anterior o siguiente.
6. `SendSelectionWhatsAppButton` genera el link `wa.me` con todos los arboles seleccionados.

## Flujo admin

1. `/admin` carga el catalogo mock mas reciente.
2. `AdminCatalogEditor` mantiene una copia local editable.
3. `AdminMomentList` permite cambiar numero, timestamp, seccion, estado y notas.
4. Los cambios no persisten en el MVP; son una maqueta funcional de la UI de revision.

## Estrategia sin suscripciones

El plan base evita servicios pagados durante los siguientes anos mientras el volumen sea manejable:

- GitHub Pages sirve la web publica.
- Google Drive guarda videos crudos y procesados.
- La laptop local corre el publicador y ffmpeg solo cuando se necesita publicar.
- Los catalogos publicados son JSON estaticos en `public/catalog`.
- Git history y Drive Procesados funcionan como respaldo operativo.

Esta decision reduce costo fijo y evita operar un backend 24/7. La consecuencia aceptada es que la publicacion sigue siendo semi-manual.

## Integracion futura

- Google Drive es la carpeta de entrada gratuita para videos crudos del dia.
- `scripts/publish-catalog.mjs` reemplaza por ahora la necesidad de backend.
- Un worker local procesara videos, extraera frames con `ffmpeg` y creara candidatos de `TreeMoment`.
- Supabase, Cloudinary u otro backend quedan fuera del plan base y solo se reconsideran si el negocio necesita multiusuario real, pagos, reservas automaticas o volumen alto.
- La deteccion inicial debe enfocarse en pausas o estabilidad de video, no en deteccion perfecta de objetos.

## Estrategia de videos

El repositorio no debe ser la bodega de videos reales. Para el MVP se permite un video proto como fixture temporal, pero el flujo real sera:

1. Mama sube videos a Google Drive en `Terra Viva/Inbox - Videos por publicar`.
2. Carlos prende la laptop y ejecuta el publicador local o el workflow self-hosted.
3. `scripts/publish-catalog.mjs` toma videos de las ultimas 24 horas y genera catalogo estatico.
4. El worker futuro descarga/procesa video con `ffmpeg`.
5. El sistema genera miniaturas y candidatos de momentos.
6. Admin revisa, corrige estados y publica el catalogo.

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
- El pipeline Drive-first vive en `scripts/` para no acoplar credenciales ni procesamiento a la UI.

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
