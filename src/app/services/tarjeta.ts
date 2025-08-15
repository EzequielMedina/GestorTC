import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Tarjeta } from '../models/tarjeta.model';

const STORAGE_KEY = 'gestor_tc_tarjetas';

@Injectable({
  providedIn: 'root'
})
export class TarjetaService {
  private tarjetasSubject = new BehaviorSubject<Tarjeta[]>(this.loadFromStorage());

  constructor() {
    // Inicializar con datos de ejemplo si no hay datos guardados
    if (this.tarjetasSubject.value.length === 0) {
      this.initializeSampleData();
    }
  }

  /**
   * Obtiene todas las tarjetas como un Observable
   */
  getTarjetas$(): Observable<Tarjeta[]> {
    return this.tarjetasSubject.asObservable();
  }

  /**
   * Obtiene una tarjeta por su ID
   * @param id ID de la tarjeta a buscar
   */
  getTarjetaById(id: string): Observable<Tarjeta | undefined> {
    return this.tarjetasSubject.pipe(
      map(tarjetas => tarjetas.find(t => t.id === id))
    );
  }

  /**
   * Agrega una nueva tarjeta
   * @param tarjeta Tarjeta a agregar (sin ID)
   */
  agregarTarjeta(tarjeta: Omit<Tarjeta, 'id'>): Observable<Tarjeta> {
    const saneada = this.sanitizarTarjetaSinId(tarjeta);
    const nuevaTarjeta: Tarjeta = {
      ...saneada,
      id: uuidv4()
    };

    return this.actualizarTarjetas([...this.tarjetasSubject.value, nuevaTarjeta]).pipe(
      map(() => nuevaTarjeta)
    );
  }

  /**
   * Actualiza una tarjeta existente
   * @param id ID de la tarjeta a actualizar
   * @param cambios Objeto con los cambios a aplicar
   */
  actualizarTarjeta(id: string, cambios: Partial<Omit<Tarjeta, 'id'>>): Observable<Tarjeta | undefined> {
    const tarjetaActual = this.tarjetasSubject.value.find(t => t.id === id);
    
    if (!tarjetaActual) {
      return of(undefined);
    }

    const cambiosSaneados = this.sanitizarParcial(cambios);
    const tarjetaActualizada: Tarjeta = {
      ...tarjetaActual,
      ...cambiosSaneados,
      id // Asegurarse de que el ID no se modifique
    };

    return this.actualizarTarjetas(
      this.tarjetasSubject.value.map(t => t.id === id ? tarjetaActualizada : t)
    ).pipe(
      map(() => tarjetaActualizada)
    );
  }

  /**
   * Elimina una tarjeta por su ID
   * @param id ID de la tarjeta a eliminar
   */
  eliminarTarjeta(id: string): Observable<boolean> {
    const existe = this.tarjetasSubject.value.some(t => t.id === id);
    
    if (!existe) {
      return of(false);
    }

    return this.actualizarTarjetas(
      this.tarjetasSubject.value.filter(t => t.id !== id)
    ).pipe(
      map(() => true)
    );
  }

  /**
   * Reemplaza completamente la colección de tarjetas.
   * Útil para operaciones de importación.
   */
  reemplazarTarjetas(tarjetas: Tarjeta[]): Observable<Tarjeta[]> {
    return this.actualizarTarjetas(tarjetas);
  }

  /**
   * Actualiza la lista de tarjetas y guarda en el almacenamiento local
   * @param tarjetas Nueva lista de tarjetas
   */
  private actualizarTarjetas(tarjetas: Tarjeta[]): Observable<Tarjeta[]> {
    this.tarjetasSubject.next(tarjetas);
    this.saveToStorage(tarjetas);
    return of(tarjetas);
  }

  /**
   * Carga las tarjetas desde el almacenamiento local
   */
  private loadFromStorage(): Tarjeta[] {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
      console.error('Error al cargar tarjetas del almacenamiento local:', error);
      return [];
    }
  }

  /**
   * Guarda las tarjetas en el almacenamiento local
   */
  private saveToStorage(tarjetas: Tarjeta[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tarjetas));
    } catch (error) {
      console.error('Error al guardar tarjetas en el almacenamiento local:', error);
    }
  }

  /**
   * Normaliza el campo ultimosDigitos: devuelve undefined si está vacío o solo espacios.
   */
  private normalizarUltimosDigitos(valor?: string): string | undefined {
    if (valor === undefined || valor === null) return undefined;
    const v = String(valor).trim();
    return v.length === 0 ? undefined : v;
  }

  /**
   * Sanitiza una tarjeta sin ID (para alta)
   */
  private sanitizarTarjetaSinId(t: Omit<Tarjeta, 'id'>): Omit<Tarjeta, 'id'> {
    return {
      ...t,
      ultimosDigitos: this.normalizarUltimosDigitos(t.ultimosDigitos)
    };
  }

  /**
   * Sanitiza cambios parciales (para edición)
   */
  private sanitizarParcial(cambios: Partial<Omit<Tarjeta, 'id'>>): Partial<Omit<Tarjeta, 'id'>> {
    const result: Partial<Omit<Tarjeta, 'id'>> = { ...cambios };
    if ('ultimosDigitos' in result) {
      result.ultimosDigitos = this.normalizarUltimosDigitos(result.ultimosDigitos as any);
    }
    return result;
  }

  /**
   * Inicializa datos de ejemplo si no hay tarjetas guardadas
   */
  private initializeSampleData(): void {
    const sampleTarjetas: Tarjeta[] = [
      { 
        id: uuidv4(), 
        nombre: 'Visa Oro', 
        banco: 'Banco Nación',
        limite: 50000,
        diaCierre: 5,
        diaVencimiento: 15,
        ultimosDigitos: '1234'
      },
      { 
        id: uuidv4(), 
        nombre: 'Mastercard Platinum', 
        banco: 'Galicia',
        limite: 100000,
        diaCierre: 10,
        diaVencimiento: 20,
        ultimosDigitos: '5678'
      },
      { 
        id: uuidv4(), 
        nombre: 'Amex Gold', 
        banco: 'Santander',
        limite: 75000,
        diaCierre: 15,
        diaVencimiento: 25,
        ultimosDigitos: '9012'
      }
    ];
    
    this.actualizarTarjetas(sampleTarjetas).subscribe();
  }
}
