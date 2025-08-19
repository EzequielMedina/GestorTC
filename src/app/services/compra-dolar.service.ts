import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompraDolar, ResumenCompraDolar } from '../models/compra-dolar.model';
import { DolarService } from './dolar.service';

@Injectable({
  providedIn: 'root'
})
export class CompraDolarService {
  private readonly STORAGE_KEY = 'compras_dolar';
  private comprasSubject = new BehaviorSubject<CompraDolar[]>([]);
  public compras$ = this.comprasSubject.asObservable();

  constructor(private dolarService: DolarService) {
    this.cargarCompras();
  }

  /**
   * Obtiene todas las compras como Observable
   */
  obtenerCompras(): Observable<CompraDolar[]> {
    return this.compras$;
  }

  /**
   * Alias para obtenerCompras (compatibilidad con otros servicios)
   */
  getCompras$(): Observable<CompraDolar[]> {
    return this.compras$;
  }

  /**
   * Obtiene una compra por ID
   */
  obtenerCompraPorId(id: number): CompraDolar | undefined {
    return this.comprasSubject.value.find(c => c.id === id);
  }

  /**
   * Obtiene una compra por mes y año
   */
  obtenerCompraPorMesAnio(mes: number, anio: number): CompraDolar | undefined {
    return this.comprasSubject.value.find(c => c.mes === mes && c.anio === anio);
  }

  /**
   * Agrega o actualiza una compra de dólares
   */
  guardarCompra(compra: Omit<CompraDolar, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): Observable<CompraDolar> {
    const compras = [...this.comprasSubject.value];
    const existente = compras.find(c => c.mes === compra.mes && c.anio === compra.anio);
    
    let compraGuardada: CompraDolar;
    
    if (existente) {
      // Actualizar compra existente
      const index = compras.indexOf(existente);
      compraGuardada = {
        ...existente,
        ...compra,
        precioCompraTotal: compra.dolares * compra.precioCompra,
        fechaActualizacion: new Date()
      };
      compras[index] = compraGuardada;
    } else {
      // Crear nueva compra
      const nuevoId = this.generarNuevoId(compras);
      compraGuardada = {
        ...compra,
        id: nuevoId,
        precioCompraTotal: compra.dolares * compra.precioCompra,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      };
      compras.push(compraGuardada);
    }

    // Ordenar por año y mes
    compras.sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });

    this.comprasSubject.next(compras);
    this.guardarEnStorage(compras);

    return new Observable(observer => {
      observer.next(compraGuardada);
      observer.complete();
    });
  }

  /**
   * Elimina una compra por ID
   */
  eliminarCompra(id: number): Observable<boolean> {
    const compras = this.comprasSubject.value.filter(c => c.id !== id);
    this.comprasSubject.next(compras);
    this.guardarEnStorage(compras);

    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Actualiza los precios API de todas las compras
   */
  actualizarPreciosAPI(): Observable<CompraDolar[]> {
    return this.dolarService.obtenerDolarOficial().pipe(
      map(dolarAPI => {
        const compras = this.comprasSubject.value.map(compra => ({
          ...compra,
          precioAPI: dolarAPI.venta,
          precioAPITotal: compra.dolares * dolarAPI.venta,
          diferencia: (compra.dolares * dolarAPI.venta) - compra.precioCompraTotal,
          fechaActualizacion: new Date()
        }));
        
        this.comprasSubject.next(compras);
        this.guardarEnStorage(compras);
        return compras;
      })
    );
  }

  /**
   * Obtiene el resumen de todas las compras
   */
  obtenerResumen(): Observable<ResumenCompraDolar> {
    return combineLatest([
      this.compras$,
      this.dolarService.dolarActual$
    ]).pipe(
      map(([compras, dolarActual]) => {
        const resumen: ResumenCompraDolar = {
          totalDolares: 0,
          totalPesosCompra: 0,
          totalPesosAPI: 0,
          variacionTotal: 0
        };

        compras.forEach(compra => {
          // Validar que los valores sean números válidos
          const dolares = isNaN(compra.dolares) ? 0 : compra.dolares;
          const precioCompraTotal = isNaN(compra.precioCompraTotal) ? 0 : compra.precioCompraTotal;
          
          resumen.totalDolares += dolares;
          resumen.totalPesosCompra += precioCompraTotal;
          
          if (dolarActual) {
            const precioAPITotal = dolares * dolarActual.venta;
            resumen.totalPesosAPI += precioAPITotal;
          }
        });

        resumen.variacionTotal = resumen.totalPesosAPI - resumen.totalPesosCompra;
        return resumen;
      })
    );
  }

  /**
   * Importa compras desde un array (usado por ExcelService)
   */
  importarCompras(compras: CompraDolar[]): Observable<CompraDolar[]> {
    // Asegurar que todas las compras tengan ID y fechas
    const comprasConId = compras.map((compra, index) => {
      // Validar valores numéricos antes de calcular
      const dolares = isNaN(compra.dolares) ? 0 : compra.dolares;
      const precioCompra = isNaN(compra.precioCompra) ? 0 : compra.precioCompra;
      
      return {
        ...compra,
        id: compra.id || (index + 1),
        dolares: dolares,
        precioCompra: precioCompra,
        precioCompraTotal: dolares * precioCompra,
        fechaCreacion: compra.fechaCreacion || new Date(),
        fechaActualizacion: compra.fechaActualizacion || new Date()
      };
    });

    // Ordenar por año y mes
    comprasConId.sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });

    this.comprasSubject.next(comprasConId);
    this.guardarEnStorage(comprasConId);

    return new Observable(observer => {
      observer.next(comprasConId);
      observer.complete();
    });
  }

  /**
   * Limpia todas las compras
   */
  limpiarCompras(): Observable<boolean> {
    this.comprasSubject.next([]);
    this.guardarEnStorage([]);

    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Reemplaza todas las compras con nuevos datos (para importación)
   */
  reemplazarCompras(nuevasCompras: CompraDolar[]): Observable<CompraDolar[]> {
    this.comprasSubject.next(nuevasCompras);
    this.guardarEnStorage(nuevasCompras);

    return new Observable(observer => {
      observer.next(nuevasCompras);
      observer.complete();
    });
  }

  private cargarCompras(): void {
    try {
      const comprasStr = localStorage.getItem(this.STORAGE_KEY);
      if (comprasStr) {
        const compras: CompraDolar[] = JSON.parse(comprasStr);
        // Convertir fechas de string a Date y validar campos numéricos
        compras.forEach(compra => {
          if (compra.fechaCreacion && typeof compra.fechaCreacion === 'string') {
            compra.fechaCreacion = new Date(compra.fechaCreacion);
          }
          if (compra.fechaActualizacion && typeof compra.fechaActualizacion === 'string') {
            compra.fechaActualizacion = new Date(compra.fechaActualizacion);
          }
          
          // Validar y corregir valores numéricos
          compra.dolares = isNaN(compra.dolares) ? 0 : compra.dolares;
          compra.precioCompra = isNaN(compra.precioCompra) ? 0 : compra.precioCompra;
          
          // Si precioCompraTotal no existe o es NaN, calcularlo
          if (isNaN(compra.precioCompraTotal) || compra.precioCompraTotal === undefined) {
            compra.precioCompraTotal = compra.dolares * compra.precioCompra;
          }
        });
        this.comprasSubject.next(compras);
      }
    } catch (error) {
      console.error('Error al cargar compras de dólares:', error);
      this.comprasSubject.next([]);
    }
  }

  private guardarEnStorage(compras: CompraDolar[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(compras));
    } catch (error) {
      console.error('Error al guardar compras de dólares:', error);
    }
  }

  private generarNuevoId(compras: CompraDolar[]): number {
    if (compras.length === 0) return 1;
    return Math.max(...compras.map(c => c.id || 0)) + 1;
  }

  /**
   * Obtiene el nombre del mes en español
   */
  obtenerNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || '';
  }

  /**
   * Obtiene el nombre corto del mes
   */
  obtenerNombreMesCorto(mes: number): string {
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return meses[mes - 1] || '';
  }
}