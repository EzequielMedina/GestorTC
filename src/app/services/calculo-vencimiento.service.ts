import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { TarjetaService } from './tarjeta';
import { GastoService } from './gasto';
import { ResumenService } from './resumen.service';
import { Tarjeta } from '../models/tarjeta.model';
import { Gasto } from '../models/gasto.model';
import { DatosVencimientoTarjeta } from '../models/notificacion.model';

/**
 * Interfaz para el resumen de vencimiento de una tarjeta
 */
export interface ResumenVencimientoTarjeta {
  tarjeta: Tarjeta;
  montoTotalAdeudado: number;
  montoMesActual: number;
  montoProximoMes: number;
  porcentajeUso: number;
  saldoDisponible: number;
  diasHastaVencimiento: number;
  gastosRecientes: Gasto[];
  cuotasPendientes: {
    descripcion: string;
    montoCuota: number;
    cuotaActual: number;
    cantidadCuotas: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class CalculoVencimientoService {

  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private resumenService: ResumenService
  ) {}

  /**
   * Obtiene los datos de vencimiento para una tarjeta específica
   */
  getDatosVencimientoTarjeta$(tarjetaId: string): Observable<DatosVencimientoTarjeta | null> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$()
    ]).pipe(
      map(([tarjetas, gastos]: [Tarjeta[], Gasto[]]) => {
        const tarjeta = tarjetas.find((t: Tarjeta) => t.id === tarjetaId);
        if (!tarjeta) return null;

        const gastosTarjeta = gastos.filter((g: Gasto) => g.tarjetaId === tarjetaId);
        const fechaActual = new Date();
        const mesActual = this.getMonthKey(fechaActual);
        const fechaProximoMes = new Date(fechaActual);
        fechaProximoMes.setMonth(fechaActual.getMonth() + 1);
        const proximoMes = this.getMonthKey(fechaProximoMes);

        // Calcular montos
        const montoTotalAdeudado = this.calcularMontoTotalAdeudado(gastosTarjeta);
        const montoMesActual = this.calcularMontoMes(gastosTarjeta, mesActual);
        const montoProximoMes = this.calcularMontoMes(gastosTarjeta, proximoMes);
        
        // Calcular porcentaje de uso y saldo disponible
        const porcentajeUso = tarjeta.limite > 0 ? (montoTotalAdeudado / tarjeta.limite) * 100 : 0;
        const saldoDisponible = Math.max(0, tarjeta.limite - montoTotalAdeudado);
        
        // Calcular días hasta vencimiento
        const diasHastaVencimiento = this.calcularDiasHastaVencimiento(tarjeta);
        
        // Obtener gastos recientes (últimos 30 días)
        const gastosRecientes = this.getGastosRecientes(gastosTarjeta, 30);
        
        // Obtener cuotas pendientes para el próximo mes
        const cuotasPendientes = this.getCuotasPendientes(gastosTarjeta, proximoMes);

        return {
          tarjetaId: tarjeta.id,
          nombreTarjeta: tarjeta.nombre,
          banco: tarjeta.banco || 'No especificado',
          diaVencimiento: tarjeta.diaVencimiento!,
          montoAPagar: montoMesActual,
          montoAdeudado: montoMesActual,
          montoProximoMes,
          porcentajeUso: Math.min(100, Math.max(0, porcentajeUso)),
          saldoDisponible,
          diasHastaVencimiento,
          fechaVencimiento: this.getFechaVencimiento(tarjeta),
          ultimosDigitos: tarjeta.ultimosDigitos,
          gastosRecientes: gastosRecientes.length,
          cuotasPendientes: cuotasPendientes.length
        };
      })
    );
  }

  /**
   * Obtiene el resumen completo de vencimiento para una tarjeta
   */
  getResumenVencimientoTarjeta$(tarjetaId: string): Observable<ResumenVencimientoTarjeta | null> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$()
    ]).pipe(
      map(([tarjetas, gastos]) => {
        const tarjeta = tarjetas.find(t => t.id === tarjetaId);
        if (!tarjeta) return null;

        const gastosTarjeta = gastos.filter(g => g.tarjetaId === tarjetaId);
        const fechaActual = new Date();
        const mesActual = this.getMonthKey(fechaActual);
        const fechaProximoMes = new Date(fechaActual);
        fechaProximoMes.setMonth(fechaActual.getMonth() + 1);
        const proximoMes = this.getMonthKey(fechaProximoMes);

        // Calcular todos los montos
        const montoTotalAdeudado = this.calcularMontoTotalAdeudado(gastosTarjeta);
        const montoMesActual = this.calcularMontoMes(gastosTarjeta, mesActual);
        const montoProximoMes = this.calcularMontoMes(gastosTarjeta, proximoMes);
        
        const porcentajeUso = tarjeta.limite > 0 ? (montoTotalAdeudado / tarjeta.limite) * 100 : 0;
        const saldoDisponible = Math.max(0, tarjeta.limite - montoTotalAdeudado);
        const diasHastaVencimiento = this.calcularDiasHastaVencimiento(tarjeta);
        const gastosRecientes = this.getGastosRecientes(gastosTarjeta, 30);
        const cuotasPendientes = this.getCuotasPendientes(gastosTarjeta, proximoMes);

        return {
          tarjeta,
          montoTotalAdeudado,
          montoMesActual,
          montoProximoMes,
          porcentajeUso: Math.min(100, Math.max(0, porcentajeUso)),
          saldoDisponible,
          diasHastaVencimiento,
          gastosRecientes,
          cuotasPendientes
        };
      })
    );
  }

  /**
   * Filtra las tarjetas que vencen según el día y la anticipación configurada
   */
  filtrarTarjetasQueVencen(
    tarjetas: Tarjeta[], 
    diaHoy: number, 
    diasAnticipacion: number
  ): Tarjeta[] {
    return tarjetas.filter(tarjeta => {
      if (!tarjeta.diaVencimiento) return false;
      
      const diasHastaVencimiento = this.calcularDiasHastaVencimiento(tarjeta);
      return diasHastaVencimiento >= 0 && diasHastaVencimiento <= diasAnticipacion;
    });
  }

  /**
   * Obtiene todas las tarjetas que vencen en los próximos días
   */
  getTarjetasProximasAVencer$(diasAnticipacion: number = 3): Observable<DatosVencimientoTarjeta[]> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$()
    ]).pipe(
      map(([tarjetas, gastos]: [Tarjeta[], Gasto[]]) => {
        const fechaActual = new Date();
        const tarjetasVencimiento: DatosVencimientoTarjeta[] = [];

        tarjetas.forEach((tarjeta: Tarjeta) => {
          const diasHastaVencimiento = this.calcularDiasHastaVencimiento(tarjeta);
          
          // Solo incluir tarjetas que vencen dentro del período de anticipación
          if (diasHastaVencimiento >= 0 && diasHastaVencimiento <= diasAnticipacion) {
            const gastosTarjeta = gastos.filter((g: Gasto) => g.tarjetaId === tarjeta.id);
            const mesActual = this.getMonthKey(fechaActual);
            const fechaProximoMes = new Date(fechaActual);
            fechaProximoMes.setMonth(fechaActual.getMonth() + 1);
            const proximoMes = this.getMonthKey(fechaProximoMes);
            
            const montoTotalAdeudado = this.calcularMontoTotalAdeudado(gastosTarjeta);
            const montoMesActual = this.calcularMontoMes(gastosTarjeta, mesActual);
            const montoProximoMes = this.calcularMontoMes(gastosTarjeta, proximoMes);
            
            const porcentajeUso = tarjeta.limite > 0 ? (montoTotalAdeudado / tarjeta.limite) * 100 : 0;
            const saldoDisponible = Math.max(0, tarjeta.limite - montoTotalAdeudado);
            const gastosRecientes = this.getGastosRecientes(gastosTarjeta, 30);
            const cuotasPendientes = this.getCuotasPendientes(gastosTarjeta, proximoMes);

            tarjetasVencimiento.push({
              tarjetaId: tarjeta.id,
              nombreTarjeta: tarjeta.nombre,
              banco: tarjeta.banco || 'No especificado',
              diaVencimiento: tarjeta.diaVencimiento!,
              montoAPagar: montoMesActual,
              montoAdeudado: montoMesActual,
              montoProximoMes,
              porcentajeUso: Math.min(100, Math.max(0, porcentajeUso)),
              saldoDisponible,
              diasHastaVencimiento,
              fechaVencimiento: this.getFechaVencimiento(tarjeta),
              ultimosDigitos: tarjeta.ultimosDigitos,
              gastosRecientes: gastosRecientes.length,
              cuotasPendientes: cuotasPendientes.length
            });
          }
        });

        // Ordenar por días hasta vencimiento (más próximas primero)
        return tarjetasVencimiento.sort((a, b) => a.diasHastaVencimiento - b.diasHastaVencimiento);
      })
    );
  }

  /**
   * Calcula el monto total adeudado de una tarjeta (suma de todos los gastos)
   */
  private calcularMontoTotalAdeudado(gastos: Gasto[]): number {
    return gastos.reduce((total, gasto) => total + gasto.monto, 0);
  }

  /**
   * Calcula el monto a pagar en un mes específico considerando cuotas
   */
  private calcularMontoMes(gastos: Gasto[], monthKey: string): number {
    return gastos.reduce((total, gasto) => {
      return total + this.gastoImpactaMes(gasto, monthKey);
    }, 0);
  }

  /**
   * Calcula cuánto impacta un gasto en un mes específico
   * (Lógica similar a ResumenService)
   */
  private gastoImpactaMes(gasto: Gasto, monthKey: string): number {
    const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
    
    if (cuotas <= 1) {
      // Gasto de una sola vez
      const gastoMonthKey = this.monthKeyFromISO(gasto.fecha);
      return gastoMonthKey === monthKey ? gasto.monto : 0;
    }
    
    // Gasto en cuotas
    const montoCuota = gasto.montoPorCuota ?? Math.round((gasto.monto / cuotas) * 100) / 100;
    const firstISO = this.firstMonthISOFromGasto(gasto);
    
    for (let i = 0; i < cuotas; i++) {
      const cuotaISO = this.addMonths(firstISO, i);
      if (cuotaISO.slice(0, 7) === monthKey) {
        return montoCuota;
      }
    }
    
    return 0;
  }

  /**
   * Calcula los días hasta el vencimiento de la tarjeta
   */
  private calcularDiasHastaVencimiento(tarjeta: Tarjeta): number {
    const fechaActual = new Date();
    const fechaVencimiento = this.getFechaVencimiento(tarjeta);
    
    const diffTime = fechaVencimiento.getTime() - fechaActual.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene la fecha de vencimiento de la tarjeta para el mes actual
   */
  private getFechaVencimiento(tarjeta: Tarjeta): Date {
    const fechaActual = new Date();
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    
    // Crear fecha de vencimiento para el mes actual
    const fechaVencimiento = new Date(año, mes, tarjeta.diaVencimiento);
    
    // Si ya pasó el vencimiento de este mes, usar el del próximo mes
    if (fechaVencimiento < fechaActual) {
      fechaVencimiento.setMonth(mes + 1);
    }
    
    return fechaVencimiento;
  }

  /**
   * Obtiene los gastos recientes (últimos N días)
   */
  private getGastosRecientes(gastos: Gasto[], dias: number): Gasto[] {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    return gastos.filter(gasto => {
      const fechaGasto = new Date(gasto.fecha);
      return fechaGasto >= fechaLimite;
    });
  }

  /**
   * Obtiene las cuotas pendientes para un mes específico
   */
  private getCuotasPendientes(gastos: Gasto[], monthKey: string): {
    descripcion: string;
    montoCuota: number;
    cuotaActual: number;
    cantidadCuotas: number;
  }[] {
    const cuotasPendientes: {
      descripcion: string;
      montoCuota: number;
      cuotaActual: number;
      cantidadCuotas: number;
    }[] = [];

    gastos.forEach(gasto => {
      const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
      
      if (cuotas > 1) {
        const montoCuota = gasto.montoPorCuota ?? Math.round((gasto.monto / cuotas) * 100) / 100;
        const firstISO = this.firstMonthISOFromGasto(gasto);
        
        for (let i = 0; i < cuotas; i++) {
          const cuotaISO = this.addMonths(firstISO, i);
          if (cuotaISO.slice(0, 7) === monthKey) {
            cuotasPendientes.push({
              descripcion: gasto.descripcion,
              montoCuota,
              cuotaActual: i + 1,
              cantidadCuotas: cuotas
            });
            break;
          }
        }
      }
    });

    return cuotasPendientes;
  }

  // Métodos auxiliares (similares a ResumenService)
  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private monthKeyFromISO(isoString: string): string {
    return isoString.slice(0, 7); // YYYY-MM
  }

  private firstMonthISOFromGasto(gasto: Gasto): string {
    if (gasto.primerMesCuota) {
      return gasto.primerMesCuota;
    }
    return gasto.fecha.slice(0, 7) + '-01';
  }

  private addMonths(isoString: string, months: number): string {
    const date = new Date(isoString);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().slice(0, 10);
  }
}