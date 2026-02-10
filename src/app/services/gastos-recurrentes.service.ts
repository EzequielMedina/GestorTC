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
      hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
      const hoyISO = hoy.toISOString().split('T')[0];
      const nuevasInstancias: InstanciaGastoRecurrente[] = [];
      const fechasGeneradas = new Set<string>(); // Para evitar duplicados en esta ejecución

      series.filter(s => s.activo).forEach(serie => {
        // Generar instancias para los próximos 12 meses
        for (let i = 0; i < 12; i++) {
          const fechaVencimiento = this.calcularFechaVencimiento(serie, i);
          const claveInstancia = `${serie.id}-${fechaVencimiento}`;
          
          // Verificar si ya existe una instancia para esta fecha (en almacenamiento)
          const existeEnStorage = instanciasExistentes.some(
            inst => inst.serieRecurrenteId === serie.id && 
                    inst.fechaVencimiento === fechaVencimiento
          );

          // Verificar si ya se generó en esta ejecución
          const existeEnEstaEjecucion = fechasGeneradas.has(claveInstancia);

          if (!existeEnStorage && !existeEnEstaEjecucion && fechaVencimiento >= hoyISO) {
            nuevasInstancias.push({
              id: uuidv4(),
              serieRecurrenteId: serie.id,
              fechaVencimiento,
              monto: serie.monto,
              pagado: false,
              fechaCreacion: new Date().toISOString()
            });
            fechasGeneradas.add(claveInstancia);
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
    hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    const hoyISO = hoy.toISOString().split('T')[0];
    const instanciasExistentes = this.instanciasSubject.value;
    const nuevasInstancias: InstanciaGastoRecurrente[] = [];
    const fechasGeneradas = new Set<string>(); // Para evitar duplicados

    // Generar instancias para los próximos 12 meses
    for (let i = 0; i < 12; i++) {
      const fechaVencimiento = this.calcularFechaVencimiento(serie, i);
      const claveInstancia = `${serie.id}-${fechaVencimiento}`;
      
      const existe = instanciasExistentes.some(
        inst => inst.serieRecurrenteId === serie.id && 
                inst.fechaVencimiento === fechaVencimiento
      );

      const existeEnEstaEjecucion = fechasGeneradas.has(claveInstancia);

      if (!existe && !existeEnEstaEjecucion && fechaVencimiento >= hoyISO) {
        nuevasInstancias.push({
          id: uuidv4(),
          serieRecurrenteId: serie.id,
          fechaVencimiento,
          monto: serie.monto,
          pagado: false,
          fechaCreacion: new Date().toISOString()
        });
        fechasGeneradas.add(claveInstancia);
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
    
    // Calcular el mes y año objetivo
    const mesObjetivo = fechaInicio.getMonth() + (mesesPorFrecuencia * mesesAdelante);
    const añoObjetivo = fechaInicio.getFullYear() + Math.floor(mesObjetivo / 12);
    const mesFinal = mesObjetivo % 12;
    
    // Obtener el último día del mes objetivo para validar el día de vencimiento
    const ultimoDiaDelMes = new Date(añoObjetivo, mesFinal + 1, 0).getDate();
    
    // Ajustar el día si es mayor que los días disponibles en el mes
    const diaVencimiento = Math.min(serie.diaVencimiento, ultimoDiaDelMes);
    
    const fechaVencimiento = new Date(añoObjetivo, mesFinal, diaVencimiento);

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

  /**
   * Limpia instancias duplicadas (misma serie y misma fecha)
   * Útil para corregir duplicados existentes
   */
  limpiarDuplicados(): void {
    const instancias = this.instanciasSubject.value;
    const instanciasUnicas = new Map<string, InstanciaGastoRecurrente>();
    
    // Mantener solo la primera instancia de cada combinación serie-fecha
    instancias.forEach(inst => {
      const clave = `${inst.serieRecurrenteId}-${inst.fechaVencimiento}`;
      if (!instanciasUnicas.has(clave)) {
        instanciasUnicas.set(clave, inst);
      } else {
        // Si hay duplicado, mantener la más antigua (o la pagada si una está pagada)
        const existente = instanciasUnicas.get(clave)!;
        if (inst.pagado && !existente.pagado) {
          // Si la nueva está pagada y la existente no, reemplazar
          instanciasUnicas.set(clave, inst);
        } else if (!inst.pagado && existente.pagado) {
          // Si la existente está pagada y la nueva no, mantener la existente
          // No hacer nada, ya está la correcta
        } else if (inst.fechaCreacion < existente.fechaCreacion) {
          // Si ninguna está pagada o ambas están pagadas, mantener la más antigua
          instanciasUnicas.set(clave, inst);
        }
      }
    });
    
    const instanciasLimpias = Array.from(instanciasUnicas.values());
    const duplicadosEliminados = instancias.length - instanciasLimpias.length;
    
    if (duplicadosEliminados > 0) {
      this.saveInstanciasToStorage(instanciasLimpias);
      this.instanciasSubject.next(instanciasLimpias);
      console.log(`Se eliminaron ${duplicadosEliminados} instancias duplicadas`);
    }
  }
}

