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
  guardarCompra(compra: Omit<CompraDolar, 'id' | 'fechaActualizacion'>): Observable<CompraDolar> {
    const compras = [...this.comprasSubject.value];
    const fechaActual = new Date();
    
    // Siempre crear una nueva compra, incluso si es el mismo mes/año
    const compraGuardada: CompraDolar = {
      ...compra,
      id: this.generarNuevoId(compras),
      // Usar la fecha proporcionada por el formulario si viene, si no, ahora
      fechaCreacion: (compra as any).fechaCreacion ? new Date((compra as any).fechaCreacion) : fechaActual,
      fechaActualizacion: fechaActual
    };
    compras.push(compraGuardada);

    // Ordenar por fecha de creación (más reciente primero) y luego por año/mes
    compras.sort((a, b) => {
      const fa = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
      const fb = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
      if (fb !== fa) return fb - fa;
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.mes - a.mes;
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
   * Obtiene el total de dólares comprados
   */
  obtenerTotalDolaresComprados(): Observable<number> {
    return this.compras$.pipe(
      map(compras => compras.reduce((total, compra) => total + compra.dolares, 0))
    );
  }

  /**
   * Obtiene el total invertido en pesos
   */
  obtenerTotalInvertido(): Observable<number> {
    return this.compras$.pipe(
      map(compras => compras.reduce((total, compra) => total + (compra.dolares * compra.precioCompra), 0))
    );
  }

  /**
   * Obtiene el precio promedio de compra
   */
  obtenerPrecioPromedio(): Observable<number> {
    return combineLatest([
      this.obtenerTotalDolaresComprados(),
      this.obtenerTotalInvertido()
    ]).pipe(
      map(([totalDolares, totalInvertido]) => {
        return totalDolares > 0 ? totalInvertido / totalDolares : 0;
      })
    );
  }

  /**
   * Obtiene el valor actual de los dólares comprados
   */
  obtenerValorActual(): Observable<number> {
    return combineLatest([
      this.obtenerTotalDolaresComprados(),
      this.dolarService.dolarActual$
    ]).pipe(
      map(([totalDolares, dolarActual]) => {
        return totalDolares * (dolarActual?.venta || 0);
      })
    );
  }

  /**
   * Obtiene el resumen completo de las compras
   */
  obtenerResumen(): Observable<ResumenCompraDolar> {
    return combineLatest([
      this.compras$,
      this.dolarService.dolarActual$
    ]).pipe(
      map(([compras, dolarActual]) => {
        const totalDolares = compras.reduce((sum, c) => sum + c.dolares, 0);
        const totalPesosCompra = compras.reduce((sum, c) => sum + (c.dolares * c.precioCompra), 0);
        const totalPesosAPI = totalDolares * (dolarActual?.venta || 0);
        const variacionTotal = totalPesosAPI - totalPesosCompra;

        return {
          totalDolares,
          totalPesosCompra,
          totalPesosAPI,
          variacionTotal
        };
      })
    );
  }

  /**
   * Obtiene las compras de un año específico
   */
  obtenerComprasPorAnio(anio: number): Observable<CompraDolar[]> {
    return this.compras$.pipe(
      map(compras => compras.filter(c => c.anio === anio))
    );
  }

  /**
   * Importa un array de compras
   */
  importarCompras(compras: CompraDolar[]): Observable<CompraDolar[]> {
    // Validar y limpiar las compras importadas
    const comprasValidas = compras.filter(compra => {
      return compra.mes && compra.anio && compra.dolares > 0 && compra.precioCompra > 0;
    }).map(compra => ({
      ...compra,
      id: compra.id || 0, // Se regenerará al guardar
      fechaCreacion: compra.fechaCreacion ? new Date(compra.fechaCreacion) : new Date(),
      fechaActualizacion: new Date()
    }));

    // Combinar con compras existentes, evitando duplicados por mes/año
    const comprasExistentes = this.comprasSubject.value;
    const comprasCombinadas = [...comprasExistentes];

    comprasValidas.forEach(nuevaCompra => {
      const indiceExistente = comprasCombinadas.findIndex(
        c => c.mes === nuevaCompra.mes && c.anio === nuevaCompra.anio
      );
      
      if (indiceExistente >= 0) {
        comprasCombinadas[indiceExistente] = {
          ...nuevaCompra,
          id: comprasCombinadas[indiceExistente].id
        };
      } else {
        comprasCombinadas.push({
          ...nuevaCompra,
          id: this.generarNuevoId(comprasCombinadas)
        });
      }
    });

    // Ordenar y guardar
    comprasCombinadas.sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.mes - a.mes;
    });

    this.comprasSubject.next(comprasCombinadas);
    this.guardarEnStorage(comprasCombinadas);

    return new Observable(observer => {
      observer.next(comprasCombinadas);
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
   * Reemplaza todas las compras con un nuevo array
   */
  reemplazarCompras(nuevasCompras: CompraDolar[]): Observable<CompraDolar[]> {
    this.comprasSubject.next(nuevasCompras);
    this.guardarEnStorage(nuevasCompras);

    return new Observable(observer => {
      observer.next(nuevasCompras);
      observer.complete();
    });
  }

  /**
   * Actualiza los precios API de todas las compras usando el valor de dólar actual
   */
  actualizarPreciosAPI(): Observable<CompraDolar[]> {
    return this.dolarService.obtenerDolarOficial().pipe(
      map(dolarAPI => {
        const precioAPI = (dolarAPI && !isNaN(dolarAPI.venta) && dolarAPI.venta > 0) ? dolarAPI.venta : 0;
        const comprasActualizadas = this.comprasSubject.value.map(compra => {
          const dolares = isNaN(compra.dolares) ? 0 : compra.dolares;
          const precioCompra = isNaN(compra.precioCompra) ? 0 : compra.precioCompra;
          const precioCompraTotal = dolares * precioCompra;
          const precioAPITotal = dolares * precioAPI;
          const diferencia = precioAPITotal - precioCompraTotal;

          return {
            ...compra,
            precioAPI,
            precioAPITotal: isNaN(precioAPITotal) ? 0 : precioAPITotal,
            diferencia: isNaN(diferencia) ? 0 : diferencia,
            fechaActualizacion: new Date()
          } as CompraDolar;
        });

        this.comprasSubject.next(comprasActualizadas);
        this.guardarEnStorage(comprasActualizadas);
        return comprasActualizadas;
      })
    );
  }

  private cargarCompras(): void {
    try {
      const comprasStr = localStorage.getItem(this.STORAGE_KEY);
      if (comprasStr) {
        const compras = JSON.parse(comprasStr) as CompraDolar[];
        
        // Validar y convertir fechas
        const comprasValidas = compras.map(compra => {
          if (compra.fechaCreacion && typeof compra.fechaCreacion === 'string') {
            compra.fechaCreacion = new Date(compra.fechaCreacion);
          }
          if (compra.fechaActualizacion && typeof compra.fechaActualizacion === 'string') {
            compra.fechaActualizacion = new Date(compra.fechaActualizacion);
          }
          return compra;
        }).filter(compra => {
          // Filtrar compras válidas
          return compra.mes && compra.anio && compra.dolares > 0 && compra.precioCompra > 0;
        });

        // Ordenar por año y mes (más reciente primero)
        comprasValidas.sort((a, b) => {
          if (a.anio !== b.anio) return b.anio - a.anio;
          return b.mes - a.mes;
        });

        this.comprasSubject.next(comprasValidas);
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