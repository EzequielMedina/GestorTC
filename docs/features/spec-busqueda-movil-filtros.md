# Spec: Búsqueda global en móvil y filtros en resultados

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 2.2 Navegación y búsqueda (SI)  
**Prioridad:** Media  
**Módulo:** Búsqueda global / Layout  

---

## 1. Objetivo

- **Búsqueda global en móvil:** que la búsqueda sea accesible en pantallas pequeñas (icono de lupa que abra la búsqueda en pantalla completa o en un sheet/bottom sheet), ya que actualmente puede estar oculta o poco usable en móvil.
- **Filtros en resultados de búsqueda:** permitir filtrar los resultados por tipo (solo gastos, solo tarjetas, etc.) y/o por rango de fechas.

---

## 2. Requisitos funcionales

### 2.1 Búsqueda en móvil

- En viewport considerado “móvil” (ej. ancho &lt; 768px o 600px):
  - Mostrar un **icono de lupa** en el toolbar (si la barra de búsqueda completa está oculta).
  - Al tocar el icono:
    - Abrir la búsqueda en **pantalla completa** (overlay con input y resultados), **o**
    - Abrir un **panel/sheet** (desde arriba o abajo) con el campo de búsqueda y la lista de resultados.
  - El usuario puede escribir y ver resultados igual que en desktop; al elegir un resultado, navegar y cerrar el overlay/sheet.
  - Botón o gesto para cerrar sin seleccionar (volver a la vista anterior).

- En desktop se mantiene el comportamiento actual (barra de búsqueda en toolbar si ya existe).

### 2.2 Filtros en resultados de búsqueda

- En la interfaz de resultados de búsqueda (común para desktop y móvil):
  - **Filtro por tipo:** dropdown o chips para “Todos”, “Solo gastos”, “Solo tarjetas”, “Solo préstamos”, “Solo dólares” (según los tipos que devuelva `SearchService`).
  - **Filtro por rango de fechas (opcional):** cuando el tipo sea “Gastos” (o “Todos” con gastos incluidos), poder restringir por “Desde” y “Hasta”. Aplicar el filtro sobre los resultados ya obtenidos (o sobre la consulta si el servicio lo permite).
- Los filtros se aplican sobre los resultados actuales de la búsqueda; si el usuario cambia el texto de búsqueda, se puede mantener o resetear los filtros (definir: se sugiere mantener tipo, resetear fechas).

---

## 3. Criterios de aceptación

- [ ] En vista móvil hay un icono de lupa visible que abre la búsqueda (pantalla completa o sheet).
- [ ] En la vista de búsqueda (móvil y desktop) se pueden filtrar resultados por tipo (gastos, tarjetas, préstamos, dólares).
- [ ] Opcional: filtro por rango de fechas para gastos.
- [ ] La búsqueda en móvil permite escribir, ver resultados y navegar al ítem seleccionado sin problemas.

---

## 4. Notas técnicas

- **Componente búsqueda:** `src/app/components/global-search/`. Actualmente puede ser una barra en el toolbar; en móvil mostrar solo icono y, al clic, abrir un panel con el mismo input + lógica de búsqueda. Reutilizar `SearchService` y la misma lista de resultados.
- **Breakpoint:** usar variable CSS o `BreakpointObserver` (Angular CDK/Material) para detectar móvil y cambiar entre “barra siempre visible” e “icono que abre overlay”.
- **Filtros:** estado local en el componente (tipo seleccionado, fechas); filtrar el array de resultados antes de mostrarlo, o extender `SearchService.search()` para aceptar parámetros de tipo y rango si se prefiere filtrar en origen.
- **Archivos a tocar:**  
  - `src/app/components/global-search/` (HTML, TS, CSS)  
  - `src/app/app.html` (mostrar icono en móvil en lugar de barra completa si aplica)  
  - `src/app/services/search.service.ts` (opcional: parámetros de filtro)  

---

## 5. Dependencias

- Ninguna. SearchService y resultados ya existen; solo UI y filtrado.
