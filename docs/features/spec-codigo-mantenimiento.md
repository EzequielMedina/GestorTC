# Spec: Limpieza de console.log y documentación JSDoc

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 3.4 Código y mantenimiento (SI)  
**Prioridad:** Media  
**Módulo:** Código base  

---

## 1. Objetivo

- **Quitar o condicionar `console.log`** (y `console.debug`, `console.info` si se usan para debug) en producción; en desarrollo se pueden mantener o usar un logger condicional.
- **Documentación JSDoc** en métodos públicos de servicios principales (ResumenService, CuotaService, GastoService, BackupService, etc.) para facilitar onboarding de desarrolladores.

---

## 2. Requisitos funcionales

### 2.1 Console.log y logs de debug

- **Inventario:** buscar en el proyecto (especialmente en `src/app`) usos de `console.log`, `console.debug`, `console.warn` que sean claramente de depuración (ej. “DEBUG - Tarjetas disponibles”, “DEBUG - Gastos disponibles” en resumen.service o en componentes).
- **Acción:**
  - **Opción A (recomendada):** eliminar los `console.log` de debug en producción. En desarrollo, si se quieren mantener, usar un servicio o utilidad `Logger` que solo escriba en consola cuando `!environment.production` (o una variable de entorno).
  - **Opción B:** reemplazar `console.log` por llamadas a un `LoggerService` que en producción no imprima (o envíe a un backend de logs si en el futuro se agrega). En desarrollo, el Logger puede hacer `console.log`.
- **Excepciones:** `console.error` para errores reales puede mantenerse o redirigirse al ErrorHandler; `console.warn` para avisos importantes puede mantenerse si se considera útil en producción.
- **Archivos conocidos:** en `resumen.service.ts` hay (o hubo) logs DEBUG; revisar también componentes que impriman estado interno.

### 2.2 Documentación JSDoc

- **Servicios objetivo:** al menos los siguientes (métodos públicos):
  - **ResumenService:** `getTotalDelMes$`, `getResumenPorTarjetaDelMes$`, `getDetalleGastosAgrupadosPorTarjeta$`, `getDetalleGastosDelMes$`, `gastoImpactaMes` (si es público o se expone para tests).
  - **CuotaService:** métodos de obtención de cuotas, marcar pagada/adelantada, generación desde gastos.
  - **GastoService:** `getGastos$`, `addGasto`, `updateGasto`, `deleteGasto`, etc.
  - **BackupService:** `createBackup`, `restoreBackup`, `exportToJson`, `restoreFromJson`, validación.
- **Formato JSDoc:** para cada método público:
  - Descripción en una línea (o más si hace falta).
  - `@param` para cada parámetro (nombre y tipo, descripción breve).
  - `@returns` cuando aplique (tipo y descripción).
  - `@example` opcional para métodos no triviales.
- No es obligatorio documentar métodos privados; priorizar la API pública de los servicios listados.

---

## 3. Criterios de aceptación

- [ ] No quedan `console.log` (o equivalentes) de debug en código que se ejecute en producción; o están condicionados a entorno de desarrollo / Logger.
- [ ] ResumenService, CuotaService, GastoService y BackupService tienen JSDoc en sus métodos públicos principales (descripción, @param, @returns donde aplique).
- [ ] El build de producción no incluye logs de depuración innecesarios (verificación manual o con búsqueda en el bundle).

---

## 4. Notas técnicas

- **Logger:** ejemplo mínimo: `LoggerService.log(msg, ...args) { if (!environment.production) console.log(msg, ...args); }`. Inyectar donde se necesite; reemplazar `console.log` por `this.logger.log`.
- **JSDoc:** no cambia el comportamiento del código; solo comentarios. TypeScript/IDE mostrará la documentación en tooltips.
- **Archivos a tocar:**  
  - `src/app/services/resumen.service.ts` (quitar/condicionar logs, añadir JSDoc)  
  - `src/app/services/cuota.service.ts`  
  - `src/app/services/gasto.ts`  
  - `src/app/services/backup.service.ts`  
  - Opcional: `src/app/services/logger.service.ts` (nuevo)  
  - `src/environments/environment.prod.ts` (si se usa flag para logs)  

---

## 5. Dependencias

- Ninguna. Solo cambios de código y comentarios.
