# Feature: Carga de Gastos de Servicios desde Archivo

## ⚠️ NOTA IMPORTANTE - CAMBIO DE IMPLEMENTACIÓN

**Estado Actual:** ❌ **CANCELADA** - La funcionalidad de importación de archivos (CSV, Excel, JSON, PDF) fue cancelada debido a complejidades técnicas con la lectura de PDFs y variabilidad en los formatos.

**Implementación Alternativa:** ✅ **COMPLETADA** - Se implementó en su lugar un **Sistema Manual de Gastos Recurrentes** que permite:
- Crear series de gastos recurrentes manualmente
- Configurar frecuencia (mensual, bimestral, trimestral, semestral, anual)
- Generar instancias automáticamente para los próximos meses
- Marcar instancias como pagadas
- Integración con el calendario financiero
- Agrupación por mes para mejor visualización

Ver sección "Sistema de Gastos Recurrentes" en `context.md` para detalles de la implementación actual.

---

## 📋 Resumen Ejecutivo (Original)

Esta feature permitiría a los usuarios importar gastos de servicios (facturas de servicios públicos, suscripciones, servicios recurrentes) desde archivos en diferentes formatos (CSV, Excel, JSON, PDF), automatizando el proceso de registro y categorización de estos gastos recurrentes.

**Versión:** 1.0.0  
**Fecha de Creación:** 2025-01-27  
**Fecha de Cancelación:** 2025-01-27  
**Estado:** ❌ Cancelada - Reemplazada por Sistema Manual de Gastos Recurrentes  
**Prioridad:** Media-Alta

---

## 🎯 Objetivos

1. **Automatizar la carga de gastos recurrentes** de servicios públicos y suscripciones
2. **Reducir el tiempo de registro manual** de gastos mensuales
3. **Mejorar la precisión** en la categorización automática de servicios
4. **Soportar múltiples formatos** de archivo para flexibilidad (CSV, Excel, JSON, **PDF**)
5. **Extraer datos de facturas PDF** automáticamente usando OCR y parsing
6. **Validar y prevenir duplicados** antes de importar
7. **Proporcionar vista previa** antes de confirmar la importación

---

## 👥 Casos de Uso

### CU-1: Importar Facturas de Servicios Públicos
**Actor:** Usuario  
**Precondiciones:** Usuario tiene acceso a la aplicación y archivo de facturas  
**Flujo Principal:**
1. Usuario navega a la sección "Cargar Servicios"
2. Usuario selecciona archivo con facturas (CSV/Excel/JSON)
3. Sistema valida formato y estructura del archivo
4. Sistema muestra vista previa de gastos a importar
5. Usuario revisa y ajusta mapeo de categorías si es necesario
6. Usuario confirma importación
7. Sistema importa gastos y muestra resumen

**Flujo Alternativo:**
- Si el archivo tiene errores, sistema muestra errores específicos
- Si hay duplicados, sistema ofrece opción de actualizar o saltar

### CU-2: Importar Suscripciones Recurrentes
**Actor:** Usuario  
**Precondiciones:** Usuario tiene lista de suscripciones en archivo  
**Flujo Principal:**
1. Usuario carga archivo con suscripciones mensuales
2. Sistema detecta patrones recurrentes
3. Sistema sugiere crear gastos recurrentes automáticos
4. Usuario confirma creación de gastos recurrentes
5. Sistema programa gastos para meses futuros

### CU-3: Importar Factura PDF
**Actor:** Usuario  
**Precondiciones:** Usuario tiene factura PDF de servicio  
**Flujo Principal:**
1. Usuario selecciona archivo PDF de factura
2. Sistema extrae texto del PDF usando OCR/parsing
3. Sistema identifica campos clave (fecha, monto, descripción, proveedor)
4. Sistema muestra vista previa con datos extraídos
5. Usuario verifica y corrige datos si es necesario
6. Usuario confirma importación
7. Sistema crea gasto con datos de la factura

**Flujo Alternativo:**
- Si el PDF es escaneado (imagen), sistema usa OCR para extraer texto
- Si el PDF tiene estructura, sistema parsea campos directamente
- Si la extracción falla, usuario puede ingresar datos manualmente

### CU-4: Importar Múltiples Facturas PDF
**Actor:** Usuario  
**Precondiciones:** Usuario tiene carpeta con múltiples PDFs de facturas  
**Flujo Principal:**
1. Usuario selecciona múltiples archivos PDF
2. Sistema procesa cada PDF individualmente
3. Sistema extrae datos de cada factura
4. Sistema muestra vista previa con todas las facturas
5. Usuario revisa y ajusta datos
6. Usuario confirma importación masiva
7. Sistema crea un gasto por cada factura procesada

### CU-5: Validar y Corregir Datos Antes de Importar
**Actor:** Usuario  
**Precondiciones:** Archivo cargado con errores o datos incompletos  
**Flujo Principal:**
1. Sistema detecta errores en el archivo
2. Sistema muestra lista de errores con filas afectadas
3. Usuario corrige errores en el archivo o en la interfaz
4. Sistema revalida datos
5. Usuario confirma importación

---

## 📊 Requisitos Funcionales

### RF-1: Soporte de Formatos de Archivo
- **RF-1.1:** Debe soportar archivos CSV con encoding UTF-8
- **RF-1.2:** Debe soportar archivos Excel (.xlsx, .xls)
- **RF-1.3:** Debe soportar archivos JSON estructurados
- **RF-1.4:** Debe soportar archivos PDF (.pdf) con texto extraíble
- **RF-1.5:** Debe soportar archivos PDF escaneados usando OCR
- **RF-1.6:** Debe soportar múltiples PDFs en una sola importación
- **RF-1.7:** Debe validar que el archivo no exceda 10MB (PDFs hasta 20MB)
- **RF-1.8:** Debe detectar automáticamente el formato del archivo

### RF-2: Estructura de Datos Esperada
- **RF-2.1:** Debe aceptar columnas mínimas: fecha, descripción, monto
- **RF-2.2:** Debe aceptar columnas opcionales: categoría, tarjeta, notas
- **RF-2.3:** Debe mapear automáticamente columnas por nombre o posición
- **RF-2.4:** Debe permitir configuración personalizada de mapeo

### RF-3: Categorización Automática
- **RF-3.1:** Debe detectar automáticamente el tipo de servicio por descripción
- **RF-3.2:** Debe mapear servicios comunes a categorías predefinidas:
  - Luz → Servicios
  - Gas → Servicios
  - Agua → Servicios
  - Internet → Servicios
  - Teléfono → Servicios
  - Netflix → Entretenimiento
  - Spotify → Entretenimiento
  - Amazon Prime → Entretenimiento
  - Gym → Salud
- **RF-3.3:** Debe permitir corrección manual de categorías antes de importar
- **RF-3.4:** Debe aprender de correcciones manuales para futuras importaciones

### RF-4: Validación de Datos
- **RF-4.1:** Debe validar que las fechas estén en formato válido (YYYY-MM-DD, DD/MM/YYYY)
- **RF-4.2:** Debe validar que los montos sean números positivos
- **RF-4.3:** Debe validar que las descripciones no estén vacías
- **RF-4.4:** Debe validar que las tarjetas existan en el sistema
- **RF-4.5:** Debe validar que las categorías existan o sugerir crear nuevas
- **RF-4.6:** Debe detectar duplicados (mismo monto, fecha y descripción)

### RF-5: Extracción de PDF
- **RF-5.1:** Debe extraer texto de PDFs con texto nativo
- **RF-5.2:** Debe usar OCR para PDFs escaneados (imágenes)
- **RF-5.3:** Debe identificar campos clave en facturas (fecha, monto, descripción, proveedor)
- **RF-5.4:** Debe reconocer formatos comunes de facturas (EDENOR, EDESUR, Metrogas, etc.)
- **RF-5.5:** Debe mostrar confianza de extracción (porcentaje de certeza)
- **RF-5.6:** Debe permitir corrección manual de datos extraídos
- **RF-5.7:** Debe aprender de correcciones para mejorar extracción futura
- **RF-5.8:** Debe procesar múltiples páginas en un mismo PDF
- **RF-5.9:** Debe manejar PDFs con múltiples facturas (separar automáticamente)

### RF-6: Vista Previa
- **RF-6.1:** Debe mostrar tabla con todos los gastos a importar
- **RF-6.2:** Debe mostrar resumen estadístico (total, cantidad, promedio)
- **RF-6.3:** Debe resaltar filas con errores o advertencias
- **RF-6.4:** Debe permitir editar datos individuales antes de importar
- **RF-6.5:** Debe permitir excluir filas específicas de la importación
- **RF-6.6:** Debe mostrar distribución por categorías
- **RF-6.7:** Debe mostrar vista previa del PDF original (para PDFs)
- **RF-6.8:** Debe mostrar nivel de confianza de extracción (para PDFs)

### RF-7: Procesamiento de Importación
- **RF-7.1:** Debe crear gastos con IDs únicos (UUID)
- **RF-7.2:** Debe asignar tarjeta por defecto si no se especifica
- **RF-7.3:** Debe manejar duplicados según preferencia del usuario (actualizar/saltar)
- **RF-7.4:** Debe mostrar progreso durante la importación
- **RF-7.5:** Debe generar reporte de importación (éxitos, errores, advertencias)
- **RF-7.6:** Debe permitir deshacer importación (últimas 24 horas)
- **RF-7.7:** Debe guardar PDF original asociado al gasto (opcional)

### RF-8: Plantillas y Configuraciones
- **RF-8.1:** Debe proporcionar plantillas descargables (CSV, Excel)
- **RF-8.2:** Debe permitir guardar configuraciones de mapeo personalizadas
- **RF-8.3:** Debe permitir cargar configuraciones guardadas
- **RF-8.4:** Debe soportar múltiples proveedores de servicios (EDENOR, EDESUR, etc.)
- **RF-8.5:** Debe permitir configurar plantillas de extracción para cada proveedor
- **RF-8.6:** Debe aprender patrones de extracción de PDFs por proveedor

---

## 🔧 Requisitos Técnicos

### RT-1: Arquitectura
- **RT-1.1:** Debe seguir la arquitectura existente (componentes standalone)
- **RT-1.2:** Debe usar servicios inyectables para lógica de negocio
- **RT-1.3:** Debe usar RxJS para manejo de datos asíncronos
- **RT-1.4:** Debe integrarse con GastoService existente

### RT-2: Librerías y Dependencias
- **RT-2.1:** Usar `xlsx` (ya instalado) para procesar Excel
- **RT-2.2:** Usar `papaparse` o parser CSV nativo para CSV
- **RT-2.3:** Usar `uuid` (ya instalado) para generar IDs
- **RT-2.4:** Usar Angular Material para UI
- **RT-2.5:** Usar `pdf.js` o `pdfjs-dist` para extraer texto de PDFs
- **RT-2.6:** Usar `tesseract.js` o API de OCR para PDFs escaneados
- **RT-2.7:** Usar `pdf-parse` como alternativa para parsing de PDFs
- **RT-2.8:** Considerar `pdf-lib` para manipulación avanzada de PDFs

### RT-3: Rendimiento
- **RT-3.1:** Debe procesar archivos de hasta 1000 filas en < 2 segundos
- **RT-3.2:** Debe usar Web Workers para archivos grandes (> 500 filas)
- **RT-3.3:** Debe implementar paginación en vista previa para > 100 filas
- **RT-3.4:** Debe optimizar memoria durante procesamiento de archivos grandes
- **RT-3.5:** Debe procesar PDFs simples (texto nativo) en < 3 segundos
- **RT-3.6:** Debe procesar PDFs escaneados (OCR) en < 10 segundos por página
- **RT-3.7:** Debe usar Web Workers para procesamiento de OCR (no bloquear UI)
- **RT-3.8:** Debe mostrar progreso durante procesamiento de PDFs
- **RT-3.9:** Debe cachear resultados de OCR para evitar reprocesamiento

### RT-4: Persistencia
- **RT-4.1:** Debe guardar configuraciones de mapeo en localStorage
- **RT-4.2:** Debe guardar historial de importaciones (últimas 10)
- **RT-4.3:** Debe integrarse con sistema de backup existente

### RT-5: Validaciones y Errores
- **RT-5.1:** Debe manejar errores de lectura de archivo gracefully
- **RT-5.2:** Debe validar estructura antes de procesar
- **RT-5.3:** Debe proporcionar mensajes de error descriptivos
- **RT-5.4:** Debe loguear errores para debugging

---

## 🎨 Diseño de Interfaz de Usuario

### Pantalla Principal: Cargar Servicios

```
┌─────────────────────────────────────────────────────────┐
│  📄 Cargar Gastos de Servicios                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Arrastra y suelta tu archivo aquí              │  │
│  │  o haz clic para seleccionar                     │  │
│  │                                                  │  │
│  │  Formatos soportados:                           │  │
│  │  CSV, Excel (.xlsx), JSON, PDF                  │  │
│  │  Tamaño máximo: 10MB (PDFs: 20MB)              │  │
│  │                                                  │  │
│  │  📄 Puedes seleccionar múltiples PDFs           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  📋 Plantillas disponibles:                           │
│  [Descargar CSV] [Descargar Excel]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Pantalla de Vista Previa

```
┌─────────────────────────────────────────────────────────┐
│  📊 Vista Previa de Importación                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Resumen:                                               │
│  • Total de gastos: 25                                  │
│  • Monto total: $45,230                                │
│  • Período: Enero 2025                                 │
│  • Categorías: Servicios (15), Entretenimiento (10)    │
│                                                         │
│  ⚠️ Advertencias: 2                                    │
│  ❌ Errores: 0                                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Tabla de gastos (con paginación)                │  │
│  │  [Editar] [Excluir] [Ver PDF] por fila           │  │
│  │                                                  │  │
│  │  Para PDFs:                                      │  │
│  │  • Confianza de extracción: 95% ✓               │  │
│  │  • Vista previa del PDF disponible              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [← Volver]  [Configurar Mapeo]  [Importar]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Pantalla de Configuración de Mapeo

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ Configurar Mapeo de Columnas                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Columna del archivo → Campo del sistema                │
│                                                         │
│  Fecha:        [Fecha] ▼                                │
│  Descripción:  [Descripción] ▼                         │
│  Monto:        [Monto] ▼                                │
│  Categoría:    [Categoría] ▼ (opcional)                 │
│  Tarjeta:      [Tarjeta] ▼ (opcional)                   │
│                                                         │
│  ⚙️ Opciones avanzadas:                                 │
│  ☑ Detectar automáticamente categorías                 │
│  ☑ Asignar tarjeta por defecto: [Visa] ▼               │
│  ☐ Crear categorías nuevas si no existen                │
│                                                         │
│  [Guardar Configuración]  [Cancelar]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📐 Estructura de Datos

### Modelo: GastoServicio (Temporal, para importación)

```typescript
interface GastoServicioImportado {
  // Datos del archivo
  fecha: string;              // YYYY-MM-DD o DD/MM/YYYY
  descripcion: string;
  monto: number;
  categoria?: string;         // Nombre de categoría
  tarjeta?: string;           // Nombre de tarjeta
  notas?: string;
  
  // Metadatos de importación
  filaOriginal: number;       // Número de fila en archivo
  errores?: string[];         // Errores de validación
  advertencias?: string[];    // Advertencias
  categoriaId?: string;       // ID de categoría mapeada
  tarjetaId?: string;         // ID de tarjeta mapeada
  excluir?: boolean;          // Si se excluye de importación
  
  // Metadatos específicos de PDF
  esPDF?: boolean;            // Si proviene de PDF
  archivoPDF?: File;          // Archivo PDF original
  paginaPDF?: number;         // Página del PDF (si aplica)
  confianzaExtraccion?: number; // Porcentaje de confianza (0-100)
  textoExtraido?: string;     // Texto completo extraído del PDF
  proveedorDetectado?: string; // Proveedor detectado (EDENOR, etc.)
  camposExtraidos?: {         // Campos específicos extraídos
    fechaVencimiento?: string;
    numeroFactura?: string;
    periodoFacturado?: string;
    consumo?: string;
  };
}
```

### Modelo: ConfiguracionMapeo

```typescript
interface ConfiguracionMapeo {
  id: string;
  nombre: string;
  fechaCreacion: string;
  
  // Mapeo de columnas
  mapeoColumnas: {
    fecha: string;            // Nombre de columna en archivo
    descripcion: string;
    monto: string;
    categoria?: string;
    tarjeta?: string;
    notas?: string;
  };
  
  // Opciones
  tarjetaPorDefecto?: string; // ID de tarjeta
  detectarCategorias: boolean;
  crearCategoriasNuevas: boolean;
  
  // Reglas de categorización
  reglasCategorizacion: ReglaCategorizacion[];
}

interface ReglaCategorizacion {
  patron: string;             // Regex o texto a buscar
  categoriaId: string;        // ID de categoría a asignar
  prioridad: number;          // Prioridad (mayor = primero)
}
```

### Modelo: ResultadoImportacion

```typescript
interface ResultadoImportacion {
  id: string;
  fechaImportacion: string;
  archivo: string;
  totalFilas: number;
  exitosos: number;
  errores: number;
  advertencias: number;
  montoTotal: number;
  gastosCreados: string[];   // IDs de gastos creados
  erroresDetalle: ErrorImportacion[];
}

interface ErrorImportacion {
  fila: number;
  descripcion: string;
  error: string;
  datos: Partial<GastoServicioImportado>;
}
```

---

## 🔄 Flujo de Trabajo

### Flujo Principal

```
1. Usuario selecciona archivo
   ↓
2. Sistema detecta formato y valida tamaño
   ↓
3. Sistema lee y parsea archivo
   ↓
4. Sistema aplica mapeo de columnas (configuración guardada o automática)
   ↓
5. Sistema valida cada fila
   ↓
6. Sistema categoriza automáticamente
   ↓
7. Sistema detecta duplicados
   ↓
8. Sistema muestra vista previa con resumen
   ↓
9. Usuario revisa y ajusta si es necesario
   ↓
10. Usuario confirma importación
   ↓
11. Sistema crea gastos en GastoService
   ↓
12. Sistema genera reporte de importación
   ↓
13. Sistema guarda historial de importación
```

### Flujo de Validación

```
Para cada fila del archivo:
  ├─ Validar fecha (formato y rango)
  ├─ Validar monto (número positivo)
  ├─ Validar descripción (no vacía)
  ├─ Validar tarjeta (existe o usar por defecto)
  ├─ Validar categoría (existe o crear nueva)
  └─ Detectar duplicados (mismo monto, fecha, descripción)
```

### Flujo de Categorización

```
Para cada descripción:
  ├─ Aplicar reglas de categorización (ordenadas por prioridad)
  ├─ Buscar palabras clave en descripción
  │  ├─ "luz", "electricidad", "edenor", "edesur" → Servicios
  │  ├─ "gas", "metrogas", "camuzzi" → Servicios
  │  ├─ "agua", "aysa" → Servicios
  │  ├─ "internet", "fibertel", "movistar" → Servicios
  │  ├─ "netflix", "spotify", "disney" → Entretenimiento
  │  └─ etc.
  └─ Si no coincide, usar categoría "Otros" o sugerir al usuario
```

---

## 🛠️ Implementación Técnica

### Estructura de Archivos

```
src/app/
├── models/
│   ├── gasto-servicio-importado.model.ts
│   ├── configuracion-mapeo.model.ts
│   └── resultado-importacion.model.ts
├── services/
│   ├── carga-servicios.service.ts
│   └── categorizacion-servicios.service.ts
├── pages/
│   └── cargar-servicios/
│       ├── cargar-servicios.component.ts
│       ├── cargar-servicios.component.html
│       └── cargar-servicios.component.css
└── components/
    ├── vista-previa-importacion/
    │   ├── vista-previa-importacion.component.ts
    │   ├── vista-previa-importacion.component.html
    │   └── vista-previa-importacion.component.css
    └── configuracion-mapeo/
        ├── configuracion-mapeo.component.ts
        ├── configuracion-mapeo.component.html
        └── configuracion-mapeo.component.css
```

### Servicio: CargaServiciosService

```typescript
@Injectable({ providedIn: 'root' })
export class CargaServiciosService {
  // Leer archivo y parsear según formato
  parsearArchivo(file: File): Observable<GastoServicioImportado[]>
  
  // Procesar PDF (texto nativo o OCR)
  procesarPDF(file: File): Observable<GastoServicioImportado[]>
  
  // Extraer texto de PDF
  extraerTextoPDF(file: File): Observable<string>
  
  // Aplicar OCR a PDF escaneado
  aplicarOCR(file: File): Observable<string>
  
  // Identificar campos en texto extraído
  identificarCampos(texto: string, proveedor?: string): Partial<GastoServicioImportado>
  
  // Detectar proveedor de servicio
  detectarProveedor(texto: string): string | undefined
  
  // Validar estructura de datos
  validarDatos(datos: GastoServicioImportado[]): ValidationResult
  
  // Aplicar mapeo de columnas
  aplicarMapeo(datos: any[], config: ConfiguracionMapeo): GastoServicioImportado[]
  
  // Detectar duplicados
  detectarDuplicados(datos: GastoServicioImportado[]): Duplicado[]
  
  // Importar gastos
  importarGastos(datos: GastoServicioImportado[]): Observable<ResultadoImportacion>
  
  // Guardar configuración
  guardarConfiguracion(config: ConfiguracionMapeo): void
  
  // Cargar configuración
  cargarConfiguracion(id: string): ConfiguracionMapeo | undefined
  
  // Guardar plantilla de extracción para proveedor
  guardarPlantillaProveedor(proveedor: string, plantilla: PlantillaExtraccion): void
}
```

### Servicio: CategorizacionServiciosService

```typescript
@Injectable({ providedIn: 'root' })
export class CategorizacionServiciosService {
  // Categorizar descripción
  categorizar(descripcion: string, reglas: ReglaCategorizacion[]): string | undefined
  
  // Obtener reglas predefinidas
  getReglasPredefinidas(): ReglaCategorizacion[]
  
  // Aprender de corrección manual
  agregarRegla(patron: string, categoriaId: string): void
}
```

---

## ✅ Criterios de Aceptación

### CA-1: Importación Básica
- [ ] Usuario puede cargar archivo CSV con gastos de servicios
- [ ] Sistema detecta automáticamente columnas (fecha, descripción, monto)
- [ ] Sistema muestra vista previa con todos los gastos
- [ ] Usuario puede importar gastos con un clic
- [ ] Gastos aparecen en la lista de gastos después de importar

### CA-2: Validación
- [ ] Sistema valida formato de fechas y muestra error si es inválido
- [ ] Sistema valida que montos sean números positivos
- [ ] Sistema detecta duplicados y ofrece opciones (actualizar/saltar)
- [ ] Sistema muestra lista de errores con filas afectadas

### CA-3: Categorización
- [ ] Sistema categoriza automáticamente servicios comunes
- [ ] Usuario puede corregir categorías antes de importar
- [ ] Sistema aprende de correcciones manuales

### CA-4: Múltiples Formatos
- [ ] Sistema soporta CSV con diferentes separadores (coma, punto y coma)
- [ ] Sistema soporta Excel (.xlsx, .xls)
- [ ] Sistema soporta JSON estructurado

### CA-5: Configuración
- [ ] Usuario puede guardar configuración de mapeo
- [ ] Usuario puede cargar configuración guardada
- [ ] Sistema recuerda última configuración usada

---

## 🧪 Casos de Prueba

### CP-1: Importar CSV Simple
**Datos de entrada:**
```csv
Fecha,Descripción,Monto
2025-01-15,Luz EDENOR,5230
2025-01-20,Gas Metrogas,4500
```

**Resultado esperado:**
- 2 gastos creados
- Ambos categorizados como "Servicios"
- Fechas correctas
- Montos correctos

### CP-2: Detectar Duplicados
**Datos de entrada:**
```csv
Fecha,Descripción,Monto
2025-01-15,Luz EDENOR,5230
2025-01-15,Luz EDENOR,5230
```

**Resultado esperado:**
- Sistema detecta duplicado
- Muestra opción de actualizar o saltar
- Solo se importa un gasto

### CP-3: Validar Errores
**Datos de entrada:**
```csv
Fecha,Descripción,Monto
2025-13-45,Invalid Date,abc
```

**Resultado esperado:**
- Sistema muestra error en fila 2
- Error específico: "Fecha inválida"
- Error específico: "Monto debe ser un número"
- Fila no se importa

### CP-4: Categorización Automática
**Datos de entrada:**
```csv
Fecha,Descripción,Monto
2025-01-15,Netflix Subscription,1200
2025-01-20,Spotify Premium,600
```

**Resultado esperado:**
- Ambos categorizados como "Entretenimiento"
- Categorización correcta sin intervención manual

### CP-5: Importar PDF con Texto Nativo
**Datos de entrada:**
- Archivo PDF de factura EDENOR con texto seleccionable

**Resultado esperado:**
- Sistema extrae texto del PDF
- Identifica: fecha, monto, descripción, proveedor
- Muestra vista previa con datos extraídos
- Confianza de extracción > 90%
- Usuario puede confirmar importación

### CP-6: Importar PDF Escaneado (OCR)
**Datos de entrada:**
- Archivo PDF escaneado (imagen) de factura

**Resultado esperado:**
- Sistema detecta que es PDF escaneado
- Aplica OCR para extraer texto
- Identifica campos principales
- Muestra confianza de extracción (puede ser menor)
- Usuario puede corregir datos antes de importar

### CP-7: Múltiples PDFs
**Datos de entrada:**
- 5 archivos PDF de diferentes facturas

**Resultado esperado:**
- Sistema procesa cada PDF
- Muestra vista previa con todos los gastos
- Un gasto por cada PDF procesado
- Usuario puede revisar y ajustar cada uno
- Importación masiva exitosa

---

## 📝 Notas de Implementación

### Consideraciones
1. **Encoding de archivos:** Asegurar soporte para UTF-8 y Latin-1
2. **Fechas:** Manejar múltiples formatos (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
3. **Separadores decimales:** Manejar tanto punto como coma (1.234,56 vs 1,234.56)
4. **Memoria:** Para archivos grandes, procesar en chunks
5. **UX:** Mostrar progreso durante procesamiento de archivos grandes
6. **PDFs con texto nativo:** Usar pdf.js para extracción directa (más rápido)
7. **PDFs escaneados:** Usar Tesseract.js o API de OCR (más lento pero necesario)
8. **Patrones de facturas:** Crear plantillas por proveedor para mejor extracción
9. **Confianza de extracción:** Mostrar nivel de certeza al usuario para validación
10. **Múltiples páginas:** Procesar cada página por separado y combinar resultados
11. **Almacenamiento de PDFs:** Considerar guardar PDF original asociado al gasto (opcional)
12. **Rendimiento OCR:** Usar Web Workers para no bloquear UI durante procesamiento

### Mejoras Futuras
1. **API de servicios:** Integración con APIs de proveedores (EDENOR, etc.)
2. **OCR mejorado:** Usar servicios de OCR en la nube para mayor precisión
3. **Programación automática:** Crear gastos recurrentes automáticamente
4. **Notificaciones:** Alertar cuando llegan nuevas facturas
5. **Análisis:** Detectar patrones y anomalías en gastos de servicios
6. **Aprendizaje automático:** Entrenar modelo para reconocer nuevos formatos
7. **Extracción de imágenes:** Extraer logos y códigos de barras de facturas
8. **Validación cruzada:** Comparar datos extraídos con datos históricos
9. **Soporte multi-idioma:** Reconocer facturas en diferentes idiomas
10. **Integración con email:** Importar facturas directamente desde correo electrónico

---

## 📚 Referencias

- [Documentación de xlsx](https://sheetjs.com/)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)
- [Angular File Upload](https://angular.io/guide/file-upload)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- Modelo de Gasto existente: `src/app/models/gasto.model.ts`
- Servicio de Gasto existente: `src/app/services/gasto.ts`

---

## 🎯 Priorización

### Fase 1 (MVP)
- ✅ Soporte CSV básico
- ✅ Validación básica
- ✅ Vista previa simple
- ✅ Importación básica

### Fase 2
- ⏳ Soporte Excel
- ⏳ Categorización automática
- ⏳ Detección de duplicados
- ⏳ Configuración de mapeo
- ⏳ **Soporte PDF básico (texto nativo)**

### Fase 3
- ⏳ Soporte JSON
- ⏳ Plantillas descargables
- ⏳ Historial de importaciones
- ⏳ Aprendizaje de categorización
- ⏳ **Soporte PDF escaneado (OCR)**
- ⏳ **Extracción inteligente de campos**
- ⏳ **Múltiples PDFs en batch**

### Fase 4 (Avanzado)
- ⏳ **Plantillas por proveedor**
- ⏳ **Aprendizaje automático de patrones**
- ⏳ **Almacenamiento de PDFs originales**
- ⏳ **Validación cruzada con datos históricos**

---

---

## 📦 Dependencias Adicionales para PDF

### Librerías Requeridas

```json
{
  "dependencies": {
    "pdfjs-dist": "^3.11.174",
    "tesseract.js": "^5.0.4",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/pdf-parse": "^1.1.4"
  }
}
```

### Instalación

```bash
npm install pdfjs-dist tesseract.js pdf-parse
npm install --save-dev @types/pdf-parse
```

### Configuración de pdfjs-dist

En `angular.json`, agregar configuración para worker:

```json
{
  "assets": [
    {
      "glob": "**/*",
      "input": "node_modules/pdfjs-dist/build",
      "output": "/assets/pdfjs"
    }
  ]
}
```

### Uso de Web Workers para OCR

```typescript
// worker-ocr.ts
import Tesseract from 'tesseract.js';

self.onmessage = async (e) => {
  const { imageData, options } = e.data;
  const { data: { text } } = await Tesseract.recognize(imageData, 'spa', options);
  self.postMessage({ text });
};
```

---

## 🔍 Algoritmo de Extracción de PDF

### Paso 1: Detectar Tipo de PDF
```
Si PDF tiene texto nativo:
  → Usar pdf.js para extracción directa
Si PDF es imagen escaneada:
  → Usar OCR (Tesseract.js)
```

### Paso 2: Extraer Texto
```
Para cada página del PDF:
  - Extraer texto completo
  - Identificar estructura (tablas, párrafos)
  - Detectar formato de factura
```

### Paso 3: Identificar Campos
```
Usar expresiones regulares y patrones:
  - Fecha: /\d{2}\/\d{2}\/\d{4}/ o /\d{4}-\d{2}-\d{2}/
  - Monto: /\$\s*\d+[.,]\d{2}/ o /Total.*?(\d+[.,]\d{2})/
  - Proveedor: Buscar nombres conocidos (EDENOR, EDESUR, etc.)
  - Número de factura: /Factura.*?(\d+)/ o /N°.*?(\d+)/
  - Período: /Período.*?(\d{2}\/\d{4})/
```

### Paso 4: Validar y Calcular Confianza
```
Para cada campo extraído:
  - Validar formato
  - Calcular confianza basada en:
    * Precisión del patrón regex
    * Posición en el documento
    * Coherencia con otros campos
```

---

## 📝 Plantillas de Extracción por Proveedor

### EDENOR
```typescript
{
  proveedor: 'EDENOR',
  patrones: {
    fecha: /Fecha de Vencimiento:\s*(\d{2}\/\d{2}\/\d{4})/,
    monto: /Total a Pagar:\s*\$?\s*(\d+[.,]\d{2})/,
    numeroFactura: /Factura N°:\s*(\d+)/,
    periodo: /Período:\s*(\w+\s+\d{4})/
  },
  posicionCampos: {
    fecha: 'top-right',
    monto: 'bottom-right',
    numeroFactura: 'top-left'
  }
}
```

### EDESUR
```typescript
{
  proveedor: 'EDESUR',
  patrones: {
    fecha: /Vencimiento:\s*(\d{2}\/\d{2}\/\d{4})/,
    monto: /Importe Total:\s*\$?\s*(\d+[.,]\d{2})/,
    numeroFactura: /Número de Factura:\s*(\d+)/,
    periodo: /Período Facturado:\s*(\w+\s+\d{4})/
  }
}
```

### Metrogas
```typescript
{
  proveedor: 'Metrogas',
  patrones: {
    fecha: /Vencimiento:\s*(\d{2}\/\d{2}\/\d{4})/,
    monto: /Total:\s*\$?\s*(\d+[.,]\d{2})/,
    numeroFactura: /Factura:\s*(\d+)/,
    periodo: /Período:\s*(\w+\s+\d{4})/
  }
}
```

---

**Documento creado:** 2025-01-27  
**Última actualización:** 2025-01-27 (Agregado soporte PDF)  
**Autor:** Sistema de Desarrollo  
**Revisión:** 1.1

