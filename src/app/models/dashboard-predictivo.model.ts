/**
 * Modelos para el Dashboard Predictivo Avanzado
 * Contiene interfaces para predicciones, alertas, recomendaciones y scoring financiero
 */

/**
 * Modelo que representa una predicción de gasto futuro
 * @property id - Identificador único de la predicción
 * @property tarjetaId - ID de la tarjeta asociada a la predicción
 * @property mes - Mes de la predicción (1-12)
 * @property anio - Año de la predicción
 * @property montoPredicho - Monto estimado para el período
 * @property confianza - Nivel de confianza de la predicción (0-100)
 * @property algoritmo - Algoritmo utilizado para la predicción
 * @property factores - Factores que influyen en la predicción
 * @property fechaGeneracion - Fecha en que se generó la predicción
 */
export interface PrediccionGasto {
  id: string;
  tarjetaId: string;
  mes: number; // 1-12
  anio: number;
  montoPredicho: number;
  confianza: number; // 0-100
  algoritmo: 'regresion_lineal' | 'media_movil' | 'estacional' | 'hibrido';
  factores: string[];
  fechaGeneracion: Date;
  tendencia: 'creciente' | 'decreciente' | 'estable';
  variacionEsperada: number; // Porcentaje de variación esperada
}

/**
 * Modelo que representa una alerta proactiva del sistema
 * @property id - Identificador único de la alerta
 * @property tipo - Tipo de alerta generada
 * @property prioridad - Nivel de prioridad de la alerta
 * @property titulo - Título descriptivo de la alerta
 * @property mensaje - Mensaje detallado de la alerta
 * @property tarjetaId - ID de la tarjeta relacionada (opcional)
 * @property montoInvolucrado - Monto relacionado con la alerta (opcional)
 * @property fechaGeneracion - Fecha de generación de la alerta
 * @property fechaVencimiento - Fecha límite de la alerta (opcional)
 * @property leida - Indica si la alerta ha sido leída
 * @property accionRecomendada - Acción sugerida para resolver la alerta
 */
export interface Alerta {
  id: string;
  tipo: 'limite_cercano' | 'gasto_inusual' | 'patron_riesgoso' | 'oportunidad_ahorro' | 'vencimiento_proximo';
  prioridad: 'alta' | 'media' | 'baja';
  titulo: string;
  mensaje: string;
  tarjetaId?: string;
  montoInvolucrado?: number;
  fechaGeneracion: Date;
  fechaVencimiento?: Date;
  leida: boolean;
  accionRecomendada: string;
  icono: string;
  color: string;
}

/**
 * Modelo que representa una recomendación personalizada
 * @property id - Identificador único de la recomendación
 * @property categoria - Categoría de la recomendación
 * @property titulo - Título de la recomendación
 * @property descripcion - Descripción detallada
 * @property impactoEstimado - Impacto económico estimado
 * @property dificultad - Nivel de dificultad de implementación
 * @property tarjetasAfectadas - IDs de tarjetas que se verían afectadas
 * @property fechaGeneracion - Fecha de generación
 * @property vigencia - Días de vigencia de la recomendación
 * @property aplicada - Indica si la recomendación fue aplicada
 * @property puntuacion - Puntuación de relevancia (0-100)
 */
export interface Recomendacion {
  id: string;
  categoria: 'ahorro' | 'optimizacion' | 'seguridad' | 'planificacion' | 'inversion';
  titulo: string;
  descripcion: string;
  impactoEstimado: number; // Monto estimado de ahorro/beneficio
  dificultad: 'facil' | 'medio' | 'dificil';
  tarjetasAfectadas: string[];
  fechaGeneracion: Date;
  vigencia: number; // Días
  aplicada: boolean;
  puntuacion: number; // 0-100
  pasos: string[]; // Pasos para implementar la recomendación
  etiquetas: string[];
}

/**
 * Modelo que representa el score financiero del usuario
 * @property puntuacion - Puntuación general (0-1000)
 * @property nivel - Nivel descriptivo del score
 * @property factores - Factores que componen el score
 * @property tendencia - Tendencia del score en el tiempo
 * @property fechaCalculo - Fecha del último cálculo
 * @property recomendacionesMejora - Sugerencias para mejorar el score
 * @property comparativoMesAnterior - Comparación con el mes anterior
 */
export interface ScoreFinanciero {
  puntuacion: number; // 0-1000
  nivel: 'excelente' | 'muy_bueno' | 'bueno' | 'regular' | 'malo';
  factores: FactorScore[];
  tendencia: 'mejorando' | 'empeorando' | 'estable';
  fechaCalculo: Date;
  recomendacionesMejora: string[];
  comparativoMesAnterior: {
    puntuacion: number;
    diferencia: number;
    porcentajeCambio: number;
  };
  desglose: {
    utilizacionCredito: number; // 0-100
    diversificacionGastos: number; // 0-100
    consistenciaPagos: number; // 0-100
    controlPresupuesto: number; // 0-100
    planificacionFinanciera: number; // 0-100
  };
}

/**
 * Modelo que representa un factor individual del score financiero
 * @property nombre - Nombre del factor
 * @property valor - Valor numérico del factor
 * @property peso - Peso del factor en el cálculo total
 * @property descripcion - Descripción del factor
 * @property estado - Estado actual del factor
 */
export interface FactorScore {
  nombre: string;
  valor: number;
  peso: number; // 0-1
  descripcion: string;
  estado: 'excelente' | 'bueno' | 'regular' | 'malo';
}

/**
 * Modelo para datos de tendencias y análisis temporal
 * @property periodo - Período de análisis
 * @property datos - Array de datos temporales
 * @property tendencia - Dirección de la tendencia
 * @property estacionalidad - Información de patrones estacionales
 */
export interface TendenciaAnalisis {
  periodo: 'semanal' | 'mensual' | 'trimestral' | 'anual';
  datos: DatoTemporal[];
  tendencia: {
    direccion: 'creciente' | 'decreciente' | 'estable';
    pendiente: number;
    correlacion: number;
  };
  estacionalidad: {
    detectada: boolean;
    patron: string;
    intensidad: number;
  };
}

/**
 * Modelo para un punto de dato temporal
 * @property fecha - Fecha del dato
 * @property valor - Valor numérico
 * @property categoria - Categoría del dato (opcional)
 */
export interface DatoTemporal {
  fecha: Date;
  valor: number;
  categoria?: string;
}

/**
 * Modelo para configuración de alertas personalizadas
 * @property id - Identificador único
 * @property nombre - Nombre de la configuración
 * @property condiciones - Condiciones que disparan la alerta
 * @property activa - Si la alerta está activa
 * @property frecuencia - Frecuencia de evaluación
 */
export interface ConfiguracionAlerta {
  id: string;
  nombre: string;
  condiciones: CondicionAlerta[];
  activa: boolean;
  frecuencia: 'diaria' | 'semanal' | 'mensual';
  notificaciones: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

/**
 * Modelo para una condición de alerta
 * @property campo - Campo a evaluar
 * @property operador - Operador de comparación
 * @property valor - Valor de comparación
 * @property tipo - Tipo de dato del valor
 */
export interface CondicionAlerta {
  campo: string;
  operador: '>' | '<' | '=' | '>=' | '<=' | '!=';
  valor: number | string;
  tipo: 'numero' | 'texto' | 'fecha';
}

/**
 * Modelo para métricas del dashboard
 * @property nombre - Nombre de la métrica
 * @property valor - Valor actual
 * @property valorAnterior - Valor del período anterior
 * @property unidad - Unidad de medida
 * @property formato - Formato de visualización
 */
export interface MetricaDashboard {
  nombre: string;
  valor: number;
  valorAnterior?: number;
  unidad: string;
  formato: 'moneda' | 'porcentaje' | 'numero' | 'entero';
  tendencia?: 'positiva' | 'negativa' | 'neutral';
  icono: string;
  color: string;
}