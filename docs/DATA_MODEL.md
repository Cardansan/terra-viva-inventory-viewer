# Modelo de datos

## CatalogDay

Representa un catalogo diario.

- `id`: identificador estable.
- `date`: fecha en formato `YYYY-MM-DD`.
- `title`: titulo visible para admin.
- `status`: `draft` o `published`.
- `videos`: lista de `CatalogVideo`.
- `moments`: lista de `TreeMoment`.

## CatalogVideo

Representa un video del catalogo.

- `id`: identificador estable.
- `catalogDayId`: catalogo al que pertenece.
- `title`: nombre del video o seccion.
- `sectionLabel`: etiqueta corta, por ejemplo `Mueble 1`.
- `url`: URL del video.
- `durationSeconds`: duracion aproximada.
- `order`: orden de visualizacion.

## TreeMoment

Representa un árbol seleccionable dentro de un video.

- `id`: identificador estable.
- `catalogDayId`: catalogo al que pertenece.
- `videoId`: video fuente.
- `treeNumber`: numero que ve la clienta.
- `timestampSeconds`: segundo del video donde se muestra.
- `thumbnailUrl`: miniatura o placeholder.
- `sectionLabel`: ubicacion simple, por ejemplo `Mueble 1 · Repisa superior`.
- `status`: `available`, `reserved`, `sold` o `hidden`.
- `notes`: notas opcionales para admin o venta.
- `crop`: recorte opcional con `x`, `y`, `width`, `height`.

## Estados

- `available`: se puede preguntar o apartar.
- `reserved`: apartado, pero visible para evitar confusion.
- `sold`: vendido, visible con estado claro.
- `hidden`: no aparece en la vista publica.
- `draft`: catalogo no publicado.
- `published`: catalogo visible para clientas.

### Visibilidad publica actual

- `available` y `reserved` se mantienen en la experiencia publica, sin mostrar etiqueta de estado a la clienta.
- `sold` se conserva en admin, pero se filtra completamente de la vista publica.
- `hidden` se filtra completamente de la vista publica.
- `treeNumber` es el numero interno/admin. La vista publica puede mostrar una numeracion continua calculada despues de filtrar vendidos y ocultos.

## Campos futuros

- `stoneType`: cuarzo rosa, amatista, citrino, jade, etc.
- `wireColor`: dorado, cobre, plateado u otro.
- `baseType`: geoda, madera, piedra, ceramica.
- `size`: chico, mediano, grande.
- `tags`: etiquetas para filtros.
- `price`: precio publico u oculto.
- `availabilityUpdatedAt`: fecha de ultima revision.
- `sourceFrameUrl`: frame original extraido del video.
- `spotlightCrop`: recorte manual para destacar el árbol.
