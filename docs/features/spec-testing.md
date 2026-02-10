# Spec: Tests unitarios y E2E

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 3.1 Testing (SI)  
**Prioridad:** Alta  
**Módulo:** Calidad / CI  

---

## 1. Objetivo

- **Tests unitarios** para servicios críticos: ResumenService, CuotaService, GastoService, BackupService (cálculos de mes, cuotas, integridad).
- **Tests de integración o E2E** para flujos clave: “agregar gasto → ver en resumen”, “crear backup → restaurar”, “registro rápido desde FAB”.

---

## 2. Requisitos funcionales

### 2.1 Tests unitarios de servicios

- **ResumenService**
  - `monthKeyFromISO`: strings y Date; formato YYYY-MM-DD.
  - `gastoImpactaMes` (o lógica equivalente expuesta): gasto 1 cuota en un mes → aporte correcto; gasto en cuotas en varios meses → aporte por mes correcto; `primerMesCuota` respetado.
  - `getTotalDelMes$`: con lista de gastos mock, total correcto para un monthKey dado.
- **CuotaService**
  - Generación de cuotas desde un gasto con N cuotas: cantidad de cuotas, fechas y montos esperados.
  - Estados: marcar cuota pagada/adelantada; obtener cuotas pendientes del mes.
- **GastoService**
  - CRUD: agregar, obtener, actualizar, eliminar; `getGastos$()` emite después de cambios.
  - Filtros o consultas que exponga (si hay).
- **BackupService**
  - Crear backup: estructura de datos incluida (tarjetas, gastos, etc.) y metadatos.
  - Restaurar: datos restaurados en servicios inyectados (o en store); validación de integridad antes de restaurar.
  - Exportar/importar desde JSON: round-trip sin pérdida crítica de datos.

- Los tests deben ser **independientes** (mocks de dependencias, no localStorage real si se puede evitar, o limpiar entre tests). Framework: **Jasmine/Karma** (por defecto en Angular) o **Jest** si el proyecto ya lo usa.

### 2.2 Tests de integración o E2E

- **Herramienta:** Angular recomienda **Cypress** o **Playwright**; si el proyecto usa otro (Protractor legacy), documentar. Objetivo: 1–3 flujos críticos.
- **Flujos a cubrir:**
  1. **Agregar gasto y ver en resumen:** navegar a Gastos (o usar FAB), completar formulario, guardar; navegar a Resumen, seleccionar el mes correspondiente; verificar que el gasto aparece en el detalle o total.
  2. **Backup y restauración:** crear backup (o exportar JSON); modificar/eliminar algún dato; restaurar desde backup/archivo; verificar que los datos restaurados coinciden.
  3. **Registro rápido desde FAB:** abrir app, pulsar FAB, llenar monto y descripción (y tarjeta si es necesario), guardar; verificar que el gasto aparece en listado de gastos o en resumen del mes actual.

- Los E2E pueden asumir datos iniciales conocidos (seed) o empezar con app “vacía” y crear datos en el propio test.

---

## 3. Criterios de aceptación

- [ ] ResumenService tiene tests unitarios para cálculo de mes y aporte de gastos/cuotas al mes.
- [ ] CuotaService tiene tests para generación de cuotas y cambio de estado.
- [ ] GastoService tiene tests para CRUD básico.
- [ ] BackupService tiene tests para crear, restaurar y validación.
- [ ] Existe al menos un test E2E (o de integración) que cubra “agregar gasto y ver en resumen” o “backup → restaurar” o “FAB → guardar gasto”.
- [ ] Los tests unitarios se ejecutan con `npm run test` (o comando estándar del proyecto) y pasan en CI si existe.

---

## 4. Notas técnicas

- **Angular:** `ng test` (Karma) o configuración Jest. Servicios: `TestBed.inject(Service)` y mocks de `GastoService`, `TarjetaService`, etc. con `jasmine.createSpyObj` o clases mock.
- **localStorage:** en tests unitarios, mockear o usar `Storage` en memoria; o limpiar en `afterEach`.
- **E2E:** si no hay Cypress/Playwright, añadir dependencia y script en `package.json`; un solo spec con los flujos indicados es suficiente para empezar.
- **Archivos a crear/tocar:**  
  - `src/app/services/resumen.service.spec.ts`  
  - `src/app/services/cuota.service.spec.ts`  
  - `src/app/services/gasto.spec.ts` (puede existir; ampliar)  
  - `src/app/services/backup.service.spec.ts`  
  - `cypress/e2e/` o `e2e/` (según herramienta) para E2E  

---

## 5. Dependencias

- Jasmine/Karma (incluidos en Angular) o Jest. Para E2E: Cypress o Playwright (añadir al proyecto).
