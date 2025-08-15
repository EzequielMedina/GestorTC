import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Gasto } from '../models/gasto.model';

const STORAGE_KEY = 'gestor_tc_gastos';

@Injectable({
  providedIn: 'root'
})
export class GastoService {
  private gastosSubject = new BehaviorSubject<Gasto[]>(this.loadFromStorage());

  constructor() {}

  /**
   * Obtiene todos los gastos como un Observable
   */
  getGastos$(): Observable<Gasto[]> {
    return this.gastosSubject.asObservable();
  }

  /**
   * Obtiene un gasto por su ID
   * @param id ID del gasto a buscar
   */
  getGastoById(id: string): Observable<Gasto | undefined> {
    return this.gastosSubject.pipe(
      map(gastos => gastos.find(g => g.id === id))
    );
  }

  /**
   * Obtiene los gastos filtrados por tarjeta
   * @param tarjetaId ID de la tarjeta para filtrar
   */
  getGastosPorTarjeta$(tarjetaId: string): Observable<Gasto[]> {
    return this.gastosSubject.pipe(
      map(gastos => gastos.filter(g => g.tarjetaId === tarjetaId))
    );
  }

  /**
   * Obtiene los gastos filtrados por rango de fechas
   * @param desde Fecha de inicio (opcional)
   * @param hasta Fecha de fin (opcional)
   */
  getGastosPorRangoFechas$(desde?: Date, hasta?: Date): Observable<Gasto[]> {
    return this.gastosSubject.pipe(
      map(gastos => {
        return gastos.filter(gasto => {
          const fechaGasto = new Date(gasto.fecha);
          const cumpleDesde = !desde || fechaGasto >= desde;
          const cumpleHasta = !hasta || fechaGasto <= hasta;
          return cumpleDesde && cumpleHasta;
        });
      })
    );
  }

  /**
   * Agrega un nuevo gasto
   * @param gasto Gasto a agregar (sin ID)
   */
  agregarGasto(gasto: Omit<Gasto, 'id'>): Observable<Gasto> {
    const nuevoGasto: Gasto = {
      ...gasto,
      id: uuidv4()
    };

    return this.actualizarGastos([...this.gastosSubject.value, nuevoGasto]).pipe(
      map(() => nuevoGasto)
    );
  }

  /**
   * Actualiza un gasto existente
   * @param id ID del gasto a actualizar
   * @param cambios Objeto con los cambios a aplicar
   */
  actualizarGasto(id: string, cambios: Partial<Omit<Gasto, 'id'>>): Observable<Gasto | undefined> {
    const gastoActual = this.gastosSubject.value.find(g => g.id === id);
    
    if (!gastoActual) {
      return of(undefined);
    }

    const gastoActualizado: Gasto = {
      ...gastoActual,
      ...cambios,
      id // Asegurarse de que el ID no se modifique
    };

    // Validar que si se marca como compartido, tenga los campos requeridos
    if (gastoActualizado.compartidoCon && gastoActualizado.porcentajeCompartido === undefined) {
      gastoActualizado.porcentajeCompartido = 50; // Valor por defecto si no se especifica
    }

    return this.actualizarGastos(
      this.gastosSubject.value.map(g => g.id === id ? gastoActualizado : g)
    ).pipe(
      map(() => gastoActualizado)
    );
  }

  /**
   * Elimina un gasto por su ID
   * @param id ID del gasto a eliminar
   */
  eliminarGasto(id: string): Observable<boolean> {
    const existe = this.gastosSubject.value.some(g => g.id === id);
    
    if (!existe) {
      return of(false);
    }

    return this.actualizarGastos(
      this.gastosSubject.value.filter(g => g.id !== id)
    ).pipe(
      map(() => true)
    );
  }

  /**
   * Reemplaza completamente la colección de gastos.
   * Útil para operaciones de importación.
   */
  reemplazarGastos(gastos: Gasto[]): Observable<Gasto[]> {
    return this.actualizarGastos(gastos);
  }

  /**
   * Calcula el total de gastos para una tarjeta específica
   * @param tarjetaId ID de la tarjeta (opcional, si no se proporciona calcula el total de todos los gastos)
   */
  calcularTotalGastos$(tarjetaId?: string): Observable<number> {
    return this.gastosSubject.pipe(
      map(gastos => {
        const gastosFiltrados = tarjetaId 
          ? gastos.filter(g => g.tarjetaId === tarjetaId)
          : gastos;
        
        return gastosFiltrados.reduce((total, gasto) => total + gasto.monto, 0);
      })
    );
  }

  /**
   * Actualiza la lista de gastos y guarda en el almacenamiento local
   * @param gastos Nueva lista de gastos
   */
  private actualizarGastos(gastos: Gasto[]): Observable<Gasto[]> {
    this.gastosSubject.next(gastos);
    this.saveToStorage(gastos);
    return of(gastos);
  }

  /**
   * Carga los gastos desde el almacenamiento local
   */
  private loadFromStorage(): Gasto[] {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
      console.error('Error al cargar gastos del almacenamiento local:', error);
      return [];
    }
  }

  /**
   * Guarda los gastos en el almacenamiento local
   */
  private saveToStorage(gastos: Gasto[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gastos));
    } catch (error) {
      console.error('Error al guardar gastos en el almacenamiento local:', error);
    }
  }
}
