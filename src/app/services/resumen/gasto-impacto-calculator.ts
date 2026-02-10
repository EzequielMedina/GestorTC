import { Gasto } from '../../models/gasto.model';
import { RangoFechas } from '../../models/resumen/rango-fechas';

/**
 * Normaliza fecha a YYYY-MM-DD (string) en fecha local.
 * Acepta Date o string. Usa getFullYear/getMonth/getDate para evitar desfase por timezone.
 */
function toISODate(fecha: string | Date | unknown): string {
  if (fecha instanceof Date) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof fecha === 'string' && /^\d{4}-\d{2}/.test(fecha)) {
    return fecha.slice(0, 10);
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Primer día del mes de la primera cuota (YYYY-MM-01). Prioriza primerMesCuota del gasto.
 */
function firstMonthISOFromGasto(g: Gasto): string {
  const fechaStr = toISODate(g.fecha);
  const base = g.primerMesCuota ?? fechaStr.slice(0, 7) + '-01';
  const [y, m] = base.slice(0, 7).split('-');
  return `${y}-${m}-01`;
}

/**
 * Suma N meses a una fecha YYYY-MM-DD y devuelve YYYY-MM-01.
 */
function addMonths(isoYYYYMMDD: string, months: number): string {
  const [y, m, d] = isoYYYYMMDD.split('-').map(Number);
  const date = new Date(y, m - 1, d || 1);
  date.setMonth(date.getMonth() + months);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

/**
 * Calcula el monto que un gasto aporta dentro de un rango de fechas.
 * - Gasto de una cuota: aporte = monto si la fecha del gasto está en el rango, sino 0.
 * - Gasto en cuotas: cada cuota aporta montoPorCuota si la fecha de vencimiento de esa cuota
 *   (primer día del mes correspondiente a primerMesCuota + i) cae en el rango.
 */
export function gastoImpactaEnRango(gasto: Gasto, rango: RangoFechas): number {
  const cuotas = Math.max(1, gasto.cantidadCuotas ?? 1);
  if (cuotas <= 1) {
    const fechaGasto = toISODate(gasto.fecha);
    return rango.incluye(fechaGasto) ? gasto.monto : 0;
  }
  const montoCuota = gasto.montoPorCuota ?? Math.round((gasto.monto / cuotas) * 100) / 100;
  const firstISO = firstMonthISOFromGasto(gasto);
  let total = 0;
  for (let i = 0; i < cuotas; i++) {
    const fechaCuota = addMonths(firstISO, i);
    if (rango.incluye(fechaCuota)) {
      total += montoCuota;
    }
  }
  return total;
}
