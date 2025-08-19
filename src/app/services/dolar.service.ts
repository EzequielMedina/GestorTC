import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { DolarAPI } from '../models/compra-dolar.model';

@Injectable({
  providedIn: 'root'
})
export class DolarService {
  private readonly API_URL = 'https://dolarapi.com/v1/dolares/oficial';
  private readonly CACHE_KEY = 'dolar_cache';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos
  
  private dolarActualSubject = new BehaviorSubject<DolarAPI | null>(null);
  public dolarActual$ = this.dolarActualSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarDolarDesdeCache();
  }

  /**
   * Obtiene el valor del dólar desde la API o desde caché si está vigente
   */
  obtenerDolarOficial(): Observable<DolarAPI> {
    const cache = this.obtenerCache();
    
    if (cache && this.esCacheValido(cache.timestamp)) {
      console.log('Usando dólar desde caché:', cache.data);
      this.dolarActualSubject.next(cache.data);
      return new Observable<DolarAPI>(observer => {
        observer.next(cache.data);
        observer.complete();
      });
    }

    console.log('Obteniendo dólar desde API...');
    return this.http.get<DolarAPI>(this.API_URL, { headers: { 'Accept': 'application/json' }}).pipe(
      tap(data => {
        console.log('Dólar obtenido desde API:', data);
        this.guardarEnCache(data);
        this.dolarActualSubject.next(data);
      }),
      catchError(error => {
        console.error('Error al obtener dólar desde API:', error);
        // Si hay error y tenemos caché (aunque esté vencido), usarlo
        if (cache) {
          console.log('Usando caché vencido por error en API');
          this.dolarActualSubject.next(cache.data);
          return new Observable<DolarAPI>(observer => {
            observer.next(cache.data);
            observer.complete();
          });
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene el precio de venta actual del dólar
   */
  obtenerPrecioVenta(): Observable<number> {
    return this.obtenerDolarOficial().pipe(
      map(dolar => dolar.venta)
    );
  }

  /**
   * Obtiene el precio de compra actual del dólar
   */
  obtenerPrecioCompra(): Observable<number> {
    return this.obtenerDolarOficial().pipe(
      map(dolar => dolar.compra)
    );
  }

  /**
   * Fuerza la actualización del dólar desde la API
   */
  actualizarDolar(): Observable<DolarAPI> {
    this.limpiarCache();
    return this.obtenerDolarOficial();
  }

  /**
   * Obtiene el último valor del dólar sin hacer nueva consulta
   */
  obtenerUltimoDolar(): DolarAPI | null {
    return this.dolarActualSubject.value;
  }

  private cargarDolarDesdeCache(): void {
    const cache = this.obtenerCache();
    if (cache) {
      this.dolarActualSubject.next(cache.data);
    }
  }

  private obtenerCache(): { data: DolarAPI; timestamp: number } | null {
    try {
      const cacheStr = localStorage.getItem(this.CACHE_KEY);
      if (cacheStr) {
        return JSON.parse(cacheStr);
      }
    } catch (error) {
      console.error('Error al leer caché de dólar:', error);
      this.limpiarCache();
    }
    return null;
  }

  private guardarEnCache(data: DolarAPI): void {
    try {
      const cache = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error al guardar caché de dólar:', error);
    }
  }

  private esCacheValido(timestamp: number): boolean {
    return (Date.now() - timestamp) < this.CACHE_DURATION;
  }

  private limpiarCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  /**
   * Formatea un precio en pesos argentinos
   */
  formatearPesos(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  }

  /**
   * Formatea una cantidad de dólares
   */
  formatearDolares(monto: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(monto);
  }
}