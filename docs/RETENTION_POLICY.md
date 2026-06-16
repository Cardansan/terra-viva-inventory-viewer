# Retention Policy

## Regla

Conservar:

- catalogo activo,
- dos backups funcionales anteriores.

Cuando existan activo + dos backups funcionales, lo mas antiguo puede mandarse a papelera de Drive.

## Que es un backup funcional

Un backup funcional debe tener:

- `catalog.json` valido,
- momentos suficientes,
- videos o procesados asociados disponibles si el flujo los necesita.

## Que se puede depurar

Solo carpetas antiguas dentro de:

```text
Terra Viva / Procesados / YYYY-MM-DD
```

Nunca se borra permanentemente. Solo se manda a papelera.

## Modo seguro

Por default:

```text
--trash-old false
```

Antes de depurar, correr dry-run:

```bash
pnpm publish:catalog -- --drive-folder-id DRIVE_INBOX_FOLDER_ID --dry-run true --trash-old true
```

Si no se puede validar cuales son los dos backups funcionales, no se depura nada.
