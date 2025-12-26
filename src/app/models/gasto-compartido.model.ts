/**
 * Modelo que representa una persona que comparte un gasto
 */
export interface PersonaGasto {
  nombre: string;
  porcentaje: number; // 0-100
  monto: number; // Calculado automáticamente
}

/**
 * Utilidades para trabajar con gastos compartidos
 */
export class GastoCompartidoUtil {
  /**
   * Valida que la suma de porcentajes sea 100%
   */
  static validarPorcentajes(personas: PersonaGasto[]): { valido: boolean; mensaje?: string } {
    if (personas.length === 0) {
      return { valido: true };
    }

    const sumaPorcentajes = personas.reduce((sum, p) => sum + p.porcentaje, 0);
    const diferencia = Math.abs(100 - sumaPorcentajes);

    if (diferencia > 0.01) { // Permitir pequeñas diferencias por redondeo
      return {
        valido: false,
        mensaje: `La suma de porcentajes debe ser 100%. Actual: ${sumaPorcentajes.toFixed(2)}%`
      };
    }

    // Validar que todos los porcentajes estén entre 0 y 100
    for (const persona of personas) {
      if (persona.porcentaje < 0 || persona.porcentaje > 100) {
        return {
          valido: false,
          mensaje: `El porcentaje de ${persona.nombre} debe estar entre 0 y 100%`
        };
      }
    }

    return { valido: true };
  }

  /**
   * Calcula los montos para cada persona basado en el monto total y los porcentajes
   */
  static calcularMontos(personas: PersonaGasto[], montoTotal: number): PersonaGasto[] {
    return personas.map(persona => ({
      ...persona,
      monto: (montoTotal * persona.porcentaje) / 100
    }));
  }

  /**
   * Divide equitativamente entre N personas
   */
  static dividirEquitativamente(numeroPersonas: number): PersonaGasto[] {
    const porcentajePorPersona = 100 / numeroPersonas;
    const personas: PersonaGasto[] = [];

    for (let i = 0; i < numeroPersonas; i++) {
      personas.push({
        nombre: `Persona ${i + 1}`,
        porcentaje: porcentajePorPersona,
        monto: 0 // Se calculará después
      });
    }

    return personas;
  }

  /**
   * Convierte el formato antiguo (compartidoCon + porcentajeCompartido) al nuevo formato
   */
  static convertirFormatoAntiguo(
    compartidoCon?: string,
    porcentajeCompartido?: number
  ): PersonaGasto[] | undefined {
    if (!compartidoCon || porcentajeCompartido === undefined) {
      return undefined;
    }

    return [
      {
        nombre: compartidoCon,
        porcentaje: porcentajeCompartido,
        monto: 0 // Se calculará después
      }
    ];
  }

  /**
   * Obtiene el monto del titular (100% - suma de porcentajes compartidos)
   */
  static calcularMontoTitular(personas: PersonaGasto[], montoTotal: number): number {
    if (!personas || personas.length === 0) {
      return montoTotal;
    }

    const porcentajeCompartido = personas.reduce((sum, p) => sum + p.porcentaje, 0);
    const porcentajeTitular = 100 - porcentajeCompartido;
    return (montoTotal * porcentajeTitular) / 100;
  }
}

