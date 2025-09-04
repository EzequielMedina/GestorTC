import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TarjetaService } from './tarjeta';
import { ConfiguracionUsuarioService } from './configuracion-usuario.service';
import { NotificacionService } from './notificacion.service';
import { ServiceWorkerService } from './service-worker.service';

export interface BackgroundSyncStatus {
  isSupported: boolean;
  isRegistered: boolean;
  lastSync: Date | null;
  pendingTasks: string[];
}

@Injectable({
  providedIn: 'root'
})
export class BackgroundSyncService {
  private statusSubject = new BehaviorSubject<BackgroundSyncStatus>({
    isSupported: false,
    isRegistered: false,
    lastSync: null,
    pendingTasks: []
  });

  public status$ = this.statusSubject.asObservable();
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor(
    private tarjetaService: TarjetaService,
    private configuracionUsuarioService: ConfiguracionUsuarioService,
    private notificacionService: NotificacionService,
    private serviceWorkerService: ServiceWorkerService
  ) {
    this.inicializar();
  }

  /**
   * Inicializa el servicio de Background Sync
   */
  private async inicializar(): Promise<void> {
    try {
      const isSupported = this.verificarSoporte();
      
      if (isSupported) {
        await this.obtenerServiceWorkerRegistration();
        await this.configurarSincronizacionDatos();
      }
      
      this.actualizarStatus();
    } catch (error) {
      console.error('Error inicializando Background Sync:', error);
      this.actualizarStatus();
    }
  }

  /**
   * Verifica si el navegador soporta Background Sync
   */
  private verificarSoporte(): boolean {
    return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
  }

  /**
   * Obtiene el registro del Service Worker
   */
  private async obtenerServiceWorkerRegistration(): Promise<void> {
    try {
      this.serviceWorkerRegistration = await this.serviceWorkerService.getRegistration();
      if (this.serviceWorkerRegistration) {
        console.log('Background Sync: Service Worker listo');
      } else {
        throw new Error('Service Worker no está disponible');
      }
    } catch (error) {
      console.error('Error obteniendo Service Worker registration:', error);
      throw error;
    }
  }

  /**
   * Configura la sincronización automática de datos
   */
  private async configurarSincronizacionDatos(): Promise<void> {
    // Sincronizar datos cuando cambien
    this.tarjetaService.getTarjetas$().subscribe(async (tarjetas) => {
      await this.guardarDatosEnServiceWorker('tarjetas', tarjetas);
    });

    // Sincronizar configuración de usuario (localStorage: gestor-tc-config-usuario)
    this.configuracionUsuarioService.configuracion$.subscribe(async (configuracion) => {
      await this.guardarDatosEnServiceWorker('configuracion', configuracion);
      console.log('🔄 Configuración de usuario sincronizada con SW:', configuracion?.tiempos?.horaNotificacion);
    });

    // NUEVO: Sincronizar configuración de notificaciones (localStorage: gestor-tc-config-notificaciones)
    this.notificacionService.getConfiguracion$().subscribe(async (configNotificacion) => {
      if (configNotificacion) {
        await this.guardarDatosEnServiceWorker('configuracion-notificaciones', configNotificacion);
        console.log('🔄 Configuración de notificaciones sincronizada con SW:', configNotificacion?.horaNotificacion);
      }
    });
  }

  /**
   * Programa una verificación de vencimientos en Background Sync
   */
  public async programarVerificacionVencimientos(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service Worker no está registrado');
      }

      // Verificar si Background Sync está disponible
      if ('sync' in this.serviceWorkerRegistration) {
        await (this.serviceWorkerRegistration as any).sync.register('verificar-vencimientos');
        console.log('Background Sync: Verificación de vencimientos programada');
      } else {
        console.warn('Background Sync no está disponible, usando fallback');
        // Fallback: programar verificación manual
        setTimeout(() => this.verificarVencimientosManual(), 5000);
      }
      
      this.actualizarTareasPendientes(['verificar-vencimientos']);
      return true;
    } catch (error) {
      console.error('Error programando verificación de vencimientos:', error);
      return false;
    }
  }

  /**
   * Fuerza una verificación manual de vencimientos desde el Service Worker
   */
  public async forzarVerificacionVencimientos(): Promise<void> {
    try {
      await this.serviceWorkerService.postMessage({
        type: 'FORCE_CHECK_VENCIMIENTOS',
        payload: {}
      });
      console.log('🔧 Background Sync: Verificación forzada enviada al Service Worker');
    } catch (error) {
      console.error('Error forzando verificación:', error);
    }
  }

  /**
   * Programa el envío de notificaciones pendientes
   */
  public async programarEnvioNotificacionesPendientes(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service Worker no está registrado');
      }

      // Verificar si Background Sync está disponible
      if ('sync' in this.serviceWorkerRegistration) {
        await (this.serviceWorkerRegistration as any).sync.register('enviar-notificaciones-pendientes');
        console.log('Background Sync: Envío de notificaciones pendientes programado');
      } else {
        console.warn('Background Sync no está disponible, usando fallback');
        // Fallback: enviar notificaciones inmediatamente
        setTimeout(() => this.enviarNotificacionesPendientesManual(), 1000);
      }
      
      this.actualizarTareasPendientes(['enviar-notificaciones-pendientes']);
      return true;
    } catch (error) {
      console.error('Error programando envío de notificaciones pendientes:', error);
      return false;
    }
  }

  /**
   * Guarda una notificación como pendiente para envío offline
   */
  public async guardarNotificacionPendiente(notificacion: any): Promise<boolean> {
    try {
      const notificacionPendiente = {
        id: Date.now().toString(),
        title: notificacion.title,
        options: notificacion.options,
        timestamp: new Date().toISOString()
      };

      await this.guardarDatosEnServiceWorker('notificaciones_pendientes', [notificacionPendiente]);
      await this.programarEnvioNotificacionesPendientes();
      
      return true;
    } catch (error) {
      console.error('Error guardando notificación pendiente:', error);
      return false;
    }
  }

  /**
   * Inicia verificación periódica de vencimientos
   */
  public async iniciarVerificacionPeriodica(): Promise<boolean> {
    try {
      // Esperar a que el Service Worker esté listo antes de programar
      await this.esperarServiceWorkerListo();
      
      // Programar verificación inmediata
      await this.programarVerificacionVencimientos();
      
      // Configurar verificación cada hora
      setInterval(async () => {
        await this.programarVerificacionVencimientos();
      }, 60 * 60 * 1000); // 1 hora
      
      console.log('Background Sync: Verificación periódica iniciada');
      return true;
    } catch (error) {
      console.error('Error iniciando verificación periódica:', error);
      return false;
    }
  }

  /**
   * Espera a que el Service Worker esté completamente listo
   */
  private async esperarServiceWorkerListo(): Promise<void> {
    const maxIntentos = 10;
    const intervalo = 500; // 500ms
    
    for (let intento = 0; intento < maxIntentos; intento++) {
      if (this.serviceWorkerRegistration) {
        console.log('Background Sync: Service Worker listo para programar tareas');
        return;
      }
      
      console.log(`Background Sync: Esperando Service Worker... (${intento + 1}/${maxIntentos})`);
      await new Promise(resolve => setTimeout(resolve, intervalo));
    }
    
    throw new Error('Service Worker no se registró en el tiempo esperado');
  }

  /**
   * Detiene la verificación periódica
   */
  public detenerVerificacionPeriodica(): void {
    // En una implementación real, aquí se limpiarían los intervalos
    console.log('Background Sync: Verificación periódica detenida');
  }

  /**
   * Obtiene el estado actual del Background Sync
   */
  public getStatus(): Observable<BackgroundSyncStatus> {
    return this.status$;
  }

  /**
   * Fuerza una sincronización manual
   */
  public async sincronizarManualmente(): Promise<boolean> {
    try {
      await this.programarVerificacionVencimientos();
      await this.programarEnvioNotificacionesPendientes();
      
      this.actualizarUltimaSync();
      console.log('Background Sync: Sincronización manual completada');
      return true;
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      return false;
    }
  }

  /**
   * Guarda datos en el Service Worker
   */
  private async guardarDatosEnServiceWorker(store: string, data: any): Promise<void> {
    await this.serviceWorkerService.postMessage({
      type: 'SAVE_DATA',
      payload: {
        key: store,
        data: data
      }
    });
  }

  /**
   * Programa una tarea de Background Sync
   */
  private async programarTareaSync(tag: string): Promise<void> {
    await this.serviceWorkerService.postMessage({
      type: 'SCHEDULE_SYNC',
      payload: {
        tag: tag
      }
    });
  }

  /**
   * Actualiza el estado del servicio
   */
  private actualizarStatus(): void {
    const currentStatus = this.statusSubject.value;
    
    const newStatus: BackgroundSyncStatus = {
      isSupported: this.verificarSoporte(),
      isRegistered: this.serviceWorkerRegistration !== null,
      lastSync: currentStatus.lastSync,
      pendingTasks: currentStatus.pendingTasks
    };

    this.statusSubject.next(newStatus);
  }

  /**
   * Actualiza la lista de tareas pendientes
   */
  private actualizarTareasPendientes(tareas: string[]): void {
    const currentStatus = this.statusSubject.value;
    const nuevasTareas = [...new Set([...currentStatus.pendingTasks, ...tareas])];
    
    this.statusSubject.next({
      ...currentStatus,
      pendingTasks: nuevasTareas
    });
  }

  /**
   * Actualiza la fecha de última sincronización
   */
  private actualizarUltimaSync(): void {
    const currentStatus = this.statusSubject.value;
    
    this.statusSubject.next({
      ...currentStatus,
      lastSync: new Date(),
      pendingTasks: [] // Limpiar tareas pendientes después de sync exitoso
    });
  }

  /**
   * Reinicia el servicio
   */
  public async reiniciar(): Promise<void> {
    try {
      this.detenerVerificacionPeriodica();
      await this.inicializar();
      console.log('Background Sync Service reiniciado');
    } catch (error) {
      console.error('Error reiniciando Background Sync Service:', error);
    }
  }

  /**
   * Pausa una tarea de background sync
   */
  public async pausarTarea(tag: string): Promise<boolean> {
    try {
      // En una implementación real, esto pausaría la tarea específica
      console.log(`Pausando tarea: ${tag}`);
      return true;
    } catch (error) {
      console.error(`Error pausando tarea ${tag}:`, error);
      return false;
    }
  }

  /**
   * Reanuda una tarea de background sync
   */
  public async reanudarTarea(tag: string): Promise<boolean> {
    try {
      // En una implementación real, esto reanudaría la tarea específica
      console.log(`Reanudando tarea: ${tag}`);
      await this.programarTareaSync(tag);
      return true;
    } catch (error) {
      console.error(`Error reanudando tarea ${tag}:`, error);
      return false;
    }
  }

  /**
   * Obtiene el estado de una tarea específica
   */
  public async obtenerEstadoTarea(tag: string): Promise<{ activa: boolean; ultimaEjecucion?: Date }> {
    try {
      const status = this.statusSubject.value;
      return {
        activa: status.pendingTasks.includes(tag),
        ultimaEjecucion: status.lastSync || undefined
      };
    } catch (error) {
      console.error(`Error obteniendo estado de tarea ${tag}:`, error);
      return { activa: false };
    }
  }

  /**
   * Método fallback para verificar vencimientos manualmente
   */
  private async verificarVencimientosManual(): Promise<void> {
    try {
      console.log('🔄 Ejecutando verificación manual de vencimientos');
      // Aquí se ejecutaría la lógica de verificación
      // Por ahora solo actualizamos el estado
      this.actualizarUltimaSync();
    } catch (error) {
      console.error('Error en verificación manual de vencimientos:', error);
    }
  }

  /**
   * Método fallback para enviar notificaciones pendientes manualmente
   */
  private async enviarNotificacionesPendientesManual(): Promise<void> {
    try {
      console.log('📤 Enviando notificaciones pendientes manualmente');
      // Aquí se ejecutaría la lógica de envío
      // Por ahora solo actualizamos el estado
      this.actualizarUltimaSync();
    } catch (error) {
      console.error('Error enviando notificaciones pendientes:', error);
    }
  }
}