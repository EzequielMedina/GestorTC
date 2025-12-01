/**
 * Estado de una cuota
 */
export type EstadoCuota = 'PENDIENTE' | 'PAGADA' | 'ADELANTADA';

/**
 * Modelo que representa una cuota individual de un gasto
 */
export interface Cuota {
  id: string;
  gastoId: string;
  numeroCuota: number; // 1, 2, 3...
  fechaVencimiento: string; // YYYY-MM-DD
  monto: number;
  estado: EstadoCuota;
  fechaPago?: string; // YYYY-MM-DD
  intereses?: number;
  notas?: string;
}

/**
 * Resumen de cuotas por mes
 */
export interface ResumenCuotasMes {
  mes: string; // YYYY-MM
  totalPendiente: number;
  totalPagado: number;
  cantidadPendientes: number;
  cantidadPagadas: number;
  cuotas: Cuota[];
}

