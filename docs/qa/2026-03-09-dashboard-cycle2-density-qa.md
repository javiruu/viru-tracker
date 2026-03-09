# QA — Ciclo 2 Dashboard (densidad y jerarquía)

## Objetivo
Reducir densidad visual y reforzar jerarquía de bloques/headers/acciones sin rediseño ni cambios funcionales.

## Cambios aplicados
- Ajuste de espaciado vertical global del dashboard (`--dashboard-section-gap`, `--dashboard-block-gap`).
- Jerarquía más clara de textos secundarios (`--dashboard-muted-size`, `--dashboard-muted-tone`).
- Refino de `dashboard-section-head`, `module-desc`, `module-actions`, `dashboard-secondary` y `notes-board`.
- Ajustes responsive (<=900px) para mantener ritmo y evitar densidad excesiva.

## Verificación técnica
```bash
cd frontend
npm run build
```
Resultado: **OK**.

## Evidencias visuales
- `docs/qa/snapshots/dashboard-cycle2-desktop.png`
- `docs/qa/snapshots/dashboard-cycle2-mobile.png`

## Resultado
- Menor sensación de bloque compacto en secciones principales y notas.
- Mejor lectura de títulos/subtítulos sin competir con CTAs.
- CTA principal por bloque se mantiene sin cambios de copy ni lógica.
