import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Categoria, CATEGORIAS_PREDEFINIDAS } from '../models/categoria.model';

const STORAGE_KEY = 'gestor_tc_categorias';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private categoriasSubject = new BehaviorSubject<Categoria[]>(this.loadFromStorage());

  constructor() {
    // Inicializar con categorías predefinidas si no hay datos guardados
    if (this.categoriasSubject.value.length === 0) {
      this.initializePredefinedCategories();
    }
  }

  /**
   * Obtiene todas las categorías como un Observable
   */
  getCategorias$(): Observable<Categoria[]> {
    return this.categoriasSubject.asObservable();
  }

  /**
   * Obtiene una categoría por su ID
   * @param id ID de la categoría a buscar
   */
  getCategoriaById(id: string): Observable<Categoria | undefined> {
    return this.categoriasSubject.pipe(
      map(categorias => categorias.find(c => c.id === id))
    );
  }

  /**
   * Obtiene las categorías predefinidas
   */
  getCategoriasPredefinidas$(): Observable<Categoria[]> {
    return this.categoriasSubject.pipe(
      map(categorias => categorias.filter(c => c.esPredefinida))
    );
  }

  /**
   * Obtiene las categorías personalizadas
   */
  getCategoriasPersonalizadas$(): Observable<Categoria[]> {
    return this.categoriasSubject.pipe(
      map(categorias => categorias.filter(c => !c.esPredefinida))
    );
  }

  /**
   * Agrega una nueva categoría personalizada
   * @param categoria Categoría a agregar (sin ID)
   */
  agregarCategoria(categoria: Omit<Categoria, 'id' | 'esPredefinida'>): Observable<Categoria> {
    const nuevaCategoria: Categoria = {
      ...categoria,
      id: uuidv4(),
      esPredefinida: false
    };

    return this.actualizarCategorias([...this.categoriasSubject.value, nuevaCategoria]).pipe(
      map(() => nuevaCategoria)
    );
  }

  /**
   * Actualiza una categoría existente (solo personalizadas)
   * @param id ID de la categoría a actualizar
   * @param cambios Objeto con los cambios a aplicar
   */
  actualizarCategoria(id: string, cambios: Partial<Omit<Categoria, 'id' | 'esPredefinida'>>): Observable<Categoria | undefined> {
    const categoriaActual = this.categoriasSubject.value.find(c => c.id === id);
    
    if (!categoriaActual) {
      return of(undefined);
    }

    // No permitir modificar categorías predefinidas
    if (categoriaActual.esPredefinida) {
      return of(undefined);
    }

    const categoriaActualizada: Categoria = {
      ...categoriaActual,
      ...cambios,
      id,
      esPredefinida: false
    };

    return this.actualizarCategorias(
      this.categoriasSubject.value.map(c => c.id === id ? categoriaActualizada : c)
    ).pipe(
      map(() => categoriaActualizada)
    );
  }

  /**
   * Elimina una categoría (solo personalizadas)
   * @param id ID de la categoría a eliminar
   */
  eliminarCategoria(id: string): Observable<boolean> {
    const categoria = this.categoriasSubject.value.find(c => c.id === id);
    
    if (!categoria) {
      return of(false);
    }

    // No permitir eliminar categorías predefinidas
    if (categoria.esPredefinida) {
      return of(false);
    }

    const categoriasActualizadas = this.categoriasSubject.value.filter(c => c.id !== id);
    return this.actualizarCategorias(categoriasActualizadas).pipe(
      map(() => true)
    );
  }

  /**
   * Intenta asignar una categoría automáticamente basada en la descripción
   * @param descripcion Descripción del gasto
   */
  sugerirCategoria(descripcion: string): Observable<Categoria | undefined> {
    if (!descripcion) {
      return of(undefined);
    }

    const descripcionLower = descripcion.toLowerCase();
    
    // Palabras clave para cada categoría
    const keywords: { [key: string]: string[] } = {
      'Alimentación': ['comida', 'restaurant', 'restaurante', 'supermercado', 'mercado', 'cena', 'almuerzo', 'desayuno', 'pizza', 'hamburguesa', 'café', 'cafe'],
      'Transporte': ['uber', 'taxi', 'colectivo', 'subte', 'metro', 'nafta', 'combustible', 'estacionamiento', 'peaje', 'viaje'],
      'Entretenimiento': ['cine', 'película', 'pelicula', 'netflix', 'spotify', 'juego', 'videojuego', 'teatro', 'concierto'],
      'Salud': ['farmacia', 'medico', 'médico', 'hospital', 'clinica', 'clínica', 'dentista', 'medicina', 'farmacia'],
      'Educación': ['libro', 'curso', 'universidad', 'colegio', 'escuela', 'material', 'estudio'],
      'Ropa': ['ropa', 'zapatos', 'zapato', 'vestido', 'pantalon', 'pantalón', 'camisa', 'calzado'],
      'Servicios': ['luz', 'agua', 'gas', 'internet', 'telefono', 'teléfono', 'cable', 'servicio', 'impuesto', 'alquiler'],
      'Compras': ['compra', 'tienda', 'super', 'supermercado', 'shopping', 'mall']
    };

    return this.getCategorias$().pipe(
      map(categorias => {
        // Buscar coincidencias en palabras clave
        for (const [nombreCategoria, palabras] of Object.entries(keywords)) {
          if (palabras.some(palabra => descripcionLower.includes(palabra))) {
            const categoria = categorias.find(c => c.nombre === nombreCategoria);
            if (categoria) {
              return categoria;
            }
          }
        }

        // Si no hay coincidencia, retornar "Otros"
        return categorias.find(c => c.nombre === 'Otros');
      })
    );
  }

  /**
   * Actualiza el estado de las categorías y persiste en localStorage
   */
  private actualizarCategorias(categorias: Categoria[]): Observable<void> {
    return new Observable(observer => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(categorias));
        this.categoriasSubject.next(categorias);
        observer.next();
        observer.complete();
      } catch (error) {
        console.error('Error al guardar categorías:', error);
        observer.error(error);
      }
    });
  }

  /**
   * Carga las categorías desde localStorage
   */
  private loadFromStorage(): Categoria[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
    return [];
  }

  /**
   * Inicializa las categorías predefinidas
   */
  private initializePredefinedCategories(): void {
    const categoriasPredefinidas: Categoria[] = CATEGORIAS_PREDEFINIDAS.map(cat => ({
      ...cat,
      id: uuidv4()
    }));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categoriasPredefinidas));
      this.categoriasSubject.next(categoriasPredefinidas);
    } catch (error) {
      console.error('Error al inicializar categorías predefinidas:', error);
    }
  }
}

