import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private notificationService: NotificationService
  ) {
    if (this.swUpdate.isEnabled) {
      this.checkForUpdates();
      this.handleUpdates();
    }
  }

  /**
   * Verifica si hay actualizaciones disponibles
   */
  checkForUpdates(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate().then(() => {
        console.log('Verificando actualizaciones...');
      }).catch(err => {
        console.error('Error al verificar actualizaciones:', err);
      });
    }
  }

  /**
   * Maneja las actualizaciones del service worker
   */
  private handleUpdates(): void {
    // Detectar cuando hay una nueva versión disponible
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map(evt => ({
          type: 'UPDATE_AVAILABLE',
          current: evt.currentVersion,
          available: evt.latestVersion,
        }))
      )
      .subscribe(() => {
        this.notifyUpdateAvailable();
      });
  }

  /**
   * Notifica al usuario que hay una actualización disponible
   */
  private notifyUpdateAvailable(): void {
    this.notificationService.confirm(
      'Nueva versión disponible',
      'Hay una nueva versión de la aplicación. ¿Deseas actualizar ahora?',
      'Actualizar',
      'Más tarde'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.activateUpdate();
      }
    });
  }

  /**
   * Activa la actualización del service worker
   */
  activateUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => {
        this.notificationService.success('Aplicación actualizada. La página se recargará...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }).catch(err => {
        console.error('Error al activar actualización:', err);
        this.notificationService.error('Error al actualizar la aplicación');
      });
    }
  }

  /**
   * Verifica si el service worker está habilitado
   */
  isEnabled(): boolean {
    return this.swUpdate.isEnabled;
  }
}

