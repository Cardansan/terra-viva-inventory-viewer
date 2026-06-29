# Drive Inbox Workflow

## Convencion vigente

```text
Terra Viva/
  Inbox - Videos por publicar/
  Procesados/
    YYYY-MM-DD/
```

## Regla principal

El Inbox raiz funciona como cola de pendientes.

- Mama sube videos al Inbox.
- La web puede subir videos directo ahi.
- El worker toma lo que siga pendiente en esa raiz.
- La publicacion final mueve solo los archivos ya usados a `Procesados/YYYY-MM-DD`.

## Flujo operativo

1. Subir videos al Inbox.
2. Crear orden `process_draft`.
3. La laptop genera el borrador.
4. Revisar el borrador.
5. Crear orden `publish_approved`.
6. La laptop publica y mueve procesados si corresponde.

## Importante

- No crear carpetas por fecha dentro del Inbox.
- No borrar videos manualmente despues de subirlos.
- Si hay un video equivocado, corregirlo antes de publicar.
- El Inbox no debe usarse como archivo historico; solo como cola activa.
