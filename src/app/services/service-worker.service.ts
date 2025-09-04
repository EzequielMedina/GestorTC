import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerService {
  private statusSubject = new BehaviorSubject<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    registration: null
  });

  public status$ = this.statusSubject.asObservable();
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.inicializar();
  }

  /**
   * Inicializa y registra el Service Worker
   */
  private async inicializar(): Promise<void> {
    try {
      const isSupported = this.verificarSoporte();
      
      if (isSupported) {
        await this.registrarServiceWorker();
      }
      
      this.actualizarStatus();
    } catch (error) {
      console.error('Error inicializando Service Worker:', error);
      this.actualizarStatus();
    }
  }

  /**
   * Verifica si el navegador soporta Service Workers
   */
  private verificarSoporte(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Registra el Service Worker
   */
  private async registrarServiceWorker(): Promise<void> {
    try {
      console.log('Service Worker: Iniciando registro...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      this.serviceWorkerRegistration = registration;
      
      console.log('Service Worker: Registrado exitosamente', registration.scope);
      
      // Escuchar actualizaciones del Service Worker
      registration.addEventListener('updatefound', () => {
        console.log('Service Worker: Nueva versión disponible');
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Service Worker: Nueva versión instalada');
            }
          });
        }
      });
      
      // Manejar cambios de estado
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker: Controlador cambiado');
      });
      
    } catch (error) {
      console.error('Service Worker: Error durante el registro:', error);
      throw error;
    }
  }

  /**
   * Obtiene el registro del Service Worker
   */
  public async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration;
    }

    // Si no tenemos el registro, intentar obtenerlo
    try {
      const registration = await navigator.serviceWorker.ready;
      this.serviceWorkerRegistration = registration;
      this.actualizarStatus();
      return registration;
    } catch (error) {
      console.error('Service Worker: Error obteniendo registro:', error);
      return null;
    }
  }

  /**
   * Verifica si el Service Worker está registrado
   */
  public isRegistered(): boolean {
    return this.serviceWorkerRegistration !== null;
  }

  /**
   * Envía un mensaje al Service Worker
   */
  public async postMessage(message: any): Promise<void> {
    const registration = await this.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage(message);
    } else {
      console.warn('Service Worker: No hay worker activo para enviar mensaje');
    }
  }

  /**
   * Actualiza el estado del servicio
   */
  private actualizarStatus(): void {
    const status: ServiceWorkerStatus = {
      isSupported: this.verificarSoporte(),
      isRegistered: this.serviceWorkerRegistration !== null,
      registration: this.serviceWorkerRegistration
    };

    this.statusSubject.next(status);
  }

  /**
   * Desregistra el Service Worker (para desarrollo/testing)
   */
  public async unregister(): Promise<boolean> {
    try {
      const registration = await this.getRegistration();
      if (registration) {
        const result = await registration.unregister();
        if (result) {
          this.serviceWorkerRegistration = null;
          this.actualizarStatus();
          console.log('Service Worker: Desregistrado exitosamente');
        }
        return result;
      }
      return false;
    } catch (error) {
      console.error('Service Worker: Error desregistrando:', error);
      return false;
    }
  }
}