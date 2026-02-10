# Spec: Selector de mes en Dashboard y empty states

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 2.3 Dashboard y resumen (SI)  
**Prioridad:** Media  
**Módulo:** Dashboard / Resumen / Páginas principales  

---

## 1. Objetivo

- **Dashboard:** dejar claro que los datos corresponden al “mes actual” y, si se implementa, añadir un enlace “Ver otro mes” que lleve al Resumen con ese mes seleccionado.
- **Empty states:** en las vistas principales (gastos, tarjetas, presupuestos, etc.), mostrar mensajes y acciones claras cuando no hay datos (ej. “Agregar primera tarjeta”, “Registrar primer gasto”).

---

## 2. Requisitos funcionales

### 2.1 Dashboard — mes actual y enlace a “otro mes”

- En la página **Dashboard** (`/dashboard`):
  - Mostrar de forma explícita el **mes y año** que se están mostrando (ej. “Febrero 2025” o “Resumen de febrero 2025”) en el encabezado o junto a los bloques de totales.
  - Añadir un enlace o botón **“Ver otro mes”** (o “Cambiar mes”) que:
    - Navegue a la página **Resumen** (`/resumen`) con el mes seleccionable (el Resumen ya tiene selector de mes); **o**
    - Abra un selector de mes en el Dashboard y, al elegir un mes, navegue a Resumen con ese mes preseleccionado (vía query param o estado).
- No es obligatorio que el Dashboard muestre datos de “otro mes”; el objetivo es dejar claro “esto es el mes actual” y dar acceso rápido al Resumen por mes.

### 2.2 Empty states

- Aplicar en las siguientes vistas (cuando la lista o el bloque principal esté vacío):
  - **Gastos** (`/gastos`): mensaje “Aún no tenés gastos registrados” (o similar) y botón “Registrar primer gasto” (abre formulario o FAB).
  - **Tarjetas** (`/tarjetas`): mensaje “Aún no tenés tarjetas cargadas” y botón “Agregar primera tarjeta”.
  - **Presupuestos** (`/presupuestos`): mensaje “Aún no tenés presupuestos” y botón “Crear presupuesto”.
  - **Resumen:** si no hay datos para el mes elegido, mensaje “No hay movimientos en este mes” (y opción de cambiar de mes).
  - **Dashboard:** si no hay tarjetas o no hay gastos en el mes actual, mensaje amigable (ej. “Agregá una tarjeta para empezar” o “No hay gastos este mes”) en el bloque correspondiente, sin dejar bloques vacíos sin explicación.
- Diseño: icono + texto + CTA (botón o enlace). Mantener estilo de la app (Material, variables CSS).

---

## 3. Criterios de aceptación

- [ ] En el Dashboard se muestra explícitamente el mes/año de los datos.
- [ ] Existe un enlace “Ver otro mes” (o equivalente) que lleva al Resumen (con selector de mes).
- [ ] En Gastos, Tarjetas y Presupuestos hay empty state con mensaje y acción cuando no hay ítems.
- [ ] En Resumen hay mensaje cuando no hay datos para el mes elegido.
- [ ] En Dashboard los bloques sin datos muestran un mensaje claro en lugar de quedar vacíos.

---

## 4. Notas técnicas

- **Dashboard:** componente `dashboard.component.ts/html`; añadir variable `mesActual` (nombre del mes + año) y enlace `routerLink="/resumen"` (opcional con query `?mes=YYYY-MM` si el Resumen lo soporta).
- **Empty states:** en cada página, usar `*ngIf="items.length === 0"` (o equivalente) para mostrar un bloque con icono, texto y botón; el resto del contenido con `*ngIf="items.length > 0"`.
- **Archivos a tocar:**  
  - `src/app/pages/dashboard/dashboard.component.html` (y .ts si se añade lógica)  
  - `src/app/pages/gastos/gastos.component.html`  
  - `src/app/pages/tarjetas/tarjetas.component.html`  
  - `src/app/pages/presupuestos/presupuestos.component.html`  
  - `src/app/pages/resumen/` (vista resumen)  
  - Opcional: componente reutilizable `empty-state` (icono, mensaje, acción)  

---

## 5. Dependencias

- Ninguna. Solo cambios de presentación y navegación.
