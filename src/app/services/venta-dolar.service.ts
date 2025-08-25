import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { VentaDolar, BalanceDolar, TransaccionDolar } from '../models/venta-dolar.model';
import { CompraDolar } from '../models/compra-dolar.model';
import { CompraDolarService } from './compra-dolar.service';
import { DolarService } from './dolar.service';

@Injectable({
  providedIn: 'root'
})
export class VentaDolarService {
  private readonly STORAGE_KEY = 'ventas_dolar';
  private ventasSubject = new BehaviorSubject<VentaDolar[]>([]);
  public ventas$ = this.ventasSubject.asObservable();

  constructor(
    private compraDolarService: CompraDolarService,
    private dolarService: DolarService
  ) {
    this.cargarVentas();
  }

  /**
   * Obtiene todas las ventas como Observable
   */
  obtenerVentas(): Observable<VentaDolar[]> {
    return this.ventas$;
  }

  /**
   * Alias para obtenerVentas (compatibilidad con otros servicios)
   */
  getVentas$(): Observable<VentaDolar[]> {
    return this.ventas$;
  }

  /**
   * Obtiene una venta por ID
   */
  obtenerVentaPorId(id: number): VentaDolar | undefined {
    return this.ventasSubject.value.find(v => v.id === id);
  }

  /**
   * Obtiene una venta por mes y año
   */
  obtenerVentaPorMesAnio(mes: number, anio: number): VentaDolar | undefined {
    return this.ventasSubject.value.find(v => v.mes === mes && v.anio === anio);
  }

  /**
   * Calcula el precio promedio de compra usando FIFO
   */
  private calcularPrecioCompraPromedio(dolaresAVender: number): Observable<number> {
    return combineLatest([
      this.compraDolarService.obtenerCompras(),
      this.obtenerVentas()
    ]).pipe(
      map(([compras, ventas]) => {
        const comprasOrdenadas = compras.sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return a.mes - b.mes;
        });

        let dolaresVendidosTotal = ventas.reduce((total: number, venta: VentaDolar) => total + venta.dolares, 0);
        let dolaresDisponibles = comprasOrdenadas.reduce((total: number, compra: CompraDolar) => total + compra.dolares, 0) - dolaresVendidosTotal;

        if (dolaresAVender > dolaresDisponibles) {
          throw new Error('No hay suficientes dólares disponibles para la venta');
        }

        let dolaresRestantesParaVender = dolaresAVender;
        let costoTotal = 0;
        let dolaresYaVendidos = dolaresVendidosTotal;

        for (const compra of comprasOrdenadas) {
          if (dolaresRestantesParaVender <= 0) break;

          let dolaresDisponiblesEnCompra = compra.dolares;
          
          // Restar los dólares ya vendidos de esta compra
          if (dolaresYaVendidos > 0) {
            const dolaresARestar = Math.min(dolaresYaVendidos, compra.dolares);
            dolaresDisponiblesEnCompra -= dolaresARestar;
            dolaresYaVendidos -= dolaresARestar;
          }

          if (dolaresDisponiblesEnCompra > 0) {
            const dolaresAUsar = Math.min(dolaresRestantesParaVender, dolaresDisponiblesEnCompra);
            costoTotal += dolaresAUsar * compra.precioCompra;
            dolaresRestantesParaVender -= dolaresAUsar;
          }
        }

        // Validar que no haya división por cero o valores inválidos
        if (dolaresAVender <= 0 || costoTotal <= 0) {
          throw new Error('Error en el cálculo del precio promedio de compra');
        }
        
        const precioPromedio = costoTotal / dolaresAVender;
        
        // Validar que el resultado sea un número válido
        if (isNaN(precioPromedio) || !isFinite(precioPromedio)) {
          throw new Error('Error en el cálculo del precio promedio de compra');
        }
        
        return precioPromedio;
      })
    );
  }

  /**
   * Valida si hay suficientes dólares disponibles para la venta
   */
  validarDolaresDisponibles(dolaresAVender: number): Observable<boolean> {
    return combineLatest([
      this.compraDolarService.obtenerCompras(),
      this.obtenerVentas()
    ]).pipe(
      map(([compras, ventas]) => {
        const totalComprado = compras.reduce((total, compra) => total + compra.dolares, 0);
        const totalVendido = ventas.reduce((total, venta) => total + venta.dolares, 0);
        const disponibles = totalComprado - totalVendido;
        return dolaresAVender <= disponibles;
      })
    );
  }

  /**
   * Obtiene la cantidad de dólares disponibles
   */
  obtenerDolaresDisponibles(): Observable<number> {
    return combineLatest([
      this.compraDolarService.obtenerCompras(),
      this.obtenerVentas()
    ]).pipe(
      map(([compras, ventas]) => {
        const totalComprado = compras.reduce((total, compra) => total + compra.dolares, 0);
        const totalVendido = ventas.reduce((total, venta) => total + venta.dolares, 0);
        return totalComprado - totalVendido;
      })
    );
  }

  /**
   * Agrega o actualiza una venta de dólares
   */
  guardarVenta(venta: Omit<VentaDolar, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'precioCompraPromedio' | 'ganancia' | 'porcentajeGanancia'>): Observable<VentaDolar> {
    // Validar valores de entrada
    if (!venta.dolares || isNaN(venta.dolares) || venta.dolares <= 0) {
      throw new Error('La cantidad de dólares debe ser un número válido mayor a 0');
    }
    
    if (!venta.precioVenta || isNaN(venta.precioVenta) || venta.precioVenta <= 0) {
      throw new Error('El precio de venta debe ser un número válido mayor a 0');
    }
    
    return this.validarDolaresDisponibles(venta.dolares).pipe(
      switchMap(esValido => {
        if (!esValido) {
          throw new Error('No hay suficientes dólares disponibles para esta venta');
        }
        return this.calcularPrecioCompraPromedio(venta.dolares);
      }),
      map(precioCompraPromedio => {
        const ventas = [...this.ventasSubject.value];
        const existente = ventas.find(v => v.mes === venta.mes && v.anio === venta.anio);
        
        // Calcular ganancias con validaciones
        const costoTotal = precioCompraPromedio * venta.dolares;
        const ganancia = (venta.precioVenta - precioCompraPromedio) * venta.dolares;
        
        // Validar que el costo total sea válido para evitar división por cero
        let porcentajeGanancia = 0;
        if (costoTotal > 0 && !isNaN(costoTotal) && isFinite(costoTotal)) {
          porcentajeGanancia = (ganancia / costoTotal) * 100;
        }
        
        // Validar que los valores calculados sean números válidos
        const gananciaFinal = isNaN(ganancia) || !isFinite(ganancia) ? 0 : ganancia;
        const porcentajeFinal = isNaN(porcentajeGanancia) || !isFinite(porcentajeGanancia) ? 0 : porcentajeGanancia;
        
        let ventaGuardada: VentaDolar;
        
        if (existente) {
          // Actualizar venta existente
          const index = ventas.indexOf(existente);
          ventaGuardada = {
            ...existente,
            ...venta,
            precioVentaTotal: venta.dolares * venta.precioVenta,
            precioCompraPromedio,
            ganancia: gananciaFinal,
            porcentajeGanancia: porcentajeFinal,
            fechaActualizacion: new Date()
          };
          ventas[index] = ventaGuardada;
        } else {
          // Crear nueva venta
          const nuevoId = this.generarNuevoId(ventas);
          ventaGuardada = {
            ...venta,
            id: nuevoId,
            precioVentaTotal: venta.dolares * venta.precioVenta,
            precioCompraPromedio,
            ganancia: gananciaFinal,
            porcentajeGanancia: porcentajeFinal,
            fechaCreacion: new Date(),
            fechaActualizacion: new Date()
          };
          ventas.push(ventaGuardada);
        }

        // Ordenar por año y mes
        ventas.sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return a.mes - b.mes;
        });

        this.ventasSubject.next(ventas);
        this.guardarEnStorage(ventas);

        return ventaGuardada;
      })
    );
  }

  /**
   * Elimina una venta por ID
   */
  eliminarVenta(id: number): Observable<boolean> {
    const ventas = this.ventasSubject.value.filter(v => v.id !== id);
    this.ventasSubject.next(ventas);
    this.guardarEnStorage(ventas);

    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Obtiene el balance consolidado de dólares
   */
  obtenerBalance(): Observable<BalanceDolar> {
    return combineLatest([
      this.compraDolarService.obtenerCompras(),
      this.obtenerVentas(),
      this.dolarService.obtenerDolarOficial()
    ]).pipe(
      map(([compras, ventas, precioAPI]) => {
        const dolaresComprados = compras.reduce((total: number, compra: CompraDolar) => total + compra.dolares, 0);
        const dolaresVendidos = ventas.reduce((total: number, venta: VentaDolar) => total + venta.dolares, 0);
        const dolaresDisponibles = dolaresComprados - dolaresVendidos;
        
        const inversionTotal = compras.reduce((total: number, compra: CompraDolar) => total + compra.precioCompraTotal, 0);
        const recuperado = ventas?.reduce((total: number, venta: VentaDolar) => total + venta.precioVentaTotal, 0) || 0;
        const gananciaTotal = recuperado - (ventas?.reduce((total: number, venta: VentaDolar) => total + (venta.precioCompraPromedio * venta.dolares), 0) || 0);
        
        const precioCompraPromedio = inversionTotal / (dolaresComprados || 1);
        const porcentajeGananciaTotal = inversionTotal > 0 ? (gananciaTotal / inversionTotal) * 100 : 0;
        const valorActualDisponibles = dolaresDisponibles * (precioAPI?.venta || 0);

        return {
          dolaresDisponibles,
          dolaresComprados,
          dolaresVendidos,
          inversionTotal,
          recuperado,
          gananciaTotal,
          porcentajeGananciaTotal,
          precioCompraPromedio,
          valorActualDisponibles
        };
      })
    );
  }

  /**
   * Obtiene todas las transacciones (compras y ventas) unificadas
   */
  obtenerTransaccionesUnificadas(): Observable<TransaccionDolar[]> {
    return combineLatest([
      this.compraDolarService.obtenerCompras(),
      this.obtenerVentas()
    ]).pipe(
      map(([compras, ventas]) => {
        const transacciones: TransaccionDolar[] = [];

        // Agregar compras
        compras.forEach(compra => {
          transacciones.push({
            id: compra.id,
            tipo: 'compra',
            mes: compra.mes,
            anio: compra.anio,
            dolares: compra.dolares,
            precio: compra.precioCompra,
            total: compra.precioCompraTotal,
            fechaCreacion: compra.fechaCreacion
          });
        });

        // Agregar ventas
        ventas.forEach(venta => {
          transacciones.push({
            id: venta.id,
            tipo: 'venta',
            mes: venta.mes,
            anio: venta.anio,
            dolares: venta.dolares,
            precio: venta.precioVenta,
            total: venta.precioVentaTotal,
            ganancia: venta.ganancia,
            porcentajeGanancia: venta.porcentajeGanancia,
            fechaCreacion: venta.fechaCreacion
          });
        });

        // Ordenar por fecha
        return transacciones.sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return a.mes - b.mes;
        });
      })
    );
  }

  /**
   * Importa ventas desde un array
   */
  importarVentas(ventas: VentaDolar[]): Observable<VentaDolar[]> {
    return new Observable(observer => {
      try {
        const ventasValidadas = ventas.map(venta => ({
          ...venta,
          id: venta.id || this.generarNuevoId(this.ventasSubject.value),
          precioVentaTotal: venta.dolares * venta.precioVenta,
          fechaCreacion: venta.fechaCreacion || new Date(),
          fechaActualizacion: new Date()
        }));

        // Ordenar por año y mes
        ventasValidadas.sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return a.mes - b.mes;
        });

        this.ventasSubject.next(ventasValidadas);
        this.guardarEnStorage(ventasValidadas);

        observer.next(ventasValidadas);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Limpia todas las ventas
   */
  limpiarVentas(): Observable<boolean> {
    this.ventasSubject.next([]);
    this.guardarEnStorage([]);
    
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Reemplaza todas las ventas con un nuevo array
   */
  reemplazarVentas(nuevasVentas: VentaDolar[]): Observable<VentaDolar[]> {
    this.ventasSubject.next(nuevasVentas);
    this.guardarEnStorage(nuevasVentas);
    return this.obtenerVentas();
  }

  private cargarVentas(): void {
    try {
      const ventasGuardadas = localStorage.getItem(this.STORAGE_KEY);
      if (ventasGuardadas) {
        const ventas: VentaDolar[] = JSON.parse(ventasGuardadas);
        // Convertir fechas de string a Date
        ventas.forEach(venta => {
          if (venta.fechaCreacion) {
            venta.fechaCreacion = new Date(venta.fechaCreacion);
          }
          if (venta.fechaActualizacion) {
            venta.fechaActualizacion = new Date(venta.fechaActualizacion);
          }
        });
        this.ventasSubject.next(ventas);
      }
    } catch (error) {
      console.error('Error al cargar ventas desde localStorage:', error);
      this.ventasSubject.next([]);
    }
  }

  private guardarEnStorage(ventas: VentaDolar[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ventas));
    } catch (error) {
      console.error('Error al guardar ventas en localStorage:', error);
    }
  }

  private generarNuevoId(ventas: VentaDolar[]): number {
    if (ventas.length === 0) return 1;
    const maxId = Math.max(...ventas.map(v => v.id || 0));
    return maxId + 1;
  }

  obtenerNombreMes(mes: number): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes - 1] || '';
  }

  obtenerNombreMesCorto(mes: number): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[mes - 1] || '';
  }
}