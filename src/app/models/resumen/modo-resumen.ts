/**
 * Modo de visualización del resumen: mes natural (calendario) o período de cierre (por tarjeta).
 */
export type ModoResumen = 'mesNatural' | 'periodoCierre';

/**
 * Resultado de comparar dos períodos (meses). Solo mes natural en primera versión.
 */
export interface ComparacionMeses {
  totalA: number;
  totalB: number;
  diferenciaAbs: number;
  diferenciaPorc: number;
  porTarjeta: Array<{
    nombre: string;
    totalA: number;
    totalB: number;
    diferenciaAbs: number;
    diferenciaPorc: number;
  }>;
}
