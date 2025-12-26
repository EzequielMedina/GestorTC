import { GastoServicioImportado, ValidationError } from './gasto-servicio-importado.model';

/**
 * Resultado de una importación de gastos
 */
export interface ResultadoImportacion {
  id: string;
  fechaImportacion: string;
  archivo: string;
  formato: 'CSV' | 'Excel' | 'JSON' | 'PDF';
  totalFilas: number;
  exitosos: number;
  errores: number;
  advertencias: number;
  montoTotal: number;
  gastosCreados: string[];   // IDs de gastos creados
  erroresDetalle: ErrorImportacion[];
  advertenciasDetalle?: ValidationError[];
}

/**
 * Error detallado de importación
 */
export interface ErrorImportacion {
  fila: number;
  descripcion: string;
  error: string;
  datos: Partial<GastoServicioImportado>;
}

