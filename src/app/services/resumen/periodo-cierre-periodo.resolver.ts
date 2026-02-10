import { RangoFechas } from '../../models/resumen/rango-fechas';
import { Tarjeta } from '../../models/tarjeta.model';
import { IPeriodoResolver } from './periodo-resolver.interface';

/**
 * Resuelve el rango del período de facturación por tarjeta.
 * Dado monthKey (mes en que cierra el período) y tarjeta.diaCierre:
 * - Inicio: (diaCierre + 1) del mes anterior.
 * - Fin: diaCierre del mes actual (ajustado si el mes tiene menos días).
 */
export class PeriodoCierrePeriodoResolver implements IPeriodoResolver {
  /**
   * Obtiene el rango para un día de cierre dado (sin necesidad de tarjeta).
   * Útil para mostrar en UI un ejemplo de fechas del período.
   */
  getRangoParaDiaCierre(monthKey: string, diaCierre: number): RangoFechas {
    const tarjetaFicticia = { id: '', nombre: '', limite: 0, diaCierre, diaVencimiento: 1 } as Tarjeta;
    return this.getRangoParaTarjeta(tarjetaFicticia, monthKey);
  }

  getRangoParaTarjeta(tarjeta: Tarjeta | null, monthKey: string): RangoFechas {
    if (!tarjeta) {
      throw new Error('PeriodoCierrePeriodoResolver requiere una tarjeta');
    }
    const diaCierre = Math.max(1, Math.min(31, tarjeta.diaCierre ?? 1));
    const [y, m] = monthKey.split('-').map(Number);

    const diasMesAnterior = new Date(y, m - 1, 0).getDate();
    const diaSiguienteAlCierre = diaCierre + 1;
    let fechaInicio: string;
    if (diaSiguienteAlCierre > diasMesAnterior) {
      // El "día siguiente al cierre" no existe en el mes anterior (ej. cierre 28 y feb tiene 28 días).
      // El período empieza el día 1 del mes actual.
      fechaInicio = `${y}-${String(m).padStart(2, '0')}-01`;
    } else {
      const mesAnterior = new Date(y, m - 2, 1);
      const añoInicio = mesAnterior.getFullYear();
      const mesInicio = mesAnterior.getMonth() + 1;
      fechaInicio = `${añoInicio}-${String(mesInicio).padStart(2, '0')}-${String(diaSiguienteAlCierre).padStart(2, '0')}`;
    }

    const diasMesActual = new Date(y, m, 0).getDate();
    const diaFin = Math.min(diaCierre, diasMesActual);
    const fechaFin = `${y}-${String(m).padStart(2, '0')}-${String(diaFin).padStart(2, '0')}`;

    return new RangoFechas(fechaInicio, fechaFin);
  }
}
