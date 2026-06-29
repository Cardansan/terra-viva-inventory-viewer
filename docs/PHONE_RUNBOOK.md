# Runbook para manana

Objetivo: dejar la laptop escuchando y permitir que mama haga todo desde su celular.

Guia simple para ella:

- `docs/GUIA_MAMA_INTERFAZ.pdf`

## Hoy en la laptop

1. Verifica que `terra-viva.publisher.local.json` tenga:
   - `driveFolderId`
   - `googleDriveAccessToken`
   - `googleDriveRefreshToken`
   - `googleDriveClientId`
   - `googleDriveClientSecret`
2. Ejecuta `TerraViva - Iniciar escucha automatica.cmd`.
3. Confirma que el script muestre un PID y la ruta de logs.
4. Deja la laptop conectada a corriente y sin entrar en suspension.

## Manana desde el celular

1. Abre `/edicion-catalogo/`.
2. Abre `Cargar videos para preparar catalogo` y sube los videos al Inbox.
3. Si hace falta, la web abrira Google Drive sola durante esa accion.
4. Toca `Crear borrador nuevo`.
5. Si hace falta, la web abrira Google Drive sola durante esa accion.
6. Espera en `Ver ultimo avance` hasta ver `Terminado`.
7. Revisa el borrador, oculta lo que no deba salir y ajusta lo necesario.
8. Toca `Publicar catalogo`.
9. Si hace falta, la web abrira Google Drive sola durante esa accion.
10. Espera otra vez a ver `Terminado`.

## Cuenta autorizada

- Mientras la app OAuth siga en modo de prueba, `terravivapue@gmail.com` y `carlos.d.san25@gmail.com` deben seguir dadas de alta como usuarias autorizadas en Google Cloud.

## Acceso y seguridad ligera

- Las clientas ya no ven link al panel de edicion desde el catalogo publico.
- La ruta de trabajo es `/edicion-catalogo/` y conviene guardarla como bookmark.
- Los borradores usan `noindex`, pero eso no reemplaza autenticacion.
- El gate ligero con Google existe, pero debe quedarse apagado hasta que Carlos decida activarlo.

## Si algo falla

- Si la web dice que Drive vencio: toca otra vez el boton principal que estabas usando y deja que abra Google Drive.
- Si la laptop no procesa nada: revisa `.tools/logs/drive-worker-background.out.log` y `.tools/logs/drive-worker-background.err.log`.
- Si hace falta reiniciar el worker: usa `TerraViva - Detener escucha automatica.cmd` y luego `TerraViva - Iniciar escucha automatica.cmd`.
