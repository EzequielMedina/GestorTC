# Spec: Accesibilidad — ARIA, teclado y contraste

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 2.4 Accesibilidad (SI)  
**Prioridad:** Alta  
**Módulo:** Global / Componentes / Tema  

---

## 1. Objetivo

- **ARIA y teclado:** labels en controles importantes, navegación completa por teclado en diálogos y menús, orden de tabulación lógico.
- **Contraste y modo alto contraste:** revisar contraste en modo claro y oscuro; opción de tema “alto contraste” para texto/fondo.

---

## 2. Requisitos funcionales

### 2.1 ARIA y labels

- Todos los **iconos que son botones** (toolbar, cards, acciones) deben tener:
  - `aria-label` descriptivo (ej. “Cerrar”, “Agregar gasto”, “Abrir menú”).
  - O un texto visible asociado (en ese caso no es obligatorio aria-label si el texto es suficiente).
- **Formularios:** inputs con `<label>` asociado (por `for`/id o envuelto en mat-form-field que ya lo maneja). Campos obligatorios con `aria-required="true"` si no se indica de otra forma.
- **Diálogos:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apuntando al título del diálogo. El foco debe entrar al abrir (en el primer elemento focusable o en el título) y no salir del diálogo mientras esté abierto (trap focus).
- **Menús (sidenav, menú “Más”):** elementos de lista navegables por teclado (flechas y Enter); `aria-expanded` en el botón que abre el menú cuando aplique.

### 2.2 Navegación por teclado

- **Diálogos:** Tab recorre los controles dentro del diálogo; Shift+Tab hacia atrás; Escape cierra el diálogo (si el diseño lo permite).
- **Tablas (Material):** asegurar que las celdas accionables (editar, eliminar) sean focusables y activables con Enter/Space.
- **Orden de tabulación:** lógico (de arriba a abajo, izquierda a derecha). Evitar saltos ilógicos; en formularios, orden según el orden visual.
- No dejar trampas de foco (elementos que reciben foco pero no permiten salir con Tab).

### 2.3 Contraste y modo alto contraste

- **Revisión de contraste:** en modo claro y modo oscuro, los textos principales deben cumplir al menos **WCAG 2.1 AA** (4.5:1 para texto normal, 3:1 para texto grande). Revisar especialmente:
  - Texto sobre fondos de cards y sobre fondos de página.
  - Enlaces y botones secundarios.
- **Tema “Alto contraste”:** añadir una opción más en el selector de tema (junto a Claro, Oscuro, Automático): **“Alto contraste”**.
  - Alto contraste: fondo muy oscuro (o blanco puro) y texto blanco (o negro) con contraste máximo; botones y bordes bien definidos. Objetivo: legibilidad máxima para usuarios con baja visión.
  - Persistir la preferencia en localStorage (igual que el tema actual).
- **Variables CSS:** definir variables para el tema alto contraste (ej. `--hc-bg`, `--hc-text`, `--hc-border`) y aplicarlas cuando el tema sea “alto contraste”.

---

## 3. Criterios de aceptación

- [ ] Los botones de icono tienen aria-label (o texto equivalente).
- [ ] Los diálogos principales (gasto, tarjeta, presupuesto, etc.) tienen role dialog, trap focus y cierre con Escape.
- [ ] Se puede navegar por teclado por menús y formularios sin usar el mouse.
- [ ] Existe opción “Alto contraste” en el selector de tema y se aplica correctamente.
- [ ] En modo claro y oscuro actuales, los textos críticos cumplen contraste mínimo (revisión manual o con herramienta).

---

## 4. Notas técnicas

- **Angular Material:** muchos componentes ya traen ARIA; revisar y completar donde falte. `cdkTrapFocus` (Angular CDK) para trap focus en diálogos.
- **ThemeService:** extender para soportar valor “high-contrast” y cargar conjunto de variables CSS para alto contraste. Estructura similar a dark/light.
- **Archivos a tocar:**  
  - `src/app/services/theme.service.ts` (y posiblemente `theme-toggle.component`)  
  - `src/styles.css` o archivo de temas (variables alto contraste)  
  - Componentes de diálogo (gasto-dialog, tarjeta-dialog, etc.): aria-label en botones, trap focus  
  - `src/app/app.html` (menú, toolbar: aria-label en iconos)  
  - Tablas en páginas principales (tabindex y teclado si hace falta)  

---

## 5. Dependencias

- Angular CDK (FocusTrap) si no está ya. No se requieren librerías externas adicionales.
