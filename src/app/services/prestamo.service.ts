import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Prestamo, Entrega } from '../models/prestamo.model';

const STORAGE_KEY = 'gestor_tc_prestamos';

@Injectable({
    providedIn: 'root'
})
export class PrestamoService {
    private prestamosSubject = new BehaviorSubject<Prestamo[]>(this.loadFromStorage());

    constructor() {
        // Inicializar con datos de ejemplo si no hay datos guardados
        if (this.prestamosSubject.value.length === 0) {
            // this.initializeSampleData(); // Opcional: descomentar si se quieren datos de prueba
        }
    }

    /**
     * Obtiene todos los préstamos como un Observable
     */
    getPrestamos$(): Observable<Prestamo[]> {
        return this.prestamosSubject.asObservable();
    }

    /**
     * Obtiene un préstamo por su ID
     * @param id ID del préstamo a buscar
     */
    getPrestamoById(id: string): Observable<Prestamo | undefined> {
        return this.prestamosSubject.pipe(
            map(prestamos => prestamos.find(p => p.id === id))
        );
    }

    /**
     * Agrega un nuevo préstamo
     * @param prestamo Préstamo a agregar (sin ID)
     */
    agregarPrestamo(prestamo: Omit<Prestamo, 'id' | 'entregas'>): Observable<Prestamo> {
        const nuevoPrestamo: Prestamo = {
            ...prestamo,
            id: uuidv4(),
            entregas: [],
            estado: 'ACTIVO'
        };

        return this.actualizarPrestamos([...this.prestamosSubject.value, nuevoPrestamo]).pipe(
            map(() => nuevoPrestamo)
        );
    }

    /**
     * Actualiza un préstamo existente
     * @param id ID del préstamo a actualizar
     * @param cambios Objeto con los cambios a aplicar
     */
    actualizarPrestamo(id: string, cambios: Partial<Omit<Prestamo, 'id' | 'entregas'>>): Observable<Prestamo | undefined> {
        const prestamoActual = this.prestamosSubject.value.find(p => p.id === id);

        if (!prestamoActual) {
            return of(undefined);
        }

        const prestamoActualizado: Prestamo = {
            ...prestamoActual,
            ...cambios
        };

        return this.actualizarPrestamos(
            this.prestamosSubject.value.map(p => p.id === id ? prestamoActualizado : p)
        ).pipe(
            map(() => prestamoActualizado)
        );
    }

    /**
     * Elimina un préstamo por su ID
     * @param id ID del préstamo a eliminar
     */
    eliminarPrestamo(id: string): Observable<boolean> {
        const existe = this.prestamosSubject.value.some(p => p.id === id);

        if (!existe) {
            return of(false);
        }

        return this.actualizarPrestamos(
            this.prestamosSubject.value.filter(p => p.id !== id)
        ).pipe(
            map(() => true)
        );
    }

    /**
     * Agrega una entrega a un préstamo
     * @param prestamoId ID del préstamo
     * @param entrega Entrega a agregar (sin ID)
     */
    agregarEntrega(prestamoId: string, entrega: Omit<Entrega, 'id'>): Observable<Entrega | undefined> {
        const prestamo = this.prestamosSubject.value.find(p => p.id === prestamoId);
        if (!prestamo) return of(undefined);

        const nuevaEntrega: Entrega = {
            ...entrega,
            id: uuidv4()
        };

        const prestamoActualizado: Prestamo = {
            ...prestamo,
            entregas: [...prestamo.entregas, nuevaEntrega]
        };

        return this.actualizarPrestamos(
            this.prestamosSubject.value.map(p => p.id === prestamoId ? prestamoActualizado : p)
        ).pipe(
            map(() => nuevaEntrega)
        );
    }

    /**
     * Actualiza una entrega existente
     * @param prestamoId ID del préstamo
     * @param entregaId ID de la entrega a actualizar
     * @param cambios Cambios a aplicar a la entrega
     */
    actualizarEntrega(prestamoId: string, entregaId: string, cambios: Partial<Omit<Entrega, 'id'>>): Observable<boolean> {
        const prestamo = this.prestamosSubject.value.find(p => p.id === prestamoId);
        if (!prestamo) return of(false);

        const entregaActual = prestamo.entregas.find(e => e.id === entregaId);
        if (!entregaActual) return of(false);

        const entregaActualizada: Entrega = {
            ...entregaActual,
            ...cambios
        };

        const prestamoActualizado: Prestamo = {
            ...prestamo,
            entregas: prestamo.entregas.map(e => e.id === entregaId ? entregaActualizada : e)
        };

        return this.actualizarPrestamos(
            this.prestamosSubject.value.map(p => p.id === prestamoId ? prestamoActualizado : p)
        ).pipe(
            map(() => true)
        );
    }

    /**
     * Elimina una entrega de un préstamo
     * @param prestamoId ID del préstamo
     * @param entregaId ID de la entrega
     */
    eliminarEntrega(prestamoId: string, entregaId: string): Observable<boolean> {
        const prestamo = this.prestamosSubject.value.find(p => p.id === prestamoId);
        if (!prestamo) return of(false);

        const prestamoActualizado: Prestamo = {
            ...prestamo,
            entregas: prestamo.entregas.filter(e => e.id !== entregaId)
        };

        return this.actualizarPrestamos(
            this.prestamosSubject.value.map(p => p.id === prestamoId ? prestamoActualizado : p)
        ).pipe(
            map(() => true)
        );
    }

    /**
     * Reemplaza completamente la colección de préstamos.
     * Útil para operaciones de importación.
     */
    reemplazarPrestamos(prestamos: Prestamo[]): Observable<Prestamo[]> {
        return this.actualizarPrestamos(prestamos);
    }

    /**
     * Actualiza la lista de préstamos y guarda en el almacenamiento local
     * @param prestamos Nueva lista de préstamos
     */
    private actualizarPrestamos(prestamos: Prestamo[]): Observable<Prestamo[]> {
        this.prestamosSubject.next(prestamos);
        this.saveToStorage(prestamos);
        return of(prestamos);
    }

    /**
     * Carga los préstamos desde el almacenamiento local
     */
    private loadFromStorage(): Prestamo[] {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : [];
        } catch (error) {
            console.error('Error al cargar préstamos del almacenamiento local:', error);
            return [];
        }
    }

    /**
     * Guarda los préstamos en el almacenamiento local
     */
    private saveToStorage(prestamos: Prestamo[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prestamos));
        } catch (error) {
            console.error('Error al guardar préstamos en el almacenamiento local:', error);
        }
    }
}
