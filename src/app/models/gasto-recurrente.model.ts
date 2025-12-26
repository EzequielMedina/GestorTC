/**
 * Modelo que representa una serie de gastos recurrentes (servicios)
 */
export interface GastoRecurrente {
  id: string;
  nombre: string;
  descripcion: string;
  monto: number;
  categoriaId?: string;
  tarjetaId: string;
  diaVencimiento: number; // Día del mes (1-31)
  frecuencia: FrecuenciaRecurrencia;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin?: string; // YYYY-MM-DD (opcional, si no tiene fin)
  activo: boolean;
  fechaCreacion: string; // ISO string
  fechaActualizacion?: string; // ISO string
  proveedor?: string; // EDENOR, EDESUR, etc.
  notas?: string;
}

/**
 * Frecuencia de recurrencia
 */
export type FrecuenciaRecurrencia = 
  | 'MENSUAL'      // Cada mes
  | 'BIMESTRAL'    // Cada 2 meses
  | 'TRIMESTRAL'   // Cada 3 meses
  | 'SEMESTRAL'    // Cada 6 meses
  | 'ANUAL';       // Cada año

/**
 * Instancia de un gasto recurrente generado
 */
export interface InstanciaGastoRecurrente {
  id: string;
  serieRecurrenteId: string;
  fechaVencimiento: string; // YYYY-MM-DD
  monto: number;
  pagado: boolean;
  fechaPago?: string; // YYYY-MM-DD (si está pagado)
  fechaCreacion: string; // ISO string
}

