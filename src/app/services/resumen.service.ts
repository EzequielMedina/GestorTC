import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
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

  private monthKeyFromISO(isoDate: string): string {
    // isoDate esperado: YYYY-MM-DD
    return isoDate.slice(0, 7);
  }

  private firstMonthISOFromGasto(g: Gasto): string {
    // prioriza primerMesCuota si existe; si no, usa mes de fecha del gasto normalizado a día 1
    const base = g.primerMesCuota || (this.monthKeyFromISO(g.fecha) + '-01');
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
      })
    );
  }

  /**
   * Total del mes (YYYY-MM) considerando cuotas
   */
  getTotalDelMes$(monthKey: string): Observable<number> {
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
    );
  }

  /**
   * Porcentaje de uso total del mes (totalDelMes / limiteTotal * 100)
   */
  getPorcentajeUsoTotalDelMes$(monthKey: string): Observable<number> {
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
      map(tarjetas => tarjetas.reduce((total, tarjeta) => total + tarjeta.limite, 0))
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
}
