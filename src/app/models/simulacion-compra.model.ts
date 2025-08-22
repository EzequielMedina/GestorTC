/**
 * Modelo que representa una simulación de compra con tarjeta de crédito.
 * Incluye análisis de riesgo, impacto financiero y métricas de comportamiento.
 */
export interface SimulacionCompra {
  id: string;
  tarjetaId: string;
  descripcion: string;
  monto: number;
  fecha: string; // Formato ISO 8601: YYYY-MM-DD
  cantidadCuotas?: number;
  
  // Datos de análisis de riesgo
  analisisRiesgo: AnalisisRiesgo;
  
  // Impacto en el límite de crédito
  impactoLimite: ImpactoLimite;
  
  // Métricas de comportamiento
  metricasComportamiento: MetricasComportamiento;
  
  // Proyecciones financieras
  proyeccionesFinancieras: ProyeccionesFinancieras;
  
  // Comparativas con gastos históricos
  comparativasHistoricas: ComparativasHistoricas;
  
  // Recomendaciones inteligentes
  recomendaciones: Recomendacion[];
}

/**
 * Análisis de riesgo de la compra simulada
 */
export interface AnalisisRiesgo {
  nivelRiesgo: 'bajo' | 'medio' | 'alto' | 'critico';
  puntuacionRiesgo: number; // 0-100
  factoresRiesgo: string[];
  probabilidadSobreendeudamiento: number; // 0-100
  tiempoRecuperacion: number; // días estimados para recuperar el límite
}

/**
 * Impacto en el límite de crédito
 */
export interface ImpactoLimite {
  limiteActual: number;
  limiteDisponible: number;
  limitePostCompra: number;
  porcentajeUsoActual: number; // 0-100
  porcentajeUsoPostCompra: number; // 0-100
  incrementoUso: number; // diferencia en porcentaje
  alertaLimite: boolean;
  diasHastaLimite?: number; // si continúa el patrón de gasto actual
}

/**
 * Métricas de comportamiento de gasto
 */
export interface MetricasComportamiento {
  promedioMensual: number;
  desviacionEstandar: number;
  tendenciaGasto: 'creciente' | 'decreciente' | 'estable';
  frecuenciaCompras: number; // compras por mes
  categoriaGastoMasFrecuente: string;
  patronEstacionalidad: boolean;
  indiceImpulsividad: number; // 0-100 basado en frecuencia y montos
}

/**
 * Proyecciones financieras basadas en la simulación
 */
export interface ProyeccionesFinancieras {
  proyeccion3Meses: ProyeccionMensual[];
  proyeccion6Meses: ProyeccionMensual[];
  proyeccion12Meses: ProyeccionMensual[];
  costoFinancieroEstimado: number; // si se financia
  tasaInteresAplicable: number;
  montoMinimoMensual: number;
  tiempoAmortizacionCompleta: number; // meses
}

/**
 * Proyección mensual individual
 */
export interface ProyeccionMensual {
  mes: string; // YYYY-MM
  saldoEstimado: number;
  pagoMinimo: number;
  interesesAcumulados: number;
  limiteDisponible: number;
  porcentajeUso: number;
}

/**
 * Comparativas con gastos históricos
 */
export interface ComparativasHistoricas {
  promedioUltimos3Meses: number;
  promedioUltimos6Meses: number;
  promedioUltimos12Meses: number;
  mayorCompraHistorica: number;
  posicionEnRanking: number; // 1-100, donde 1 es la compra más grande
  similitudConPatronHistorico: number; // 0-100
  impactoEnPromedioMensual: number; // porcentaje de cambio
}

/**
 * Recomendación inteligente del sistema
 */
export interface Recomendacion {
  tipo: 'financiera' | 'temporal' | 'alternativa' | 'precaucion';
  prioridad: 'alta' | 'media' | 'baja';
  titulo: string;
  descripcion: string;
  accionSugerida?: string;
  beneficioEstimado?: number;
  iconoSugerido?: string;
}

/**
 * Datos para gráficos de la simulación
 */
export interface DatosGraficosSimulacion {
  // Gráfico de impacto en límite
  impactoLimite: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
    }[];
  };
  
  // Gráfico de proyección temporal
  proyeccionTemporal: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }[];
  };
  
  // Gráfico comparativo histórico
  comparativoHistorico: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
    }[];
  };
  
  // Gráfico de distribución de riesgo
  distribucionRiesgo: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
    }[];
  };
}

/**
 * Configuración de la simulación
 */
export interface ConfiguracionSimulacion {
  incluirIntereses: boolean;
  tasaInteresAnual: number;
  considerarInflacion: boolean;
  tasaInflacionAnual: number;
  incluirComisiones: boolean;
  comisionMantenimiento: number;
  alertasPersonalizadas: boolean;
  umbralRiesgoPersonalizado?: number;
}

/**
 * Resultado completo de la simulación
 */
export interface ResultadoSimulacion {
  simulacion: SimulacionCompra;
  datosGraficos: DatosGraficosSimulacion;
  configuracion: ConfiguracionSimulacion;
  timestamp: string;
  duracionCalculoMs: number;
}