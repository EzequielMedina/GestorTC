import { FiltroAvanzado } from './filtro-avanzado.model';

/**
 * Configuración de un reporte personalizado
 */
export interface ConfiguracionReporte {
  id: string;
  nombre: string;
  descripcion?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  
  // Filtros
  filtros: FiltroAvanzado;
  
  // Columnas a mostrar
  columnas: ColumnaReporte[];
  
  // Agrupación
  agruparPor?: 'tarjeta' | 'categoria' | 'mes' | 'etiqueta' | 'ninguna';
  
  // Ordenamiento
  ordenarPor?: 'fecha' | 'monto' | 'descripcion';
  ordenAscendente?: boolean;
  
  // Formato
  incluirGraficos?: boolean;
  incluirResumen?: boolean;
  incluirNotas?: boolean;
}

/**
 * Columna del reporte
 */
export interface ColumnaReporte {
  id: string;
  nombre: string;
  visible: boolean;
  orden?: number;
}

/**
 * Datos del reporte generado
 */
export interface ReporteGenerado {
  id: string;
  configuracionId: string;
  fechaGeneracion: string;
  datos: any[];
  resumen: ResumenReporte;
  graficos?: any[];
}

/**
 * Resumen del reporte
 */
export interface ResumenReporte {
  totalGastos: number;
  cantidadGastos: number;
  promedioGasto: number;
  gastoMaximo: number;
  gastoMinimo: number;
  porTarjeta?: { [tarjetaId: string]: number };
  porCategoria?: { [categoriaId: string]: number };
  porMes?: { [mes: string]: number };
}

/**
 * Columnas predefinidas disponibles
 */
export const COLUMNAS_DISPONIBLES: ColumnaReporte[] = [
  { id: 'fecha', nombre: 'Fecha', visible: true, orden: 1 },
  { id: 'descripcion', nombre: 'Descripción', visible: true, orden: 2 },
  { id: 'monto', nombre: 'Monto', visible: true, orden: 3 },
  { id: 'tarjeta', nombre: 'Tarjeta', visible: true, orden: 4 },
  { id: 'categoria', nombre: 'Categoría', visible: true, orden: 5 },
  { id: 'etiquetas', nombre: 'Etiquetas', visible: false, orden: 6 },
  { id: 'nota', nombre: 'Nota', visible: false, orden: 7 },
  { id: 'compartido', nombre: 'Compartido', visible: false, orden: 8 },
  { id: 'cuotas', nombre: 'Cuotas', visible: false, orden: 9 }
];

