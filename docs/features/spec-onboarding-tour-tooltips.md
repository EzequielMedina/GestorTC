# Spec: Tour guiado contextual y tooltips en iconos

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 2.5 Onboarding (SI)  
**Prioridad:** Media  
**Módulo:** Tour / Tooltips / Layout  

---

## 1. Objetivo

- **Tour guiado contextual:** pasos opcionales por sección (ej. “Así se usa Presupuestos”, “Así se usa Cuotas”) además del tour general existente.
- **Tooltips en iconos:** donde haya solo icono (toolbar, cards, botones), un tooltip breve que explique la acción.

---

## 2. Requisitos funcionales

### 2.1 Tour guiado contextual

- **Estado actual:** existe un tour guiado general (según context.md). Mantenerlo.
- **Nuevo:** tours **por sección/página**, opcionales y accesibles sin obligar al usuario:
  - Ejemplos de secciones: Presupuestos, Cuotas, Calendario financiero, Gastos de servicios, Reportes personalizados, Backup.
  - En cada página que tenga tour contextual, un botón o enlace discreto (ej. “¿Primera vez? Ver cómo usar esta sección”) que inicie un recorrido de 3–6 pasos solo por esa página (resaltar elementos y texto explicativo).
- Contenido de cada paso: título corto + texto (1–2 líneas) + elemento a resaltar (selector o referencia al componente).
- El usuario puede saltar o cerrar el tour en cualquier momento. Opcional: “No volver a mostrar este tour” por sección (guardar en localStorage).
- Reutilizar la misma infraestructura del tour actual (`TourService`, `tour-step.model`, componente de tour) si está diseñada de forma extensible; si no, definir pasos por “contexto” (nombre de sección) y filtrar por ruta o por id de sección.

### 2.2 Tooltips en iconos

- **Ámbito:** toolbar (header), FAB, botones de acción en cards y tablas que muestren solo icono (sin texto).
- **Implementación:** añadir `matTooltip="Texto descriptivo"` (Angular Material) a:
  - Icono del menú (hamburguesa), Dashboard, Tarjetas, Gastos, Resumen, Presupuestos, etc.
  - Iconos del menú “Más” (Préstamos, Gestión Dólares, etc.).
  - FAB: “Agregar gasto rápido” (y si se implementa atajo: “Agregar gasto rápido (Ctrl+Shift+G)”).
  - Botones de editar/eliminar en filas de tablas (ej. “Editar”, “Eliminar”).
  - Icono de búsqueda, tema, notificaciones/alertas.
- Textos cortos (1–4 palabras), en español, claros para quien no conoce la app.

---

## 3. Criterios de aceptación

- [ ] Existe al menos un tour contextual para una sección (ej. Presupuestos o Cuotas) accesible desde la propia página.
- [ ] El usuario puede iniciar el tour contextual, avanzar, saltar y cerrar.
- [ ] Los iconos del toolbar y del menú principal tienen tooltip.
- [ ] El FAB tiene tooltip (y opcionalmente el atajo).
- [ ] Los botones de acción solo-icono en tablas/cards tienen tooltip.

---

## 4. Notas técnicas

- **Tour:** revisar `src/app/services/tour.service.ts` y `src/app/components/tour-guiado/`. Si los pasos se definen por “sección”, añadir propiedad `seccion` o `ruta` al modelo de paso y que el componente de tour acepte parámetro “solo pasos de esta sección”.
- **Tooltips:** Angular Material `MatTooltipModule`; directiva `matTooltip`. Evitar tooltips en elementos que ya tienen texto visible.
- **Archivos a tocar:**  
  - `src/app/services/tour.service.ts` (pasos por sección)  
  - `src/app/components/tour-guiado/` (filtrar por sección, enlace desde páginas)  
  - `src/app/app.html` (tooltips en toolbar y menú)  
  - `src/app/components/gasto-rapido-fab/` (tooltip)  
  - Tablas y cards en páginas (botones de acción con matTooltip)  

---

## 5. Dependencias

- Angular Material Tooltip ya disponible. Tour actual ya existe; solo extender modelo y lógica por sección.
