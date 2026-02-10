/**
 * Value object que representa un intervalo de fechas [inicio, fin] en ISO YYYY-MM-DD.
 * Inmutable. Usado para filtrar gastos/cuotas por período de facturación.
 */
export class RangoFechas {
  constructor(
    public readonly fechaInicio: string,
    public readonly fechaFin: string
  ) {
    if (!fechaInicio || !fechaFin) {
      throw new Error('RangoFechas requiere fechaInicio y fechaFin en formato YYYY-MM-DD');
    }
    if (fechaInicio > fechaFin) {
      throw new Error('fechaInicio no puede ser posterior a fechaFin');
    }
  }

  /**
   * Indica si la fecha dada (YYYY-MM-DD) está dentro del rango, inclusive.
   */
  incluye(fecha: string): boolean {
    const d = this.normalizarFecha(fecha);
    return d >= this.fechaInicio && d <= this.fechaFin;
  }

  private normalizarFecha(fecha: string): string {
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      return fecha.slice(0, 10);
    }
    return fecha;
  }
}
