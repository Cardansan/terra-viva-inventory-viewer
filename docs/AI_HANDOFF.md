# AI Handoff

## Que hace la app

Terra Viva Inventory Viewer convierte videos de inventario de árboles de cuarzo en un catálogo navegable por momentos. La clienta no tiene que pausar manualmente: elige por número de árbol, ve estado y manda un mensaje de WhatsApp con catálogo, video y timestamp.

## Archivos para leer primero

1. `README.md`
2. `lib/catalogTypes.ts`
3. `lib/mockCatalogData.ts`
4. `components/CatalogViewer.tsx`
5. `components/AdminCatalogEditor.tsx`
6. `docs/ROADMAP.md`

## Convenciones

- Mantener TypeScript estricto.
- Componentes pequeños y claros.
- Reglas puras en `/lib`.
- No mezclar datos mock con UI.
- UI mobile-first, botones grandes, texto legible.
- La selección principal es `Árbol #`, no timestamp.

## Data mock

La data mock esta en `lib/mockCatalogData.ts`. Ahi se cambian videos, momentos, estados y miniaturas mientras no exista backend.

## Tipos

Los contratos principales estan en `lib/catalogTypes.ts`:

- `CatalogDay`
- `CatalogVideo`
- `TreeMoment`
- `CatalogStatus`
- `TreeMomentStatus`

## Donde agregar integracion real

- Repositorios o queries Supabase: crear `lib/catalogRepository.ts`.
- Google Drive como entrada inicial de videos: crear `lib/driveInput.ts`.
- Storage futuro: crear `lib/mediaStorage.ts` para Supabase Storage o Cloudinary si se adopta despues.
- Worker de video: crear carpeta futura `workers/` o servicio externo.
- WhatsApp: mantener `lib/whatsapp.ts`.
- Extraccion y deteccion de momentos: crear `lib/videoProcessing/` cuando existan videos reales.

## Estrategia de video actual

El repo incluye `public/videos/terra-viva-proto-inventory.mp4` solo como fixture temporal. Los videos reales futuros no deben subirse a Git. La fuente gratuita inicial sera Google Drive con carpetas por fecha y maximo 3 dias activos.

## Que NO hacer todavia

No implementar IA compleja de detección de objetos ni prometer detección perfecta de árboles. La fase actual es por timestamps, pausas y estabilidad del video. Esperar videos reales y dataset antes de entrenar, evaluar o integrar modelos de visión.

## Como continuar rapido

Para una nueva sesion, lee `lib/mockCatalogData.ts` y `components/CatalogViewer.tsx` para entender el flujo publico. Si el trabajo es de admin, lee `components/AdminCatalogEditor.tsx` y `components/AdminMomentList.tsx`. Si el trabajo es backend, empieza por `lib/catalogTypes.ts` y reemplaza gradualmente el mock con un repositorio.

## Iteracion UX vigente

- La vista publica usa `getPublicMoments` en `lib/videoMoments.ts`.
- `sold` y `hidden` no aparecen para clientas; admin conserva todos los momentos.
- La numeracion publica se calcula por posicion visible.
- WhatsApp es el CTA principal y recibe el numero publico.
- `Ver video de este arbol` es una accion secundaria debajo de WhatsApp.
- `ShareCatalogButton` maneja Web Share API y fallback a clipboard.
- `admin login` debe permanecer discreto al fondo mientras no exista login real.
