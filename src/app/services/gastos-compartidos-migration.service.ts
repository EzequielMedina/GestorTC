import { Injectable } from '@angular/core';
import { Gasto } from '../models/gasto.model';
import { GastoCompartidoUtil } from '../models/gasto-compartido.model';
import { GastoService } from './gasto';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

/**
 * Servicio para migrar gastos compartidos del formato antiguo al nuevo formato
 */
@Injectable({
  providedIn: 'root'
})
export class GastosCompartidosMigrationService {
  private readonly MIGRATION_KEY = 'gestor_tc_gastos_compartidos_migrated';

  constructor(private gastoService: GastoService) {}

  /**
   * Verifica si la migración ya se realizó
   */
  isMigrated(): boolean {
    return localStorage.getItem(this.MIGRATION_KEY) === 'true';
  }

  /**
   * Marca la migración como completada
   */
  private markAsMigrated(): void {
    localStorage.setItem(this.MIGRATION_KEY, 'true');
  }

  /**
   * Migra todos los gastos del formato antiguo al nuevo formato
   */
  migrarGastos(): Observable<{ migrados: number; total: number }> {
    return this.gastoService.getGastos$().pipe(
      map(gastos => {
        let migrados = 0;
        const gastosActualizados: Gasto[] = [];

        gastos.forEach(gasto => {
          // Solo migrar si tiene formato antiguo y no tiene formato nuevo
          if (gasto.compartidoCon && 
              gasto.porcentajeCompartido !== undefined && 
              (!gasto.personasCompartidas || gasto.personasCompartidas.length === 0)) {
            
            // Convertir al nuevo formato
            const personas = GastoCompartidoUtil.convertirFormatoAntiguo(
              gasto.compartidoCon,
              gasto.porcentajeCompartido
            );

            if (personas) {
              // Calcular montos
              const personasConMontos = GastoCompartidoUtil.calcularMontos(personas, gasto.monto);
              
              // Crear gasto actualizado
              const gastoActualizado: Gasto = {
                ...gasto,
                personasCompartidas: personasConMontos
                // Mantener compartidoCon y porcentajeCompartido para compatibilidad hacia atrás
              };

              gastosActualizados.push(gastoActualizado);
              migrados++;
            } else {
              gastosActualizados.push(gasto);
            }
          } else {
            gastosActualizados.push(gasto);
          }
        });

        // Actualizar gastos en el servicio
        if (migrados > 0) {
          // Guardar en localStorage directamente
          try {
            localStorage.setItem('gestor_tc_gastos', JSON.stringify(gastosActualizados));
            // Forzar actualización del BehaviorSubject
            if (this.gastoService['gastosSubject']) {
              this.gastoService['gastosSubject'].next(gastosActualizados);
            }
          } catch (error) {
            console.error('Error al guardar gastos migrados:', error);
          }
        }

        this.markAsMigrated();

        return {
          migrados,
          total: gastos.length
        };
      })
    );
  }

  /**
   * Ejecuta la migración automáticamente si no se ha realizado
   */
  migrarSiEsNecesario(): Observable<boolean> {
    if (this.isMigrated()) {
      return of(false);
    }

    return this.migrarGastos().pipe(
      map(resultado => {
        console.log(`Migración completada: ${resultado.migrados} de ${resultado.total} gastos migrados`);
        return resultado.migrados > 0;
      })
    );
  }
}

