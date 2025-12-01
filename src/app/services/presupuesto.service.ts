import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Presupuesto, PresupuestoSeguimiento, TipoPresupuesto } from '../models/presupuesto.model';
import { Gasto } from '../models/gasto.model';
import { GastoService } from './gasto';
import { ResumenService } from './resumen.service';

const STORAGE_KEY = 'gestor_tc_presupuestos';

@Injectable({
  providedIn: 'root'
})
export class PresupuestoService {
  private presupuestosSubject = new BehaviorSubject<Presupuesto[]>(this.loadFromStorage());
  public presupuestos$ = this.presupuestosSubject.asObservable();

  constructor(
    private gastoService: GastoService,
    private resumenService: ResumenService
  ) {}

  /**
   * Obtiene todos los presupuestos como Observable
   */
  getPresupuestos$(): Observable<Presupuesto[]> {
    return this.presupuestosSubject.asObservable();
  }

  /**
   * Obtiene presupuestos activos para un mes específico
   */
  getPresupuestosPorMes$(mes: string): Observable<Presupuesto[]> {
    return this.presupuestosSubject.pipe(
      map(presupuestos => presupuestos.filter(p => p.mes === mes && p.activo))
    );
  }

  /**
   * Obtiene presupuestos con seguimiento
   */
  getPresupuestosConSeguimiento$(mes: string): Observable<PresupuestoSeguimiento[]> {
    return combineLatest([
      this.presupuestosSubject,
      this.gastoService.getGastos$()
    ]).pipe(
      map(([presupuestos, gastos]) => {
        const presupuestosMes = presupuestos.filter(p => p.mes === mes && p.activo);
        
        return presupuestosMes.map(presupuesto => {
          const gastado = this.calcularGastado(presupuesto, gastos, mes);
          const disponible = presupuesto.monto - gastado;
          const porcentajeUsado = presupuesto.monto > 0 ? (gastado / presupuesto.monto) * 100 : 0;
          const porcentajeRestante = 100 - porcentajeUsado;
          
          let estado: 'dentro' | 'cerca' | 'excedido' = 'dentro';
          if (porcentajeUsado >= 100) {
            estado = 'excedido';
          } else if (porcentajeUsado >= 80) {
            estado = 'cerca';
          }

          return {
            ...presupuesto,
            gastado,
            disponible,
            porcentajeUsado,
            porcentajeRestante,
            estado
          };
        });
      })
    );
  }

  /**
   * Calcula el monto gastado para un presupuesto
   */
  private calcularGastado(presupuesto: Presupuesto, gastos: Gasto[], mes: string): number {
    const [anio, mesNum] = mes.split('-').map(Number);
    
    if (presupuesto.tipo === 'CATEGORIA' && presupuesto.categoriaId) {
      // Sumar gastos de la categoría en el mes
      return gastos
        .filter(gasto => {
          if (gasto.categoriaId !== presupuesto.categoriaId) return false;
          
          // Verificar si el gasto impacta en el mes
          const fechaGasto = new Date(gasto.fecha);
          const mesGasto = fechaGasto.getFullYear() * 12 + fechaGasto.getMonth() + 1;
          const mesObjetivo = anio * 12 + mesNum;
          
          // Si tiene cuotas, verificar si alguna cuota cae en el mes
          if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1 && gasto.primerMesCuota) {
            const primerMes = new Date(gasto.primerMesCuota + '-01');
            const primerMesNum = primerMes.getFullYear() * 12 + primerMes.getMonth() + 1;
            
            for (let i = 0; i < gasto.cantidadCuotas; i++) {
              if (primerMesNum + i === mesObjetivo) {
                return true;
              }
            }
            return false;
          }
          
          return mesGasto === mesObjetivo;
        })
        .reduce((sum, gasto) => {
          if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
            return sum + (gasto.montoPorCuota || gasto.monto / gasto.cantidadCuotas);
          }
          return sum + gasto.monto;
        }, 0);
    } else if (presupuesto.tipo === 'TARJETA' && presupuesto.tarjetaId) {
      // Sumar gastos de la tarjeta en el mes
      return gastos
        .filter(gasto => {
          if (gasto.tarjetaId !== presupuesto.tarjetaId) return false;
          
          const fechaGasto = new Date(gasto.fecha);
          const mesGasto = fechaGasto.getFullYear() * 12 + fechaGasto.getMonth() + 1;
          const mesObjetivo = anio * 12 + mesNum;
          
          if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1 && gasto.primerMesCuota) {
            const primerMes = new Date(gasto.primerMesCuota + '-01');
            const primerMesNum = primerMes.getFullYear() * 12 + primerMes.getMonth() + 1;
            
            for (let i = 0; i < gasto.cantidadCuotas; i++) {
              if (primerMesNum + i === mesObjetivo) {
                return true;
              }
            }
            return false;
          }
          
          return mesGasto === mesObjetivo;
        })
        .reduce((sum, gasto) => {
          if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
            return sum + (gasto.montoPorCuota || gasto.monto / gasto.cantidadCuotas);
          }
          return sum + gasto.monto;
        }, 0);
    }
    
    return 0;
  }

  /**
   * Agrega un nuevo presupuesto
   */
  agregarPresupuesto(presupuesto: Omit<Presupuesto, 'id' | 'fechaCreacion'>): Observable<Presupuesto> {
    const nuevoPresupuesto: Presupuesto = {
      ...presupuesto,
      id: uuidv4(),
      fechaCreacion: new Date().toISOString()
    };

    return this.actualizarPresupuestos([...this.presupuestosSubject.value, nuevoPresupuesto]).pipe(
      map(() => nuevoPresupuesto)
    );
  }

  /**
   * Actualiza un presupuesto existente
   */
  actualizarPresupuesto(id: string, cambios: Partial<Omit<Presupuesto, 'id' | 'fechaCreacion'>>): Observable<Presupuesto | undefined> {
    const presupuestoActual = this.presupuestosSubject.value.find(p => p.id === id);
    
    if (!presupuestoActual) {
      return new Observable(observer => {
        observer.next(undefined);
        observer.complete();
      });
    }

    const presupuestoActualizado: Presupuesto = {
      ...presupuestoActual,
      ...cambios,
      id
    };

    return this.actualizarPresupuestos(
      this.presupuestosSubject.value.map(p => p.id === id ? presupuestoActualizado : p)
    ).pipe(
      map(() => presupuestoActualizado)
    );
  }

  /**
   * Elimina un presupuesto
   */
  eliminarPresupuesto(id: string): Observable<boolean> {
    const presupuestosActualizados = this.presupuestosSubject.value.filter(p => p.id !== id);
    return this.actualizarPresupuestos(presupuestosActualizados).pipe(
      map(() => true)
    );
  }

  /**
   * Actualiza el estado de los presupuestos y persiste en localStorage
   */
  private actualizarPresupuestos(presupuestos: Presupuesto[]): Observable<void> {
    return new Observable(observer => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presupuestos));
        this.presupuestosSubject.next(presupuestos);
        observer.next();
        observer.complete();
      } catch (error) {
        console.error('Error al guardar presupuestos:', error);
        observer.error(error);
      }
    });
  }

  /**
   * Carga los presupuestos desde localStorage
   */
  private loadFromStorage(): Presupuesto[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar presupuestos:', error);
    }
    return [];
  }
}

