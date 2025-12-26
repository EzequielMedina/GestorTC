import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const STORAGE_KEY_PREFERENCIAS = 'gestor_tc_preferencias_usuario';
const STORAGE_KEY_DESC_FRECUENTES = 'gestor_tc_descripciones_frecuentes';

export interface PreferenciasUsuario {
  ultimaTarjetaId?: string;
  ultimaCategoriaId?: string;
  modoRapidoActivo?: boolean;
}

export interface DescripcionFrecuente {
  texto: string;
  vecesUsada: number;
  ultimaUso: string; // ISO string
  montoPromedio?: number;
  categoriaId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PreferenciasUsuarioService {
  private preferenciasSubject = new BehaviorSubject<PreferenciasUsuario>(this.cargarPreferencias());
  public preferencias$ = this.preferenciasSubject.asObservable();

  private descripcionesFrecuentesSubject = new BehaviorSubject<DescripcionFrecuente[]>(this.cargarDescripcionesFrecuentes());
  public descripcionesFrecuentes$ = this.descripcionesFrecuentesSubject.asObservable();

  constructor() {}

  /**
   * Obtiene las preferencias del usuario
   */
  getPreferencias$(): Observable<PreferenciasUsuario> {
    return this.preferencias$;
  }

  /**
   * Obtiene las preferencias actuales
   */
  getPreferencias(): PreferenciasUsuario {
    return this.preferenciasSubject.value;
  }

  /**
   * Actualiza la última tarjeta usada
   */
  actualizarUltimaTarjeta(tarjetaId: string): void {
    const preferencias = { ...this.preferenciasSubject.value, ultimaTarjetaId: tarjetaId };
    this.guardarPreferencias(preferencias);
    this.preferenciasSubject.next(preferencias);
  }

  /**
   * Actualiza la última categoría usada
   */
  actualizarUltimaCategoria(categoriaId: string): void {
    const preferencias = { ...this.preferenciasSubject.value, ultimaCategoriaId: categoriaId };
    this.guardarPreferencias(preferencias);
    this.preferenciasSubject.next(preferencias);
  }

  /**
   * Registra el uso de una descripción
   */
  registrarDescripcion(descripcion: string, monto?: number, categoriaId?: string): void {
    const descripciones = this.descripcionesFrecuentesSubject.value;
    const descripcionLower = descripcion.toLowerCase().trim();
    
    const existente = descripciones.find(d => d.texto.toLowerCase() === descripcionLower);
    
    if (existente) {
      // Actualizar existente
      existente.vecesUsada += 1;
      existente.ultimaUso = new Date().toISOString();
      if (monto) {
        // Calcular promedio
        const total = (existente.montoPromedio || 0) * (existente.vecesUsada - 1) + monto;
        existente.montoPromedio = total / existente.vecesUsada;
      }
      if (categoriaId) {
        existente.categoriaId = categoriaId;
      }
    } else {
      // Crear nueva
      descripciones.push({
        texto: descripcion.trim(),
        vecesUsada: 1,
        ultimaUso: new Date().toISOString(),
        montoPromedio: monto,
        categoriaId
      });
    }

    // Ordenar por veces usada y última fecha
    descripciones.sort((a, b) => {
      if (b.vecesUsada !== a.vecesUsada) {
        return b.vecesUsada - a.vecesUsada;
      }
      return new Date(b.ultimaUso).getTime() - new Date(a.ultimaUso).getTime();
    });

    // Mantener solo las top 20
    const top20 = descripciones.slice(0, 20);
    
    this.guardarDescripcionesFrecuentes(top20);
    this.descripcionesFrecuentesSubject.next(top20);
  }

  /**
   * Obtiene las descripciones más frecuentes
   */
  getDescripcionesFrecuentes$(limite: number = 10): Observable<DescripcionFrecuente[]> {
    return this.descripcionesFrecuentes$.pipe(
      map(desc => desc.slice(0, limite))
    );
  }

  /**
   * Obtiene las descripciones más frecuentes
   */
  getDescripcionesFrecuentes(limite: number = 10): DescripcionFrecuente[] {
    return this.descripcionesFrecuentesSubject.value.slice(0, limite);
  }

  /**
   * Carga las preferencias desde localStorage
   */
  private cargarPreferencias(): PreferenciasUsuario {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFERENCIAS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar preferencias:', error);
    }
    return {};
  }

  /**
   * Guarda las preferencias en localStorage
   */
  private guardarPreferencias(preferencias: PreferenciasUsuario): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFERENCIAS, JSON.stringify(preferencias));
    } catch (error) {
      console.error('Error al guardar preferencias:', error);
    }
  }

  /**
   * Carga las descripciones frecuentes desde localStorage
   */
  private cargarDescripcionesFrecuentes(): DescripcionFrecuente[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DESC_FRECUENTES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar descripciones frecuentes:', error);
    }
    return [];
  }

  /**
   * Guarda las descripciones frecuentes en localStorage
   */
  private guardarDescripcionesFrecuentes(descripciones: DescripcionFrecuente[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_DESC_FRECUENTES, JSON.stringify(descripciones));
    } catch (error) {
      console.error('Error al guardar descripciones frecuentes:', error);
    }
  }
}

