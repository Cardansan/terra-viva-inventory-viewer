# Roadmap

## Backlog inmediato

0. Hecho: configurar y mantener el WhatsApp real `+52 222 618 1133` en `NEXT_PUBLIC_TERRA_VIVA_WHATSAPP_NUMBER`.
1. En progreso: persistencia local MVP de catalogos, backups y restauraciones en `localStorage`; pendiente migrar a Supabase para persistencia compartida entre dispositivos.
2. Login protegido para admin antes de permitir cambios reales de catalogo.
3. Hecho: agregar iconos claros a `Compartir catalogo` y `Enviar seleccion por WhatsApp`.
4. Hecho: cambiar el CTA de WhatsApp para mostrar la cantidad antes de enviar, por ejemplo `Enviar seleccion por WhatsApp (3 arboles)`.
5. Hecho: mejorar links compartidos de seleccion; cuando se abre `?selection=...`, muestra banner `Seleccion actual del cliente/a`, renderiza solo los arboles seleccionados y oculta la galeria completa del catalogo.
6. En progreso: subida de videos desde admin con seleccion multiple, validacion basica y estado de carga claro; ya existe panel local de preparacion, pendiente guardar en backend/Drive.
7. En progreso: guardar videos en Google Drive por fecha usando la estructura `Terra Viva/Catalogos/YYYY-MM-DD/`; ya existe helper de rutas, pendiente conectar API/autenticacion de Drive.
8. Pantalla de aprobacion antes de publicar con resumen de videos, momentos detectados y confirmacion final.
9. Procesamiento con `ffmpeg` para generar miniaturas y candidatos de momentos desde los videos cargados.
10. En progreso: retencion local de inventario conserva catalogo activo + dos backups en el admin MVP; pendiente papelera/backups reales en Supabase o Drive.

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
