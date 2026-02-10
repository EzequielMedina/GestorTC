# Spec: Resumen por período de facturación y comparación de períodos

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 1.2 Resumen y períodos (SI)  
**Prioridad:** Alta  
**Módulo:** Resumen / Análisis de tendencias  

---

## 1. Objetivo

- Ofrecer una **vista de resumen por período de facturación** de cada tarjeta (alineada al día de cierre), además del resumen por mes natural.
- Permitir **comparar dos meses** o **dos años** con totales y diferencias (en Resumen o Análisis de tendencias).

---

## 2. Requisitos funcionales

### 2.1 Resumen por período de cierre (por tarjeta)

- Cada tarjeta tiene `diaCierre` (1–31). El período de facturación es desde el día siguiente al cierre hasta el próximo cierre (ej. cierre 15 → período 16/ene al 15/feb).
- En la página **Resumen** (`/resumen`):
  - Añadir un **selector de modo**: “Por mes natural” (actual) vs “Por período de cierre”.
  - Cuando se elige “Por período de cierre”:
    - Mostrar un selector de **período** (ej. “Enero 2025” = cierres que caen en enero, o “Período 16-dic al 15-ene” según definición acordada).
    - Para cada tarjeta, incluir en el resumen del período solo los gastos cuya **fecha** caiga dentro del período de cierre de esa tarjeta.
  - Reutilizar la lógica actual de totales y cuotas, pero filtrando por el rango de fechas del período de cierre de la tarjeta (no por `monthKey` de mes natural).
- Documentar en la UI brevemente qué significa “período de cierre” (ej. tooltip o texto de ayuda).

### 2.2 Comparar dos meses o dos años

- En **Resumen** o **Análisis de tendencias** (elegir una ubicación y mantenerla consistente):
  - Selector **“Comparar”**: elegir Mes A y Mes B (mismo año o distintos), o Año A y Año B.
  - Vista de comparación:
    - Totales por tarjeta (o por categoría) para cada período.
    - Diferencia absoluta y/o porcentual entre A y B.
    - Opcional: pequeño gráfico de barras comparativo (A vs B).
  - Si se implementa en Análisis de tendencias, reutilizar datos de tendencias donde aplique.

---

## 3. Criterios de aceptación

- [x] En Resumen existe selector “Por mes natural” / “Por período de cierre”.
- [x] En modo “Por período de cierre”, los totales por tarjeta se calculan usando el rango de fechas definido por `diaCierre` de cada tarjeta.
- [x] Existe flujo “Comparar” (dos meses o dos años) con totales y diferencias mostrados claramente.
- [x] No se rompe el comportamiento actual cuando se usa “Por mes natural”.
- [x] Las cuotas de un gasto se asignan al período según la fecha de vencimiento de la cuota (o regla explícita documentada).

---

## 4. Estado de implementación

- **Selector de modo:** En Resumen hay radios "Mes natural" y "Por cierre"; la navegación mensual (◀ mes ▶) se aplica al mes en que cierra el período.
- **Período de cierre:** `PeriodoCierrePeriodoResolver` calcula el rango (diaCierre+1 del mes anterior → diaCierre del mes). Si el día siguiente al cierre no existe en el mes anterior (ej. cierre 28 y febrero), el período empieza el día 1 del mes actual. Las fechas de gastos se normalizan a fecha local para evitar desfases por timezone.
- **Comparar:** Sección "Comparar meses" en Resumen con selectores Mes A y Mes B; se muestran totales, diferencia absoluta y porcentual, y desglose por tarjeta. Implementado para dos meses (no comparación por año completo).
- **Cuotas:** Regla en `gasto-impacto-calculator`: gasto de una cuota impacta si su fecha cae en el rango; gasto en cuotas impacta por cada cuota cuyo mes de vencimiento (primer día del mes, `primerMesCuota + i`) está en el rango.

---

## 5. Notas técnicas

- **Modelo Tarjeta:** ya tiene `diaCierre` (y `diaVencimiento`). Calcular rango del período: dado un “mes de cierre” (ej. enero), el período puede ser “del (diaCierre+1) del mes anterior al (diaCierre) del mes seleccionado”. Definir si el selector es “Mes en que cierra” o “Período mostrado (fechas)”.
- **ResumenService:** extender o crear métodos que reciban `monthKey` + `diaCierre` por tarjeta, o un rango de fechas por tarjeta, y filtren gastos/cuotas por ese rango. Mantener `getTotalDelMes$`, `getResumenPorTarjetaDelMes$` para mes natural.
- **Archivos a tocar:**  
  - `src/app/services/resumen.service.ts`  
  - `src/app/pages/resumen/` (vista y selector de modo y comparación)  
  - Opcional: `src/app/pages/analisis-tendencias/` si la comparación va ahí  
  - `src/app/models/tarjeta.model.ts` (solo lectura de `diaCierre`)

---

## 6. Dependencias

- Ninguna externa. Depende del modelo de tarjeta con `diaCierre` ya existente.
