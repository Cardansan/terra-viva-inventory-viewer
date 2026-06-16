# Self-Hosted Runner

## Idea

La laptop solo debe estar encendida durante la publicacion. No tiene que estar prendida 24/7 y no se abre ningun puerto a internet.

## Flujo

1. Se prende la laptop.
2. El runner self-hosted de GitHub queda disponible.
3. Carlos ejecuta manualmente el workflow `Publish catalog from Drive Inbox`.
4. El job corre en la laptop, lee Drive, genera catalogo y commitea cambios.
5. GitHub Pages despliega despues con el workflow normal.

Si el job se queda esperando runner, significa que la laptop esta apagada, dormida o el servicio del runner no esta activo.

## Software necesario

- Node.js 20.
- pnpm 9.15.4.
- git.
- ffmpeg para thumbnails reales.
- GitHub Actions self-hosted runner con etiquetas:

```text
self-hosted
terra-viva-publisher
```

## Seguridad

- No abrir puertos.
- No exponer la laptop a internet.
- No guardar tokens en el frontend.
- Guardar credenciales solo como secretos locales/GitHub Actions mientras se define el metodo final.
