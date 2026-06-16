# Deployment

Terra Viva Inventory Viewer is currently ready for two free deployment paths.

## Current GitHub Repository

- Repository: `Cardansan/terra-viva-inventory-viewer`
- Default branch: `main`
- Visibility: private
- Static build: supported through `next.config.mjs`
- GitHub Pages workflow: `.github/workflows/deploy-github-pages.yml`
- Build runtime: Node 20, declared in `package.json` and `.nvmrc`.

## Option A: GitHub Pages

GitHub Pages is configured, but the current GitHub plan does not allow Pages for this private repository.

To publish with GitHub Pages:

1. Make the repository public, after confirming the proto video can be public.
2. Enable Pages from GitHub Actions.
3. Run the `Deploy GitHub Pages` workflow.

Expected URL:

```text
https://Cardansan.github.io/terra-viva-inventory-viewer/
```

The workflow builds with:

```text
Node 20
GITHUB_PAGES=true
NEXT_PUBLIC_BASE_PATH=/terra-viva-inventory-viewer
```

Those variables make video and thumbnail URLs work under the repository subpath.

## Option B: Vercel

Vercel is the recommended path if the repository should stay private.

Steps:

1. Go to Vercel and import `Cardansan/terra-viva-inventory-viewer`.
2. Keep the default Next.js settings.
3. Deploy from the `main` branch.
4. Add a custom domain later if needed.

No secrets are required for the current mock MVP.

## Notes

- The current video is stored in `public/videos/terra-viva-proto-inventory.mp4`.
- If the repo becomes public, that video becomes public too.
- For production, move videos to Supabase Storage, Cloudinary, Google Drive, or another storage layer instead of committing new videos to Git.
