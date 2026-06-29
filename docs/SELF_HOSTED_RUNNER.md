# Self-Hosted Runner

## Rol actual

El runner self-hosted es una ruta opcional de operacion para la laptop publicadora.

No reemplaza el worker local por ordenes web; simplemente permite ejecutar el pipeline desde GitHub Actions usando la misma laptop como executor.

## Cuando sirve

- para corridas manuales controladas,
- para publicar desde GitHub Actions sin mover el procesamiento fuera de la laptop,
- para mantener la laptop sin puertos abiertos.

## Flujo

1. Encender la laptop.
2. Dejar activo el runner self-hosted.
3. Lanzar el workflow que use la etiqueta `terra-viva-publisher`.
4. El job corre en la laptop y usa sus dependencias locales.
5. GitHub Pages despliega despues con el workflow normal.

## Requisitos

- Node.js 20
- pnpm 9.x
- git
- `ffmpeg`
- configuracion local de Drive
- runner con etiquetas:

```text
self-hosted
terra-viva-publisher
```

## Seguridad

- no abrir puertos,
- no exponer la laptop a internet,
- no mover secretos al frontend,
- mantener credenciales del runner y del publicador del lado confiable.

## Nota

La ruta principal actual para operacion cotidiana sigue siendo el worker local escuchando ordenes web en Drive. El self-hosted runner queda como herramienta complementaria.
