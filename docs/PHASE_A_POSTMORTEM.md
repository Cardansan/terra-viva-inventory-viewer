# Fase A Postmortem

Fecha: 2026-06-21

## Objetivo de este postmortem

Registrar que aprendimos al intentar cerrar Fase A demasiado pronto, que ya corregimos, que sigue pendiente y como evitar repetir los mismos errores en la siguiente ronda.

## Resumen ejecutivo

La principal conclusion es esta:

- Fase A estaba mas avanzada de lo que parecia,
- pero no estaba tan cerrada como se habia declarado,
- y el punto mas debil no era la existencia del flujo sino la coherencia final entre UX, estado publicado y calidad del borrador real.

En otras palabras:

- el modelo operativo `draft -> aprobacion -> published` si quedo bien encaminado;
- la separacion de rutas ya existe y ahora esta mas limpia;
- pero el primer video real expuso que la calidad del borrador seguia limitada por el generador de momentos.

## Lo que se confirmo despues de la iteracion de refinamiento

### 1. El problema de los 9 momentos era real y tenia una causa simple

No era un problema misterioso de video, ni de Drive, ni de `ffmpeg`.

El generador inicial:

- estaba hardcodeado a `9` momentos por video;
- y solo cubria una parte del recorrido.

Eso explicaba por que un video con `20+` arboles visibles podia terminar en un borrador con solo `9` candidatos.

### 2. La confusion draft/publicado tambien era real

Aunque la arquitectura correcta ya existia, todavia habia una fuente de confusion:

- algunas superficies parecian mezclar estado local del admin con el catalogo compartido;
- y visualmente seguia siendo facil sentir que el publicado podia estar mostrando lenguaje interno.

La correccion fue reforzar que:

- `/drafts/current/` es revision interna;
- `/catalog/[date]/` es vista de clienta;
- y la vista publicada no debe heredar estado local de admin.

### 3. El admin en movil seguia cargado de mas

La primera version del header admin ocupaba demasiado espacio y estorbaba el flujo principal.

La mejora correcta no fue meter mas UI, sino quitar jerarquia:

- remover el header sticky,
- bajar `Vista de Cliente`,
- y esconder `Guardar/Abrir catalogo` como herramientas manuales secundarias.

## Problemas causados por la naturaleza del proyecto

### 1. El producto combina tres estados distintos que se parecen demasiado

El proyecto no tiene solo "catalogo listo" y "catalogo no listo". Tiene al menos:

- borrador,
- aprobacion,
- publicado.

Si esa separacion no se hace visible en codigo, docs y QA, se vuelve facil confundir:

- que deberia ver mama,
- que deberia ver la clienta,
- y cual archivo es la fuente de verdad en cada paso.

**Leccion**

Siempre tratar estos tres estados como superficies distintas, no como variaciones menores del mismo catalogo.

### 2. La calidad del borrador depende mucho del estilo de grabacion

Todavia no existe deteccion de estabilidad real ni deteccion de objetos.

Por eso el sistema actual depende mucho de:

- paneos mas lentos,
- pausas mas claras,
- mejor encuadre,
- menos blur,
- y mejor luz.

**Leccion**

Mientras no exista Fase 5 real, la calidad del video importa casi tanto como la calidad del codigo.

### 3. El pipeline seguia teniendo una limitacion artificial

El sistema parecia "procesar" videos reales, pero la logica de momentos todavia era demasiado primitiva.

Eso generaba una sensacion falsa de avance:

- ya habia Drive,
- ya habia thumbnails,
- ya habia borrador online,
- pero el borrador seguia incompleto por una regla demasiado rigida.

**Leccion**

En esta clase de producto, no basta con que el pipeline exista: hay que revisar si la heuristica realmente cubre el problema del usuario.

### 4. Declarar cerrada una fase antes del rerun real fue prematuro

Lo que faltaba no era una idea abstracta, sino una validacion concreta:

- volver a correr el video real,
- ver el nuevo borrador,
- y medir si la cobertura mejoro de verdad.

**Leccion**

No declarar cerrada una fase de pipeline visual hasta que una corrida real posterior a la ultima mejora confirme el efecto.

## Problemas causados por la computadora o el entorno

### 1. PATH de Node/NPM no era confiable en cada shell

En varias validaciones:

- `node` o `npm` no estaban disponibles directamente,
- aunque el runtime si existia.

Eso obligo a usar la ruta explicita del binario de Node para validar build y scripts.

**Leccion**

Para automatizacion confiable en esta laptop, conviene usar wrappers que llamen Node por ruta conocida cuando el entorno sea inestable.

### 2. Screenshots automaticos siguen siendo fragiles

El automation de screenshots via navegador embebido o CDP no fue el punto mas confiable del proceso.

Lo que si fue confiable:

- build local,
- abrir rutas,
- verificar DOM,
- y validar el texto esperado.

**Leccion**

Para QA de este proyecto:

- primero verificar ruta y contenido,
- despues screenshot si el entorno lo permite,
- y no dejar que una captura fallida bloquee una conclusion ya probada por otros medios.

### 3. Typecheck depende de `.next/types`

El proyecto incluye tipos generados de `.next` en `tsconfig`.

Eso significa que correr `tsc --noEmit` sin un build reciente puede fallar por archivos faltantes aunque el codigo este bien.

**Leccion**

En este repo, el orden robusto es:

1. `next build`
2. `tsc --noEmit`

o, alternativamente, ajustar el flujo de validacion para no depender de un `.next` desactualizado.

## Lo que salio bien

- El modelo sin backend pagado se mantuvo.
- GitHub Pages + Drive + laptop siguen siendo suficientes para esta fase.
- La separacion draft/publicado ya existe y ahora esta mejor defendida.
- El admin quedo mas usable en movil.
- La causa del submuestreo ya se encontro y ya se corrigio en codigo.
- Ya existe documentacion practica para grabar mejores videos.

## Lo que no quedo completamente resuelto todavia

- Aun falta reprocesar el video real con la nueva logica.
- Aun no sabemos con evidencia final si la siguiente corrida ya se acerca de forma confiable a los `20+` arboles esperados.
- La deteccion sigue siendo muestreo temporal, no estabilidad real.

## Reglas nuevas para no repetir esto

1. No cerrar una fase de pipeline visual sin una corrida real posterior a la ultima mejora.
2. Cuando el problema parezca "la IA detecto poco", revisar primero si la heuristica actual esta artificialmente limitada.
3. Validar por separado:
   - borrador,
   - aprobacion,
   - publicado.
4. En mobile admin, priorizar scroll y lista sobre controles auxiliares.
5. No dejar que screenshots automaticos fallen mas tiempo del que valen.
6. Todo comando largo debe correr con timeout o con chequeos cortos por etapas; no dejar procesos indefinidos "por si terminan".

## Recomendacion para la siguiente ronda

La siguiente ronda no debe empezar por meter IA compleja.

Debe empezar por esto:

1. reprocesar el video real con los parametros nuevos;
2. revisar cuantas candidatas salen;
3. ajustar `momentIntervalSeconds` y `maxMomentsPerVideo` si hace falta;
4. repetir QA visual sobre borrador, admin y publicado;
5. solo despues decidir si hace falta una heuristica mas avanzada.
