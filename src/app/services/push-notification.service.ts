import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ServiceWorkerService } from './service-worker.service';

export interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationStatus {
  isSupported: boolean;
  isServiceWorkerRegistered: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscription?: PushSubscriptionInfo;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: NotificationAction[];
  vibrate?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLat3eAALZ-4e9YAcPp-aPAwLu0-fy2RKhonWrQNdl2ZOhSHY1iCOg'; // Clave pública VAPID de ejemplo
  
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscription | null = null;
  
  private statusSubject = new BehaviorSubject<PushNotificationStatus>({
    isSupported: false,
    isServiceWorkerRegistered: false,
    isSubscribed: false,
    permission: 'default'
  });

  public status$ = this.statusSubject.asObservable();

  constructor(private serviceWorkerService: ServiceWorkerService) {
    this.inicializar();
  }

  /**
   * Inicializa el servicio de push notifications
   */
  private async inicializar(): Promise<void> {
    try {
      const isSupported = this.verificarSoporte();
      
      if (isSupported) {
        await this.obtenerServiceWorkerRegistration();
        await this.verificarSuscripcionExistente();
      }
      
      this.actualizarStatus();
    } catch (error) {
      console.error('Error inicializando push notifications:', error);
      this.actualizarStatus();
    }
  }

  /**
   * Verifica si el navegador soporta push notifications
   */
  private verificarSoporte(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  /**
   * Obtiene el registro del Service Worker
   */
  private async obtenerServiceWorkerRegistration(): Promise<void> {
    try {
      this.serviceWorkerRegistration = await this.serviceWorkerService.getRegistration();
      if (this.serviceWorkerRegistration) {
        console.log('Push Notifications: Service Worker listo');
      } else {
        throw new Error('Service Worker no está disponible');
      }
    } catch (error) {
      console.error('Error obteniendo Service Worker registration:', error);
      throw error;
    }
  }

  /**
   * Verifica si ya existe una suscripción push
   */
  private async verificarSuscripcionExistente(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      return;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      this.pushSubscription = subscription;
    } catch (error) {
      console.error('Error verificando suscripción existente:', error);
    }
  }

  /**
   * Solicita permisos para notificaciones
   */
  public async solicitarPermisos(): Promise<NotificationPermission> {
    try {
      const permission = await Notification.requestPermission();
      this.actualizarStatus();
      return permission;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return 'denied';
    }
  }

  /**
   * Suscribe al usuario para recibir push notifications
   */
  public async suscribir(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service Worker no registrado');
      }

      const permission = await this.solicitarPermisos();
      if (permission !== 'granted') {
        throw new Error('Permisos de notificación denegados');
      }

      // Convertir la clave VAPID a Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY);
      
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      this.pushSubscription = subscription;
      
      // Enviar suscripción al servidor (simulado)
      await this.enviarSuscripcionAlServidor(subscription);
      
      this.actualizarStatus();
      
      console.log('Usuario suscrito a push notifications:', subscription);
      return true;
      
    } catch (error) {
      console.error('Error suscribiendo a push notifications:', error);
      this.actualizarStatus();
      return false;
    }
  }

  /**
   * Desuscribe al usuario de las push notifications
   */
  public async desuscribir(): Promise<boolean> {
    try {
      if (!this.pushSubscription) {
        return true; // Ya está desuscrito
      }

      const success = await this.pushSubscription.unsubscribe();
      
      if (success) {
        // Notificar al servidor sobre la desuscripción (simulado)
        await this.eliminarSuscripcionDelServidor(this.pushSubscription);
        
        this.pushSubscription = null;
        this.actualizarStatus();
        
        console.log('Usuario desuscrito de push notifications');
      }
      
      return success;
      
    } catch (error) {
      console.error('Error desuscribiendo de push notifications:', error);
      return false;
    }
  }

  /**
   * Envía una notificación de vencimiento de tarjeta
   */
  public async enviarNotificacionVencimiento(datos: any): Promise<boolean> {
    try {
      const status = this.statusSubject.value;
      
      if (!status.isSupported) {
        console.warn('Push notifications no soportadas');
        return false;
      }

      // Si no está suscrito, intentar mostrar notificación local
      if (!status.isSubscribed) {
        console.warn('Usuario no suscrito a push notifications, usando notificación local');
        return await this.mostrarNotificacionVencimientoLocal(datos);
      }

      // Generar notificación usando el template
      const { PushVencimientoTemplate } = await import('../templates/push-vencimiento.template');
      const notificationOptions = PushVencimientoTemplate.generarNotificacion(datos);
      
      // Mostrar la notificación
      await this.mostrarNotificacionLocal({
        ...notificationOptions,
        title: notificationOptions.title || 'Notificación de Vencimiento'
      });
      
      console.log('Notificación de vencimiento enviada para:', datos.nombreTarjeta);
      return true;
      
    } catch (error) {
      console.error('Error enviando notificación de vencimiento:', error);
      return false;
    }
  }

  /**
   * Muestra una notificación de vencimiento local (fallback)
   */
  private async mostrarNotificacionVencimientoLocal(datos: any): Promise<boolean> {
    try {
      if (Notification.permission !== 'granted') {
        const permission = await this.solicitarPermisos();
        if (permission !== 'granted') {
          console.warn('Permisos de notificación denegados');
          return false;
        }
      }

      const notification = new Notification(`Vencimiento de ${datos.nombreTarjeta}`, {
        body: `Tu tarjeta vence el ${datos.fechaVencimiento}. ${datos.diasRestantes} días restantes.`,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: `vencimiento-${datos.numeroTarjeta}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Error mostrando notificación local:', error);
      return false;
    }
  }

  /**
   * Programa una notificación para envío posterior (Background Sync)
   */
  public async programarNotificacionVencimiento(datos: any, fechaEnvio: Date): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        console.warn('Service Worker no disponible para programar notificación');
        return false;
      }

      // Enviar datos al Service Worker para programar la notificación
      const message = {
        type: 'SCHEDULE_NOTIFICATION',
        payload: {
          datos,
          fechaEnvio: fechaEnvio.getTime(),
          id: `vencimiento-${datos.numeroTarjeta}-${Date.now()}`
        }
      };

      this.serviceWorkerRegistration.active?.postMessage(message);
      
      console.log('Notificación programada para:', fechaEnvio, datos.nombreTarjeta);
      return true;
      
    } catch (error) {
      console.error('Error programando notificación:', error);
      return false;
    }
  }

  /**
   * Cancela una notificación programada
   */
  public async cancelarNotificacionProgramada(numeroTarjeta: string): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const message = {
        type: 'CANCEL_NOTIFICATION',
        payload: {
          tag: `vencimiento-${numeroTarjeta}`
        }
      };

      this.serviceWorkerRegistration.active?.postMessage(message);
      return true;
      
    } catch (error) {
      console.error('Error cancelando notificación programada:', error);
      return false;
    }
  }

  /**
   * Envía una notificación push de prueba
   */
  public async enviarNotificacionPrueba(): Promise<boolean> {
    try {
      if (!this.pushSubscription) {
        throw new Error('No hay suscripción activa');
      }

      // Simular envío de notificación desde el servidor
      const notificationData = {
        title: '🧪 Notificación de Prueba',
        body: 'Esta es una notificación de prueba del Gestor TC',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: 'test-notification',
        data: {
          tipo: 'prueba',
          url: '/notificaciones',
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'view',
            title: '👀 Ver configuración',
            icon: '/assets/icons/view-icon.png'
          }
        ],
        requireInteraction: false,
        vibrate: [200, 100, 200]
      };

      // En un entorno real, esto se enviaría al servidor push
      // Aquí simulamos mostrando la notificación directamente
      await this.mostrarNotificacionLocal(notificationData);
      
      console.log('Notificación de prueba enviada');
      return true;
      
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      return false;
    }
  }

  /**
   * Muestra una notificación local (para pruebas)
   */
  private async mostrarNotificacionLocal(data: ExtendedNotificationOptions & { title: string }): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      // Fallback a notificación del navegador
      new Notification(data.title, {
        body: data.body,
        icon: data.icon,
        tag: data.tag,
        data: data.data
      });
      return;
    }

    await this.serviceWorkerRegistration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      actions: data.actions as any,
      requireInteraction: data.requireInteraction,
      vibrate: data.vibrate as any
    } as NotificationOptions);
  }

  /**
   * Obtiene el estado actual del servicio
   */
  public getStatus(): Observable<PushNotificationStatus> {
    return this.status$;
  }

  /**
   * Verifica si las notificaciones push están soportadas
   */
  public esSoportado(): boolean {
    return this.statusSubject.value.isSupported;
  }

  /**
   * Verifica si el usuario está suscrito a notificaciones push
   */
  public estaUsuarioSuscrito(): boolean {
    return this.statusSubject.value.isSubscribed;
  }

  /**
   * Obtiene información de la suscripción actual
   */
  public getSuscripcionInfo(): PushSubscriptionInfo | null {
    if (!this.pushSubscription) {
      return null;
    }

    const keys = this.pushSubscription.getKey('p256dh');
    const auth = this.pushSubscription.getKey('auth');

    if (!keys || !auth) {
      return null;
    }

    return {
      endpoint: this.pushSubscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(keys),
        auth: this.arrayBufferToBase64(auth)
      }
    };
  }

  /**
   * Actualiza el estado del servicio
   */
  private actualizarStatus(): void {
    const status: PushNotificationStatus = {
      isSupported: this.verificarSoporte(),
      isServiceWorkerRegistered: !!this.serviceWorkerRegistration,
      isSubscribed: !!this.pushSubscription,
      permission: Notification.permission,
      subscription: this.getSuscripcionInfo() || undefined
    };

    this.statusSubject.next(status);
  }

  /**
   * Simula el envío de la suscripción al servidor
   */
  private async enviarSuscripcionAlServidor(subscription: PushSubscription): Promise<void> {
    const subscriptionInfo = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      },
      timestamp: Date.now()
    };

    // Guardar en localStorage como simulación
    localStorage.setItem('push-subscription', JSON.stringify(subscriptionInfo));
    
    console.log('Suscripción enviada al servidor (simulado):', subscriptionInfo);
    
    // En producción, aquí se haría una llamada HTTP al backend:
    // await this.http.post('/api/push/subscribe', subscriptionInfo).toPromise();
  }

  /**
   * Simula la eliminación de la suscripción del servidor
   */
  private async eliminarSuscripcionDelServidor(subscription: PushSubscription): Promise<void> {
    // Eliminar de localStorage como simulación
    localStorage.removeItem('push-subscription');
    
    console.log('Suscripción eliminada del servidor (simulado)');
    
    // En producción, aquí se haría una llamada HTTP al backend:
    // await this.http.delete('/api/push/unsubscribe', { body: { endpoint: subscription.endpoint } }).toPromise();
  }

  /**
   * Convierte una clave VAPID de base64 a Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convierte ArrayBuffer a base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Reinicia el servicio (útil para debugging)
   */
  public async reiniciar(): Promise<void> {
    try {
      await this.desuscribir();
      
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.unregister();
        this.serviceWorkerRegistration = null;
      }
      
      await this.inicializar();
      
      console.log('Servicio de push notifications reiniciado');
    } catch (error) {
      console.error('Error reiniciando servicio:', error);
    }
  }
}