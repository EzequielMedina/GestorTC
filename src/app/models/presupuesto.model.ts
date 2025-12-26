/**
 * Tipo de presupuesto
 */
export type TipoPresupuesto = 'CATEGORIA' | 'TARJETA';

/**
 * Modelo que representa un presupuesto mensual
 * @property id - Identificador único del presupuesto
 * @property tipo - Tipo de presupuesto (CATEGORIA o TARJETA)
 * @property categoriaId - ID de la categoría (si tipo es CATEGORIA)
 * @property tarjetaId - ID de la tarjeta (si tipo es TARJETA)
 * @property monto - Monto del presupuesto
 * @property mes - Mes del presupuesto en formato YYYY-MM
 * @property activo - Indica si el presupuesto está activo
 * @property fechaCreacion - Fecha de creación
 */
export interface Presupuesto {
  id: string;
  tipo: TipoPresupuesto;
  categoriaId?: string;
  tarjetaId?: string;
  monto: number;
  mes: string; // YYYY-MM
  activo: boolean;
  fechaCreacion: string; // ISO string
}

/**
 * Información de seguimiento de un presupuesto
 */
export interface PresupuestoSeguimiento extends Presupuesto {
  gastado: number;
  disponible: number;
  porcentajeUsado: number;
  porcentajeRestante: number;
  estado: 'dentro' | 'cerca' | 'excedido';
}

