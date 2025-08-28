# Plan de Implementación: Funcionalidad de Venta de Dólares

## 📋 Resumen Ejecutivo

Este documento describe la implementación de la funcionalidad de **Venta de Dólares** para el Gestor TC, que permitirá a los usuarios vender dólares previamente comprados, calcular ganancias/pérdidas y mantener un historial completo de transacciones.

## 🎯 Objetivos

- Implementar sistema de venta de dólares con precio de venta actual
- Calcular automáticamente ganancias/pérdidas por transacción
- Mantener balance actualizado de dólares disponibles
- Integrar con el historial existente de compras
- Proporcionar análisis de rendimiento de inversiones

## 🏗️ Arquitectura Técnica

### Modelos de Datos

#### VentaDolar Interface
```typescript
export interface VentaDolar {
  id?: number;
  mes: number; // 1-12
  anio: number;
  dolares: number; // cantidad de dólares vendidos
  precioVenta: number; // precio en pesos por dólar al momento de la venta
  precioVentaTotal: number; // dolares * precioVenta
  precioCompraPromedio: number; // precio promedio de compra de los dólares vendidos
  ganancia: number; // (precioVenta - precioCompraPromedio) * dolares
  porcentajeGanancia: number; // (ganancia / (precioCompraPromedio * dolares)) * 100
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}
```

#### BalanceDolar Interface
```typescript
export interface BalanceDolar {
  dolaresDisponibles: number;
  dolaresComprados: number;
  dolaresVendidos: number;
  inversionTotal: number; // total invertido en compras
  recuperado: number; // total recuperado en ventas
  gananciaTotal: number; // recuperado - inversionTotal
  porcentajeGananciaTotal: number;
}
```

### Servicios

#### VentaDolarService
- Gestión de ventas de dólares
- Cálculo de ganancias/pérdidas
- Validación de dólares disponibles
- Integración con CompraDolarService

#### BalanceDolarService
- Cálculo de balance general
- Análisis de rendimiento
- Estadísticas consolidadas

## 🎨 Diseño de Interfaz

### Página Principal: Gestión de Dólares

```svg
<svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
  <!-- Header -->
  <rect x="0" y="0" width="800" height="80" fill="#1976d2" />
  <text x="40" y="50" fill="white" font-size="24" font-weight="bold">Gestión de Dólares</text>
  
  <!-- Balance Card -->
  <rect x="20" y="100" width="760" height="120" rx="12" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="40" y="130" font-size="18" font-weight="bold">💰 Balance General</text>
  
  <!-- Balance Stats -->
  <rect x="40" y="140" width="180" height="60" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="50" y="160" font-size="12" fill="#666">Dólares Disponibles</text>
  <text x="50" y="180" font-size="20" font-weight="bold" fill="#1976d2">$1,250.00</text>
  
  <rect x="240" y="140" width="180" height="60" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="250" y="160" font-size="12" fill="#666">Ganancia Total</text>
  <text x="250" y="180" font-size="20" font-weight="bold" fill="#4caf50">+$125,000</text>
  
  <rect x="440" y="140" width="180" height="60" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="450" y="160" font-size="12" fill="#666">Rendimiento</text>
  <text x="450" y="180" font-size="20" font-weight="bold" fill="#4caf50">+15.2%</text>
  
  <rect x="640" y="140" width="120" height="60" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="650" y="160" font-size="12" fill="#666">Precio Actual</text>
  <text x="650" y="180" font-size="16" font-weight="bold">$1,025</text>
  
  <!-- Tabs -->
  <rect x="20" y="240" width="760" height="50" rx="8" fill="white" stroke="#e0e0e0" />
  <rect x="30" y="250" width="120" height="30" rx="4" fill="#1976d2" />
  <text x="70" y="270" fill="white" font-size="14" text-anchor="middle">Comprar</text>
  
  <rect x="160" y="250" width="120" height="30" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="220" y="270" fill="#666" font-size="14" text-anchor="middle">Vender</text>
  
  <rect x="290" y="250" width="120" height="30" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="350" y="270" fill="#666" font-size="14" text-anchor="middle">Historial</text>
  
  <!-- Compra Form (Active) -->
  <rect x="20" y="310" width="760" height="200" rx="12" fill="white" stroke="#e0e0e0" />
  <text x="40" y="340" font-size="16" font-weight="bold">Registrar Nueva Compra</text>
  
  <!-- Form Fields -->
  <rect x="40" y="360" width="150" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="50" y="380" font-size="12" fill="#666">Mes</text>
  
  <rect x="210" y="360" width="150" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="220" y="380" font-size="12" fill="#666">Año</text>
  
  <rect x="380" y="360" width="150" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="390" y="380" font-size="12" fill="#666">Cantidad USD</text>
  
  <rect x="550" y="360" width="150" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="560" y="380" font-size="12" fill="#666">Precio Compra</text>
  
  <!-- Submit Button -->
  <rect x="40" y="420" width="120" height="40" rx="20" fill="#1976d2" />
  <text x="100" y="445" fill="white" font-size="14" text-anchor="middle">Guardar</text>
  
  <!-- Historial Table -->
  <rect x="20" y="530" width="760" height="300" rx="12" fill="white" stroke="#e0e0e0" />
  <text x="40" y="560" font-size="16" font-weight="bold">Historial de Transacciones</text>
  
  <!-- Table Header -->
  <rect x="40" y="580" width="720" height="30" fill="#f5f5f5" />
  <text x="60" y="600" font-size="12" font-weight="bold">Período</text>
  <text x="160" y="600" font-size="12" font-weight="bold">Tipo</text>
  <text x="240" y="600" font-size="12" font-weight="bold">Cantidad</text>
  <text x="340" y="600" font-size="12" font-weight="bold">Precio</text>
  <text x="440" y="600" font-size="12" font-weight="bold">Total</text>
  <text x="540" y="600" font-size="12" font-weight="bold">Ganancia</text>
  <text x="640" y="600" font-size="12" font-weight="bold">Acciones</text>
  
  <!-- Table Rows -->
  <rect x="40" y="610" width="720" height="30" fill="white" stroke="#f0f0f0" />
  <text x="60" y="630" font-size="12">Ene 2024</text>
  <text x="160" y="630" font-size="12" fill="#4caf50">Compra</text>
  <text x="240" y="630" font-size="12">$500</text>
  <text x="340" y="630" font-size="12">$950</text>
  <text x="440" y="630" font-size="12">$475,000</text>
  <text x="540" y="630" font-size="12">-</text>
  
  <rect x="40" y="640" width="720" height="30" fill="#f9f9f9" stroke="#f0f0f0" />
  <text x="60" y="660" font-size="12">Feb 2024</text>
  <text x="160" y="660" font-size="12" fill="#f44336">Venta</text>
  <text x="240" y="660" font-size="12">$200</text>
  <text x="340" y="660" font-size="12">$1,025</text>
  <text x="440" y="660" font-size="12">$205,000</text>
  <text x="540" y="660" font-size="12" fill="#4caf50">+$15,000</text>
</svg>
```

### Modal de Venta de Dólares

```svg
<svg width="500" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Modal Background -->
  <rect x="0" y="0" width="500" height="600" rx="12" fill="white" stroke="#e0e0e0" stroke-width="2" />
  
  <!-- Header -->
  <rect x="0" y="0" width="500" height="60" rx="12" fill="#f44336" />
  <text x="30" y="40" fill="white" font-size="18" font-weight="bold">💸 Vender Dólares</text>
  <circle cx="460" cy="30" r="15" fill="rgba(255,255,255,0.2)" />
  <text x="460" y="35" fill="white" font-size="16" text-anchor="middle">×</text>
  
  <!-- Available Balance -->
  <rect x="30" y="80" width="440" height="60" rx="8" fill="#fff3e0" stroke="#ffb74d" />
  <text x="50" y="105" font-size="14" font-weight="bold">Dólares Disponibles</text>
  <text x="50" y="125" font-size="24" font-weight="bold" fill="#f57c00">$1,250.00 USD</text>
  
  <!-- Current Price -->
  <rect x="30" y="160" width="440" height="50" rx="8" fill="#e8f5e8" stroke="#4caf50" />
  <text x="50" y="180" font-size="12" fill="#2e7d32">Precio de Venta Actual</text>
  <text x="50" y="200" font-size="20" font-weight="bold" fill="#2e7d32">$1,025.00 ARS</text>
  
  <!-- Form Fields -->
  <text x="30" y="240" font-size="14" font-weight="bold">Detalles de la Venta</text>
  
  <!-- Mes/Año -->
  <rect x="30" y="260" width="200" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="40" y="275" font-size="10" fill="#666">MES</text>
  <text x="40" y="290" font-size="14">Marzo 2024</text>
  
  <rect x="250" y="260" width="220" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="260" y="275" font-size="10" fill="#666">AÑO</text>
  <text x="260" y="290" font-size="14">2024</text>
  
  <!-- Cantidad -->
  <rect x="30" y="320" width="200" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="40" y="335" font-size="10" fill="#666">CANTIDAD USD</text>
  <text x="40" y="350" font-size="14">500.00</text>
  
  <!-- Precio Venta -->
  <rect x="250" y="320" width="220" height="40" rx="4" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="260" y="335" font-size="10" fill="#666">PRECIO VENTA</text>
  <text x="260" y="350" font-size="14">$1,025.00</text>
  
  <!-- Preview Calculation -->
  <rect x="30" y="380" width="440" height="120" rx="8" fill="#f3e5f5" stroke="#9c27b0" />
  <text x="50" y="405" font-size="14" font-weight="bold">Vista Previa del Cálculo</text>
  
  <text x="50" y="430" font-size="12" fill="#666">Total a Recibir:</text>
  <text x="350" y="430" font-size="14" font-weight="bold">$512,500 ARS</text>
  
  <text x="50" y="450" font-size="12" fill="#666">Precio Compra Promedio:</text>
  <text x="350" y="450" font-size="14">$950.00</text>
  
  <text x="50" y="470" font-size="12" fill="#666">Ganancia Estimada:</text>
  <text x="350" y="470" font-size="14" font-weight="bold" fill="#4caf50">+$37,500 ARS</text>
  
  <text x="50" y="490" font-size="12" fill="#666">Rendimiento:</text>
  <text x="350" y="490" font-size="14" font-weight="bold" fill="#4caf50">+7.89%</text>
  
  <!-- Action Buttons -->
  <rect x="30" y="520" width="100" height="40" rx="20" fill="#e0e0e0" stroke="#bdbdbd" />
  <text x="80" y="545" font-size="14" text-anchor="middle" fill="#666">Cancelar</text>
  
  <rect x="370" y="520" width="100" height="40" rx="20" fill="#f44336" />
  <text x="420" y="545" font-size="14" text-anchor="middle" fill="white">Vender</text>
</svg>
```

### Vista de Análisis de Rendimiento

```svg
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Header -->
  <rect x="0" y="0" width="800" height="60" fill="#673ab7" />
  <text x="30" y="40" fill="white" font-size="20" font-weight="bold">📊 Análisis de Rendimiento</text>
  
  <!-- Summary Cards -->
  <rect x="30" y="80" width="180" height="100" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="50" y="105" font-size="12" fill="#666">Total Invertido</text>
  <text x="50" y="130" font-size="24" font-weight="bold" fill="#1976d2">$950,000</text>
  <text x="50" y="150" font-size="12" fill="#666">1,000 USD comprados</text>
  
  <rect x="230" y="80" width="180" height="100" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="250" y="105" font-size="12" fill="#666">Total Recuperado</text>
  <text x="250" y="130" font-size="24" font-weight="bold" fill="#4caf50">$512,500</text>
  <text x="250" y="150" font-size="12" fill="#666">500 USD vendidos</text>
  
  <rect x="430" y="80" width="180" height="100" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="450" y="105" font-size="12" fill="#666">Ganancia Neta</text>
  <text x="450" y="130" font-size="24" font-weight="bold" fill="#4caf50">+$37,500</text>
  <text x="450" y="150" font-size="12" fill="#4caf50">+7.89% rendimiento</text>
  
  <rect x="630" y="80" width="150" height="100" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="650" y="105" font-size="12" fill="#666">Dólares Restantes</text>
  <text x="650" y="130" font-size="24" font-weight="bold" fill="#ff9800">500 USD</text>
  <text x="650" y="150" font-size="12" fill="#666">Valor: $512,500</text>
  
  <!-- Chart Area -->
  <rect x="30" y="200" width="740" height="300" rx="8" fill="white" stroke="#e0e0e0" />
  <text x="50" y="230" font-size="16" font-weight="bold">Evolución de la Inversión</text>
  
  <!-- Chart Grid -->
  <line x1="80" y1="250" x2="750" y2="250" stroke="#f0f0f0" />
  <line x1="80" y1="300" x2="750" y2="300" stroke="#f0f0f0" />
  <line x1="80" y1="350" x2="750" y2="350" stroke="#f0f0f0" />
  <line x1="80" y1="400" x2="750" y2="400" stroke="#f0f0f0" />
  <line x1="80" y1="450" x2="750" y2="450" stroke="#f0f0f0" />
  
  <!-- Chart Lines -->
  <polyline points="80,400 200,380 320,360 440,340 560,320 680,300" 
            fill="none" stroke="#1976d2" stroke-width="3" />
  <polyline points="80,400 200,390 320,385 440,375 560,365 680,350" 
            fill="none" stroke="#4caf50" stroke-width="3" />
  
  <!-- Legend -->
  <rect x="580" y="260" width="150" height="60" rx="4" fill="#f9f9f9" stroke="#e0e0e0" />
  <line x1="600" y1="280" x2="620" y2="280" stroke="#1976d2" stroke-width="3" />
  <text x="630" y="285" font-size="12">Valor de Compra</text>
  <line x1="600" y1="300" x2="620" y2="300" stroke="#4caf50" stroke-width="3" />
  <text x="630" y="305" font-size="12">Valor Actual</text>
  
  <!-- Bottom Stats -->
  <rect x="30" y="520" width="740" height="60" rx="8" fill="#f5f5f5" stroke="#e0e0e0" />
  <text x="50" y="545" font-size="12" fill="#666">Mejor Operación:</text>
  <text x="50" y="565" font-size="14" font-weight="bold" fill="#4caf50">Feb 2024 - +15.2% (+$15,000)</text>
  
  <text x="400" y="545" font-size="12" fill="#666">Próxima Recomendación:</text>
  <text x="400" y="565" font-size="14" font-weight="bold" fill="#ff9800">Mantener - Tendencia alcista</text>
</svg>
```

## 🔧 Plan de Implementación

### Fase 1: Modelos y Servicios (2-3 días)

#### 1.1 Crear Modelos
- [ ] `VentaDolar` interface
- [ ] `BalanceDolar` interface
- [ ] `TransaccionDolar` union type
- [ ] Actualizar `ResumenCompraDolar` para incluir ventas

#### 1.2 Implementar VentaDolarService
- [ ] Métodos CRUD para ventas
- [ ] Validación de dólares disponibles
- [ ] Cálculo de ganancias/pérdidas
- [ ] Integración con localStorage

#### 1.3 Implementar BalanceDolarService
- [ ] Cálculo de balance consolidado
- [ ] Análisis de rendimiento
- [ ] Estadísticas de inversión

### Fase 2: Componentes de UI (3-4 días)

#### 2.1 Refactorizar Página Existente
- [ ] Renombrar a `GestionDolaresComponent`
- [ ] Implementar sistema de tabs
- [ ] Agregar card de balance general
- [ ] Mejorar responsive design

#### 2.2 Implementar Tab de Venta
- [ ] Formulario de venta
- [ ] Validaciones en tiempo real
- [ ] Preview de cálculos
- [ ] Modal de confirmación

#### 2.3 Implementar Tab de Historial
- [ ] Tabla unificada de transacciones
- [ ] Filtros por tipo y período
- [ ] Indicadores visuales de ganancia/pérdida
- [ ] Acciones de edición/eliminación

### Fase 3: Análisis y Reportes (2-3 días)

#### 3.1 Página de Análisis
- [ ] Gráficos de rendimiento
- [ ] Métricas de inversión
- [ ] Comparativas temporales
- [ ] Recomendaciones automáticas

#### 3.2 Exportación de Datos
- [ ] Incluir ventas en exportación Excel
- [ ] Reporte de ganancias/pérdidas
- [ ] Análisis fiscal

### Fase 4: Testing y Optimización (1-2 días)

#### 4.1 Testing
- [ ] Pruebas unitarias de servicios
- [ ] Pruebas de integración
- [ ] Testing de UI responsiva
- [ ] Validación de cálculos

#### 4.2 Optimización
- [ ] Performance de cálculos
- [ ] Optimización de queries
- [ ] Mejoras de UX

## 📱 Especificaciones Responsive

### Desktop (>768px)
- Layout de 3 columnas para balance
- Tabs horizontales
- Tabla completa con todas las columnas
- Gráficos de tamaño completo

### Tablet (768px - 480px)
- Layout de 2 columnas para balance
- Tabs con scroll horizontal si es necesario
- Tabla con scroll horizontal
- Gráficos adaptados

### Mobile (<480px)
- Layout de 1 columna para balance
- Tabs apilados verticalmente
- Cards en lugar de tabla
- Gráficos simplificados

## 🎨 Estándares de Diseño

### Colores
- **Compra**: `#1976d2` (Azul Material)
- **Venta**: `#f44336` (Rojo Material)
- **Ganancia**: `#4caf50` (Verde Material)
- **Pérdida**: `#ff5722` (Naranja Material)
- **Neutral**: `#757575` (Gris Material)

### Iconografía
- **Compra**: `trending_up`, `add_circle`
- **Venta**: `trending_down`, `remove_circle`
- **Balance**: `account_balance_wallet`
- **Análisis**: `analytics`, `assessment`
- **Ganancia**: `arrow_upward`
- **Pérdida**: `arrow_downward`

### Tipografía
- **Títulos**: Material Design Typography
- **Números**: Monospace para alineación
- **Monedas**: Formato localizado (ARS/USD)

## 🔒 Validaciones y Reglas de Negocio

### Validaciones de Venta
1. **Dólares disponibles**: No se puede vender más de lo que se tiene
2. **Cantidad mínima**: Mínimo $0.01 USD
3. **Precio válido**: Precio debe ser mayor a $0
4. **Período válido**: Mes y año válidos
5. **No duplicados**: Una venta por mes/año

### Cálculos
1. **Precio promedio de compra**: FIFO (First In, First Out)
2. **Ganancia**: (Precio Venta - Precio Compra Promedio) × Cantidad
3. **Rendimiento**: (Ganancia / Inversión) × 100
4. **Balance**: Compras - Ventas

## 📊 Métricas y KPIs

### Métricas Principales
- Total invertido
- Total recuperado
- Ganancia/pérdida neta
- Rendimiento porcentual
- Dólares disponibles

### Análisis Avanzado
- ROI por período
- Mejor/peor operación
- Tendencias de precio
- Recomendaciones de venta

## 🚀 Entregables

### Código
- [ ] Modelos TypeScript
- [ ] Servicios Angular
- [ ] Componentes UI
- [ ] Estilos CSS/SCSS
- [ ] Tests unitarios

### Documentación
- [ ] README actualizado
- [ ] Documentación de API
- [ ] Guía de usuario
- [ ] Changelog

### Assets
- [ ] Iconos SVG
- [ ] Mockups finales
- [ ] Screenshots

## ⏱️ Cronograma Estimado

| Fase | Duración | Entregables |
|------|----------|-------------|
| Fase 1 | 2-3 días | Modelos y servicios |
| Fase 2 | 3-4 días | Componentes UI |
| Fase 3 | 2-3 días | Análisis y reportes |
| Fase 4 | 1-2 días | Testing y optimización |
| **Total** | **8-12 días** | Funcionalidad completa |

## 🎯 Criterios de Aceptación

- [ ] Usuario puede vender dólares previamente comprados
- [ ] Sistema calcula automáticamente ganancias/pérdidas
- [ ] Balance se actualiza correctamente
- [ ] Historial muestra todas las transacciones
- [ ] Análisis de rendimiento es preciso
- [ ] Interfaz es responsive en todos los dispositivos
- [ ] Exportación incluye datos de ventas
- [ ] Validaciones previenen errores de usuario
- [ ] Performance es óptima con grandes volúmenes de datos

---

**Documento creado**: Enero 2025  
**Versión**: 1.0  
**Estado**: Pendiente de aprobación