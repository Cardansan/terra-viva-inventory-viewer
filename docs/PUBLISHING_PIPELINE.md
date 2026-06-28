# Publishing Pipeline

## Flujo

El flujo elegido es Drive-first y semi-manual:

1. Mama sube videos a `Terra Viva / Inbox - Videos por publicar`.
2. Carlos prende la laptop.
3. Se corre primero un procesamiento de borrador local o desde un GitHub Action con runner self-hosted.
4. Ese procesamiento toma todos los videos pendientes que siguen dentro del Inbox raiz y genera un catalogo borrador con momentos candidatos.
5. El borrador se revisa en admin y se aprueban los momentos que si deben quedar visibles.
6. Despues se ejecuta la publicacion final con `scripts/publish-catalog.mjs`.
7. La publicacion final genera `public/catalog/YYYY-MM-DD/catalog.json`.
8. Actualiza `public/catalog/current-catalog.json`.
9. Despues de validar, puede mover los videos usados a `Terra Viva / Procesados / YYYY-MM-DD`.
10. GitHub Pages publica el sitio estatico.

No se usa Supabase, Apps Script, puertos abiertos ni credenciales en frontend.

Este no es solo un puente temporal: es el plan operativo base para evitar suscripciones mientras el volumen del negocio lo permita.

## Flujo web de ordenes

Ademas del flujo por accesos directos, ya existe un flujo semi-automatizado disparado desde la web:

1. Admin abre `/admin`.
2. Si no hay sesion activa, la web abre Google Drive automaticamente al tocar `Subir videos al Inbox`, `Crear borrador nuevo` o `Publicar catalogo`.
3. La web puede subir videos directo al Inbox de Drive.
4. La web guarda una orden en la metadata de la carpeta Inbox de Drive.
5. La laptop con `scripts/process-drive-orders.mjs` consulta esa metadata.
6. Cuando detecta una orden:
   - corre `process_draft`, o
   - corre `publish_approved`.
7. La laptop escribe de vuelta un estado:
   - `queued`
   - `running`
   - `succeeded`
   - `failed`

Eso evita abrir puertos, evita un backend pagado y sigue usando Drive como punto de coordinacion.

## Comandos

Dry-run seguro:

```bash
pnpm publish:catalog -- --drive-folder-id DRIVE_INBOX_FOLDER_ID --dry-run true --move-processed true
```

Prueba sin Drive real usando media placeholder:

```bash
pnpm publish:catalog -- --use-placeholder-media --dry-run true
```

Procesar borrador real desde Windows:

```text
TerraViva - Procesar borrador.cmd
```

Publicar catalogo aprobado desde Windows:

```text
TerraViva - Publicar catalogo.cmd
```

Escuchar ordenes web desde Windows:

```text
TerraViva - Escuchar ordenes web.cmd
```

Iniciar escucha automatica en segundo plano:

```text
TerraViva - Iniciar escucha automatica.cmd
```

Publicacion real:

```bash
pnpm publish:catalog -- --drive-folder-id DRIVE_INBOX_FOLDER_ID --dry-run false --move-processed true --trash-old false
```

Usar fecha manual si los videos cruzaron medianoche:

```bash
pnpm publish:catalog -- --drive-folder-id DRIVE_INBOX_FOLDER_ID --date 2026-06-16
```

## Salidas generadas

```text
public/catalog/YYYY-MM-DD/catalog.json
public/catalog/YYYY-MM-DD/thumbnails/
public/catalog/current-catalog.json
```

Los IDs de momentos generados son estables:

```text
moment-YYYY-MM-DD-001
moment-YYYY-MM-DD-002
```

La app Next lee esos catalogos en build time mediante `lib/catalogRepository.ts`; si no existen, cae al mock actual.

## Drive

El script acepta `GOOGLE_DRIVE_ACCESS_TOKEN` como credencial temporal para la API de Drive. La credencial nunca debe guardarse en frontend ni commitearse.

Todavia no existe deteccion automatica de la carpeta correcta de Drive. El pipeline solo sabe donde leer si se configura manualmente `driveFolderId` en `terra-viva.publisher.local.json` o por CLI.

Validacion real completada el 2026-06-19:

- `driveFolderId` del Inbox configurado: `13fN49fIdYxKot07q7EeC6IWKqCFjO7IQ`.
- La autenticacion con token temporal funciono.
- La consulta a Drive ya funciona sin errores de API.
- El resultado actual del Inbox fue vacio (`[]`), asi que el siguiente bloqueo ya no es de integracion sino de contenido disponible en esa carpeta.

Operaciones reales preparadas:

- listar videos pendientes del Inbox raiz,
- ordenar por fecha ascendente,
- crear `Procesados/YYYY-MM-DD`,
- mover archivos usados despues de una publicacion exitosa,
- mandar antiguos a papelera en una fase segura posterior.

Modelo operativo vigente del Inbox:

- El Inbox raiz funciona como cola de videos pendientes.
- `process_draft` toma todos los videos que sigan ahi.
- `publish_approved` mueve a `Procesados/YYYY-MM-DD` solo los videos asociados al catalogo publicado.
- Ya no depende de una ventana de 24 horas para saber que procesar.

## Estado actual

Implementado:

- CLI y configuracion local.
- Dry-run.
- Placeholder pipeline.
- Generacion de catalog JSON.
- Lectura de catalogos generados desde la app.
- Workflow manual para self-hosted runner.
- El publicador ya puede tomar como base un catalogo guardado del admin.
- Separacion formal entre `draft` y `published`.
- Lanzadores Windows para procesar y publicar con logs verbosos.
- Generacion real de thumbnails con `ffmpeg` cuando hay videos descargados y `ffmpeg` disponible.
- `ffmpeg` instalado localmente via `winget`.
- Shortcut de escritorio para `Procesar borrador` y `Publicar catalogo`.
- Shortcut adicional para `Escuchar ordenes web`.
- Atajos nuevos para iniciar y detener la escucha automatica en segundo plano.
- Worker local que escucha ordenes web: `scripts/process-drive-orders.mjs`.
- Panel admin para guardar conexion Drive, subir videos al Inbox, crear ordenes web y leer estado reciente.
- Los botones principales ya pueden reabrir OAuth sin pasar por soporte si la sesion vencio.

Validacion real completada el `2026-06-22`:

- una orden web `process_draft` fue tomada por la laptop,
- se reprocesaron 3 videos reales,
- se detectaron `15` momentos,
- se generaron `15` thumbnails reales,
- despues una orden web `publish_approved` actualizo el catalogo publico `2026-06-22`,
- el catalogo publicado quedo tambien con `15` momentos y `15` thumbnails.

Pendiente antes de operacion real:

- Autenticacion Drive robusta para laptop.
- Renovacion simple del token temporal cuando el navegador lo marque vencido.
- Validacion completa antes de mover archivos en Drive.
- Retencion real conectada a carpetas `Procesados`.
- Instalador minimo para que el publicador pueda correr sin Codex.
- Confirmar en Google Cloud que el client ID web permita el origen de GitHub Pages si cambia el dominio de despliegue.
- Mientras la app OAuth siga en modo de prueba, mantener autorizada como test user a `terravivapue@gmail.com`.

## Por que solo salieron 9 momentos en la primera corrida real

La causa principal no fue Drive ni `ffmpeg`. Fue el generador de borradores.

- El algoritmo inicial estaba hardcodeado a `9` momentos por video.
- Ademas, esos timestamps solo cubrian la primera parte del video.
- No habia todavia deteccion por pausas, estabilidad ni analisis de movimiento.

Eso significa que un video con 20 o mas arboles podia terminar con un borrador de solo 9 candidatos aunque el recorrido completo mostrara muchas mas piezas.

## Parametros actuales para mejorar el siguiente borrador

El publicador ahora acepta estos parametros de generacion:

- `momentStartOffsetSeconds`
- `momentIntervalSeconds`
- `momentEndBufferSeconds`
- `minMomentsPerVideo`
- `maxMomentsPerVideo`
- `dedupeSampleSize`
- `dedupeSimilarityThreshold`
- `dedupeMinGapSeconds`

Funcionan asi:

- `momentStartOffsetSeconds`: evita capturar los primeros segundos mientras empieza el paneo.
- `momentIntervalSeconds`: cada cuantos segundos se propone un momento nuevo.
- `momentEndBufferSeconds`: deja fuera el tramo final donde suele haber movimiento de salida.
- `minMomentsPerVideo`: piso de candidatos aunque el video sea corto.
- `maxMomentsPerVideo`: techo para no saturar el borrador.
- `dedupeSampleSize`: tamano del frame reducido usado para comparar similitud visual.
- `dedupeSimilarityThreshold`: umbral de diferencia media; mas bajo conserva mas momentos, mas alto elimina mas repeticiones.
- `dedupeMinGapSeconds`: separacion minima para considerar que dos candidatos consecutivos pueden ser duplicados.

Recomendacion inicial para el siguiente video real:

```json
{
  "momentStartOffsetSeconds": 4,
  "momentIntervalSeconds": 6,
  "momentEndBufferSeconds": 8,
  "minMomentsPerVideo": 8,
  "maxMomentsPerVideo": 30,
  "dedupeSampleSize": 24,
  "dedupeSimilarityThreshold": 11,
  "dedupeMinGapSeconds": 1
}
```

Eso no garantiza deteccion perfecta, pero si hace que el borrador recorra mucho mejor un video largo y evita el cuello de botella artificial de 9 momentos.

Ademas, ahora existe una deduplicacion visual ligera: si dos candidatos consecutivos producen frames demasiado parecidos, el segundo se descarta para reducir casos donde el mismo arbol aparece repetido varias veces seguidas.

## Siguiente mejora esperada

La siguiente evolucion real de calidad es Fase 5 del roadmap:

- detectar pausas o tramos estables,
- proponer candidatos en esos tramos en lugar de solo muestrear por tiempo,
- luego dejar la correccion final a mama en admin.

Mientras tanto, la calidad del borrador depende mucho del estilo de grabacion. Ver [`docs/VIDEO_CAPTURE_GUIDELINES.md`](docs/VIDEO_CAPTURE_GUIDELINES.md).
