import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { catchError, map, tap, delay } from 'rxjs/operators';
import { 
  CotizacionDolar, 
  RangoCotizacion, 
  DatoGraficoCotizacion, 
  ResumenCotizaciones,
  EstadoCargaCotizaciones 
} from '../models/cotizacion-dolar.model';

@Injectable({
  providedIn: 'root'
})
export class ArgentinaDatosService {
  private readonly API_BASE_URL = 'https://api.argentinadatos.com/v1/cotizaciones/dolares';
  private readonly CACHE_KEY_PREFIX = 'argentina_datos_cache';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
  
  private estadoCargaSubject = new BehaviorSubject<EstadoCargaCotizaciones>({
    cargando: false,
    error: null,
    progreso: 0,
    totalDias: 0,
    diasCargados: 0
  });
  
  public estadoCarga$ = this.estadoCargaSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene cotizaciones del dólar oficial para un rango de fechas
   * @param rango Rango de fechas en formato YYYY-MM-DD
   * @param casa Tipo de cotización (por defecto 'oficial')
   */
  obtenerCotizacionesRango(
    rango: RangoCotizacion, 
    casa: string = 'oficial'
  ): Observable<CotizacionDolar[]> {
    const fechas = this.generarFechasEnRango(rango.fechaDesde, rango.fechaHasta);
    
    this.actualizarEstadoCarga({
      cargando: true,
      error: null,
      progreso: 0,
      totalDias: fechas.length,
      diasCargados: 0
    });

    // Verificar caché primero
    const cotizacionesCache = this.obtenerCotizacionesDesdeCache(fechas, casa);
    const fechasFaltantes = fechas.filter(fecha => 
      !cotizacionesCache.some(c => c.fecha === fecha)
    );

    if (fechasFaltantes.length === 0) {
      console.log('Todas las cotizaciones están en caché');
      this.actualizarEstadoCarga({
        cargando: false,
        error: null,
        progreso: 100,
        totalDias: fechas.length,
        diasCargados: fechas.length
      });
      return of(cotizacionesCache.sort((a, b) => a.fecha.localeCompare(b.fecha)));
    }

    console.log(`Obteniendo ${fechasFaltantes.length} cotizaciones desde API...`);
    
    // Crear observables para las fechas faltantes con delay para evitar rate limiting
    const observables = fechasFaltantes.map((fecha, index) => 
      this.obtenerCotizacionPorFecha(fecha, casa).pipe(
        delay(index * 100), // 100ms entre requests
        tap(() => {
          const estado = this.estadoCargaSubject.value;
          this.actualizarEstadoCarga({
            ...estado,
            diasCargados: estado.diasCargados + 1,
            progreso: Math.round(((estado.diasCargados + 1) / estado.totalDias) * 100)
          });
        }),
        catchError(error => {
          console.warn(`Error al obtener cotización para ${fecha}:`, error);
          return of(null); // Continuar con las demás fechas
        })
      )
    );

    return forkJoin(observables).pipe(
      map(resultados => {
        const cotizacionesNuevas = resultados.filter(c => c !== null) as CotizacionDolar[];
        const todasLasCotizaciones = [...cotizacionesCache, ...cotizacionesNuevas];
        
        // Guardar nuevas cotizaciones en caché
        cotizacionesNuevas.forEach(cotizacion => {
          this.guardarCotizacionEnCache(cotizacion, casa);
        });
        
        this.actualizarEstadoCarga({
          cargando: false,
          error: null,
          progreso: 100,
          totalDias: fechas.length,
          diasCargados: fechas.length
        });
        
        return todasLasCotizaciones.sort((a, b) => a.fecha.localeCompare(b.fecha));
      }),
      catchError(error => {
        console.error('Error al obtener cotizaciones:', error);
        this.actualizarEstadoCarga({
          cargando: false,
          error: 'Error al obtener las cotizaciones. Intente nuevamente.',
          progreso: 0,
          totalDias: 0,
          diasCargados: 0
        });
        
        // Si hay error, devolver solo las cotizaciones del caché
        return of(cotizacionesCache.sort((a, b) => a.fecha.localeCompare(b.fecha)));
      })
    );
  }

  /**
   * Obtiene una cotización específica por fecha
   */
  private obtenerCotizacionPorFecha(fecha: string, casa: string): Observable<CotizacionDolar> {
    const url = `${this.API_BASE_URL}/${casa}/${fecha.replace(/-/g, '/')}`;
    
    return this.http.get<CotizacionDolar>(url, {
      headers: { 'Accept': 'application/json' }
    }).pipe(
      tap(data => {
        console.log(`Cotización obtenida para ${fecha}:`, data);
      })
    );
  }

  /**
   * Convierte cotizaciones a datos para gráfico
   */
  convertirParaGrafico(cotizaciones: CotizacionDolar[], usarVenta: boolean = true): DatoGraficoCotizacion[] {
    return cotizaciones.map(cotizacion => ({
      fecha: cotizacion.fecha,
      valor: usarVenta ? cotizacion.venta : cotizacion.compra,
      fechaFormateada: this.formatearFechaParaGrafico(cotizacion.fecha)
    }));
  }

  /**
   * Calcula resumen estadístico de las cotizaciones
   */
  calcularResumen(cotizaciones: CotizacionDolar[], usarVenta: boolean = true): ResumenCotizaciones {
    if (cotizaciones.length === 0) {
      return {
        valorMinimo: 0,
        valorMaximo: 0,
        valorPromedio: 0,
        valorInicial: 0,
        valorFinal: 0,
        variacionTotal: 0,
        variacionPorcentual: 0,
        fechaMinimo: '',
        fechaMaximo: ''
      };
    }

    const valores = cotizaciones.map(c => usarVenta ? c.venta : c.compra);
    const valorMinimo = Math.min(...valores);
    const valorMaximo = Math.max(...valores);
    const valorPromedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    
    const cotizacionMinima = cotizaciones.find(c => 
      (usarVenta ? c.venta : c.compra) === valorMinimo
    )!;
    const cotizacionMaxima = cotizaciones.find(c => 
      (usarVenta ? c.venta : c.compra) === valorMaximo
    )!;
    
    const valorInicial = usarVenta ? cotizaciones[0].venta : cotizaciones[0].compra;
    const valorFinal = usarVenta ? 
      cotizaciones[cotizaciones.length - 1].venta : 
      cotizaciones[cotizaciones.length - 1].compra;
    
    const variacionTotal = valorFinal - valorInicial;
    const variacionPorcentual = valorInicial > 0 ? (variacionTotal / valorInicial) * 100 : 0;

    return {
      valorMinimo,
      valorMaximo,
      valorPromedio,
      valorInicial,
      valorFinal,
      variacionTotal,
      variacionPorcentual,
      fechaMinimo: cotizacionMinima.fecha,
      fechaMaximo: cotizacionMaxima.fecha
    };
  }

  /**
   * Genera array de fechas en formato YYYY-MM-DD para un rango
   */
  private generarFechasEnRango(fechaDesde: string, fechaHasta: string): string[] {
    const fechas: string[] = [];
    const inicio = new Date(fechaDesde);
    const fin = new Date(fechaHasta);
    
    const fechaActual = new Date(inicio);
    while (fechaActual <= fin) {
      // Solo incluir días de semana (lunes a viernes)
      const diaSemana = fechaActual.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        fechas.push(this.formatearFecha(fechaActual));
      }
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    return fechas;
  }

  /**
   * Formatea fecha para la API (YYYY-MM-DD)
   */
  private formatearFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  /**
   * Formatea fecha para mostrar en gráfico
   */
  private formatearFechaParaGrafico(fecha: string): string {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }

  /**
   * Obtiene cotizaciones desde caché
   */
  private obtenerCotizacionesDesdeCache(fechas: string[], casa: string): CotizacionDolar[] {
    const cotizaciones: CotizacionDolar[] = [];
    
    fechas.forEach(fecha => {
      const cacheKey = `${this.CACHE_KEY_PREFIX}_${casa}_${fecha}`;
      try {
        const cacheStr = localStorage.getItem(cacheKey);
        if (cacheStr) {
          const cache = JSON.parse(cacheStr);
          if (this.esCacheValido(cache.timestamp)) {
            cotizaciones.push(cache.data);
          } else {
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        console.error(`Error al leer caché para ${fecha}:`, error);
        localStorage.removeItem(cacheKey);
      }
    });
    
    return cotizaciones;
  }

  /**
   * Guarda cotización en caché
   */
  private guardarCotizacionEnCache(cotizacion: CotizacionDolar, casa: string): void {
    const cacheKey = `${this.CACHE_KEY_PREFIX}_${casa}_${cotizacion.fecha}`;
    try {
      const cache = {
        data: cotizacion,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.error(`Error al guardar caché para ${cotizacion.fecha}:`, error);
    }
  }

  /**
   * Verifica si el caché es válido
   */
  private esCacheValido(timestamp: number): boolean {
    return (Date.now() - timestamp) < this.CACHE_DURATION;
  }

  /**
   * Actualiza el estado de carga
   */
  private actualizarEstadoCarga(estado: EstadoCargaCotizaciones): void {
    this.estadoCargaSubject.next(estado);
  }

  /**
   * Limpia todo el caché de cotizaciones
   */
  limpiarCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('Caché de cotizaciones limpiado');
  }

  /**
   * Formatea un valor monetario en pesos argentinos
   */
  formatearPesos(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(monto);
  }
}