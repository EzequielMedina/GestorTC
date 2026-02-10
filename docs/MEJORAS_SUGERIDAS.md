# Mejoras sugeridas para GestorTC

**Basado en:** [ANALISIS_FUNCIONAL.md](./ANALISIS_FUNCIONAL.md), context.md, IDEAS_REGISTRO_RAPIDO_GASTOS.md y ANALISIS_Y_RECOMENDACIONES.md  
**Fecha:** Febrero 2025  

Este documento agrupa mejoras posibles ordenadas por categoría y prioridad sugerida. No implica compromiso de implementación.

---

## Resumen por prioridad

| Prioridad | Enfoque | Ejemplos |
|-----------|---------|----------|
| **Alta** | Cerrar gaps del análisis funcional, UX inmediata, datos | Sync/backup en la nube opcional, notificaciones push, atajos de teclado |
| **Media** | Profundizar módulos existentes, análisis y reportes | Dólares avanzado, presupuestos a Excel, historial de cambios |
| **Baja** | Nice-to-have, innovación | Voz, OCR tickets, geolocalización, múltiples perfiles |

---

## 1. Funcionalidad y producto

### 1.1 Persistencia y sincronización (limitación actual) NO

- **Backup/sync opcional en la nube**  
  - Exportar/importar a un backend opcional (ej. cuenta propia en Firebase/Supabase) para no depender solo del dispositivo.  
  - Mantener modo 100% local para quien no quiera cuenta.

- **Restauración desde archivo más visible**  
  - En “Backup y restauración”, destacar “Restaurar desde archivo JSON” y guía rápida para cambio de dispositivo.

### 1.2 Resumen y períodos SI

- **Resumen por período de facturación (por tarjeta)**  
  - Hoy el resumen es por mes natural según fecha del gasto.  
  - Opción: vista “por período de cierre” de cada tarjeta (ej. del 15 al 14 del mes siguiente) para alinearse al resumen de la tarjeta.

- **Comparar dos meses o dos años**  
  - En Resumen o Análisis de tendencias: selector “Comparar mes A vs mes B” o “Año A vs año B” con totales y diferencias.

### 1.3 Presupuestos NO

- **Exportar presupuestos a Excel**  
  - Exportación de presupuestos y cumplimiento (gastado vs límite) por mes.

- **Historial de cambios en presupuestos**  
  - Registrar cuándo se creó/modificó el límite (opcional: auditoría ligera).

- **Metas de ahorro**  
  - Metas por monto y plazo; seguimiento de progreso; opcionalmente ligado a balance en dólares.

### 1.4 Gastos y registro SI

- **Recordatorios post-compra (PWA)**  
  - Notificación push o in-app: “¿Hiciste una compra? Registrá tu gasto” tras X minutos de inactividad (configurable).  
  - Requiere notificaciones push en PWA y lógica de “último gasto registrado”.

- **Carga de servicios desde archivo (reintento acotado)**  
  - La carga desde PDF fue cancelada; se podría retomar solo CSV/Excel con columnas fijas y vista previa, sin OCR, para no depender de PDF.

### 1.5 Reportes y exportación SI

- **Reportes personalizados: más salidas**  
  - Exportar a Excel además de PDF.  
  - Incluir gráficos en el PDF cuando “incluir gráficos” esté activo.

- **Reporte por período de facturación**  
  - Misma idea que en Resumen: reporte alineado al cierre de cada tarjeta.

### 1.6 Dólares

- **Análisis de dólares más rico**  
  - Precio de compra promedio vs cotización actual (ganancia/pérdida no realizada).  
  - Ideas de estrategia (FIFO, promedio) solo informativas.  
  - Alertas opcionales de “precio objetivo para vender” (valor guardado por usuario).

- **Cotizaciones en tiempo real (opcional)**  
  - Si se usa alguna API pública: mostrar blue, MEP, etc. y comparar con el historial propio.

### 1.7 Cuotas y calendario SI

- **Recordatorio el día del vencimiento**  
  - Notificación el mismo día (o configurable) para vencimientos de tarjetas/cuotas, además del aviso previo en el banner.

- **Eventos personalizados editables**  
  - En calendario financiero: crear/editar/borrar eventos propios (ej. “Pagar alquiler”) no generados por tarjetas/cuotas/préstamos/servicios.

---

## 2. Experiencia de usuario (UX)

### 2.1 Registro rápido (ya fuerte; pulir) SI

- **Atajos de teclado**  
  - Atajo global (ej. `Ctrl+Shift+G` o `Ctrl+N`) para abrir el formulario rápido desde cualquier página.  
  - Foco automático en “Monto”.

- **FAB en móvil**  
  - Revisar que el FAB no tape contenido crítico (ej. último ítem de una lista) y que sea fácil de pulsar.

### 2.2 Navegación y búsqueda SI

- **Búsqueda global en móvil**  
  - El análisis indica que en móvil puede estar oculta: ofrecer icono de lupa que abra la búsqueda en pantalla completa o en un sheet.

- **Filtros avanzados en búsqueda**  
  - Opción de filtrar resultados de búsqueda por tipo (solo gastos, solo tarjetas, etc.) o por rango de fechas.

### 2.3 Dashboard y resumen SI

- **Selector de mes más visible en Dashboard**  
  - Dejar claro que el dashboard es “mes actual” y, si se agrega, un enlace “Ver otro mes” que lleve al Resumen con ese mes.

- **Empty states**  
  - Mensajes y acciones claras cuando no hay gastos, tarjetas o presupuestos (ej. “Agregar primera tarjeta”, “Registrar primer gasto”).

### 2.4 Accesibilidad SI

- **ARIA y teclado**  
  - Labels en controles importantes, navegación por teclado en diálogos y menús, orden de tabulación lógico.

- **Contraste y modo alto contraste**  
  - Revisar contraste en modo claro y oscuro; opción de tema “alto contraste” para texto/fondo.

### 2.5 Onboarding SI

- **Tour guiado contextual**  
  - Pasos opcionales por sección (ej. “Así se usa Presupuestos”) además del tour general.

- **Tooltips en iconos**  
  - Donde haya solo icono (toolbar, cards), tooltip breve para explicar la acción.

---

## 3. Mejoras técnicas y calidad

### 3.1 Testing SI

- **Tests unitarios de servicios críticos**  
  - ResumenService, CuotaService, GastoService, BackupService (cálculos de mes, cuotas, integridad).

- **Tests de integración o E2E**  
  - Flujos clave: “agregar gasto → ver en resumen”, “crear backup → restaurar”, “registro rápido desde FAB”.

### 3.2 Rendimiento SI

- **Paginación o virtual scrolling**  
  - En listados grandes (gastos, detalle del mes) para evitar lag con muchos ítems.

- **Caché de cálculos pesados**  
  - En dashboard y resumen por mes: cachear por `monthKey` y invalidar cuando cambien gastos/tarjetas.

- **Lazy loading**  
  - Mantener carga diferida de rutas (ya en uso); revisar que gráficos y reportes no carguen todo el dataset de golpe.

### 3.3 Validación y robustez SI

- **Validaciones en formularios**  
  - Presupuestos: límite > 0, fechas coherentes.  
  - Gastos: fecha no futura (o permitir con aviso), monto > 0, tarjeta existente.

- **Manejo de errores global**  
  - Interceptor o servicio que capture errores no controlados y muestre mensaje amigable (sin reemplazar logs en desarrollo).

### 3.4 Código y mantenimiento SI

- **Quitar o condicionar `console.log`**  
  - En producción no dejar logs de debug (ej. los del ResumenService); usar entorno o logger condicional.

- **Documentación de APIs internas**  
  - JSDoc en métodos públicos de servicios (ResumenService, CuotaService, etc.) para onboarding de desarrolladores.

---

## 4. Ideas de mayor alcance (opcionales)

### 4.1 Registro por voz SI

- Comando de voz tipo “Gasté 5000 en supermercado con Visa” para abrir el formulario prellenado o guardar directo con confirmación.  
- Depende de Web Speech API o servicio externo; impacto alto en UX, esfuerzo alto.

### 4.2 Escanear ticket (OCR) SI

- Foto del ticket → extracción de monto/fecha/descripción → sugerencia de gasto.  
- Requiere librería OCR (ej. Tesseract.js) y manejo de fallos; esfuerzo alto.

### 4.3 Múltiples perfiles NO

- Varios “perfiles” en la misma instalación (ej. Personal / Compartido con pareja) con cambio rápido y datos separados en localStorage (o por usuario si hay backend).

### 4.4 Integración bancaria NO

- Si en el futuro hubiera APIs de bancos o agregadores: importación automática de movimientos y cruce con gastos manuales.  
- Depende de oferta de APIs y seguridad; solo como idea de evolución.

---

## 5. Checklist rápido por módulo

| Módulo | Mejora sugerida |
|--------|------------------|
| **Resumen** | Vista por período de cierre por tarjeta; comparar dos meses/años; exportar ya existe. |
| **Presupuestos** | Exportar a Excel; historial de cambios; metas de ahorro. |
| **Gastos** | Recordatorios post-compra; atajos de teclado; búsqueda con filtros. |
| **Dashboard** | Clarificar “mes actual”; enlace a “otro mes”. |
| **Cuotas** | Notificación el día del vencimiento. |
| **Calendario** | Eventos personalizados editables. |
| **Dólares** | Precio promedio vs actual; alerta de precio de venta. |
| **Reportes** | Exportar a Excel; gráficos en PDF. |
| **PWA** | Notificaciones push para recordatorios y vencimientos. |
| **Global** | Tests, validaciones, rendimiento en listas, accesibilidad, menos console.log. |

---

## 6. Orden sugerido para implementar (primeras 10)

1. **Atajo de teclado** para formulario rápido (rápido, alto impacto).  
2. **Notificaciones push** (recordatorio “registrá tu gasto” y/o vencimientos).  
3. **Exportar presupuestos a Excel**.  
4. **Tests unitarios** en ResumenService y CuotaService.  
5. **Paginación o virtual scroll** en listado de gastos.  
6. **Resumen por período de cierre** (opción por tarjeta).  
7. **Análisis de dólares** (precio promedio vs actual, alerta de venta).  
8. **Validaciones** en presupuestos y gastos.  
9. **Quitar/condicionar** `console.log` en producción.  
10. **Eventos personalizados** en calendario financiero.

---

*Documento vivo: conviene revisarlo cuando se implementen nuevas funcionalidades o cambien las prioridades del producto.*
