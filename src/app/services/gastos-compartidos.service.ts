import { Injectable } from '@angular/core';
import { Gasto } from '../models/gasto.model';
import { PersonaGasto, GastoCompartidoUtil } from '../models/gasto-compartido.model';

/**
 * Servicio que proporciona funcionalidades para manejar gastos compartidos
 */
@Injectable({
  providedIn: 'root'
})
export class GastosCompartidosService {
  /**
   * Calcula el monto que corresponde al titular de la tarjeta en un gasto compartido
   * @param gasto Gasto a evaluar
   * @returns Monto que corresponde al titular
   */
  calcularMontoTitular(gasto: Gasto): number {
    // Priorizar nuevo formato (personasCompartidas)
    if (gasto.personasCompartidas && gasto.personasCompartidas.length > 0) {
      return GastoCompartidoUtil.calcularMontoTitular(gasto.personasCompartidas, gasto.monto);
    }

    // Compatibilidad con formato antiguo
    if (!gasto.compartidoCon || gasto.porcentajeCompartido === undefined) {
      return gasto.monto; // Si no está compartido, el titular paga todo
    }
    
    const porcentajeTitular = 100 - (gasto.porcentajeCompartido || 0);
    return (gasto.monto * porcentajeTitular) / 100;
  }

  /**
   * Calcula el monto que corresponde a la persona con quien se comparte el gasto
   * @param gasto Gasto a evaluar
   * @returns Monto que corresponde a la otra persona (para compatibilidad)
   */
  calcularMontoCompartido(gasto: Gasto): number {
    // Priorizar nuevo formato
    if (gasto.personasCompartidas && gasto.personasCompartidas.length > 0) {
      // Retornar el monto de la primera persona (para compatibilidad)
      return gasto.personasCompartidas[0]?.monto || 0;
    }

    // Compatibilidad con formato antiguo
    if (!gasto.compartidoCon || gasto.porcentajeCompartido === undefined) {
      return 0; // Si no está compartido, no hay monto compartido
    }
    
    return (gasto.monto * (gasto.porcentajeCompartido || 0)) / 100;
  }

  /**
   * Obtiene todos los montos compartidos de un gasto (nuevo formato)
   */
  obtenerMontosCompartidos(gasto: Gasto): PersonaGasto[] {
    if (gasto.personasCompartidas && gasto.personasCompartidas.length > 0) {
      return GastoCompartidoUtil.calcularMontos(gasto.personasCompartidas, gasto.monto);
    }
    return [];
  }

  /**
   * Valida si un gasto compartido tiene todos los campos necesarios
   * @param gasto Gasto a validar
   * @returns Objeto con el resultado de la validación
   */
  validarGastoCompartido(gasto: Partial<Gasto>): { valido: boolean; mensaje?: string } {
    // Si no está marcado como compartido, es válido
    if (!gasto.compartidoCon) {
      return { valido: true };
    }

    // Si está marcado como compartido pero no tiene porcentaje, usar 50% por defecto
    if (gasto.compartidoCon && gasto.porcentajeCompartido === undefined) {
      return { 
        valido: true,
        mensaje: 'Se usará 50% como porcentaje compartido por defecto.'
      };
    }

    // Validar que el porcentaje esté entre 0 y 100
    if (gasto.porcentajeCompartido !== undefined && 
        (gasto.porcentajeCompartido < 0 || gasto.porcentajeCompartido > 100)) {
      return { 
        valido: false, 
        mensaje: 'El porcentaje compartido debe estar entre 0 y 100.' 
      };
    }

    // Validar que se haya especificado con quién se comparte
    if (gasto.compartidoCon.trim() === '') {
      return { 
        valido: false, 
        mensaje: 'Debe especificar con quién se comparte el gasto.' 
      };
    }

    return { valido: true };
  }

  /**
   * Obtiene un resumen de gastos por persona
   * @param gastos Lista de gastos a analizar
   * @returns Objeto con el total por persona
   */
  obtenerResumenPorPersona(gastos: Gasto[]): { [key: string]: number } {
    const resumen: { [key: string]: number } = {};
    
    // Agregar al titular como persona por defecto
    resumen['Titular'] = 0;
    
    gastos.forEach(gasto => {
      // Sumar al titular
      resumen['Titular'] += this.calcularMontoTitular(gasto);
      
      // Nuevo formato: múltiples personas
      if (gasto.personasCompartidas && gasto.personasCompartidas.length > 0) {
        const montos = GastoCompartidoUtil.calcularMontos(gasto.personasCompartidas, gasto.monto);
        montos.forEach(persona => {
          if (!resumen[persona.nombre]) {
            resumen[persona.nombre] = 0;
          }
          resumen[persona.nombre] += persona.monto;
        });
      }
      // Formato antiguo: compatibilidad
      else if (gasto.compartidoCon) {
        const persona = gasto.compartidoCon;
        if (!resumen[persona]) {
          resumen[persona] = 0;
        }
        resumen[persona] += this.calcularMontoCompartido(gasto);
      }
    });
    
    return resumen;
  }

  /**
   * Obtiene el saldo entre el titular y otra persona
   * @param gastos Lista de gastos a analizar
   * @param persona Nombre de la persona con quien se comparte
   * @returns Saldo (positivo si el titular le debe, negativo si le deben al titular)
   */
  obtenerSaldoPersona(gastos: Gasto[], persona: string): number {
    const resumen = this.obtenerResumenPorPersona(gastos);
    
    // Si la persona no tiene gastos, el saldo es 0
    if (!resumen[persona]) {
      return 0;
    }
    
    // El saldo es lo que le debe la otra persona al titular (negativo si el titular le debe)
    return resumen[persona];
  }

  /**
   * Calcula las deudas entre todas las personas
   * @param gastos Lista de gastos a analizar
   * @returns Array de deudas (quién debe a quién)
   */
  calcularDeudasEntrePersonas(gastos: Gasto[]): Array<{ de: string; a: string; monto: number }> {
    const resumen = this.obtenerResumenPorPersona(gastos);
    const deudas: Array<{ de: string; a: string; monto: number }> = [];
    const personas = Object.keys(resumen).filter(p => p !== 'Titular');

    // Calcular deudas: cada persona debe al titular su parte
    personas.forEach(persona => {
      const monto = resumen[persona];
      if (monto > 0) {
        deudas.push({
          de: persona,
          a: 'Titular',
          monto: monto
        });
      }
    });

    return deudas;
  }

  /**
   * Valida un gasto compartido (nuevo formato)
   */
  validarGastoCompartidoNuevo(personas: PersonaGasto[]): { valido: boolean; mensaje?: string } {
    if (personas.length === 0) {
      return { valido: true };
    }

    if (personas.length > 5) {
      return {
        valido: false,
        mensaje: 'No se pueden compartir gastos con más de 5 personas'
      };
    }

    // Validar nombres únicos
    const nombres = personas.map(p => p.nombre.trim().toLowerCase());
    const nombresUnicos = new Set(nombres);
    if (nombres.length !== nombresUnicos.size) {
      return {
        valido: false,
        mensaje: 'Los nombres de las personas deben ser únicos'
      };
    }

    // Validar porcentajes
    return GastoCompartidoUtil.validarPorcentajes(personas);
  }
}
