# Spec: Recordatorios post-compra y carga de servicios desde archivo (CSV/Excel)

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 1.4 Gastos y registro (SI)  
**Prioridad:** Alta  
**Módulo:** Gastos / PWA / Cargar servicios  

---

## 1. Objetivo

- **Recordatorios post-compra (PWA):** notificación (push o in-app) tipo “¿Hiciste una compra? Registrá tu gasto” tras X minutos de inactividad desde el último gasto registrado (configurable).
- **Carga de servicios desde archivo:** retomar importación solo con **CSV o Excel** (columnas fijas), con vista previa y sin OCR/PDF.

---

## 2. Requisitos funcionales

### 2.1 Recordatorios post-compra (PWA)

- **Configuración (en ajustes o en preferencias):**
  - Activar/desactivar recordatorios.
  - Intervalo en minutos: ej. 15, 30, 60 (por defecto 30).
  - Opcional: horario de silencio (ej. no notificar entre 23:00 y 8:00).
- **Lógica:**
  - Guardar timestamp del último gasto registrado (localStorage o servicio).
  - Si no se registró ningún gasto en los últimos X minutos (y la app está abierta o en segundo plano), mostrar:
    - **In-app:** notificación/banner tipo “¿Hiciste una compra? Registrá tu gasto” con botón que abra el formulario rápido (FAB).
    - **Push (opcional):** si se implementa Push API, enviar notificación push con el mismo mensaje cuando la app no esté en primer plano (requiere Service Worker y suscripción).
- No molestar si el usuario acaba de registrar un gasto (respetar el intervalo).
- La primera vez que se active la función, se puede pedir permiso para notificaciones (para push).

### 2.2 Carga de servicios desde archivo (CSV/Excel)

- **Alcance:** solo CSV y Excel (.xlsx), **sin** PDF ni OCR.
- **Formato esperado (columnas fijas):** definir y documentar, ej.:
  - Fecha (YYYY-MM-DD o DD/MM/YYYY), Descripción, Monto, Proveedor (opcional), Tarjeta (nombre o ID), Categoría (opcional).
- **Flujo:**
  1. Usuario va a “Cargar servicios” (o sección equivalente; si la ruta existe en `cargar-servicios`, usarla).
  2. Selecciona archivo CSV o Excel.
  3. Sistema parsea y muestra **vista previa** (tabla con filas a importar).
  4. Usuario puede mapear columnas del archivo a campos del sistema si los nombres no coinciden (o usar columnas fijas por posición).
  5. Validación: fechas válidas, montos > 0, tarjeta existente. Mostrar errores por fila.
  6. Opción “Importar” crea gastos (o gastos recurrentes) según reglas definidas (ej. un gasto por fila con fecha del archivo).
- **Duplicados:** opción “omitir duplicados” o “actualizar si existe” (por fecha + monto + descripción, por ejemplo).
- Documentar formato en la misma pantalla (link a plantilla o ejemplo).

---

## 3. Criterios de aceptación

**Recordatorios:**
- [ ] Existe configuración para activar recordatorios y elegir intervalo (minutos).
- [ ] Tras X minutos sin registrar gasto, se muestra mensaje in-app (y opcionalmente push) con CTA al formulario rápido.
- [ ] No se muestra recordatorio si se registró un gasto dentro del intervalo.

**Carga de servicios:**
- [ ] Se puede seleccionar archivo CSV o Excel y ver vista previa de filas.
- [ ] Se pueden importar gastos desde el archivo con validación y manejo de errores.
- [ ] Hay documentación o plantilla del formato esperado.

---

## 4. Notas técnicas

- **Recordatorios:** usar `PreferenciasUsuarioService` o nuevo `RecordatoriosService`; guardar `ultimoGastoRegistroTimestamp`; timer o `setInterval` en app (y para push, Service Worker + Push API). Ver [FEATURE_CARGA_GASTOS_SERVICIOS.md](../FEATURE_CARGA_GASTOS_SERVICIOS.md) para contexto de la feature cancelada de PDF.
- **Carga archivo:** reutilizar `CargaServiciosService` y componentes de `cargar-servicios` si existen; restringir a CSV/Excel; librería de Excel ya usada en el proyecto (SheetJS); CSV con parser simple (split por coma o punto y coma, encoding UTF-8).
- **Archivos a tocar:**  
  - Nuevo o extender: `preferencias-usuario.service.ts` / `recordatorios.service.ts`  
  - `app.ts` o layout para timer/banner in-app  
  - `pwa-update.service.ts` o nuevo para Push (opcional)  
  - `src/app/pages/cargar-servicios/` y `carga-servicios.service.ts` para CSV/Excel  

---

## 5. Dependencias

- PWA ya configurada (Service Worker). Para push: navegador compatible con Push API y backend para suscripción (opcional; se puede dejar solo in-app en una primera versión).
