# Spec: Validaciones en formularios y manejo de errores global

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 3.3 Validación y robustez (SI)  
**Prioridad:** Alta  
**Módulo:** Formularios / Core  

---

## 1. Objetivo

- **Validaciones en formularios:** presupuestos (límite > 0, fechas coherentes); gastos (fecha no futura o con aviso, monto > 0, tarjeta existente).
- **Manejo de errores global:** interceptor o servicio que capture errores no controlados y muestre un mensaje amigable al usuario (sin reemplazar logs en desarrollo).

---

## 2. Requisitos funcionales

### 2.1 Validaciones — Presupuestos

- **Límite:** obligatorio y mayor que 0. Mensaje: “El límite debe ser mayor que 0”.
- **Fechas:** si hay fecha inicio/fin, fecha fin >= fecha inicio. Mensaje claro si no se cumple.
- **Categoría o tarjeta:** al menos uno debe estar seleccionado (según regla actual del negocio). Si la app permite presupuesto “por categoría” o “por tarjeta”, validar que no se envíe vacío.
- Mostrar errores en el formulario (inline o bajo el campo) y no enviar el formulario hasta que sea válido (o deshabilitar “Guardar” mientras haya errores).

### 2.2 Validaciones — Gastos

- **Monto:** obligatorio y mayor que 0. Mensaje: “El monto debe ser mayor que 0”.
- **Tarjeta:** obligatoria y debe ser un id de tarjeta existente (no borrada). Si la tarjeta fue eliminada, mostrar error o recargar selector.
- **Fecha:** 
  - Opción A: no permitir fechas futuras; mensaje “La fecha no puede ser futura”.
  - Opción B: permitir fechas futuras pero mostrar un aviso (ej. “Estás registrando un gasto futuro. ¿Continuar?”) y permitir confirmar.
- **Descripción:** si es obligatoria en el modelo, validar no vacía.
- Cuotas: si `cantidadCuotas` > 1, validar que sea número entero positivo y que `montoPorCuota` (si se ingresa) sea coherente con el total.

### 2.3 Validaciones — Otros formularios (opcional)

- **Tarjetas:** límite >= 0; día de cierre y vencimiento en rango 1–31.
- **Préstamos:** monto > 0, cuotas > 0, tasas no negativas.
- Aplicar el mismo criterio: mensajes claros, no enviar si hay errores.

### 2.4 Manejo de errores global

- **Objetivo:** si ocurre un error no capturado (por ejemplo en un observable que no tiene `catchError`, o en una promesa sin `catch`), no dejar la pantalla en blanco ni mostrar solo el error de consola; mostrar un mensaje amigable al usuario.
- **Implementación:**
  - **Angular:** `ErrorHandler` global (implementar `ErrorHandler` y registrar en `providers`). En el handler: registrar el error (en desarrollo: `console.error`; en producción: opcional enviar a un servicio de logging) y mostrar un mensaje al usuario vía NotificationService o MatSnackBar (ej. “Ocurrió un error. Por favor intentá de nuevo.”).
  - **Observables:** revisar servicios críticos (GastoService, ResumenService, etc.) y asegurar que los observables que hacen operaciones (guardar, eliminar) tengan `catchError` y devuelvan un mensaje manejable o llamen al NotificationService en caso de error.
- No reemplazar el flujo de errores ya manejados en formularios (ej. validación); solo capturar lo no manejado.

---

## 3. Criterios de aceptación

- [ ] Formulario de presupuestos valida límite > 0 y fechas coherentes; muestra mensajes de error.
- [ ] Formulario de gastos valida monto > 0, tarjeta existente y fecha (no futura o con aviso); muestra mensajes de error.
- [ ] Existe un ErrorHandler global (o equivalente) que muestra un mensaje al usuario cuando ocurre un error no capturado.
- [ ] En desarrollo, el error sigue visible en consola (o en un log) para depuración.

---

## 4. Notas técnicas

- **Angular:** `provideErrorHandler(MyErrorHandler)` en `app.config.ts` o en el módulo raíz. `MyErrorHandler` implementa `handleError(error: any)`.
- **Formularios:** Reactive Forms con `Validators.required`, `Validators.min(0.01)`, validadores custom para fechas y tarjeta. `form.invalid` deshabilita el botón de envío o se muestra resumen de errores al enviar.
- **Archivos a tocar:**  
  - `src/app/components/presupuesto-card/` o formulario de presupuestos (validators y mensajes)  
  - `src/app/components/gasto-dialog/` (validators y mensajes)  
  - `src/app/app.config.ts` (ErrorHandler)  
  - Nuevo `src/app/error-handler.service.ts` o `global-error.handler.ts`  
  - Servicios que hacen guardado (catchError en pipes)  

---

## 5. Dependencias

- Ninguna externa. Angular Reactive Forms y Validators ya disponibles.
