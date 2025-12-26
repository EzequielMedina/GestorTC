import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { GastoRecurrente, FrecuenciaRecurrencia, InstanciaGastoRecurrente } from '../models/gasto-recurrente.model';
import { Gasto } from '../models/gasto.model';
import { GastoService } from './gasto';
import { TarjetaService } from './tarjeta';
import { CategoriaService } from './categoria.service';

const STORAGE_KEY_GASTOS_RECURRENTES = 'gestor_tc_gastos_recurrentes';
const STORAGE_KEY_INSTANCIAS = 'gestor_tc_instancias_gastos_recurrentes';

@Injectable({
  providedIn: 'root'
})
export class GastosRecurrentesService {
  private gastosRecurrentesSubject = new BehaviorSubject<GastoRecurrente[]>(this.loadFromStorage());
  public gastosRecurrentes$ = this.gastosRecurrentesSubject.asObservable();

  private instanciasSubject = new BehaviorSubject<InstanciaGastoRecurrente[]>(this.loadInstanciasFromStorage());
  public instancias$ = this.instanciasSubject.asObservable();

  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService
  ) {
    this.generarInstanciasPendientes();
  }

  /**
   * Obtiene todos los gastos recurrentes
   */
  getGastosRecurrentes$(): Observable<GastoRecurrente[]> {
    return this.gastosRecurrentes$;
  }

  /**
   * Obtiene las instancias de gastos recurrentes
   */
  getInstancias$(): Observable<InstanciaGastoRecurrente[]> {
    return this.instancias$;
  }

  /**
   * Obtiene instancias pendientes (no pagadas)
   */
  getInstanciasPendientes$(): Observable<InstanciaGastoRecurrente[]> {
    return this.instancias$.pipe(
      map(instancias => instancias.filter(i => !i.pagado))
    );
  }

  /**
   * Crea un nuevo gasto recurrente
   */
  crearGastoRecurrente(gasto: Omit<GastoRecurrente, 'id' | 'fechaCreacion' | 'activo'>): GastoRecurrente {
    const nuevo: GastoRecurrente = {
      ...gasto,
      id: uuidv4(),
      fechaCreacion: new Date().toISOString(),
      activo: true
    };

    const gastos = [...this.gastosRecurrentesSubject.value, nuevo];
    this.saveToStorage(gastos);
    this.gastosRecurrentesSubject.next(gastos);

    // Generar instancias futuras
    this.generarInstanciasParaSerie(nuevo);

    return nuevo;
  }

  /**
   * Actualiza un gasto recurrente
   */
  actualizarGastoRecurrente(id: string, cambios: Partial<GastoRecurrente>): void {
    const gastos = this.gastosRecurrentesSubject.value.map(g => 
      g.id === id 
        ? { ...g, ...cambios, fechaActualizacion: new Date().toISOString() }
        : g
    );
    this.saveToStorage(gastos);
    this.gastosRecurrentesSubject.next(gastos);

    // Regenerar instancias si cambió algo relevante
    if (cambios.diaVencimiento || cambios.frecuencia || cambios.fechaInicio || cambios.activo !== undefined) {
      this.generarInstanciasParaSerie(gastos.find(g => g.id === id)!);
    }
  }

  /**
   * Elimina un gasto recurrente
   */
  eliminarGastoRecurrente(id: string): void {
    const gastos = this.gastosRecurrentesSubject.value.filter(g => g.id !== id);
    this.saveToStorage(gastos);
    this.gastosRecurrentesSubject.next(gastos);

    // Eliminar instancias futuras
    const instancias = this.instanciasSubject.value.filter(i => i.serieRecurrenteId !== id || i.pagado);
    this.saveInstanciasToStorage(instancias);
    this.instanciasSubject.next(instancias);
  }

  /**
   * Genera instancias de gastos recurrentes para los próximos meses
   */
  private generarInstanciasPendientes(): void {
    combineLatest([
      this.gastosRecurrentes$,
      this.instancias$
    ]).subscribe(([series, instanciasExistentes]) => {
      const hoy = new Date();
      const nuevasInstancias: InstanciaGastoRecurrente[] = [];

      series.filter(s => s.activo).forEach(serie => {
        // Generar instancias para los próximos 12 meses
        for (let i = 0; i < 12; i++) {
          const fechaVencimiento = this.calcularFechaVencimiento(serie, i);
          
          // Verificar si ya existe una instancia para esta fecha
          const existe = instanciasExistentes.some(
            inst => inst.serieRecurrenteId === serie.id && 
                    inst.fechaVencimiento === fechaVencimiento
          );

          if (!existe && fechaVencimiento >= hoy.toISOString().split('T')[0]) {
            nuevasInstancias.push({
              id: uuidv4(),
              serieRecurrenteId: serie.id,
              fechaVencimiento,
              monto: serie.monto,
              pagado: false,
              fechaCreacion: new Date().toISOString()
            });
          }
        }
      });

      if (nuevasInstancias.length > 0) {
        const todasLasInstancias = [...instanciasExistentes, ...nuevasInstancias];
        this.saveInstanciasToStorage(todasLasInstancias);
        this.instanciasSubject.next(todasLasInstancias);
      }
    });
  }

  /**
   * Genera instancias para una serie específica
   */
  private generarInstanciasParaSerie(serie: GastoRecurrente): void {
    if (!serie.activo) return;

    const hoy = new Date();
    const instanciasExistentes = this.instanciasSubject.value;
    const nuevasInstancias: InstanciaGastoRecurrente[] = [];

    // Generar instancias para los próximos 12 meses
    for (let i = 0; i < 12; i++) {
      const fechaVencimiento = this.calcularFechaVencimiento(serie, i);
      
      const existe = instanciasExistentes.some(
        inst => inst.serieRecurrenteId === serie.id && 
                inst.fechaVencimiento === fechaVencimiento
      );

      if (!existe && fechaVencimiento >= hoy.toISOString().split('T')[0]) {
        nuevasInstancias.push({
          id: uuidv4(),
          serieRecurrenteId: serie.id,
          fechaVencimiento,
          monto: serie.monto,
          pagado: false,
          fechaCreacion: new Date().toISOString()
        });
      }
    }

    if (nuevasInstancias.length > 0) {
      const todasLasInstancias = [...instanciasExistentes, ...nuevasInstancias];
      this.saveInstanciasToStorage(todasLasInstancias);
      this.instanciasSubject.next(todasLasInstancias);
    }
  }

  /**
   * Calcula la fecha de vencimiento para una instancia
   */
  private calcularFechaVencimiento(serie: GastoRecurrente, mesesAdelante: number): string {
    const fechaInicio = new Date(serie.fechaInicio);
    const mesesPorFrecuencia = this.getMesesPorFrecuencia(serie.frecuencia);
    
    const fechaVencimiento = new Date(
      fechaInicio.getFullYear(),
      fechaInicio.getMonth() + (mesesPorFrecuencia * mesesAdelante),
      serie.diaVencimiento
    );

    return fechaVencimiento.toISOString().split('T')[0];
  }

  /**
   * Obtiene la cantidad de meses según la frecuencia
   */
  private getMesesPorFrecuencia(frecuencia: FrecuenciaRecurrencia): number {
    switch (frecuencia) {
      case 'MENSUAL': return 1;
      case 'BIMESTRAL': return 2;
      case 'TRIMESTRAL': return 3;
      case 'SEMESTRAL': return 6;
      case 'ANUAL': return 12;
      default: return 1;
    }
  }

  /**
   * Marca una instancia como pagada
   */
  marcarComoPagado(instanciaId: string, fechaPago?: string): void {
    const instancias = this.instanciasSubject.value.map(inst => 
      inst.id === instanciaId
        ? { ...inst, pagado: true, fechaPago: fechaPago || new Date().toISOString().split('T')[0] }
        : inst
    );
    this.saveInstanciasToStorage(instancias);
    this.instanciasSubject.next(instancias);

    // Crear gasto real si está pagado
    this.crearGastoDesdeInstancia(instancias.find(i => i.id === instanciaId)!);
  }

  /**
   * Marca una instancia como no pagada
   */
  marcarComoNoPagado(instanciaId: string): void {
    const instancias = this.instanciasSubject.value.map(inst => 
      inst.id === instanciaId
        ? { ...inst, pagado: false, fechaPago: undefined }
        : inst
    );
    this.saveInstanciasToStorage(instancias);
    this.instanciasSubject.next(instancias);
  }

  /**
   * Crea un gasto real desde una instancia pagada
   */
  private crearGastoDesdeInstancia(instancia: InstanciaGastoRecurrente): void {
    combineLatest([
      this.gastosRecurrentes$,
      this.gastoService.getGastos$()
    ]).subscribe(([series, gastos]) => {
      const serie = series.find(s => s.id === instancia.serieRecurrenteId);
      if (!serie) return;

      // Verificar si ya existe un gasto para esta instancia
      const existeGasto = gastos.some(g => 
        g.serieRecurrenteId === serie.id &&
        g.fecha === instancia.fechaVencimiento &&
        g.pagado === true
      );

      if (!existeGasto) {
        const gasto: Gasto = {
          id: uuidv4(),
          tarjetaId: serie.tarjetaId,
          descripcion: serie.descripcion,
          monto: instancia.monto,
          fecha: instancia.fechaVencimiento,
          categoriaId: serie.categoriaId,
          pagado: true,
          serieRecurrenteId: serie.id
        };

        this.gastoService.agregarGasto(gasto).subscribe();
      }
    });
  }

  // Métodos de persistencia

  private loadFromStorage(): GastoRecurrente[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GASTOS_RECURRENTES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error al cargar gastos recurrentes:', error);
      return [];
    }
  }

  private saveToStorage(gastos: GastoRecurrente[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_GASTOS_RECURRENTES, JSON.stringify(gastos));
    } catch (error) {
      console.error('Error al guardar gastos recurrentes:', error);
    }
  }

  private loadInstanciasFromStorage(): InstanciaGastoRecurrente[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INSTANCIAS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error al cargar instancias:', error);
      return [];
    }
  }

  private saveInstanciasToStorage(instancias: InstanciaGastoRecurrente[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_INSTANCIAS, JSON.stringify(instancias));
    } catch (error) {
      console.error('Error al guardar instancias:', error);
    }
  }
}

