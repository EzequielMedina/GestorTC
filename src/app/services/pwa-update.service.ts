import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private checkInterval = 6 * 60 * 60 * 1000; // 6 horas en milisegundos

  constructor(private swUpdate: SwUpdate) {
    if (this.swUpdate.isEnabled) {
      this.initializeUpdates();
    }
  }

  /**
   * Inicializa el sistema de actualizaciones automáticas
   */
  private initializeUpdates(): void {
    // Verificar actualizaciones inmediatamente al cargar
    this.checkForUpdates();

    // Verificar actualizaciones periódicamente
    interval(this.checkInterval)
      .pipe(startWith(0))
      .subscribe(() => {
        this.checkForUpdates();
      });

    // Manejar actualizaciones cuando estén disponibles
    this.handleUpdates();
  }

  /**
   * Verifica si hay actualizaciones disponibles
   */
  checkForUpdates(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate()
        .then(updateAvailable => {
          if (updateAvailable) {
            console.log('Actualización disponible detectada');
          } else {
            console.log('No hay actualizaciones disponibles');
          }
        })
        .catch(err => {
          console.error('Error al verificar actualizaciones:', err);
        });
    }
  }

  /**
   * Maneja las actualizaciones del service worker automáticamente
   */
  private handleUpdates(): void {
    // Detectar cuando hay una nueva versión disponible
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe(() => {
        console.log('Nueva versión lista, actualizando automáticamente...');
        this.activateUpdate();
      });

    // Manejar cuando el service worker está listo para actualizar
    this.swUpdate.versionUpdates
      .pipe(
        filter(evt => evt.type === 'VERSION_DETECTED')
      )
      .subscribe(() => {
        console.log('Nueva versión detectada, descargando...');
      });
  }

  /**
   * Activa la actualización del service worker automáticamente
   */
  private activateUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate()
        .then(() => {
          console.log('Actualización activada, recargando página...');
          // Recargar automáticamente después de un breve delay
          setTimeout(() => {
            window.location.reload();
          }, 500);
        })
        .catch(err => {
          console.error('Error al activar actualización:', err);
          // Intentar recargar de todas formas para forzar la actualización
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
    }
  }

  /**
   * Activa la actualización manualmente (para uso futuro si se necesita)
   */
  activateUpdateManually(): Promise<void> {
    if (this.swUpdate.isEnabled) {
      return this.swUpdate.activateUpdate()
        .then(() => {
          window.location.reload();
        });
    }
    return Promise.resolve();
  }

  /**
   * Verifica si el service worker está habilitado
   */
  isEnabled(): boolean {
    return this.swUpdate.isEnabled;
  }
}

