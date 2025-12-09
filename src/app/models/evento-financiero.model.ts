/**
 * Tipo de evento financiero
 */
export type TipoEventoFinanciero = 
  | 'VENCIMIENTO_TARJETA'
  | 'VENCIMIENTO_CUOTA'
  | 'PAGO_PRESTAMO'
  | 'EVENTO_PERSONALIZADO';

/**
 * Prioridad del evento
 */
export type PrioridadEvento = 'ALTA' | 'MEDIA' | 'BAJA';

/**
 * Modelo que representa un evento financiero en el calendario
 */
export interface EventoFinanciero {
  id: string;
  tipo: TipoEventoFinanciero;
  titulo: string;
  descripcion?: string;
  fecha: string; // YYYY-MM-DD
  hora?: string; // HH:mm (opcional)
  monto?: number;
  prioridad: PrioridadEvento;
  color?: string; // Color personalizado para el evento
  tarjetaId?: string; // Para eventos de tarjeta
  cuotaId?: string; // Para eventos de cuota
  prestamoId?: string; // Para eventos de préstamo
  recurrente?: boolean; // Si el evento se repite
  fechaCreacion: string; // ISO string
}

/**
 * Vista de eventos por día
 */
export interface EventosDia {
  fecha: string; // YYYY-MM-DD
  eventos: EventoFinanciero[];
  totalMonto?: number;
}

/**
 * Vista de eventos por mes
 */
export interface EventosMes {
  mes: string; // YYYY-MM
  eventos: EventoFinanciero[];
  eventosPorDia: { [dia: string]: EventoFinanciero[] };
  totalMonto: number;
}

