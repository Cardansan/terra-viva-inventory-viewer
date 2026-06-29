# Deployment

## Superficie actual

El despliegue principal del proyecto es GitHub Pages con export estatico de Next.js.

Repositorio:

- `Cardansan/terra-viva-inventory-viewer`
- branch principal: `main`

Workflow principal:

- `.github/workflows/deploy-github-pages.yml`

Configuracion relevante:

- `GITHUB_PAGES=true`
- `NEXT_PUBLIC_BASE_PATH=/terra-viva-inventory-viewer`
- `next.config.mjs` usa `output: "export"` para Pages

## URL esperada

```text
https://cardansan.github.io/terra-viva-inventory-viewer/
```

## Que si se despliega

- catalogo publicado,
- borradores estaticos,
- admin estatico,
- assets y thumbnails generados.

## Que no existe en GitHub Pages

GitHub Pages no expone rutas API de Next.

Por eso el flujo de produccion no debe depender de:

- `app/api/*` como backend operativo,
- secretos de servidor,
- procesamiento de video en la web.

## Regla importante

Todo lo que deba funcionar en produccion debe ser:

- estatico,
- browser-side,
- o coordinado por Drive + laptop.

## Verificacion recomendada despues de publicar

1. abrir `/`,
2. abrir `/drafts/current/`,
3. abrir `/admin/`,
4. confirmar que thumbnails y assets cargan bajo el `basePath`,
5. confirmar que el flujo OAuth web abre Google cuando hace falta.

## Notas operativas

- Los videos reales no deben entrar al repo.
- El repo puede contener catalogos JSON y thumbnails generados.
- El procesamiento real sigue fuera de GitHub Pages.
