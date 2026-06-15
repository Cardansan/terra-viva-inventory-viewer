# Arquitectura

## Capas principales

- `app/`: rutas publicas y admin usando Next.js App Router.
- `components/`: componentes de presentacion e interaccion. Mantienen estado local solo cuando es propio del MVP.
- `lib/`: contratos de datos y funciones puras. Aqui deben vivir las reglas reutilizables antes de pasar a backend.
- `public/`: placeholders locales para miniaturas o assets estaticos.

## Flujo publico

1. `/` busca el catalogo publicado mas reciente en `mockCatalogData`.
2. `/catalog/[date]` carga el catalogo mock por fecha.
3. `CatalogViewer` filtra momentos ocultos y mantiene el momento seleccionado.
4. `VideoMomentPlayer` ejecuta `seekToMoment` al cambiar de momento.
5. `MomentNavigator` cambia al árbol anterior o siguiente.
6. `WhatsAppButton` genera el link `wa.me` con el mensaje del árbol seleccionado.

## Flujo admin

1. `/admin` carga el catalogo mock mas reciente.
2. `AdminCatalogEditor` mantiene una copia local editable.
3. `AdminMomentList` permite cambiar numero, timestamp, seccion, estado y notas.
4. Los cambios no persisten en el MVP; son una maqueta funcional de la UI de revision.

## Integracion futura

- Supabase Postgres reemplazara `mockCatalogData.ts` con tablas `catalog_days`, `catalog_videos` y `tree_moments`.
- Google Drive sera la carpeta de entrada gratuita inicial para videos crudos del dia.
- Supabase Storage podra guardar videos procesados y miniaturas cuando el producto necesite backend integrado.
- Cloudinary queda como alternativa futura si se requieren transforms/optimizacion avanzada de media.
- Un worker procesara videos, extraera frames con `ffmpeg` y creara candidatos de `TreeMoment`.
- La deteccion inicial debe enfocarse en pausas o estabilidad de video, no en deteccion perfecta de objetos.

## Estrategia de videos

El repositorio no debe ser la bodega de videos reales. Para el MVP se permite un video proto como fixture temporal, pero el flujo real sera:

1. Mama sube videos a Google Drive en `Terra Viva/Catalogos/YYYY-MM-DD/videos`.
2. Admin registra manualmente el archivo o link de Drive.
3. Worker descarga/procesa el video con `ffmpeg`.
4. El sistema genera miniaturas y candidatos de momentos.
5. Admin revisa, corrige estados y publica el catalogo.

Se mantendran maximo 3 dias activos para controlar almacenamiento y mantener costo cero.

## Decisiones tecnicas

- Next.js App Router para rutas publicas y admin simples.
- TypeScript estricto para facilitar migracion a backend real.
- Tailwind CSS para iterar rapido y mantener una UI mobile-first.
- Datos mock separados para evitar hardcodear reglas en componentes.
- WhatsApp y formato de tiempo viven en `/lib` para ser probables puntos de prueba.
