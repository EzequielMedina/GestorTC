import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Etiqueta } from '../models/etiqueta.model';

const STORAGE_KEY_ETIQUETAS = 'gestor_tc_etiquetas';

@Injectable({
  providedIn: 'root'
})
export class EtiquetaService {
  private etiquetasSubject = new BehaviorSubject<Etiqueta[]>(this.loadEtiquetasFromStorage());
  public etiquetas$ = this.etiquetasSubject.asObservable();

  // Colores predefinidos para etiquetas
  private coloresDisponibles = [
    '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA',
    '#FCBAD3', '#FFD93D', '#6BCB77', '#95A5A6', '#3B82F6',
    '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#EF4444'
  ];

  constructor() {}

  /**
   * Obtiene todas las etiquetas
   */
  getEtiquetas$(): Observable<Etiqueta[]> {
    return this.etiquetas$;
  }

  /**
   * Obtiene una etiqueta por ID
   */
  getEtiquetaById$(id: string): Observable<Etiqueta | undefined> {
    return this.etiquetas$.pipe(
      map(etiquetas => etiquetas.find(e => e.id === id))
    );
  }

  /**
   * Crea una nueva etiqueta
   */
  crearEtiqueta(nombre: string, color?: string): Etiqueta {
    const etiqueta: Etiqueta = {
      id: uuidv4(),
      nombre: nombre.trim(),
      color: color || this.obtenerColorDisponible(),
      fechaCreacion: new Date().toISOString()
    };

    const etiquetas = [...this.etiquetasSubject.value, etiqueta];
    this.saveEtiquetasToStorage(etiquetas);
    this.etiquetasSubject.next(etiquetas);

    return etiqueta;
  }

  /**
   * Actualiza una etiqueta
   */
  actualizarEtiqueta(id: string, nombre: string, color: string): void {
    const etiquetas = this.etiquetasSubject.value.map(e =>
      e.id === id
        ? { ...e, nombre: nombre.trim(), color }
        : e
    );
    this.saveEtiquetasToStorage(etiquetas);
    this.etiquetasSubject.next(etiquetas);
  }

  /**
   * Elimina una etiqueta
   */
  eliminarEtiqueta(id: string): void {
    const etiquetas = this.etiquetasSubject.value.filter(e => e.id !== id);
    this.saveEtiquetasToStorage(etiquetas);
    this.etiquetasSubject.next(etiquetas);
  }

  /**
   * Obtiene un color disponible que no esté en uso
   */
  private obtenerColorDisponible(): string {
    const etiquetas = this.etiquetasSubject.value;
    const coloresUsados = etiquetas.map(e => e.color);
    const colorDisponible = this.coloresDisponibles.find(
      color => !coloresUsados.includes(color)
    );
    return colorDisponible || this.coloresDisponibles[etiquetas.length % this.coloresDisponibles.length];
  }

  /**
   * Carga las etiquetas desde localStorage
   */
  private loadEtiquetasFromStorage(): Etiqueta[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ETIQUETAS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar etiquetas:', error);
    }
    return [];
  }

  /**
   * Guarda las etiquetas en localStorage
   */
  private saveEtiquetasToStorage(etiquetas: Etiqueta[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_ETIQUETAS, JSON.stringify(etiquetas));
    } catch (error) {
      console.error('Error al guardar etiquetas:', error);
    }
  }
}

