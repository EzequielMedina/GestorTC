import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { FiltroAvanzado, FiltroGuardado, FILTRO_POR_DEFECTO } from '../models/filtro-avanzado.model';
import { Gasto } from '../models/gasto.model';

const STORAGE_KEY_FILTROS = 'gestor_tc_filtros_guardados';

@Injectable({
  providedIn: 'root'
})
export class FiltroAvanzadoService {
  private filtrosGuardadosSubject = new BehaviorSubject<FiltroGuardado[]>(this.loadFiltrosFromStorage());
  public filtrosGuardados$ = this.filtrosGuardadosSubject.asObservable();

  constructor() {}

  /**
   * Obtiene todos los filtros guardados
   */
  getFiltrosGuardados$(): Observable<FiltroGuardado[]> {
    return this.filtrosGuardados$;
  }

  /**
   * Guarda un nuevo filtro
   */
  guardarFiltro(nombre: string, filtro: FiltroAvanzado): FiltroGuardado {
    const filtroGuardado: FiltroGuardado = {
      id: uuidv4(),
      nombre,
      filtro,
      fechaCreacion: new Date().toISOString(),
      vecesUsado: 0
    };

    const filtros = [...this.filtrosGuardadosSubject.value, filtroGuardado];
    this.saveFiltrosToStorage(filtros);
    this.filtrosGuardadosSubject.next(filtros);

    return filtroGuardado;
  }

  /**
   * Actualiza un filtro guardado
   */
  actualizarFiltro(id: string, nombre: string, filtro: FiltroAvanzado): void {
    const filtros = this.filtrosGuardadosSubject.value.map(f => 
      f.id === id 
        ? { ...f, nombre, filtro, fechaUltimoUso: new Date().toISOString() }
        : f
    );
    this.saveFiltrosToStorage(filtros);
    this.filtrosGuardadosSubject.next(filtros);
  }

  /**
   * Elimina un filtro guardado
   */
  eliminarFiltro(id: string): void {
    const filtros = this.filtrosGuardadosSubject.value.filter(f => f.id !== id);
    this.saveFiltrosToStorage(filtros);
    this.filtrosGuardadosSubject.next(filtros);
  }

  /**
   * Marca un filtro como usado (incrementa contador)
   */
  marcarFiltroComoUsado(id: string): void {
    const filtros = this.filtrosGuardadosSubject.value.map(f => 
      f.id === id 
        ? { 
            ...f, 
            vecesUsado: f.vecesUsado + 1,
            fechaUltimoUso: new Date().toISOString()
          }
        : f
    );
    this.saveFiltrosToStorage(filtros);
    this.filtrosGuardadosSubject.next(filtros);
  }

  /**
   * Aplica un filtro avanzado a una lista de gastos
   */
  aplicarFiltro(gastos: Gasto[], filtro: FiltroAvanzado): Gasto[] {
    return gastos.filter(gasto => {
      // Filtro por tarjetas
      if (!filtro.todasLasTarjetas && filtro.tarjetasIds.length > 0) {
        if (!filtro.tarjetasIds.includes(gasto.tarjetaId)) {
          return false;
        }
      }

      // Filtro por rango de fechas
      if (filtro.rangoFechas) {
        const fechaGasto = new Date(gasto.fecha);
        const desde = new Date(filtro.rangoFechas.desde);
        const hasta = new Date(filtro.rangoFechas.hasta);
        hasta.setHours(23, 59, 59, 999); // Incluir todo el día hasta

        if (fechaGasto < desde || fechaGasto > hasta) {
          // Verificar si alguna cuota cae en el rango
          if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1 && gasto.primerMesCuota) {
            let algunaCuotaEnRango = false;
            const primerMes = new Date(gasto.primerMesCuota + '-01');
            for (let i = 0; i < gasto.cantidadCuotas; i++) {
              const mesCuota = new Date(primerMes);
              mesCuota.setMonth(mesCuota.getMonth() + i);
              if (mesCuota >= desde && mesCuota <= hasta) {
                algunaCuotaEnRango = true;
                break;
              }
            }
            if (!algunaCuotaEnRango) {
              return false;
            }
          } else {
            return false;
          }
        }
      }

      // Filtro por meses
      if (filtro.meses && filtro.meses.length > 0) {
        const fechaGasto = new Date(gasto.fecha);
        const mesGasto = `${fechaGasto.getFullYear()}-${String(fechaGasto.getMonth() + 1).padStart(2, '0')}`;
        
        let coincideMes = filtro.meses.includes(mesGasto);
        
        if (!coincideMes && gasto.cantidadCuotas && gasto.cantidadCuotas > 1 && gasto.primerMesCuota) {
          const primerMes = new Date(gasto.primerMesCuota + '-01');
          for (let i = 0; i < gasto.cantidadCuotas; i++) {
            const mesCuota = new Date(primerMes);
            mesCuota.setMonth(mesCuota.getMonth() + i);
            const mesKeyCuota = `${mesCuota.getFullYear()}-${String(mesCuota.getMonth() + 1).padStart(2, '0')}`;
            if (filtro.meses.includes(mesKeyCuota)) {
              coincideMes = true;
              break;
            }
          }
        }
        
        if (!coincideMes) {
          return false;
        }
      }

      // Filtro por categorías
      if (!filtro.todasLasCategorias && filtro.categoriasIds.length > 0) {
        if (!gasto.categoriaId || !filtro.categoriasIds.includes(gasto.categoriaId)) {
          return false;
        }
      }

      // Filtro por monto
      if (filtro.montoMinimo !== undefined && gasto.monto < filtro.montoMinimo) {
        return false;
      }
      if (filtro.montoMaximo !== undefined && gasto.monto > filtro.montoMaximo) {
        return false;
      }

      // Filtro por tipo (compartido/personal)
      const esCompartido = gasto.compartidoCon && gasto.compartidoCon.trim() !== '';
      
      if (filtro.soloCompartidos && !esCompartido) {
        return false;
      }
      if (filtro.soloPersonales && esCompartido) {
        return false;
      }
      if (!filtro.incluirCompartidos && esCompartido) {
        return false;
      }
      if (!filtro.incluirPersonales && !esCompartido) {
        return false;
      }

      // Filtro por cuotas
      if (filtro.soloConCuotas && (!gasto.cantidadCuotas || gasto.cantidadCuotas <= 1)) {
        return false;
      }
      if (filtro.soloSinCuotas && gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
        return false;
      }

      // Filtro por texto
      if (filtro.textoBusqueda && filtro.textoBusqueda.trim() !== '') {
        const textoLower = filtro.textoBusqueda.toLowerCase();
        const descripcionLower = gasto.descripcion.toLowerCase();
        if (!descripcionLower.includes(textoLower)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Carga los filtros guardados desde localStorage
   */
  private loadFiltrosFromStorage(): FiltroGuardado[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FILTROS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar filtros guardados:', error);
    }
    return [];
  }

  /**
   * Guarda los filtros en localStorage
   */
  private saveFiltrosToStorage(filtros: FiltroGuardado[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_FILTROS, JSON.stringify(filtros));
    } catch (error) {
      console.error('Error al guardar filtros:', error);
    }
  }
}

