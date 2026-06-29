# Terra Viva Inventory Viewer

Catalogo mobile-first para Terra Viva que convierte videos de inventario en un flujo de:

1. carga de videos,
2. procesamiento a borrador,
3. revision interna,
4. publicacion del catalogo final para clientas.

La estrategia actual evita backend pagado. El sistema opera con GitHub Pages + Google Drive + una laptop publicadora.

## Estado actual

Fase A esta avanzada, funcional y validada en partes reales, pero todavia no debe considerarse cerrada.

Ya existe:

- catalogo publico navegable con seleccion multiple y WhatsApp,
- rutas separadas para borrador y publicado,
- admin mobile-first para revisar y editar momentos,
- subida de videos al Inbox de Drive desde `/admin`,
- ordenes web `process_draft`, `publish_approved` y `cancel_draft`,
- worker local que escucha ordenes desde Drive,
- OAuth web para Drive con activacion just-in-time desde los botones principales,
- pipeline local con `ffmpeg` para thumbnails reales y catalogos estaticos.

Sigue pendiente para cerrar Fase A:

- validar el flujo operativo completo con menos asistencia,
- mejorar cobertura/calidad de generacion de momentos,
- endurecer el worker de laptop como servicio rutinario,
- completar QA final de dia a dia.

Resumen mas detallado: [docs/PHASE_A_STATUS.md](docs/PHASE_A_STATUS.md)

## Arquitectura actual

La web no procesa video.

- GitHub Pages: sirve la interfaz publica, borradores y admin.
- Google Drive: recibe videos y funciona como buzon ligero de ordenes/estado.
- Laptop publicadora: descarga, procesa, genera thumbnails, escribe JSON y publica.

Flujo operativo actual:

```text
Mama sube videos
-> web los deja en Drive Inbox
-> web crea orden process_draft
-> laptop worker procesa
-> borrador se revisa online
-> web crea orden publish_approved
-> laptop publica
-> GitHub Pages sirve el catalogo final
```

Mas detalle tecnico: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Como correr localmente

```bash
pnpm install
pnpm dev
```

Despues abre `http://localhost:3000`.

## Rutas principales

- `/` muestra el catalogo publicado mas reciente.
- `/catalog/[date]/` muestra un catalogo publicado por fecha.
- `/drafts/current/` muestra el borrador activo.
- `/drafts/[date]/` muestra un borrador por fecha.
- `/admin/` muestra el flujo de revision, carga y publicacion.

## Scripts principales

- `pnpm dev`: desarrollo local.
- `pnpm build`: build de produccion.
- `pnpm start`: servidor Next para entorno no estatico.
- `pnpm lint`: lint.
- `pnpm typecheck`: TypeScript sin emitir.
- `pnpm setup:drive-oauth`: obtiene/renueva credenciales locales de Drive para la laptop.
- `pnpm process:catalog-draft`: genera un borrador desde el Inbox.
- `pnpm stage:approved-catalog`: prepara un catalogo aprobado para publicar.
- `pnpm publish:catalog`: publica el catalogo final.
- `pnpm watch:drive-orders`: deja a la laptop escuchando ordenes web.

## Drive y configuracion local

Convencion vigente:

```text
Terra Viva/
  Inbox - Videos por publicar/
  Procesados/
    YYYY-MM-DD/
```

Configuracion local esperada:

- `terra-viva.publisher.local.json` para la laptop publicadora.
- `terra-viva.publisher.example.json` como referencia.

No se deben commitear tokens, secretos ni credenciales reales.

## Frontend y OAuth web

La web admin ya puede pedir acceso a Drive desde el navegador usando Google Identity Services.

- La sesion se guarda solo en el navegador actual.
- Si falta sesion o expira, la web abre OAuth automaticamente al tocar:
  - `Subir videos al Inbox`
  - `Crear borrador nuevo`
  - `Publicar catalogo`
- El panel de soporte queda como diagnostico manual, no como paso obligatorio.

Mientras la app OAuth siga en modo de prueba, `terravivapue@gmail.com` debe seguir autorizada como test user en Google Cloud.

## Documentos clave

- [docs/PHASE_A_STATUS.md](docs/PHASE_A_STATUS.md): estado ejecutivo real de la Fase A.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): modelo tecnico y responsabilidades.
- [docs/PUBLISHING_PIPELINE.md](docs/PUBLISHING_PIPELINE.md): pipeline Drive-first y worker local.
- [docs/PHONE_RUNBOOK.md](docs/PHONE_RUNBOOK.md): runbook operativo de celular + laptop.
- [docs/ROADMAP.md](docs/ROADMAP.md): direccion futura y prioridades.
- [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md): orientacion rapida para otra IA.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): despliegue estatico actual.

## Direccion general del proyecto

La direccion sigue siendo:

- no meter backend pagado mientras no duela operar sin el,
- mantener borrador y publicado como superficies separadas,
- dejar a la laptop como motor privado de procesamiento,
- reducir friccion operativa para mama,
- mejorar la calidad del borrador antes de pensar en IA compleja o app movil.
