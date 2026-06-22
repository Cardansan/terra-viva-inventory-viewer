# Publishing Pipeline

## Flujo

El flujo elegido es Drive-first y semi-manual:

1. Mama sube videos a `Terra Viva / Inbox - Videos por publicar`.
2. Carlos prende la laptop.
3. Se corre primero un procesamiento de borrador local o desde un GitHub Action con runner self-hosted.
4. Ese procesamiento toma videos subidos en las ultimas 24 horas y genera un catalogo borrador con momentos candidatos.
5. El borrador se revisa en admin y se aprueban los momentos que si deben quedar visibles.
6. Despues se ejecuta la publicacion final con `scripts/publish-catalog.mjs`.
7. La publicacion final genera `public/catalog/YYYY-MM-DD/catalog.json`.
8. Actualiza `public/catalog/current-catalog.json`.
9. Despues de validar, puede mover los videos usados a `Terra Viva / Procesados / YYYY-MM-DD`.
10. GitHub Pages publica el sitio estatico.

No se usa Supabase, Apps Script, puertos abiertos ni credenciales en frontend.

Este no es solo un puente temporal: es el plan operativo base para evitar suscripciones mientras el volumen del negocio lo permita.

## Comandos

Dry-run seguro:

```bash
pnpm publish:catalog -- --drive-folder-id DRIVE_INBOX_FOLDER_ID --lookback-hours 24 --dry-run true --move-processed true
```

Prueba sin Drive real usando media placeholder:

```bash
pnpm publish:catalog -- --use-placeholder-media --lookback-hours 24 --dry-run true
```

Procesar borrador real desde Windows:

```text
TerraViva - Procesar borrador.cmd
```

Publicar catalogo aprobado desde Windows:

```text
TerraViva - Publicar catalogo.cmd
```

Publicacion real:

```bash
pnpm publish:catalog -- --drive-folder-id DRIVE_INBOX_FOLDER_ID --lookback-hours 24 --dry-run false --move-processed true --trash-old false
```

Usar fecha manual si los videos cruzaron medianoche:

```bash
pnpm publish:catalog -- --drive-folder-id DRIVE_INBOX_FOLDER_ID --date 2026-06-16 --lookback-hours 24
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

- listar videos del Inbox,
- filtrar por `createdTime` o `modifiedTime`,
- ordenar por fecha ascendente,
- crear `Procesados/YYYY-MM-DD`,
- mover archivos usados despues de una publicacion exitosa,
- mandar antiguos a papelera en una fase segura posterior.

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

Pendiente antes de operacion real:

- Autenticacion Drive robusta para laptop.
- Refresh token usable por script sin depender de Playground.
- Validacion completa antes de mover archivos en Drive.
- Retencion real conectada a carpetas `Procesados`.
- Instalador minimo para que el publicador pueda correr sin Codex.
- Confirmar que los videos reales se suben directamente a la carpeta Inbox correcta y no a una subcarpeta distinta.
