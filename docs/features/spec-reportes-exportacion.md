# Spec: Reportes personalizados — exportar a Excel y gráficos en PDF

**Referencia:** [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md) — 1.5 Reportes y exportación (SI)  
**Prioridad:** Media  
**Módulo:** Reportes personalizados  

---

## 1. Objetivo

- **Exportar reportes personalizados a Excel** además del actual export a PDF.
- **Incluir gráficos en el PDF** cuando el usuario tenga activada la opción “Incluir gráficos” en la configuración del reporte.
- Opcional: **Reporte por período de facturación** (alineado al cierre de cada tarjeta), coherente con la spec de Resumen por período.

---

## 2. Requisitos funcionales

### 2.1 Exportar a Excel

- En la página **Reportes personalizados** (`/reportes-personalizados`), para el reporte generado actual (o desde una configuración guardada):
  - Añadir botón **“Exportar a Excel”** junto a “Exportar a PDF”.
  - El Excel debe contener:
    - Misma estructura de datos que la tabla mostrada (columnas visibles según configuración).
    - Si hay agrupación (por tarjeta, categoría, mes, etc.), reflejarla en el Excel (filas agrupadas o subtotales).
    - Hoja única o múltiples hojas si hay agrupación (definir convención: ej. una hoja por grupo o una hoja con todo y subtotales).
  - Nombre de archivo sugerido: `reporte-{nombreConfig}-{fecha}.xlsx`.

### 2.2 Gráficos en PDF

- En la configuración del reporte ya existe (o se añade) opción **“Incluir gráficos”**.
- Al exportar a PDF cuando “Incluir gráficos” está activo:
  - Incluir en el PDF los gráficos que se muestran en pantalla para ese reporte (ej. gráfico por categoría, por tarjeta, según lo que el reporte ofrezca).
  - Colocación: por ejemplo, después del resumen y antes de la tabla, o al final.
  - Usar la misma librería de generación de PDF actual (o la que se use para “imprimir”/window.print); si se usa canvas de Chart.js, exportar la imagen al PDF.

### 2.3 Reporte por período de facturación (opcional)

- Si se implementa la vista “Por período de cierre” en Resumen, ofrecer en Reportes personalizados una **opción de filtro por período de facturación** (por tarjeta), de forma que el reporte muestre datos alineados al cierre de cada tarjeta en lugar de mes natural.

---

## 3. Criterios de aceptación

- [ ] Existe botón “Exportar a Excel” que descarga un .xlsx con los datos del reporte actual (columnas y agrupaciones según configuración).
- [ ] Al exportar a PDF con “Incluir gráficos” activo, el PDF contiene al menos un gráfico representativo del reporte.
- [ ] El comportamiento actual de exportar a PDF sin gráficos se mantiene.
- [ ] (Opcional) El reporte puede filtrarse por período de facturación cuando esa funcionalidad exista en Resumen.

---

## 4. Notas técnicas

- **Excel:** usar SheetJS (xlsx) ya presente en el proyecto; construir workbook con hojas según agrupación; file-saver para descarga.
- **PDF con gráficos:** Chart.js permite exportar a imagen (canvas.toDataURL); integrar en el HTML que se pasa a imprimir o a jsPDF/html2canvas. Revisar `reporte-pdf.service.ts` y componente de reportes personalizados.
- **Archivos a tocar:**  
  - `src/app/pages/reportes-personalizados/reportes-personalizados.component.ts` (lógica de export Excel y PDF con gráficos)  
  - `src/app/services/reporte.service.ts` (datos para Excel)  
  - `src/app/services/reporte-pdf.service.ts` (incluir gráficos en PDF)  

---

## 5. Dependencias

- SheetJS (xlsx) y file-saver ya usados en el proyecto. Ninguna dependencia nueva obligatoria para Excel. Para PDF con gráficos, asegurar que los gráficos estén renderizados en el DOM al momento de generar el PDF.
