# Publishing Pipeline

## Flujo

El flujo elegido es Drive-first y semi-manual:

1. Mama sube videos a `Terra Viva / Inbox - Videos por publicar`.
2. Carlos prende la laptop.
3. Se ejecuta `scripts/publish-catalog.mjs` localmente o desde un GitHub Action con runner self-hosted.
4. El publicador toma videos subidos en las ultimas 24 horas.
5. Genera `public/catalog/YYYY-MM-DD/catalog.json`.
6. Actualiza `public/catalog/current-catalog.json`.
7. Despues de validar, puede mover los videos usados a `Terra Viva / Procesados / YYYY-MM-DD`.
8. GitHub Pages publica el sitio estatico.

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

Pendiente antes de operacion real:

- Autenticacion Drive robusta para laptop.
- Extraccion real de thumbnails con ffmpeg.
- Validacion completa antes de mover archivos en Drive.
- Retencion real conectada a carpetas `Procesados`.
- Instalador minimo para que el publicador pueda correr sin Codex.
