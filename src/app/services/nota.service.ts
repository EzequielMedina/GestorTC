import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Nota } from '../models/etiqueta.model';

const STORAGE_KEY_NOTAS = 'gestor_tc_notas';

@Injectable({
  providedIn: 'root'
})
export class NotaService {
  private notasSubject = new BehaviorSubject<Nota[]>(this.loadNotasFromStorage());
  public notas$ = this.notasSubject.asObservable();

  constructor() {}

  /**
   * Obtiene todas las notas
   */
  getNotas$(): Observable<Nota[]> {
    return this.notas$;
  }

  /**
   * Obtiene una nota por ID
   */
  getNotaById$(id: string): Observable<Nota | undefined> {
    return this.notas$.pipe(
      map(notas => notas.find(n => n.id === id))
    );
  }

  /**
   * Obtiene la nota de un gasto
   */
  getNotaPorGasto$(gastoId: string): Observable<Nota | undefined> {
    return this.notas$.pipe(
      map(notas => notas.find(n => n.gastoId === gastoId))
    );
  }

  /**
   * Crea o actualiza una nota para un gasto
   */
  guardarNota(gastoId: string, contenido: string): Nota {
    const notas = this.notasSubject.value;
    const notaExistente = notas.find(n => n.gastoId === gastoId);

    if (notaExistente) {
      // Actualizar nota existente
      const notaActualizada: Nota = {
        ...notaExistente,
        contenido: contenido.trim(),
        fechaActualizacion: new Date().toISOString()
      };

      const notasActualizadas = notas.map(n =>
        n.id === notaExistente.id ? notaActualizada : n
      );
      this.saveNotasToStorage(notasActualizadas);
      this.notasSubject.next(notasActualizadas);

      return notaActualizada;
    } else {
      // Crear nueva nota
      const nuevaNota: Nota = {
        id: uuidv4(),
        gastoId,
        contenido: contenido.trim(),
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      };

      const notasActualizadas = [...notas, nuevaNota];
      this.saveNotasToStorage(notasActualizadas);
      this.notasSubject.next(notasActualizadas);

      return nuevaNota;
    }
  }

  /**
   * Elimina una nota
   */
  eliminarNota(id: string): void {
    const notas = this.notasSubject.value.filter(n => n.id !== id);
    this.saveNotasToStorage(notas);
    this.notasSubject.next(notas);
  }

  /**
   * Elimina la nota de un gasto
   */
  eliminarNotaPorGasto(gastoId: string): void {
    const notas = this.notasSubject.value.filter(n => n.gastoId !== gastoId);
    this.saveNotasToStorage(notas);
    this.notasSubject.next(notas);
  }

  /**
   * Carga las notas desde localStorage
   */
  private loadNotasFromStorage(): Nota[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTAS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar notas:', error);
    }
    return [];
  }

  /**
   * Guarda las notas en localStorage
   */
  private saveNotasToStorage(notas: Nota[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_NOTAS, JSON.stringify(notas));
    } catch (error) {
      console.error('Error al guardar notas:', error);
    }
  }
}

