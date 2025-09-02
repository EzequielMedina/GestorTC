export interface CotizacionDolar {
  moneda: string;
  casa: string;
  fecha: string; // formato YYYY-MM-DD
  compra: number;
  venta: number;
}

export interface RangoCotizacion {
  fechaDesde: string; // formato YYYY-MM-DD
  fechaHasta: string; // formato YYYY-MM-DD
}

export interface DatoGraficoCotizacion {
  fecha: string;
  valor: number;
  fechaFormateada: string; // para mostrar en el gráfico
}

export interface ResumenCotizaciones {
  valorMinimo: number;
  valorMaximo: number;
  valorPromedio: number;
  valorInicial: number;
  valorFinal: number;
  variacionTotal: number;
  variacionPorcentual: number;
  fechaMinimo: string;
  fechaMaximo: string;
}

export interface EstadoCargaCotizaciones {
  cargando: boolean;
  error: string | null;
  progreso: number; // 0-100
  totalDias: number;
  diasCargados: number;
}