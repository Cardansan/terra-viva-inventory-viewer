# Roadmap

## Fase 1: mock catalogo navegable

- Vista publica mobile-first.
- Datos mock con 20-30 momentos.
- Video y miniaturas placeholder.
- Navegacion anterior/siguiente.
- WhatsApp con mensaje precargado.

## Fase 2: admin editable y persistencia

- Supabase Postgres.
- Login admin.
- Crear catalogos por fecha.
- Guardar cambios de momentos y estados.
- Publicar/despublicar catalogos.

## Fase 3: subida de videos

- Registro inicial de videos desde Google Drive.
- Convencion de carpetas `Terra Viva/Catalogos/YYYY-MM-DD/videos`.
- Mantener maximo 3 dias activos para costo cero.
- Evaluar Supabase Storage cuando se requiera backend integrado.
- Asociacion de videos al catalogo del dia.

## Fase 4: extraccion de frames con ffmpeg

- Worker de procesamiento.
- Frames por timestamp.
- Miniaturas reales para cada `TreeMoment`.

## Fase 5: deteccion de pausas por estabilidad

- Analisis de movimiento entre frames.
- Candidatos de momentos estables.
- Revision manual antes de publicar.

## Fase 6: crops/manual spotlight

- Herramienta de recorte manual.
- Destacar el árbol correcto dentro de una repisa con muchas piezas.
- Guardar crop en `TreeMoment`.

## Fase 7: filtros por piedra/alambre/base/tamano

- Campos `stoneType`, `wireColor`, `baseType` y `size`.
- Filtros publicos sencillos.
- Busqueda por caracteristicas.

## Fase 8: integracion Google Drive opcional

- Carpeta de entrada para videos del dia.
- Importacion automatica a Storage.
- Registro de archivos procesados.
