import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, shareReplay } from 'rxjs';
import { Gasto } from '../models/gasto.model';
import { Tarjeta } from '../models/tarjeta.model';
import { GastoService } from './gasto';
import { TarjetaService } from './tarjeta';
import { GastosCompartidosService } from './gastos-compartidos.service';

/**
 * Interfaz que representa el resumen de gastos por tarjeta
 */
export interface ResumenTarjeta extends Tarjeta {
  totalGastos: number;
  porcentajeUso: number; // 0-100
  saldoDisponible: number;
}

/**
 * Interfaz que representa el resumen de gastos por persona
 */
export interface ResumenPersona {
  nombre: string;
  totalGastos: number;
  saldo: number; // Positivo si le deben, negativo si debe
}

@Injectable({
  providedIn: 'root'
})
export class ResumenService {
  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private gastosCompartidosService: GastosCompartidosService
  ) {}

  // ==========================
  // Utilidades para cuotas
  // ==========================
  private monthKeyFromDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthKeyFromISO(isoDate: string | Date | any): string {
    // Manejar tanto strings como objetos Date (puede venir como Date desde importaciones)
    let dateStr: string;
    if (isoDate instanceof Date) {
      // Si es un objeto Date, convertirlo a string ISO
      dateStr = isoDate.toISOString().split('T')[0];
    } else if (typeof isoDate === 'string') {
      dateStr = isoDate;
    } else {
      // Fallback: usar la fecha actual
      dateStr = new Date().toISOString().split('T')[0];
    }
    // isoDate esperado: YYYY-MM-DD
    return dateStr.slice(0, 7);
  }

  private firstMonthISOFromGasto(g: Gasto): string {
    // prioriza primerMesCuota si existe; si no, usa mes de fecha del gasto normalizado a día 1
    // Convertir fecha a string si es necesario (puede venir como Date desde importaciones)
    let fechaStr: string;
    const fecha = g.fecha as any; // Permitir Date o string
    if (fecha instanceof Date) {
      fechaStr = fecha.toISOString().split('T')[0];
    } else if (typeof fecha === 'string') {
      fechaStr = fecha;
    } else {
      fechaStr = new Date().toISOString().split('T')[0];
    }
    
    const base = g.primerMesCuota || (this.monthKeyFromISO(fechaStr) + '-01');
    // asegurar formato YYYY-MM-01
    const [y, m] = base.slice(0, 7).split('-');
    return `${y}-${m}-01`;
  }

  private addMonths(isoYYYYMMDD: string, months: number): string {
    const [y, m, d] = isoYYYYMMDD.split('-').map(Number);
    const date = new Date(y, m - 1, d || 1);
    date.setMonth(date.getMonth() + months);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  }

  private gastoImpactaMes(g: Gasto, monthKey: string): number {
    // Retorna el aporte del gasto al mes indicado (monthKey = 'YYYY-MM')
    const cuotas = Math.max(1, g.cantidadCuotas || 1);
    if (cuotas <= 1) {
      // gasto de una sola vez: impacta en el mes de la fecha
      return this.monthKeyFromISO(g.fecha) === monthKey ? g.monto : 0;
    }
    // cuotas: usar montoPorCuota (si no, dividir monto)
    const montoCuota = g.montoPorCuota ?? Math.round((g.monto / cuotas) * 100) / 100;
    const firstISO = this.firstMonthISOFromGasto(g);
    for (let i = 0; i < cuotas; i++) {
      const iso = this.addMonths(firstISO, i);
      if (iso.slice(0, 7) === monthKey) return montoCuota;
    }
    return 0;
  }

  /**
   * Obtiene un resumen de gastos por tarjeta
   */
  getResumenPorTarjeta$(): Observable<ResumenTarjeta[]> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$()
    ]).pipe(
      map(([tarjetas, gastos]) => {
        return tarjetas.map(tarjeta => {
          const gastosTarjeta = gastos.filter(g => g.tarjetaId === tarjeta.id);
          // Total actual (suma completa de gastos, no por mes)
          const totalGastos = gastosTarjeta.reduce((sum, g) => sum + g.monto, 0);
          const porcentajeUso = tarjeta.limite > 0 ? (totalGastos / tarjeta.limite) * 100 : 0;
          
          return {
            ...tarjeta,
            totalGastos,
            porcentajeUso: Math.min(100, Math.max(0, porcentajeUso)), // Asegurar entre 0 y 100
            saldoDisponible: Math.max(0, tarjeta.limite - totalGastos)
          };
        });
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  /**
   * Total del mes (YYYY-MM) considerando cuotas
   */
  getTotalDelMes$(monthKey: string): Observable<number> {
    // NO usar shareReplay aquí para que siempre se cree un nuevo observable cuando cambia el mes
    return this.gastoService.getGastos$().pipe(
      map(gastos => gastos.reduce((acc, g) => acc + this.gastoImpactaMes(g, monthKey), 0))
    );
  }

  /**
   * Resumen por tarjeta para un mes específico (YYYY-MM), considerando cuotas
   */
  getResumenPorTarjetaDelMes$(monthKey: string): Observable<Array<ResumenTarjeta & { totalMes: number }>> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$()
    ]).pipe(
      map(([tarjetas, gastos]) => {
        return tarjetas.map(tarjeta => {
          const gastosTarjeta = gastos.filter(g => g.tarjetaId === tarjeta.id);
          const totalGastos = gastosTarjeta.reduce((sum, g) => sum + g.monto, 0);
          const totalMes = gastosTarjeta.reduce((acc, g) => acc + this.gastoImpactaMes(g, monthKey), 0);
          const porcentajeUsoMes = tarjeta.limite > 0 ? (totalMes / tarjeta.limite) * 100 : 0;
          return {
            ...tarjeta,
            totalGastos,
            porcentajeUso: Math.min(100, Math.max(0, porcentajeUsoMes)),
            saldoDisponible: Math.max(0, tarjeta.limite - totalMes),
            totalMes
          };
        });
      })
      // NO usar shareReplay aquí - cada vez que se llama debe crear un nuevo observable
    );
  }

  /**
   * Porcentaje de uso total del mes (totalDelMes / limiteTotal * 100)
   */
  getPorcentajeUsoTotalDelMes$(monthKey: string): Observable<number> {
    // NO usar shareReplay aquí para que siempre se cree un nuevo observable cuando cambia el mes
    return combineLatest([
      this.getTotalDelMes$(monthKey),
      this.getLimiteTotal$()
    ]).pipe(
      map(([totalMes, limiteTotal]) => limiteTotal > 0 ? Math.min(100, (totalMes / limiteTotal) * 100) : 0)
    );
  }

  /**
   * Obtiene un resumen de gastos por persona
   */
  getResumenPorPersona$(): Observable<ResumenPersona[]> {
    return this.gastoService.getGastos$().pipe(
      map(gastos => {
        const resumenPersonas: { [key: string]: ResumenPersona } = {};
        
        // Inicializar con el titular
        resumenPersonas['Titular'] = {
          nombre: 'Titular',
          totalGastos: 0,
          saldo: 0
        };
        
        // Procesar cada gasto
        gastos.forEach(gasto => {
          // Calcular montos para el titular y la persona con quien se comparte (si aplica)
          const montoTitular = this.gastosCompartidosService.calcularMontoTitular(gasto);
          
          // Actualizar resumen del titular
          resumenPersonas['Titular'].totalGastos += montoTitular;
          
          // Si el gasto está compartido, actualizar el resumen de la otra persona
          if (gasto.compartidoCon) {
            const montoCompartido = this.gastosCompartidosService.calcularMontoCompartido(gasto);
            const nombrePersona = gasto.compartidoCon;
            
            if (!resumenPersonas[nombrePersona]) {
              resumenPersonas[nombrePersona] = {
                nombre: nombrePersona,
                totalGastos: 0,
                saldo: 0
              };
            }
            
            resumenPersonas[nombrePersona].totalGastos += montoCompartido;
            
            // Actualizar saldos (el titular paga todo inicialmente, los demás le deben su parte)
            resumenPersonas['Titular'].saldo += montoCompartido; // El titular suma a su saldo (le deben)
            resumenPersonas[nombrePersona].saldo -= montoCompartido; // El otro resta (debe)
          }
        });
        
        // Convertir el objeto a array y ordenar por nombre
        return Object.values(resumenPersonas).sort((a, b) => 
          a.nombre.localeCompare(b.nombre)
        );
      })
    );
  }

  /**
   * Obtiene un resumen de gastos por persona para un mes específico
   */
  getResumenPorPersonaDelMes$(monthKey: string): Observable<Array<ResumenPersona & { totalMes: number }>> {
    return this.gastoService.getGastos$().pipe(
      map(gastos => {
        const resumenPersonas: { [key: string]: ResumenPersona & { totalMes: number } } = {};
        
        // Inicializar con el titular
        resumenPersonas['Titular'] = {
          nombre: 'Titular',
          totalGastos: 0,
          saldo: 0,
          totalMes: 0
        };
        
        // Procesar cada gasto
        gastos.forEach(gasto => {
          // Calcular montos para el titular y la persona con quien se comparte (si aplica)
          const montoTitular = this.gastosCompartidosService.calcularMontoTitular(gasto);
          const montoCompartido = this.gastosCompartidosService.calcularMontoCompartido(gasto);
          
          // Calcular impacto del gasto en el mes específico
          const impactoMes = this.gastoImpactaMes(gasto, monthKey);
          const impactoMesTitular = montoCompartido > 0 
            ? (impactoMes * montoTitular) / gasto.monto 
            : impactoMes;
          const impactoMesCompartido = montoCompartido > 0 
            ? (impactoMes * montoCompartido) / gasto.monto 
            : 0;
          
          // Actualizar resumen del titular
          resumenPersonas['Titular'].totalGastos += montoTitular;
          resumenPersonas['Titular'].totalMes += impactoMesTitular;
          
          // Si el gasto está compartido, actualizar el resumen de la otra persona
          if (gasto.compartidoCon) {
            const nombrePersona = gasto.compartidoCon;
            
            if (!resumenPersonas[nombrePersona]) {
              resumenPersonas[nombrePersona] = {
                nombre: nombrePersona,
                totalGastos: 0,
                saldo: 0,
                totalMes: 0
              };
            }
            
            resumenPersonas[nombrePersona].totalGastos += montoCompartido;
            resumenPersonas[nombrePersona].totalMes += impactoMesCompartido;
            
            // Actualizar saldos (el titular paga todo inicialmente, los demás le deben su parte)
            resumenPersonas['Titular'].saldo += montoCompartido; // El titular suma a su saldo (le deben)
            resumenPersonas[nombrePersona].saldo -= montoCompartido; // El otro resta (debe)
          }
        });
        
        // Convertir el objeto a array y ordenar por nombre
        return Object.values(resumenPersonas).sort((a, b) => 
          a.nombre.localeCompare(b.nombre)
        );
      })
      // NO usar shareReplay aquí para que siempre se cree un nuevo observable cuando cambia el mes
    );
  }

  /**
   * Obtiene el total de gastos de todas las tarjetas
   */
  getTotalGastos$(): Observable<number> {
    return this.gastoService.getGastos$().pipe(
      map(gastos => gastos.reduce((total, gasto) => total + gasto.monto, 0))
    );
  }

  /**
   * Obtiene el límite total de crédito de todas las tarjetas
   */
  getLimiteTotal$(): Observable<number> {
    return this.tarjetaService.getTarjetas$().pipe(
      map(tarjetas => tarjetas.reduce((total, tarjeta) => total + tarjeta.limite, 0)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Obtiene el porcentaje de uso total de todas las tarjetas
   */
  getPorcentajeUsoTotal$(): Observable<number> {
    return combineLatest([
      this.getTotalGastos$(),
      this.getLimiteTotal$()
    ]).pipe(
      map(([totalGastos, limiteTotal]) => {
        return limiteTotal > 0 ? Math.min(100, (totalGastos / limiteTotal) * 100) : 0;
      })
    );
  }

  /**
   * Obtiene datos para gráficos de resumen
   */
  getDatosGraficoPorTarjeta$(): Observable<{ labels: string[]; datos: number[] }> {
    return this.getResumenPorTarjeta$().pipe(
      map(resumen => ({
        labels: resumen.map(t => t.nombre),
        datos: resumen.map(t => t.totalGastos)
      }))
    );
  }

  /**
   * Obtiene datos para gráficos de resumen por persona
   */
  getDatosGraficoPorPersona$(): Observable<{ labels: string[]; datos: number[] }> {
    return this.getResumenPorPersona$().pipe(
      map(resumen => ({
        labels: resumen.map(p => p.nombre),
        datos: resumen.map(p => p.totalGastos)
      }))
    );
  }

  /**
   * Obtiene el detalle de gastos agrupados por tarjeta para un mes específico
   */
  getDetalleGastosAgrupadosPorTarjeta$(monthKey: string): Observable<Array<{
    nombreTarjeta: string;
    totalTarjeta: number;
    cantidadGastos: number;
    gastosUltimaCuota: number;
    gastos: Array<{
      descripcion: string;
      montoOriginal: number;
      cuotaActual: number;
      cantidadCuotas: number;
      montoCuota: number;
      compartidoCon?: string;
      porcentajeCompartido?: number;
    }>;
  }>> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$()
    ]).pipe(
      map(([tarjetas, gastos]) => {
        const tarjetasMap = new Map(tarjetas.map(t => [t.id, t.nombre] as const));
        const gastosPorTarjeta = new Map<string, Array<{
          descripcion: string;
          montoOriginal: number;
          cuotaActual: number;
          cantidadCuotas: number;
          montoCuota: number;
          compartidoCon?: string;
          porcentajeCompartido?: number;
        }>>();

        gastos.forEach(gasto => {
          const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
          const montoCuota = gasto.montoPorCuota ?? Math.round((gasto.monto / cuotas) * 100) / 100;
          const nombreTarjeta = tarjetasMap.get(gasto.tarjetaId) || 'Tarjeta no encontrada';
          
          if (cuotas <= 1) {
            // Gasto de una sola vez: solo aparece en el mes de la fecha
            if (this.monthKeyFromISO(gasto.fecha) === monthKey) {
              if (!gastosPorTarjeta.has(nombreTarjeta)) {
                gastosPorTarjeta.set(nombreTarjeta, []);
              }
              gastosPorTarjeta.get(nombreTarjeta)!.push({
                descripcion: gasto.descripcion,
                montoOriginal: gasto.monto,
                cuotaActual: 1,
                cantidadCuotas: 1,
                montoCuota: gasto.monto,
                compartidoCon: gasto.compartidoCon,
                porcentajeCompartido: gasto.porcentajeCompartido
              });
            }
          } else {
            // Gasto en cuotas: puede aparecer en múltiples meses
            const firstISO = this.firstMonthISOFromGasto(gasto);
            for (let i = 0; i < cuotas; i++) {
              const iso = this.addMonths(firstISO, i);
              if (iso.slice(0, 7) === monthKey) {
                if (!gastosPorTarjeta.has(nombreTarjeta)) {
                  gastosPorTarjeta.set(nombreTarjeta, []);
                }
                gastosPorTarjeta.get(nombreTarjeta)!.push({
                  descripcion: gasto.descripcion,
                  montoOriginal: gasto.monto,
                  cuotaActual: i + 1,
                  cantidadCuotas: cuotas,
                  montoCuota: montoCuota,
                  compartidoCon: gasto.compartidoCon,
                  porcentajeCompartido: gasto.porcentajeCompartido
                });
              }
            }
          }
        });

        // Convertir el Map a array y calcular totales
        const resultado = Array.from(gastosPorTarjeta.entries()).map(([nombreTarjeta, gastos]) => {
          const totalTarjeta = gastos.reduce((sum, gasto) => sum + gasto.montoCuota, 0);
          const cantidadGastos = gastos.length;
          const gastosUltimaCuota = gastos.filter(gasto => gasto.cuotaActual === gasto.cantidadCuotas).length;
          return {
            nombreTarjeta,
            totalTarjeta,
            cantidadGastos,
            gastosUltimaCuota,
            gastos: gastos.sort((a, b) => a.descripcion.localeCompare(b.descripcion))
          };
        });

        // Ordenar por nombre de tarjeta
        return resultado.sort((a, b) => a.nombreTarjeta.localeCompare(b.nombreTarjeta));
      })
      // NO usar shareReplay aquí para que siempre se cree un nuevo observable cuando cambia el mes
    );
  }

  /**
   * Obtiene el detalle de gastos por tarjeta para un mes específico
   */
  getDetalleGastosDelMes$(monthKey: string): Observable<Array<{
    nombreTarjeta: string;
    descripcion: string;
    montoOriginal: number;
    cuotaActual: number;
    cantidadCuotas: number;
    montoCuota: number;
    compartidoCon?: string;
    porcentajeCompartido?: number;
  }>> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$()
    ]).pipe(
      map(([tarjetas, gastos]) => {
        console.log('DEBUG - Tarjetas disponibles:', tarjetas.map(t => ({ id: t.id, nombre: t.nombre })));
        console.log('DEBUG - Gastos disponibles:', gastos.map(g => ({ id: g.id, tarjetaId: g.tarjetaId, descripcion: g.descripcion })));
        
        const tarjetasMap = new Map(tarjetas.map(t => [t.id, t.nombre] as const));
        console.log('DEBUG - TarjetasMap:', Array.from(tarjetasMap.entries()));
        
        const detalle: Array<{
          nombreTarjeta: string;
          descripcion: string;
          montoOriginal: number;
          cuotaActual: number;
          cantidadCuotas: number;
          montoCuota: number;
          compartidoCon?: string;
          porcentajeCompartido?: number;
        }> = [];

        gastos.forEach(gasto => {
          const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
          const montoCuota = gasto.montoPorCuota ?? Math.round((gasto.monto / cuotas) * 100) / 100;
          
          if (cuotas <= 1) {
            // Gasto de una sola vez: solo aparece en el mes de la fecha
            if (this.monthKeyFromISO(gasto.fecha) === monthKey) {
              const nombreTarjeta = tarjetasMap.get(gasto.tarjetaId);
              console.log(`DEBUG - Gasto ${gasto.descripcion}: tarjetaId=${gasto.tarjetaId}, nombreTarjeta=${nombreTarjeta}`);
              
              detalle.push({
                nombreTarjeta: nombreTarjeta || 'Tarjeta no encontrada',
                descripcion: gasto.descripcion,
                montoOriginal: gasto.monto,
                cuotaActual: 1,
                cantidadCuotas: 1,
                montoCuota: gasto.monto,
                compartidoCon: gasto.compartidoCon,
                porcentajeCompartido: gasto.porcentajeCompartido
              });
            }
          } else {
            // Gasto en cuotas: puede aparecer en múltiples meses
            const firstISO = this.firstMonthISOFromGasto(gasto);
            for (let i = 0; i < cuotas; i++) {
              const iso = this.addMonths(firstISO, i);
              if (iso.slice(0, 7) === monthKey) {
                const nombreTarjeta = tarjetasMap.get(gasto.tarjetaId);
                console.log(`DEBUG - Gasto en cuotas ${gasto.descripcion}: tarjetaId=${gasto.tarjetaId}, nombreTarjeta=${nombreTarjeta}`);
                
                detalle.push({
                  nombreTarjeta: nombreTarjeta || 'Tarjeta no encontrada',
                  descripcion: gasto.descripcion,
                  montoOriginal: gasto.monto,
                  cuotaActual: i + 1,
                  cantidadCuotas: cuotas,
                  montoCuota: montoCuota,
                  compartidoCon: gasto.compartidoCon,
                  porcentajeCompartido: gasto.porcentajeCompartido
                });
              }
            }
          }
        });

        // Ordenar por tarjeta y luego por descripción
        return detalle.sort((a, b) => 
          a.nombreTarjeta.localeCompare(b.nombreTarjeta) || 
          a.descripcion.localeCompare(b.descripcion)
        );
      })
    );
  }

  /**
   * Obtiene el detalle de gastos compartidos para un mes específico
   */
  getDetalleGastosCompartidosDelMes$(monthKey: string): Observable<Array<{
    descripcion: string;
    montoCuota: number;
    compartidoCon: string;
    porcentajeCompartido: number;
    montoCompartido: number;
  }>> {
    return this.gastoService.getGastos$().pipe(
      map(gastos => {
        const detalle: Array<{
          descripcion: string;
          montoCuota: number;
          compartidoCon: string;
          porcentajeCompartido: number;
          montoCompartido: number;
        }> = [];

        gastos.forEach(gasto => {
          // Solo procesar gastos compartidos
          if (!gasto.compartidoCon || gasto.porcentajeCompartido === undefined) {
            return;
          }

          const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
          const montoCuota = gasto.montoPorCuota ?? Math.round((gasto.monto / cuotas) * 100) / 100;
          
          if (cuotas <= 1) {
            // Gasto de una sola vez: solo aparece en el mes de la fecha
            if (this.monthKeyFromISO(gasto.fecha) === monthKey) {
              const montoCompartido = (montoCuota * gasto.porcentajeCompartido) / 100;
              detalle.push({
                descripcion: gasto.descripcion,
                montoCuota: montoCuota,
                compartidoCon: gasto.compartidoCon,
                porcentajeCompartido: gasto.porcentajeCompartido,
                montoCompartido: montoCompartido
              });
            }
          } else {
            // Gasto en cuotas: puede aparecer en múltiples meses
            const firstISO = this.firstMonthISOFromGasto(gasto);
            for (let i = 0; i < cuotas; i++) {
              const iso = this.addMonths(firstISO, i);
              if (iso.slice(0, 7) === monthKey) {
                const montoCompartido = (montoCuota * gasto.porcentajeCompartido) / 100;
                detalle.push({
                  descripcion: gasto.descripcion,
                  montoCuota: montoCuota,
                  compartidoCon: gasto.compartidoCon,
                  porcentajeCompartido: gasto.porcentajeCompartido,
                  montoCompartido: montoCompartido
                });
              }
            }
          }
        });

        // Ordenar por descripción
        return detalle.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
      })
      // NO usar shareReplay aquí para que siempre se cree un nuevo observable cuando cambia el mes
    );
  }

  /**
   * Obtiene el total que te debe cada persona para un mes específico
   */
  getTotalPorPersona$(monthKey: string): Observable<Array<{ persona: string; total: number }>> {
    // NO usar shareReplay aquí para que siempre se cree un nuevo observable cuando cambia el mes
    return this.getDetalleGastosCompartidosDelMes$(monthKey).pipe(
      map(detalle => {
        const totalesPorPersona: { [key: string]: number } = {};
        
        detalle.forEach(item => {
          if (!totalesPorPersona[item.compartidoCon]) {
            totalesPorPersona[item.compartidoCon] = 0;
          }
          totalesPorPersona[item.compartidoCon] += item.montoCompartido;
        });
        
        // Convertir a array y ordenar por nombre
        return Object.entries(totalesPorPersona)
          .map(([persona, total]) => ({ persona, total }))
          .sort((a, b) => a.persona.localeCompare(b.persona));
      })
    );
  }
}
