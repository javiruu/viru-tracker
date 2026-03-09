# UI Contract v1 (Viru Tracker)

## Objetivo
Establecer reglas mínimas para mantener consistencia visual y reducir regresiones en la interfaz.

## Naming y capas de estilos
- `base.css`: fundamentos y reset.
- `tokens.css`: variables de diseño (color, spacing, tipografía, foco).
- `components.css`: componentes reutilizables.
- `screens.css`: ajustes específicos por pantalla.

Regla: evitar estilos de pantalla en capas base/components.

## Componente: Card
Uso: contenedor visual para bloques de contenido.

Reglas:
- padding consistente por defecto.
- puede tener header y footer opcionales.
- no mezclar acciones primarias en más de una por card.

Ejemplo de clases actuales:
- `.module-card`
- `.panel`

## Componente: PanelHeader
Uso: cabecera de panel o sección.

Debe incluir:
- título claro
- acción opcional alineada a la derecha
- separación visual consistente

Ejemplo de clases actuales:
- `.panel-title`
- `.row-between`
- `.dashboard-section-head`

## Componente: StatusPill
Uso: mostrar estado de entidades y procesos.

Estados estándar:
- `success` (activo/completado)
- `warn` (pausado/pendiente/en espera)
- `error` (fallo)

Reglas:
- color semántico consistente
- tamaño homogéneo
- texto breve y accionable

Ejemplo de clase:
- `.status-pill`

## Componente: ActionRow
Uso: agrupación de acciones de un bloque.

Reglas:
- CTA principal primero
- secundarios en `btn-secondary` o `btn-ghost`
- spacing uniforme

Ejemplo de clases actuales:
- `.row-actions`
- `.module-actions`
- `.alert-actions`

## Reglas de regresión
1. Todo refactor de estilos requiere build OK.
2. No introducir cambios visuales no intencionados.
3. Mantener compatibilidad con dark/light.
4. Mantener focus visible en elementos interactivos.
