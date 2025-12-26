import { Injectable } from '@angular/core';
import { ReglaCategorizacion } from '../models/configuracion-mapeo.model';
import { CategoriaService } from './categoria.service';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

const STORAGE_KEY_REGLAS = 'gestor_tc_reglas_categorizacion';

@Injectable({
  providedIn: 'root'
})
export class CategorizacionServiciosService {
  private reglasSubject = new BehaviorSubject<ReglaCategorizacion[]>(this.loadReglasFromStorage());
  public reglas$ = this.reglasSubject.asObservable();

  // Reglas predefinidas para servicios comunes
  private reglasPredefinidas: ReglaCategorizacion[] = [
    // Servicios públicos
    { patron: 'edenor|edesur|electricidad|luz|energía', categoriaId: '', prioridad: 100 },
    { patron: 'metrogas|camuzzi|gas|gas natural', categoriaId: '', prioridad: 100 },
    { patron: 'aysa|agua|agua y saneamiento', categoriaId: '', prioridad: 100 },
    { patron: 'fibertel|movistar|personal|claro|internet|wifi|conexión', categoriaId: '', prioridad: 100 },
    { patron: 'telecom|telefónica|teléfono|celular', categoriaId: '', prioridad: 100 },
    
    // Entretenimiento
    { patron: 'netflix|disney|hbo|prime video|amazon prime', categoriaId: '', prioridad: 90 },
    { patron: 'spotify|apple music|youtube premium|music', categoriaId: '', prioridad: 90 },
    { patron: 'playstation|steam|xbox|nintendo|gaming', categoriaId: '', prioridad: 85 },
    
    // Salud
    { patron: 'gym|gimnasio|fitness|personal trainer', categoriaId: '', prioridad: 80 },
    { patron: 'obra social|prepaga|medicina prepaga', categoriaId: '', prioridad: 80 },
    
    // Educación
    { patron: 'universidad|colegio|curso|educación|aprender', categoriaId: '', prioridad: 75 },
    
    // Seguros
    { patron: 'seguro|aseguradora|cobertura', categoriaId: '', prioridad: 70 }
  ];

  constructor(private categoriaService: CategoriaService) {
    this.inicializarReglasPredefinidas();
  }

  /**
   * Inicializa las reglas predefinidas con IDs de categorías reales
   */
  private inicializarReglasPredefinidas(): void {
    this.categoriaService.getCategorias$().subscribe(categorias => {
      const categoriaServicios = categorias.find(c => 
        c.nombre.toLowerCase().includes('servicio') || 
        c.nombre.toLowerCase() === 'servicios'
      );
      const categoriaEntretenimiento = categorias.find(c => 
        c.nombre.toLowerCase().includes('entretenimiento') || 
        c.nombre.toLowerCase() === 'entretenimiento'
      );
      const categoriaSalud = categorias.find(c => 
        c.nombre.toLowerCase().includes('salud') || 
        c.nombre.toLowerCase() === 'salud'
      );
      const categoriaEducacion = categorias.find(c => 
        c.nombre.toLowerCase().includes('educación') || 
        c.nombre.toLowerCase() === 'educación'
      );

      // Actualizar reglas predefinidas con IDs reales
      this.reglasPredefinidas = this.reglasPredefinidas.map(regla => {
        if (regla.prioridad >= 100) {
          return { ...regla, categoriaId: categoriaServicios?.id || '' };
        } else if (regla.prioridad >= 90) {
          return { ...regla, categoriaId: categoriaEntretenimiento?.id || '' };
        } else if (regla.prioridad >= 80) {
          return { ...regla, categoriaId: categoriaSalud?.id || '' };
        } else if (regla.prioridad >= 75) {
          return { ...regla, categoriaId: categoriaEducacion?.id || '' };
        }
        return regla;
      });
    });
  }

  /**
   * Categoriza una descripción usando las reglas disponibles
   */
  categorizar(descripcion: string, reglas?: ReglaCategorizacion[]): Observable<string | undefined> {
    const reglasAUsar = reglas || this.reglasSubject.value;
    const todasLasReglas = [...this.reglasPredefinidas, ...reglasAUsar]
      .filter(r => r.categoriaId && r.patron)
      .sort((a, b) => b.prioridad - a.prioridad);

    const descripcionLower = descripcion.toLowerCase();

    for (const regla of todasLasReglas) {
      try {
        // Intentar como regex primero
        const regex = new RegExp(regla.patron, 'i');
        if (regex.test(descripcionLower)) {
          return new Observable(observer => {
            observer.next(regla.categoriaId);
            observer.complete();
          });
        }
      } catch (e) {
        // Si falla como regex, buscar como texto simple
        if (descripcionLower.includes(regla.patron.toLowerCase())) {
          return new Observable(observer => {
            observer.next(regla.categoriaId);
            observer.complete();
          });
        }
      }
    }

    return new Observable(observer => {
      observer.next(undefined);
      observer.complete();
    });
  }

  /**
   * Obtiene las reglas predefinidas
   */
  getReglasPredefinidas(): ReglaCategorizacion[] {
    return [...this.reglasPredefinidas];
  }

  /**
   * Agrega una nueva regla de categorización
   */
  agregarRegla(patron: string, categoriaId: string, prioridad: number = 50): void {
    const nuevaRegla: ReglaCategorizacion = {
      patron,
      categoriaId,
      prioridad
    };

    const reglas = [...this.reglasSubject.value, nuevaRegla];
    this.saveReglasToStorage(reglas);
    this.reglasSubject.next(reglas);
  }

  /**
   * Elimina una regla
   */
  eliminarRegla(patron: string, categoriaId: string): void {
    const reglas = this.reglasSubject.value.filter(
      r => !(r.patron === patron && r.categoriaId === categoriaId)
    );
    this.saveReglasToStorage(reglas);
    this.reglasSubject.next(reglas);
  }

  /**
   * Carga reglas desde localStorage
   */
  private loadReglasFromStorage(): ReglaCategorizacion[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REGLAS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar reglas de categorización:', error);
    }
    return [];
  }

  /**
   * Guarda reglas en localStorage
   */
  private saveReglasToStorage(reglas: ReglaCategorizacion[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_REGLAS, JSON.stringify(reglas));
    } catch (error) {
      console.error('Error al guardar reglas de categorización:', error);
    }
  }
}

