/**
 * Modelo que representa un gasto asociado a una tarjeta de crédito.
 * @property id - Identificador único del gasto (generado con UUID).
 * @property tarjetaId - ID de la tarjeta a la que pertenece este gasto.
 * @property descripcion - Descripción detallada del gasto.
 * @property monto - Monto del gasto.
 * @property fecha - Fecha en que se realizó el gasto (formato ISO 8601: YYYY-MM-DD).
 * @property compartidoCon - (Opcional) Nombre de la persona con quien se compartió el gasto.
 * @property porcentajeCompartido - (Opcional) Porcentaje del monto que se comparte (0-100).
 */
export interface Gasto {
  id: string;
  tarjetaId: string;
  descripcion: string;
  monto: number;
  fecha: string; // Formato ISO 8601: YYYY-MM-DD
  compartidoCon?: string;
  porcentajeCompartido?: number; // 0-100
  /**
   * Cantidad de cuotas (opcional). Si no se define, se asume 1 (sin cuotas).
   * Debe ser un entero >= 1.
   */
  cantidadCuotas?: number;

  /**
   * Mes (normalizado al primer día del mes) en el que comienza a cobrarse la primera cuota.
   * Formato sugerido: YYYY-MM-01 (ISO 8601). Opcional: si no se define, se puede asumir
   * el mes de `fecha` cuando cantidadCuotas > 1.
   */
  primerMesCuota?: string;

  /**
   * Monto de cada cuota. Si no se provee, se puede calcular como monto / cantidadCuotas,
   * ajustando redondeos en la última cuota.
   */
  montoPorCuota?: number;
}
