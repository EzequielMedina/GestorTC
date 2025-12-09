/**
 * Tipo de tendencia
 */
export type TipoTendencia = 'CRECIENTE' | 'DECRECIENTE' | 'ESTABLE';

/**
 * Comparación mes a mes
 */
export interface ComparacionMes {
  mes: string; // YYYY-MM
  monto: number;
  variacionPorcentual: number; // Comparado con el mes anterior
  variacionAbsoluta: number;
}

/**
 * Comparación año a año
 */
export interface ComparacionAnual {
  año: number;
  monto: number;
  variacionPorcentual: number; // Comparado con el año anterior
  variacionAbsoluta: number;
}

/**
 * Patrón de gasto detectado
 */
export interface PatronGasto {
  tipo: 'DIA_SEMANA' | 'FIN_MES' | 'ESTACIONAL' | 'OTRO';
  descripcion: string;
  frecuencia: number; // Frecuencia de ocurrencia (0-1)
}

/**
 * Métricas de tendencia
 */
export interface MetricasTendencia {
  promedioMensual: number;
  promedioMovil: number; // Promedio móvil de 3 meses
  tendenciaGeneral: TipoTendencia;
  variacionUltimoMes: number;
  variacionUltimoAnio: number;
  picoMaximo: { mes: string; monto: number };
  valleMinimo: { mes: string; monto: number };
  patrones: PatronGasto[];
}

/**
 * Análisis de tendencias completo
 */
export interface AnalisisTendencias {
  comparacionesMensuales: ComparacionMes[];
  comparacionesAnuales: ComparacionAnual[];
  metricas: MetricasTendencia;
  tendenciaPorCategoria: { [categoriaId: string]: MetricasTendencia };
  tendenciaPorTarjeta: { [tarjetaId: string]: MetricasTendencia };
}

