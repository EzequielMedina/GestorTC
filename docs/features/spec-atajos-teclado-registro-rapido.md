# Spec: Atajos de teclado y ajustes del FAB (registro rápido)

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 2.1 Registro rápido (SI)  
**Prioridad:** Alta  
**Módulo:** Gastos / Layout / FAB  

---

## 1. Objetivo

- **Atajo de teclado global** para abrir el formulario rápido de gastos desde cualquier página (ej. `Ctrl+Shift+G` o `Ctrl+N`), con foco automático en el campo “Monto”.
- **Revisión del FAB en móvil:** que no tape contenido crítico (ej. último ítem de listas) y que sea fácil de pulsar (tamaño/posición).

---

## 2. Requisitos funcionales

### 2.1 Atajo de teclado

- Definir un atajo único para “Abrir formulario rápido de gasto”, por ejemplo:
  - `Ctrl+Shift+G` (Windows/Linux) y `Cmd+Shift+G` (Mac), **o**
  - `Ctrl+N` / `Cmd+N` (si no entra en conflicto con “nueva ventana” del navegador; si hay conflicto, usar Ctrl+Shift+G).
- El atajo debe funcionar **en toda la aplicación** (cualquier ruta), salvo cuando el foco esté en un input de texto/textarea (para no interferir al escribir). Opción: que funcione siempre y abra el diálogo; el desarrollador puede decidir si desactivar dentro de inputs.
- Al abrir el formulario rápido por atajo:
  - El **foco** debe ir al campo **Monto** (o al primer campo editable del formulario rápido) para poder escribir sin usar el mouse.
  - Comportamiento del diálogo igual que al abrirlo desde el FAB (misma validación, guardar, cerrar).

### 2.2 FAB en móvil

- **Posición:** mantener FAB en esquina inferior derecha; revisar que no quede oculto por barra de navegación del sistema en dispositivos con gestos.
- **Contenido tapado:** asegurar que el FAB no cubra el último elemento visible de listas (gastos, tarjetas, etc.). Opciones: reducir tamaño del FAB en viewport pequeño, o desplazar ligeramente (ej. más arriba) cuando se detecte scroll cerca del final de la lista; o dejar margen inferior en el contenedor de la lista.
- **Área de toque:** mínimo 44x44 px (accesibilidad). El FAB de Material suele cumplirlo; verificar en vista móvil real.

### 2.3 Documentación al usuario

- Mostrar el atajo en tooltip del FAB (ej. “Agregar gasto rápido (Ctrl+Shift+G)”).
- Opcional: en el tour guiado o en “Ayuda”, mencionar el atajo.

---

## 3. Criterios de aceptación

- [ ] Pulsar el atajo definido (ej. Ctrl+Shift+G) abre el formulario rápido desde cualquier página.
- [ ] Al abrir por atajo, el foco está en el campo Monto (o primer campo editable).
- [ ] En viewport móvil, el FAB no tapa de forma sistemática el último ítem de listas largas (o hay margen/ajuste).
- [ ] El FAB tiene área de toque adecuada (≥44px) en móvil.
- [ ] El tooltip del FAB indica el atajo de teclado.

---

## 4. Notas técnicas

- **Atajo:** registrar en el componente raíz (ej. `AppComponent`) con `@HostListener('document:keydown', ['$event'])` o en un servicio que se inyecte en el layout; evitar conflictos con atajos del navegador (preventDefault cuando sea nuestro atajo). Abrir el mismo diálogo que abre el FAB (inyección de `GastoRapidoFabComponent` o del servicio/diálogo que abra el formulario rápido).
- **FAB:** componente `gasto-rapido-fab`; revisar CSS (bottom, right, z-index) y contenedor de listas (padding-bottom o scroll margin). Media queries para móvil si hace falta.
- **Archivos a tocar:**  
  - `src/app/app.ts` (HostListener del atajo o delegación al FAB)  
  - `src/app/components/gasto-rapido-fab/gasto-rapido-fab.component.ts` (abrir diálogo y foco; exponer método “abrir” si se invoca desde app)  
  - `src/app/components/gasto-rapido-fab/gasto-rapido-fab.component.html` (tooltip con texto del atajo)  
  - Estilos del FAB y de listas en páginas principales (gastos, tarjetas, etc.)  

---

## 5. Dependencias

- Ninguna. El formulario rápido (diálogo) ya existe; solo falta enlazar el atajo y asegurar foco.
