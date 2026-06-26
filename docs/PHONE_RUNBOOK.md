# Runbook para manana

Objetivo: dejar la laptop escuchando y permitir que mama haga todo desde su celular.

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

1. Abre `/admin`.
2. En `Conexion de publicacion`, toca `Conectar con Google Drive`.
3. Si ves `Escritura web: lista`, ya puedes seguir.
4. Abre `Cargar videos para preparar catalogo` y sube los videos al Inbox.
5. Toca `Crear borrador nuevo`.
6. Espera en `Ver ultimo avance` hasta ver `Terminado`.
7. Revisa el borrador, oculta lo que no deba salir y ajusta lo necesario.
8. Toca `Publicar catalogo`.
9. Espera otra vez a ver `Terminado`.

## Si algo falla

- Si la web dice que Drive vencio: toca `Conectar con Google Drive` otra vez.
- Si la laptop no procesa nada: revisa `.tools/logs/drive-worker-background.out.log` y `.tools/logs/drive-worker-background.err.log`.
- Si hace falta reiniciar el worker: usa `TerraViva - Detener escucha automatica.cmd` y luego `TerraViva - Iniciar escucha automatica.cmd`.
