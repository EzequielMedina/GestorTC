import { RangoFechas } from '../../models/resumen/rango-fechas';
import { Tarjeta } from '../../models/tarjeta.model';

/**
 * Estrategia para obtener el rango de fechas de un período según el tipo de resumen.
 * Para mes natural, el rango es el mismo para todas las tarjetas (tarjeta puede ser null).
 * Para período de cierre, el rango depende de tarjeta.diaCierre.
 */
export interface IPeriodoResolver {
  getRangoParaTarjeta(tarjeta: Tarjeta | null, monthKey: string): RangoFechas;
}
