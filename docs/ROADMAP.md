# Roadmap

## Backlog inmediato

0. Hecho: configurar y mantener el WhatsApp real `+52 222 618 1133` en `NEXT_PUBLIC_TERRA_VIVA_WHATSAPP_NUMBER`.
1. Decision estrategica: no contratar Supabase, Cloudinary ni backend pagado como plan base de los siguientes anos; operar con GitHub Pages + Google Drive + laptop publisher mientras el volumen lo permita.
2. En progreso: persistencia local MVP de catalogos, backups y restauraciones en `localStorage`; siguiente paso es exportar/importar JSON estatico, no migrar a base de datos pagada.
3. Login protegido para admin antes de permitir cambios reales compartidos; puede resolverse con flujo local/publicador antes de meter backend.
4. Hecho: agregar iconos claros a `Compartir catalogo` y `Enviar seleccion por WhatsApp`.
5. Hecho: cambiar el CTA de WhatsApp para mostrar la cantidad antes de enviar, por ejemplo `Enviar seleccion por WhatsApp (3 arboles)`.
6. Hecho: mejorar links compartidos de seleccion; cuando se abre `?selection=...`, muestra banner `Seleccion actual del cliente/a`, renderiza solo los arboles seleccionados y oculta la galeria completa del catalogo.
7. Evaluar y corregir identificacion de arboles en links y WhatsApp: el numero visible se recalcula tras filtrar vendidos, pero el enlace debe usar un identificador estable del momento para evitar confusion. Propuesta base en `docs/TREE_IDENTIFICATION.md`.
8. En progreso: subida de videos desde admin con seleccion multiple, validacion basica y estado de carga claro; ya existe panel local de preparacion, pendiente guardar en Drive Inbox.
9. En progreso: publicador Drive-first 24h desde `Terra Viva/Inbox - Videos por publicar`; ya existe CLI, workflow self-hosted y lectura de catalogos generados, pendiente credenciales Drive robustas y thumbnails reales.
10. Pantalla de aprobacion antes de publicar con resumen de videos, momentos detectados y confirmacion final.
11. Procesamiento con `ffmpeg` para generar miniaturas y candidatos de momentos desde los videos cargados.
12. En progreso: retencion de inventario conserva catalogo activo + dos backups; pendiente papelera real en Drive.
13. Definir instalador minimo para laptop de mama: `.bat`, acceso directo o ejecutable que corra el publicador sin abrir Codex.
14. Documentar procedimiento de recuperacion: restaurar desde `public/catalog`, Drive Procesados o git history.

## Roadmap de independencia operativa

Estas fases definen como pasar de un flujo asistido por Carlos a uno que mama pueda operar sola, sin pagar backend ni exponer ninguna laptop a internet.

### Fase A: laptop de Carlos, publicacion semi-manual

Objetivo: validar el flujo completo con la menor infraestructura posible.

Flujo:

```text
Drive Inbox -> script/publicador -> GitHub Pages
```

- Mama sube videos a `Terra Viva/Inbox - Videos por publicar`.
- Carlos prende su laptop cuando ella avisa que ya subio videos.
- Carlos corre el publicador por script local o GitHub Action con self-hosted runner.
- El publicador toma videos subidos en las ultimas 24 horas, los ordena por `createdTime`/`modifiedTime`, genera catalogo estatico, miniaturas y `current-catalog.json`.
- El publicador mueve los videos usados a `Terra Viva/Procesados/YYYY-MM-DD` solo despues de una publicacion exitosa.
- La depuracion de Drive queda en modo seguro: conservar catalogo activo + dos backups funcionales; mandar a papelera lo anterior solo con `dry-run` revisado y `trash_old=true`.

Criterio para avanzar: el flujo publica varios catalogos reales sin depender de Codex, sin romper la app publica y sin perder archivos.

### Fase B: laptop de mama, publicador instalable

Objetivo: que mama pueda publicar sin esperar a Carlos.

Flujo:

```text
Doble clic -> procesa Drive Inbox -> publica en GitHub Pages
```

- Reutilizar el mismo script de la Fase A.
- Instalar dependencias en la laptop de mama: Node/pnpm o ejecutable empaquetado, Git, ffmpeg y autenticacion Drive/GitHub seguras.
- Crear un lanzador minimo: `.bat`, acceso directo o ejecutable simple.
- Usar configuracion local ignorada por git, por ejemplo `terra-viva.publisher.local.json`.
- El lanzador debe mostrar estados entendibles: buscando videos, generando miniaturas, publicando, moviendo procesados, terminado o error.
- No exigir que mama use terminal, GitHub Actions, Codex ni carpetas por dia.

Criterio para avanzar: mama puede publicar un catalogo completo con un doble clic y entender si termino bien o si hubo error.

### Fase C: app movil publicadora, solo si la laptop se vuelve friccion real

Objetivo: evaluar una app movil instalada solo si operar desde laptop sigue siendo molesto.

Flujo posible:

```text
App movil -> selecciona/procesa videos -> genera catalogo -> publica
```

- Mantener esta fase como posibilidad, no como plan base.
- Considerarla si mama no quiere usar laptop, si la preparacion desde Drive/laptop tarda demasiado o si el negocio necesita publicar con mas frecuencia.
- Evaluar primero Android, porque instalar y probar fuera de tienda es mas simple que en iOS.
- Evitar PWA pura para procesamiento pesado de video si los videos crecen: navegador movil puede ser fragil con memoria, bateria, bloqueo de pantalla y archivos grandes.
- Resolver antes la pregunta de publicacion segura: la app movil necesita subir resultados a Drive/GitHub o a un intermediario seguro; no guardar secretos sensibles en una web publica.

Criterio para iniciar: la laptop ya demostro ser una friccion real. Si la laptop funciona bien, no construir app movil.

## Fase 1: mock catalogo navegable

- Vista publica mobile-first.
- Datos mock con 20-30 momentos.
- Video y miniaturas placeholder.
- Navegacion anterior/siguiente.
- WhatsApp con mensaje precargado.

## Fase 2: admin editable y persistencia local/exportable

- Persistencia local de cambios.
- Export/import de catalogo JSON.
- Backups locales y restauracion.
- Crear catalogos por fecha.
- Guardar cambios de momentos y estados.
- Publicar/despublicar catalogos.

## Fase 3: Drive Inbox y publicador 24h

- Mama sube videos a `Terra Viva/Inbox - Videos por publicar`.
- El publicador toma archivos subidos en las ultimas 24 horas.
- Convencion de carpeta unica `Terra Viva/Inbox - Videos por publicar`.
- Mover procesados a `Terra Viva/Procesados/YYYY-MM-DD`.
- Mantener activo + dos backups funcionales para costo cero.
- Asociacion de videos al catalogo del dia.

## Fase 4: extraccion local de frames con ffmpeg

- Worker local en laptop.
- Frames por timestamp.
- Miniaturas reales para cada `TreeMoment`.
- No subir videos reales al repo.

## Fase 5: deteccion de pausas por estabilidad

- Analisis de movimiento entre frames.
- Candidatos de momentos estables.
- Revision manual antes de publicar.

## Fase 6: crops/manual spotlight

- Herramienta de recorte manual.
- Destacar el arbol correcto dentro de una repisa con muchas piezas.
- Guardar crop en `TreeMoment`.

## Fase 7: filtros por piedra/alambre/base/tamano

- Campos `stoneType`, `wireColor`, `baseType` y `size`.
- Filtros publicos sencillos.
- Busqueda por caracteristicas.

## Fase 8: operacion sin suscripciones

- Carpeta Drive Inbox como entrada unica.
- JSON estatico como fuente publica.
- GitHub Pages como hosting.
- Laptop publisher como worker temporal.
- Registro de archivos procesados.
- Reconsiderar servicios pagados solo si el volumen o multiusuario lo justifican.

## Fase futura: backend pagado solo si duele operar sin el

- Evaluar Supabase u otro backend solo ante necesidad clara de multiusuario, reservas automaticas, pagos o alto volumen.
- Mantener esta fase fuera del plan base para no crear costo fijo prematuro.
