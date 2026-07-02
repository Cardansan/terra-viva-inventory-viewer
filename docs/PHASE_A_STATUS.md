# Fase A Status

Ultima actualizacion: 2026-06-29

## Estado ejecutivo

Fase A no esta cerrada, pero ya tiene una base operativa real.

Hoy el repo ya soporta este flujo:

1. subir videos al Inbox de Drive desde la web,
2. disparar `process_draft` desde `/edicion-catalogo/`,
3. procesar el borrador en la laptop,
4. revisar el borrador en rutas separadas,
5. disparar `publish_approved` desde `/edicion-catalogo/`,
6. publicar el catalogo estatico en GitHub Pages.

## Lo que ya esta resuelto

### 1. Separacion clara entre borrador y publicado

- Existe `public/catalog-drafts/current-draft.json`.
- Existe `public/catalog/current-catalog.json`.
- `/drafts/current/` y `/drafts/[date]/` sirven para revision interna.
- `/catalog/[date]/` sirve para clientas.
- La vista publicada no debe mezclar copy de revision.

### 2. Flujo web -> Drive -> laptop ya funciona

La web ya puede:

- subir videos al Inbox,
- escribir ordenes en la metadata de la carpeta Inbox,
- leer el estado reciente,
- y reintentar el acceso a Drive sin mandar a la usuaria a soporte primero.

La laptop ya puede:

- escuchar ordenes con `scripts/process-drive-orders.mjs`,
- correr `process_draft`,
- correr `publish_approved`,
- y escribir de vuelta estados `queued`, `running`, `succeeded`, `failed`.

### 3. OAuth web ya es operable

Ya no hace falta entrar primero a soporte para operar el flujo principal.

Ahora:

- `Subir videos al Inbox`,
- `Crear borrador nuevo`,
- `Publicar catalogo`

pueden abrir Google Drive por si solos cuando la sesion falta o expira.

### 4. Superficies internas separadas mejor

Ya existe una separacion mas clara entre vista publica y herramientas internas:

- el catalogo publico ya no expone link al panel de edicion,
- la ruta principal de trabajo cambia a `/edicion-catalogo/`,
- editor y borradores usan `noindex`,
- y el gate ligero con Google queda activo por defecto para los correos permitidos.

Decision operativa vigente en publico:

- la clienta debe poder pedir arboles sin tocar Drive;
- el CTA principal pasa por seleccion + WhatsApp;
- la funcion `Ver video de este arbol` queda deprecada hasta nuevo aviso.

### 5. Validacion real del pipeline

El pipeline ya tuvo validacion real previa con videos reales y thumbnails generados.

El repo refleja:

- catalogo publicado real en `public/catalog/2026-06-22/`,
- borrador activo mas reciente en `public/catalog-drafts/2026-06-28/`,
- y flujo de draft/public separado en el frontend.

### 6. Generacion de momentos ya no esta limitada artificialmente a 9

La limitacion dura anterior ya fue corregida.

Hoy el pipeline usa:

- duracion real del video,
- parametros configurables de muestreo,
- limpieza de thumbnails viejos,
- y una deduplicacion visual ligera.

## Lo que sigue pendiente para cerrar Fase A

### 1. QA operativo de punta a punta

Falta dejar bien probado el flujo cotidiano completo:

- subir videos,
- crear borrador,
- revisar borrador,
- publicar,
- confirmar estado,
- y verificar manejo limpio de procesados.

### 2. Robustecer la operacion de la laptop

Falta convertir el worker local en una rutina mas confiable:

- arranque simple,
- logs claros,
- reinicio facil,
- menos dependencia de asistencia manual.

### 3. Mejorar la calidad del borrador

El pipeline actual todavia es heuristico.

Sigue faltando:

- medir cobertura con mas corridas reales,
- ajustar parametros por estilo de grabacion,
- reducir repeticiones y omisiones,
- decidir despues si conviene deteccion por estabilidad.

### 4. QA final de experiencia

Falta una pasada final ya pensando en operacion real para mama:

- menos lenguaje tecnico,
- mejores mensajes de error/estado,
- y validacion completa desde celular.

## Riesgos abiertos

1. El borrador todavia puede quedarse corto si el video tiene paneos rapidos o mala estabilidad.
2. La web depende de sesion de Drive por navegador, no de una credencial compartida entre dispositivos.
3. La laptop sigue siendo un punto operativo critico.

## Criterio de cierre de Fase A

Fase A debe considerarse cerrada solo cuando se cumpla todo esto:

1. el flujo web -> Drive -> laptop -> GitHub Pages funcione de forma repetible,
2. el borrador generado sea suficientemente util en videos reales,
3. la operacion desde celular sea clara para mama sin apoyo tecnico constante,
4. el worker local pueda mantenerse prendido y recuperarse con poca friccion.

## Direccion siguiente

La direccion correcta no es meter backend pagado todavia.

La siguiente iteracion debe priorizar:

1. confiabilidad operativa,
2. calidad del borrador,
3. QA real del flujo cotidiano,
4. solo despues discutir Fase B o automatizacion mas profunda.
