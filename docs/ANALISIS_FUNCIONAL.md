# Análisis Funcional - GestorTC

**Documento:** Análisis funcional completo  
**Proyecto:** Gestor de Tarjetas de Crédito (GestorTC)  
**Versión:** 1.0  
**Fecha:** Febrero 2025  

---

## 1. Resumen Ejecutivo

**GestorTC** es una aplicación web progresiva (PWA) desarrollada en **Angular** para la **gestión integral de finanzas personales** centrada en tarjetas de crédito. Permite registrar gastos, gestionar tarjetas, controlar cuotas, hacer seguimiento de préstamos, gestionar dólares, definir presupuestos, generar reportes y visualizar tendencias, con persistencia local (localStorage) y experiencia instalable/offline.

### 1.1 Visión del producto

- **Objetivo:** Que el usuario tenga en un solo lugar el control de sus tarjetas de crédito, gastos, cuotas, préstamos, dólares y presupuestos.
- **Público objetivo:** Usuarios que quieren ordenar sus finanzas personales sin depender de un backend en la nube.
- **Valor diferencial:** Registro rápido de gastos, alertas proactivas, calendario financiero, análisis de tendencias, reportes personalizados y exportación/importación.

### 1.2 Stack técnico (resumen)

| Área           | Tecnología / Detalle                          |
|----------------|------------------------------------------------|
| Frontend       | Angular 20, componentes standalone             |
| UI             | Angular Material, CSS variables, modo claro/oscuro |
| Persistencia   | localStorage (claves con prefijo `gestor_tc_`) |
| Gráficos       | Chart.js                                       |
| PWA            | @angular/pwa, Service Worker, manifest         |
| Build          | Angular CLI                                    |

---

## 2. Módulos Funcionales

A continuación se describen los módulos desde el punto de vista funcional (qué hace el usuario y qué hace el sistema).

---

### 2.1 Dashboard (Inicio)

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/dashboard` (página por defecto) |
| **Propósito** | Vista resumen del mes actual para tomar decisiones rápidas. |
| **Funcionalidades** | • Total gastado del mes y límite total disponible (por tarjetas). • Gráfico de barras: tarjetas con mayor uso (top 5). • Gráfico de pastel: gastos por categoría del mes. • Balance de dólares. • Resumen de préstamos activos. • Presupuestos cerca del límite. • Widget “Próximos vencimientos” (7 días): vencimientos de tarjetas, cuotas y préstamos con prioridad e iconos. • Navegación directa al calendario financiero. |
| **Reglas** | Todos los datos del dashboard corresponden al **mes actual**. |

---

### 2.2 Tarjetas de crédito

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/tarjetas` |
| **Propósito** | Alta, edición y baja de tarjetas; ver uso y límites. |
| **Funcionalidades** | • CRUD de tarjetas (nombre, banco, límite, últimos dígitos, fecha de cierre, fecha de vencimiento). • Visualización de uso por tarjeta (gastado vs límite). • Alertas cuando se acerca o supera el límite (80%, 90%, 100%). • Integración con gastos: cada gasto se asocia a una tarjeta. |
| **Entidades** | Tarjeta (id, nombre, banco, limite, ultimosDigitos, fechaCierre, fechaVencimiento, etc.). |

---

### 2.3 Gastos

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/gastos` |
| **Propósito** | Registrar, editar, eliminar y filtrar gastos de tarjetas. |
| **Funcionalidades** | • CRUD de gastos (fecha, descripción, monto, tarjeta, categoría, cuotas, compartido, etiquetas, notas). • **Filtros avanzados:** por tarjetas, categorías, rango de fechas, monto min/max, tipo (compartido/personal), cuotas, búsqueda por texto. • **Filtros guardados:** guardar/cargar/eliminar combinaciones de filtros con nombre. • **Plantillas de gastos rápidos:** botones con los 8 gastos más frecuentes (aprendizaje desde descripciones). • Listado con categorías, etiquetas y notas. • Asignación de categorías (9 predefinidas + personalizadas) y sugerencia automática por descripción. • Gastos compartidos: división entre varias personas (3–5) equitativa o por porcentajes; cálculo “quién debe a quién”. • Etiquetas personalizadas (colores) y notas por gasto. |
| **Registro rápido** | • **FAB (botón flotante):** desde cualquier página abre un formulario rápido (monto, descripción, tarjeta). • Autocompletado de descripciones frecuentes con monto promedio y categoría. • Última tarjeta usada por defecto. • Opción “Formulario completo” que lleva a la página de gastos. • **Preferencias de usuario:** última tarjeta, última categoría, top 20 descripciones frecuentes (localStorage). |

---

### 2.4 Resumen financiero

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/resumen` |
| **Propósito** | Ver totales por mes, por tarjeta y por categoría; exportar. |
| **Funcionalidades** | • Resumen por mes con selector de mes. • Desglose por tarjeta: total gastado, total a pagar (incluyendo cuotas). • Detalle de gastos por categoría. • Gastos compartidos y resumen general. • Exportación a Excel del resumen. |

---

### 2.5 Presupuestos

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/presupuestos` |
| **Propósito** | Definir y monitorear límites por categoría o por tarjeta. |
| **Funcionalidades** | • Crear presupuestos por categoría o por tarjeta, con monto mensual. • Seguimiento automático: gastado vs presupuesto. • Estados visuales: dentro / cerca / excedido (p. ej. 80%, 90%, 100%). • Selector de mes para ver históricos. • CRUD de presupuestos. |

---

### 2.6 Cuotas

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/cuotas` |
| **Propósito** | Ver y gestionar cuotas de gastos en cuotas (pendientes, pagadas, adelantadas). |
| **Funcionalidades** | • Cuotas generadas automáticamente a partir de gastos con cantidad de cuotas > 1. • **Cuotas virtuales:** gastos sin cuotas (una sola vez) se muestran como “cuota virtual” en el mes correspondiente. • Vista agrupada por tarjeta (expandir/colapsar). • Vista tabla con filtros: estado (todas, pendiente, pagada, adelantada), tarjeta, mes. • Resumen del mes: total pendiente, total pagado, cantidad de cuotas. • Marcar cuota como pagada o adelantada. • Marcar todas las cuotas de una tarjeta como pagadas. • **Calendario visual:** vista mensual con días con cuotas y montos. • Integración con alertas: avisos 7, 3 y 1 día antes del vencimiento (prioridad alta/media/baja). |

---

### 2.7 Gastos de servicios (recurrentes)

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/gastos-servicios` |
| **Propósito** | Gestionar gastos recurrentes (luz, gas, internet, suscripciones, etc.) sin depender de importación de PDF/Excel. |
| **Funcionalidades** | • **Series de gastos recurrentes:** nombre, descripción, monto, día de vencimiento, frecuencia (mensual, bimestral, trimestral, semestral, anual), tarjeta, categoría, proveedor (p. ej. EDENOR, EDESUR), fechas inicio/fin, activo/inactivo. • **Instancias:** generación automática para los próximos 12 meses; sin duplicados. • Marcar instancia como pagada; opción de crear gasto real al marcar. • Instancias pendientes visibles en el **calendario financiero** como eventos (tipo `VENCIMIENTO_SERVICIO`). • Listado de series e instancias; filtro por pendientes/todas. • Inclusión en backup/restauración. |

**Nota:** La funcionalidad de “Cargar servicios” desde archivo (CSV/Excel/PDF) fue cancelada; la alternativa es este sistema manual de recurrentes + la página de **Cargar Servicios** si existe como flujo alternativo (importación desde archivo con mapeo y vista previa).

---

### 2.8 Calendario financiero

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/calendario-financiero` |
| **Propósito** | Ver en un solo calendario todos los vencimientos relevantes. |
| **Funcionalidades** | • Eventos generados desde: tarjetas (vencimiento), cuotas pendientes, préstamos (pagos), gastos recurrentes (servicios). • Tipos de evento: vencimiento tarjeta, vencimiento cuota, pago préstamo, vencimiento servicio, evento personalizado. • Vista mensual con eventos por día; prioridades (alta, media, baja) según proximidad. • Widget en dashboard con próximos 7 días y enlace al calendario completo. |

---

### 2.9 Préstamos

| Aspecto     | Descripción |
|------------|--------------|
| **Rutas**  | `/prestamos`, `/prestamos/:id`, `/prestamos/:id/analisis` |
| **Propósito** | Registrar préstamos y ver detalle y análisis. |
| **Funcionalidades** | • Listado de préstamos. • Alta/edición: prestamista, monto, tasa, cuotas, fechas, notas. • Detalle de préstamo. • Vista de análisis (proyección, intereses, etc.). • Alertas de pagos pendientes. • Integración en calendario financiero. |

---

### 2.10 Gestión de dólares

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/gestion-dolares` |
| **Propósito** | Registrar compras/ventas de dólares y ver balance. |
| **Funcionalidades** | • Registro de compras y ventas de dólares (monto, cotización, fecha, etc.). • Balance actual en dólares. • Historial y posible gráfico temporal (según componentes como `grafico-dolar-temporal`). • Integración con resumen/dashboard (balance destacado). |

---

### 2.11 Gráficos

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/graficos` |
| **Propósito** | Visualizar gastos y distribución por categorías/tarjetas/tiempo. |
| **Funcionalidades** | • Gráficos de gastos por categoría, por tarjeta, evolución temporal (según implementación). • Uso de Chart.js. |

---

### 2.12 Análisis de tendencias

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/analisis-tendencias` |
| **Propósito** | Comparar gastos entre períodos y detectar patrones. |
| **Funcionalidades** | • Comparación mes a mes y año a año. • Detección de patrones y métricas de tendencia. • Gráficos por categoría y cambios significativos. |

---

### 2.13 Reportes

#### 2.13.1 Reportes WhatsApp

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/reportes-whatsapp` |
| **Propósito** | Generar reportes en formato apto para compartir (p. ej. por WhatsApp). |
| **Funcionalidades** | • Selección de mes/año. • Generación de PDF con datos del mes. • Opción de reporte de gastos compartidos. • Flujo orientado a “enviar por WhatsApp” (descarga de PDF). |

#### 2.13.2 Reportes personalizados

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/reportes-personalizados` |
| **Propósito** | Construir reportes a medida y exportar a PDF. |
| **Funcionalidades** | • **Constructor de reportes:** nombre, descripción, filtros avanzados (reutilizando el componente de filtros), columnas visibles (fecha, descripción, monto, tarjeta, categoría, etiquetas, nota, compartido, cuotas), agrupación (tarjeta, categoría, mes, etiqueta o ninguna), orden (fecha, monto, descripción, asc/desc). • Opciones: incluir resumen, gráficos, notas. • Generación dinámica según configuración; resumen (total, promedio, máximo, mínimo). • **Exportación a PDF** (p. ej. vía ventana de impresión/HTML). • Guardar/editar/eliminar configuraciones de reportes en localStorage. |

---

### 2.14 Herramientas auxiliares

#### 2.14.1 Simulador de compra

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/simulacion-compra` |
| **Propósito** | Simular una compra en cuotas y ver cuotas mensuales e intereses. |
| **Funcionalidades** | • Monto, cantidad de cuotas, tasa (si aplica). • Cálculo de cuota y total a pagar. |

#### 2.14.2 Calculadoras financieras

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/calculadoras-financieras` |
| **Propósito** | Herramientas de cálculo financiero independientes. |
| **Funcionalidades** | • Interés compuesto (capital, tasa, período, frecuencia). • Préstamos (monto, tasa, plazo → cuota mensual, total, intereses). • Ahorro (monto inicial, aporte mensual, tasa, plazo → valor futuro, intereses). • Conversión de monedas (ARS/USD con tasa configurable). • Tabs por calculadora; diseño responsive. |

---

### 2.15 Importar / Exportar

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/importar-exportar` |
| **Propósito** | Importar datos desde Excel y exportar resúmenes. |
| **Funcionalidades** | • Importación desde Excel (formato esperado: fecha, tarjeta, descripción, categoría, monto, persona, etc.). • Exportación de datos o resúmenes a Excel. • Validación e integridad de datos. |

---

### 2.16 Backup y restauración

| Aspecto     | Descripción |
|------------|--------------|
| **Ruta**   | `/backup-restauracion` |
| **Propósito** | Proteger datos con copias y restaurar en caso de pérdida. |
| **Funcionalidades** | • Backup manual y automático (configurable: diario, semanal, mensual). • Almacenamiento en localStorage con metadatos (fecha, resumen de entidades). • Exportación del backup a archivo JSON. • Restauración desde backup local o desde archivo JSON. • Inclusión de: tarjetas, gastos, préstamos, presupuestos, categorías, alertas vistas, dólares, cuotas, filtros guardados, etiquetas, notas, gastos recurrentes (series e instancias), configuraciones de reportes (según implementación). • Validación de integridad antes de restaurar; confirmación para evitar sobrescritura accidental. • Limpieza automática de backups antiguos (configurable). |

---

### 2.17 Alertas y notificaciones

| Aspecto     | Descripción |
|------------|--------------|
| **Ubicación** | Banner global (toolbar); por defecto colapsado. |
| **Propósito** | Avisar al usuario de eventos que requieren atención. |
| **Funcionalidades** | • Vencimiento de tarjetas (p. ej. 3 días antes). • Límite de crédito (80%, 90%, 100%). • Préstamos: recordatorios de pagos pendientes. • Cuotas próximas a vencer (7, 3, 1 día) con prioridad y detalle (cuota, descripción, monto). • Prioridades: alta, media, baja. • Persistencia de “alertas vistas” en localStorage. • Banner colapsable (icono + contador); al expandir se listan las alertas con navegación a la sección correspondiente. |

---

### 2.18 Búsqueda global

| Aspecto     | Descripción |
|------------|--------------|
| **Ubicación** | Toolbar (barra superior). |
| **Propósito** | Encontrar rápidamente gastos, tarjetas, préstamos o transacciones en dólares. |
| **Funcionalidades** | • Búsqueda unificada en: gastos (descripción), tarjetas (nombre/banco/últimos dígitos), préstamos (prestamista/notas), transacciones de dólares. • Búsqueda en tiempo real con debounce (p. ej. 300 ms). • Resultados agrupados por tipo con iconos; navegación al detalle. • En móvil puede estar oculta o adaptada. |

---

### 2.19 Tour guiado

| Aspecto     | Descripción |
|------------|--------------|
| **Ubicación** | Accesible desde el toolbar (o menú). |
| **Propósito** | Guiar a usuarios nuevos por las secciones principales. |
| **Funcionalidades** | • Pasos definidos (modelo `tour-step`); resaltado de elementos y textos explicativos. • Avanzar/cerrar; estado completado puede persistirse. |

---

### 2.20 Experiencia de usuario global

| Aspecto     | Descripción |
|------------|--------------|
| **Tema**   | Modo claro, oscuro y automático (según preferencia del sistema). Toggle en toolbar; persistencia en localStorage. |
| **Navegación** | Sidenav (menú lateral) con secciones: Principal (Dashboard, Tarjetas, Gastos, Resumen, Presupuestos), Gastos (Gastos de Servicios, Cuotas), Análisis (Gráficos, Análisis de Tendencias), Reportes (WhatsApp, Personalizados), Herramientas (Simulador, Calculadoras, Calendario), Gestión (Préstamos, Gestión Dólares, Importar/Exportar, Backup). Menú “Más” en toolbar para acceso rápido a opciones secundarias. |
| **PWA**    | Instalable; funciona offline; caché de assets; Service Worker; detección de actualizaciones y diálogo para recargar. |
| **Responsive** | Diseño adaptable a móvil, tablet y desktop. |

---

## 3. Flujos de usuario principales

1. **Registro rápido de un gasto:** Entrada desde FAB → formulario rápido (monto, descripción, tarjeta) → guardar → actualización de preferencias y listados.
2. **Control del mes:** Dashboard → ver total a pagar y próximos vencimientos → Cuotas para marcar pagos → Calendario para planificar.
3. **Análisis:** Gastos con filtros → Resumen por mes → Gráficos / Análisis de tendencias → Reportes personalizados o WhatsApp.
4. **Protección de datos:** Backup y restauración → exportar JSON periódicamente; en caso de cambio de dispositivo, importar JSON.
5. **Servicios recurrentes:** Gastos de Servicios → crear serie → instancias generadas → marcar pagadas o crear gasto real; visualización en Calendario.

---

## 4. Modelos de datos (resumen)

| Modelo / Entidad      | Uso principal |
|----------------------|----------------|
| Tarjeta              | Tarjetas de crédito y asociación de gastos. |
| Gasto                | Transacciones; cuotas, categoría, etiquetas, notas, compartido, serie recurrente. |
| Categoría            | Clasificación de gastos (predefinidas + personalizadas). |
| Presupuesto          | Límite por categoría o tarjeta por mes. |
| Cuota                | Cuota individual de un gasto en cuotas (estado, vencimiento). |
| Préstamo             | Préstamos personales con cuotas y análisis. |
| Compra/Venta Dólar   | Movimientos de dólares para balance. |
| Gasto recurrente     | Serie + instancias para servicios. |
| Evento financiero   | Eventos del calendario (tarjeta, cuota, préstamo, servicio). |
| Alerta               | Alertas mostradas en el banner. |
| Filtro guardado      | Configuraciones de filtros avanzados guardadas. |
| Etiqueta / Nota      | Etiquetas y notas asociadas a gastos. |
| Backup (metadatos)   | Fecha, resumen de cantidades por entidad. |
| Reporte (config.)    | Configuración de reportes personalizados. |
| Preferencias usuario | Última tarjeta, descripciones frecuentes. |

La persistencia se realiza en **localStorage** con claves con prefijo `gestor_tc_`.

---

## 5. Servicios (lógica de negocio)

| Servicio                         | Responsabilidad principal |
|----------------------------------|---------------------------|
| TarjetaService                   | CRUD tarjetas. |
| GastoService                    | CRUD gastos; relación con tarjetas y categorías. |
| CategoriaService                 | Categorías predefinidas y personalizadas. |
| ResumenService                   | Totales por mes, por tarjeta, total a pagar (cuotas). |
| PresupuestoService               | CRUD presupuestos; cálculo gastado vs límite. |
| CuotaService                     | Generación y estado de cuotas desde gastos. |
| AlertService                     | Cálculo de alertas (tarjetas, cuotas, préstamos). |
| DashboardService                 | Datos del dashboard (mes actual, eventos próximos). |
| CalendarioFinancieroService      | Construcción de eventos desde tarjetas, cuotas, préstamos, servicios. |
| GastosRecurrentesService         | Series e instancias de gastos de servicios. |
| GastosCompartidosService         | División y cálculo “quién debe a quién”. |
| BackupService                    | Crear/restaurar backup; incluir todas las entidades. |
| SearchService                    | Búsqueda global unificada. |
| TendenciaService                 | Análisis de tendencias y comparaciones. |
| ReporteService                   | Generación de reportes personalizados. |
| PreferenciasUsuarioService       | Última tarjeta, descripciones frecuentes. |
| ThemeService                     | Tema claro/oscuro/automático. |
| PwaUpdateService                 | Detección de actualizaciones y recarga. |
| Importar/Exportar, Dólar, etc.   | Importación Excel, compra/venta dólares, etc. |

---

## 6. Conclusiones

- **Alcance:** GestorTC cubre el ciclo completo: registro de gastos (rápido y completo), tarjetas, cuotas, préstamos, dólares, presupuestos, calendario de vencimientos, análisis (gráficos, tendencias), reportes (WhatsApp y personalizados), backup y experiencia PWA con tema y búsqueda global.
- **Enfoque funcional:** Orientado a autogestión de finanzas personales con datos en el dispositivo, sin obligación de backend; ideal para uso individual o familiar con gastos compartidos.
- **Puntos fuertes:** Registro rápido (FAB + plantillas + preferencias), alertas proactivas, calendario unificado, filtros avanzados y guardados, reportes configurables y backup completo.
- **Limitaciones:** Persistencia solo local (localStorage); no hay sincronización multi-dispositivo ni autenticación; la “carga de servicios” desde PDF/Excel fue sustituida por el sistema manual de gastos recurrentes.

Este documento sirve como referencia funcional para análisis de producto, onboarding de analistas o definición de requisitos en futuras iteraciones.
