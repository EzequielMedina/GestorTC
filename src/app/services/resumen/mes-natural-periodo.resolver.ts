import { RangoFechas } from '../../models/resumen/rango-fechas';
import { Tarjeta } from '../../models/tarjeta.model';
import { IPeriodoResolver } from './periodo-resolver.interface';

/**
 * Resuelve el rango del mes natural (calendario): primer y último día del mes.
 * Ignora la tarjeta.
 */
export class MesNaturalPeriodoResolver implements IPeriodoResolver {
  getRangoParaTarjeta(_tarjeta: Tarjeta | null, monthKey: string): RangoFechas {
    const [y, m] = monthKey.split('-').map(Number);
    const fechaInicio = `${monthKey}-01`;
    const ultimoDia = new Date(y, m, 0).getDate();
    const fechaFin = `${monthKey}-${String(ultimoDia).padStart(2, '0')}`;
    return new RangoFechas(fechaInicio, fechaFin);
  }
}
