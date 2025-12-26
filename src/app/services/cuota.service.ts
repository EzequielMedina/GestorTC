import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Cuota, ResumenCuotasMes } from '../models/cuota.model';
import { Gasto } from '../models/gasto.model';
import { GastoService } from './gasto';
import { TarjetaService } from './tarjeta';

const STORAGE_KEY = 'gestor_tc_cuotas';

@Injectable({
  providedIn: 'root'
})
export class CuotaService {
  private cuotasSubject = new BehaviorSubject<Cuota[]>(this.loadFromStorage());
  public cuotas$ = this.cuotasSubject.asObservable();

  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService
  ) {
    this.generarCuotasDesdeGastos();
  }

  /**
   * Genera cuotas automáticamente desde los gastos
   */
  private generarCuotasDesdeGastos(): void {
    combineLatest([
      this.gastoService.getGastos$(),
      this.cuotas$
    ]).pipe(
      map(([gastos, cuotasExistentes]) => {
        const cuotasNuevas: Cuota[] = [];
        const gastosIdsConCuotas = new Set(cuotasExistentes.map(c => c.gastoId));

        gastos.forEach(gasto => {
          if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
            // Solo generar si no hay cuotas existentes para este gasto
            if (!gastosIdsConCuotas.has(gasto.id)) {
              const primerMes = gasto.primerMesCuota || this.obtenerMesDesdeFecha(gasto.fecha);
              const montoPorCuota = gasto.montoPorCuota || (gasto.monto / gasto.cantidadCuotas);
              
              // Obtener día de vencimiento de la tarjeta
              const tarjeta = this.tarjetaService['tarjetasSubject']?.value?.find(t => t.id === gasto.tarjetaId);
              const diaVencimiento = tarjeta?.diaVencimiento || 1;

              for (let i = 0; i < gasto.cantidadCuotas; i++) {
                const fechaVencimiento = this.calcularFechaVencimiento(primerMes, i, diaVencimiento);
                cuotasNuevas.push({
                  id: uuidv4(),
                  gastoId: gasto.id,
                  numeroCuota: i + 1,
                  fechaVencimiento,
                  monto: montoPorCuota,
                  estado: 'PENDIENTE'
                });
              }
            }
          }
        });

        if (cuotasNuevas.length > 0) {
          const todasLasCuotas = [...cuotasExistentes, ...cuotasNuevas];
          this.guardarCuotas(todasLasCuotas);
          this.cuotasSubject.next(todasLasCuotas);
        }
      })
    ).subscribe();
  }

  /**
   * Obtiene todas las cuotas
   */
  getCuotas$(): Observable<Cuota[]> {
    return this.cuotas$;
  }

  /**
   * Obtiene cuotas por estado
   */
  getCuotasPorEstado$(estado: 'PENDIENTE' | 'PAGADA' | 'ADELANTADA'): Observable<Cuota[]> {
    return this.cuotas$.pipe(
      map(cuotas => cuotas.filter(c => c.estado === estado))
    );
  }

  /**
   * Obtiene cuotas pendientes próximas a vencer
   */
  getCuotasProximasAVencer$(dias: number = 7): Observable<Cuota[]> {
    return this.cuotas$.pipe(
      map(cuotas => {
        const hoy = new Date();
        const fechaLimite = new Date();
        fechaLimite.setDate(hoy.getDate() + dias);

        return cuotas.filter(c => {
          if (c.estado !== 'PENDIENTE') return false;
          const fechaVenc = new Date(c.fechaVencimiento);
          return fechaVenc >= hoy && fechaVenc <= fechaLimite;
        }).sort((a, b) => 
          new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
        );
      })
    );
  }

  /**
   * Marca una cuota como pagada
   */
  marcarComoPagada(cuotaId: string, fechaPago?: string): Observable<boolean> {
    const cuotas = this.cuotasSubject.value;
    const cuota = cuotas.find(c => c.id === cuotaId);
    
    if (!cuota) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    cuota.estado = 'PAGADA';
    cuota.fechaPago = fechaPago || new Date().toISOString().split('T')[0];

    this.guardarCuotas(cuotas);
    this.cuotasSubject.next(cuotas);

    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Obtiene resumen de cuotas por mes
   * SOLO incluye cuotas (instalments), NO gastos sin cuotas
   */
  getResumenPorMes$(mes: string): Observable<ResumenCuotasMes> {
    return this.cuotas$.pipe(
      map(cuotas => {
        // Solo cuotas que vencen en este mes
        const cuotasDelMes = cuotas.filter(c => c.fechaVencimiento.startsWith(mes));
        const pendientes = cuotasDelMes.filter(c => c.estado === 'PENDIENTE');
        const pagadas = cuotasDelMes.filter(c => c.estado === 'PAGADA');

        return {
          mes,
          totalPendiente: pendientes.reduce((sum, c) => sum + c.monto, 0),
          totalPagado: pagadas.reduce((sum, c) => sum + c.monto, 0),
          cantidadPendientes: pendientes.length,
          cantidadPagadas: pagadas.length,
          cuotas: cuotasDelMes
        };
      })
    );
  }

  /**
   * Adelanta una cuota (marca como pagada antes de su vencimiento)
   */
  adelantarCuota(cuotaId: string, fechaPago?: string): Observable<boolean> {
    const cuotas = this.cuotasSubject.value;
    const cuota = cuotas.find(c => c.id === cuotaId);
    
    if (!cuota || cuota.estado !== 'PENDIENTE') {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    cuota.estado = 'ADELANTADA';
    cuota.fechaPago = fechaPago || new Date().toISOString().split('T')[0];

    this.guardarCuotas(cuotas);
    this.cuotasSubject.next(cuotas);

    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Obtiene cuotas por tarjeta
   */
  getCuotasPorTarjeta$(tarjetaId: string): Observable<Cuota[]> {
    return combineLatest([
      this.cuotas$,
      this.gastoService.getGastos$()
    ]).pipe(
      map(([cuotas, gastos]) => {
        const gastosDeTarjeta = gastos.filter(g => g.tarjetaId === tarjetaId);
        const gastosIds = new Set(gastosDeTarjeta.map(g => g.id));
        return cuotas.filter(c => gastosIds.has(c.gastoId));
      })
    );
  }

  /**
   * Marca todas las cuotas pendientes de una tarjeta como pagadas
   * @param tarjetaId ID de la tarjeta
   * @param fechaPago Fecha de pago (opcional, por defecto hoy)
   * @param mesFiltro Mes en formato YYYY-MM para filtrar las cuotas (opcional)
   */
  marcarTodasCuotasTarjetaComoPagadas(tarjetaId: string, fechaPago?: string, mesFiltro?: string): Observable<number> {
    return combineLatest([
      this.cuotas$,
      this.gastoService.getGastos$()
    ]).pipe(
      map(([cuotas, gastos]) => {
        const gastosDeTarjeta = gastos.filter(g => g.tarjetaId === tarjetaId);
        const gastosIds = new Set(gastosDeTarjeta.map(g => g.id));
        let cuotasDeTarjeta = cuotas.filter(c => 
          gastosIds.has(c.gastoId) && c.estado === 'PENDIENTE'
        );

        // Filtrar por mes si se proporciona
        if (mesFiltro) {
          cuotasDeTarjeta = cuotasDeTarjeta.filter(c => 
            c.fechaVencimiento.startsWith(mesFiltro)
          );
        }

        const fechaPagoStr = fechaPago || new Date().toISOString().split('T')[0];
        let marcadas = 0;

        cuotasDeTarjeta.forEach(cuota => {
          cuota.estado = 'PAGADA';
          cuota.fechaPago = fechaPagoStr;
          marcadas++;
        });

        if (marcadas > 0) {
          this.guardarCuotas(cuotas);
          this.cuotasSubject.next(cuotas);
        }

        return marcadas;
      })
    );
  }

  /**
   * Obtiene cuotas por rango de fechas
   */
  getCuotasPorRango$(fechaInicio: string, fechaFin: string): Observable<Cuota[]> {
    return this.cuotas$.pipe(
      map(cuotas => {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return cuotas.filter(c => {
          const fechaVenc = new Date(c.fechaVencimiento);
          return fechaVenc >= inicio && fechaVenc <= fin;
        });
      })
    );
  }

  /**
   * Obtiene el total a pagar en un mes específico
   */
  getTotalAPagarEnMes$(mes: string): Observable<number> {
    return this.getResumenPorMes$(mes).pipe(
      map(resumen => resumen.totalPendiente)
    );
  }

  private calcularFechaVencimiento(primerMes: string, numeroCuota: number, diaVencimiento?: number): string {
    const [anio, mes] = primerMes.split('-').map(Number);
    const fecha = new Date(anio, mes - 1 + numeroCuota, diaVencimiento || 1);
    return fecha.toISOString().split('T')[0];
  }

  private obtenerMesDesdeFecha(fecha: string): string {
    const d = new Date(fecha);
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${anio}-${mes}`;
  }

  private loadFromStorage(): Cuota[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar cuotas:', error);
    }
    return [];
  }

  private guardarCuotas(cuotas: Cuota[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cuotas));
    } catch (error) {
      console.error('Error al guardar cuotas:', error);
    }
  }
}

