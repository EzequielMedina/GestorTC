import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ConfiguracionReporte, ReporteGenerado, ResumenReporte, COLUMNAS_DISPONIBLES } from '../models/reporte.model';
import { Gasto } from '../models/gasto.model';
import { Tarjeta } from '../models/tarjeta.model';
import { Categoria } from '../models/categoria.model';
import { Etiqueta } from '../models/etiqueta.model';
import { GastoService } from './gasto';
import { TarjetaService } from './tarjeta';
import { CategoriaService } from './categoria.service';
import { EtiquetaService } from './etiqueta.service';
import { NotaService } from './nota.service';
import { FiltroAvanzadoService } from './filtro-avanzado.service';

const STORAGE_KEY_REPORTES = 'gestor_tc_reportes_configuraciones';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private configuracionesSubject = new BehaviorSubject<ConfiguracionReporte[]>(this.loadConfiguracionesFromStorage());
  public configuraciones$ = this.configuracionesSubject.asObservable();

  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService,
    private etiquetaService: EtiquetaService,
    private notaService: NotaService,
    private filtroAvanzadoService: FiltroAvanzadoService
  ) {}

  /**
   * Obtiene todas las configuraciones de reportes
   */
  getConfiguraciones$(): Observable<ConfiguracionReporte[]> {
    return this.configuraciones$;
  }

  /**
   * Obtiene una configuración por ID
   */
  getConfiguracionById$(id: string): Observable<ConfiguracionReporte | undefined> {
    return this.configuraciones$.pipe(
      map(configs => configs.find(c => c.id === id))
    );
  }

  /**
   * Crea una nueva configuración de reporte
   */
  crearConfiguracion(configuracion: Omit<ConfiguracionReporte, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): ConfiguracionReporte {
    const nueva: ConfiguracionReporte = {
      ...configuracion,
      id: uuidv4(),
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    };

    const configuraciones = [...this.configuracionesSubject.value, nueva];
    this.saveConfiguracionesToStorage(configuraciones);
    this.configuracionesSubject.next(configuraciones);

    return nueva;
  }

  /**
   * Actualiza una configuración
   */
  actualizarConfiguracion(id: string, cambios: Partial<ConfiguracionReporte>): void {
    const configuraciones = this.configuracionesSubject.value.map(c =>
      c.id === id
        ? { ...c, ...cambios, fechaActualizacion: new Date().toISOString() }
        : c
    );
    this.saveConfiguracionesToStorage(configuraciones);
    this.configuracionesSubject.next(configuraciones);
  }

  /**
   * Elimina una configuración
   */
  eliminarConfiguracion(id: string): void {
    const configuraciones = this.configuracionesSubject.value.filter(c => c.id !== id);
    this.saveConfiguracionesToStorage(configuraciones);
    this.configuracionesSubject.next(configuraciones);
  }

  /**
   * Genera un reporte basado en una configuración
   */
  generarReporte(configuracionId: string): Observable<ReporteGenerado> {
    return combineLatest([
      this.getConfiguracionById$(configuracionId),
      this.gastoService.getGastos$(),
      this.tarjetaService.getTarjetas$(),
      this.categoriaService.getCategorias$(),
      this.etiquetaService.getEtiquetas$(),
      this.notaService.getNotas$()
    ]).pipe(
      map(([config, gastos, tarjetas, categorias, etiquetas, notas]) => {
        if (!config) {
          throw new Error('Configuración no encontrada');
        }

        // Aplicar filtros
        let gastosFiltrados = this.aplicarFiltros(gastos, config.filtros, tarjetas, categorias);

        // Aplicar agrupación
        if (config.agruparPor && config.agruparPor !== 'ninguna') {
          // La agrupación se maneja en el componente
        }

        // Aplicar ordenamiento
        gastosFiltrados = this.aplicarOrdenamiento(gastosFiltrados, config.ordenarPor, config.ordenAscendente);

        // Calcular resumen
        const resumen = this.calcularResumen(gastosFiltrados, tarjetas, categorias, config.agruparPor);

        // Formatear datos según columnas visibles
        const datos = this.formatearDatos(gastosFiltrados, config.columnas, tarjetas, categorias, etiquetas, notas);

        const reporte: ReporteGenerado = {
          id: uuidv4(),
          configuracionId,
          fechaGeneracion: new Date().toISOString(),
          datos,
          resumen
        };

        return reporte;
      })
    );
  }

  /**
   * Aplica filtros a los gastos
   */
  private aplicarFiltros(
    gastos: Gasto[],
    filtros: any,
    tarjetas: Tarjeta[],
    categorias: Categoria[]
  ): Gasto[] {
    return gastos.filter(gasto => {
      // Filtro de tarjetas
      if (!filtros.todasLasTarjetas && filtros.tarjetasIds && filtros.tarjetasIds.length > 0) {
        if (!filtros.tarjetasIds.includes(gasto.tarjetaId)) {
          return false;
        }
      }

      // Filtro de categorías
      if (!filtros.todasLasCategorias && filtros.categoriasIds && filtros.categoriasIds.length > 0) {
        if (!gasto.categoriaId || !filtros.categoriasIds.includes(gasto.categoriaId)) {
          return false;
        }
      }

      // Filtro de rango de fechas
      if (filtros.rangoFechas?.desde) {
        if (gasto.fecha < filtros.rangoFechas.desde) {
          return false;
        }
      }
      if (filtros.rangoFechas?.hasta) {
        if (gasto.fecha > filtros.rangoFechas.hasta) {
          return false;
        }
      }

      // Filtro de monto
      if (filtros.montoMin !== undefined && gasto.monto < filtros.montoMin) {
        return false;
      }
      if (filtros.montoMax !== undefined && gasto.monto > filtros.montoMax) {
        return false;
      }

      // Filtro de texto
      if (filtros.textoBusqueda) {
        const busqueda = filtros.textoBusqueda.toLowerCase();
        if (!gasto.descripcion.toLowerCase().includes(busqueda)) {
          return false;
        }
      }

      // Filtro compartido/personal
      if (filtros.soloCompartidos && !gasto.compartidoCon && (!gasto.personasCompartidas || gasto.personasCompartidas.length === 0)) {
        return false;
      }
      if (filtros.soloPersonales && (gasto.compartidoCon || (gasto.personasCompartidas && gasto.personasCompartidas.length > 0))) {
        return false;
      }

      return true;
    });
  }

  /**
   * Aplica ordenamiento
   */
  private aplicarOrdenamiento(
    gastos: Gasto[],
    ordenarPor?: string,
    ascendente: boolean = true
  ): Gasto[] {
    if (!ordenarPor) return gastos;

    const copia = [...gastos];
    copia.sort((a, b) => {
      let comparacion = 0;

      switch (ordenarPor) {
        case 'fecha':
          comparacion = a.fecha.localeCompare(b.fecha);
          break;
        case 'monto':
          comparacion = a.monto - b.monto;
          break;
        case 'descripcion':
          comparacion = a.descripcion.localeCompare(b.descripcion);
          break;
      }

      return ascendente ? comparacion : -comparacion;
    });

    return copia;
  }

  /**
   * Calcula el resumen del reporte
   */
  private calcularResumen(
    gastos: Gasto[],
    tarjetas: Tarjeta[],
    categorias: Categoria[],
    agruparPor?: string
  ): ResumenReporte {
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const montos = gastos.map(g => g.monto);
    const montosOrdenados = [...montos].sort((a, b) => a - b);

    const resumen: ResumenReporte = {
      totalGastos,
      cantidadGastos: gastos.length,
      promedioGasto: gastos.length > 0 ? totalGastos / gastos.length : 0,
      gastoMaximo: montosOrdenados.length > 0 ? montosOrdenados[montosOrdenados.length - 1] : 0,
      gastoMinimo: montosOrdenados.length > 0 ? montosOrdenados[0] : 0
    };

    // Agrupaciones
    if (agruparPor === 'tarjeta') {
      resumen.porTarjeta = {};
      gastos.forEach(g => {
        const nombre = tarjetas.find(t => t.id === g.tarjetaId)?.nombre || 'Sin tarjeta';
        resumen.porTarjeta![g.tarjetaId] = (resumen.porTarjeta![g.tarjetaId] || 0) + g.monto;
      });
    }

    if (agruparPor === 'categoria') {
      resumen.porCategoria = {};
      gastos.forEach(g => {
        if (g.categoriaId) {
          resumen.porCategoria![g.categoriaId] = (resumen.porCategoria![g.categoriaId] || 0) + g.monto;
        }
      });
    }

    if (agruparPor === 'mes') {
      resumen.porMes = {};
      gastos.forEach(g => {
        const mes = g.fecha.substring(0, 7); // YYYY-MM
        resumen.porMes![mes] = (resumen.porMes![mes] || 0) + g.monto;
      });
    }

    return resumen;
  }

  /**
   * Formatea los datos según las columnas visibles
   */
  private formatearDatos(
    gastos: Gasto[],
    columnas: any[],
    tarjetas: Tarjeta[],
    categorias: Categoria[],
    etiquetas: Etiqueta[],
    notas: any[]
  ): any[] {
    return gastos.map(gasto => {
      const fila: any = {};

      columnas.forEach(col => {
        if (!col.visible) return;

        switch (col.id) {
          case 'fecha':
            fila.fecha = gasto.fecha;
            break;
          case 'descripcion':
            fila.descripcion = gasto.descripcion;
            break;
          case 'monto':
            fila.monto = gasto.monto;
            break;
          case 'tarjeta':
            fila.tarjeta = tarjetas.find(t => t.id === gasto.tarjetaId)?.nombre || 'Sin tarjeta';
            break;
          case 'categoria':
            fila.categoria = categorias.find(c => c.id === gasto.categoriaId)?.nombre || 'Sin categoría';
            break;
          case 'etiquetas':
            if (gasto.etiquetasIds && gasto.etiquetasIds.length > 0) {
              fila.etiquetas = gasto.etiquetasIds
                .map(id => etiquetas.find(e => e.id === id)?.nombre)
                .filter(Boolean)
                .join(', ');
            }
            break;
          case 'nota':
            const nota = notas.find(n => n.gastoId === gasto.id);
            fila.nota = nota?.contenido || '';
            break;
          case 'compartido':
            fila.compartido = gasto.compartidoCon || (gasto.personasCompartidas && gasto.personasCompartidas.length > 0 ? 'Sí' : 'No');
            break;
          case 'cuotas':
            fila.cuotas = gasto.cantidadCuotas && gasto.cantidadCuotas > 1 ? `${gasto.cantidadCuotas} cuotas` : 'Sin cuotas';
            break;
        }
      });

      return fila;
    });
  }

  /**
   * Carga configuraciones desde localStorage
   */
  private loadConfiguracionesFromStorage(): ConfiguracionReporte[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REPORTES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones de reportes:', error);
    }
    return [];
  }

  /**
   * Guarda configuraciones en localStorage
   */
  private saveConfiguracionesToStorage(configuraciones: ConfiguracionReporte[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTES, JSON.stringify(configuraciones));
    } catch (error) {
      console.error('Error al guardar configuraciones de reportes:', error);
    }
  }

  /**
   * Obtiene las columnas disponibles
   */
  getColumnasDisponibles() {
    return COLUMNAS_DISPONIBLES;
  }
}

