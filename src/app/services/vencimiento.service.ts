import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { switchMap, filter, catchError } from 'rxjs/operators';
import { TarjetaService } from './tarjeta';
import { ResumenService } from './resumen.service';
import { NotificacionService } from './notificacion.service';
import { CalculoVencimientoService } from './calculo-vencimiento.service';
import { BackgroundSyncService } from './background-sync.service';
import { PushNotificationService } from './push-notification.service';
import { Tarjeta } from '../models/tarjeta.model';
import { DatosVencimientoTarjeta, ResultadoNotificacion } from '../models/notificacion.model';

@Injectable({
  providedIn: 'root'
})
export class VencimientoService {
  private readonly STORAGE_KEY_ULTIMA_VERIFICACION = 'gestor-tc-ultima-verificacion';
  private readonly INTERVALO_VERIFICACION = 60 * 60 * 1000; // 1 hora en milisegundos
  
  private verificacionActivaSubject = new BehaviorSubject<boolean>(false);
  private ultimaVerificacionSubject = new BehaviorSubject<Date | null>(null);
  
  constructor(
    private tarjetaService: TarjetaService,
    private resumenService: ResumenService,
    private notificacionService: NotificacionService,
    private calculoVencimientoService: CalculoVencimientoService,
    private backgroundSyncService: BackgroundSyncService,
    private pushNotificationService: PushNotificationService
  ) {
    this.cargarUltimaVerificacion();
    this.iniciarVerificacionPeriodica();
    this.configurarBackgroundSync();
    this.configurarPushNotifications();
  }

  /**
   * Obtiene el estado de verificación activa
   */
  getVerificacionActiva$(): Observable<boolean> {
    return this.verificacionActivaSubject.asObservable();
  }

  /**
   * Obtiene la fecha de la última verificación
   */
  getUltimaVerificacion$(): Observable<Date | null> {
    return this.ultimaVerificacionSubject.asObservable();
  }

  /**
   * Inicia la verificación periódica automática
   */
  iniciarVerificacionPeriodica(): void {
    // Verificar inmediatamente si no se ha verificado hoy
    this.verificarSiEsNecesario();

    // Configurar verificación periódica cada hora
    interval(this.INTERVALO_VERIFICACION)
      .pipe(
        filter(() => this.debeVerificarHoy()),
        switchMap(() => this.verificarVencimientos()),
        catchError(error => {
          console.error('Error en verificación periódica:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Verifica manualmente los vencimientos
   */
  verificarVencimientosManual(): Observable<ResultadoNotificacion[]> {
    return this.verificarVencimientos();
  }

  /**
   * Verifica si hay tarjetas que vencen hoy y envía notificaciones
   */
  private verificarVencimientos(): Observable<ResultadoNotificacion[]> {
    this.verificacionActivaSubject.next(true);
    
    return new Observable(observer => {
      this.procesarVerificacion()
        .then(resultados => {
          observer.next(resultados);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        })
        .finally(() => {
          this.verificacionActivaSubject.next(false);
        });
    });
  }

  /**
   * Procesa la verificación de vencimientos
   */
  private async procesarVerificacion(): Promise<ResultadoNotificacion[]> {
    try {
      const configuracion = this.notificacionService.obtenerConfiguracion();
      const tarjetas = await this.tarjetaService.getTarjetas$().toPromise() || [];
      const hoy = new Date();
      const diaHoy = hoy.getDate();
      
      console.log(`🔍 Verificando vencimientos para el día ${diaHoy}`);
      
      const tarjetasQueVencen = this.filtrarTarjetasQueVencen(tarjetas, diaHoy, configuracion.diasAnticipacion);
      
      if (tarjetasQueVencen.length === 0) {
        console.log('✅ No hay tarjetas que venzan hoy');
        this.actualizarUltimaVerificacion();
        return [];
      }

      console.log(`📋 Encontradas ${tarjetasQueVencen.length} tarjeta(s) que vence(n):`, 
        tarjetasQueVencen.map(t => t.nombre));

      const resultados: ResultadoNotificacion[] = [];
      
      for (const tarjeta of tarjetasQueVencen) {
        try {
          const datosVencimiento = await this.obtenerDatosVencimiento(tarjeta);
          
          // Enviar notificación tradicional
          const resultadoTradicional = await this.notificacionService.enviarNotificacionVencimiento(datosVencimiento);
          
          // Enviar notificación push a través del Service Worker
          let resultadoPush: ResultadoNotificacion;
          try {
            await this.pushNotificationService.enviarNotificacionVencimiento(datosVencimiento);
            resultadoPush = {
              exito: true,
              mensaje: `Notificación push enviada para ${tarjeta.nombre}`,
              tipoEnvio: 'push',
              fechaEnvio: new Date().toISOString()
            };
            console.log(`🔔 Notificación push enviada para ${tarjeta.nombre}: ✅`);
          } catch (pushError) {
            console.warn(`⚠️ Error en notificación push para ${tarjeta.nombre}:`, pushError);
            resultadoPush = {
              exito: false,
              mensaje: `Error en notificación push para ${tarjeta.nombre}`,
              tipoEnvio: 'push',
              fechaEnvio: new Date().toISOString(),
              error: pushError?.toString()
            };
          }
          
          // Programar notificación para cuando la app esté cerrada
          try {
            const fechaVencimiento = this.calcularFechaVencimiento(tarjeta.diaVencimiento);
            const tiempoHastaVencimiento = fechaVencimiento.getTime() - Date.now();
            
            if (tiempoHastaVencimiento > 0) {
              await this.pushNotificationService.programarNotificacionVencimiento(
                datosVencimiento,
                fechaVencimiento
              );
              console.log(`⏰ Notificación programada para ${tarjeta.nombre}`);
            }
          } catch (scheduleError) {
            console.warn(`⚠️ Error programando notificación para ${tarjeta.nombre}:`, scheduleError);
          }
          
          // Combinar resultados
          const resultadoCombinado: ResultadoNotificacion = {
            exito: resultadoTradicional.exito || resultadoPush.exito,
            mensaje: `${resultadoTradicional.mensaje} | ${resultadoPush.mensaje}`,
            tipoEnvio: 'ambos',
            fechaEnvio: new Date().toISOString(),
            error: resultadoTradicional.error || resultadoPush.error
          };
          
          resultados.push(resultadoCombinado);
          
          console.log(`📧 Notificación completa para ${tarjeta.nombre}:`, resultadoCombinado.exito ? '✅' : '❌');
        } catch (error) {
          console.error(`Error al procesar tarjeta ${tarjeta.nombre}:`, error);
          resultados.push({
            exito: false,
            mensaje: `Error al procesar ${tarjeta.nombre}: ${error}`,
            tipoEnvio: 'ambos',
            fechaEnvio: new Date().toISOString(),
            error: error?.toString()
          });
        }
      }

      this.actualizarUltimaVerificacion();
      return resultados;
      
    } catch (error) {
      console.error('Error en procesarVerificacion:', error);
      throw error;
    }
  }

  /**
   * Filtra las tarjetas que vencen según el día y la anticipación configurada
   */
  private filtrarTarjetasQueVencen(
    tarjetas: Tarjeta[], 
    diaHoy: number, 
    diasAnticipacion: number
  ): Tarjeta[] {
    return this.calculoVencimientoService.filtrarTarjetasQueVencen(tarjetas, diaHoy, diasAnticipacion);
  }

  /**
   * Obtiene las tarjetas que están próximas a vencer
   */
  getTarjetasProximasAVencer$(diasAnticipacion: number = 3): Observable<DatosVencimientoTarjeta[]> {
    return this.calculoVencimientoService.getTarjetasProximasAVencer$(diasAnticipacion);
  }

  /**
   * Obtiene los datos detallados de vencimiento para una tarjeta específica
   */
  getDatosVencimientoTarjeta$(tarjetaId: string): Observable<DatosVencimientoTarjeta | null> {
    return this.calculoVencimientoService.getDatosVencimientoTarjeta$(tarjetaId);
  }

  /**
   * Obtiene los datos completos de vencimiento para una tarjeta
   */
  private async obtenerDatosVencimiento(tarjeta: Tarjeta): Promise<DatosVencimientoTarjeta> {
    try {
      const datosVencimiento = await this.calculoVencimientoService.getDatosVencimientoTarjeta$(tarjeta.id).toPromise();
      
      if (datosVencimiento) {
        return {
          ...datosVencimiento,
          banco: tarjeta.banco || 'No especificado',
          diaVencimiento: tarjeta.diaVencimiento!,
          ultimosDigitos: tarjeta.ultimosDigitos,
          fechaVencimiento: this.calcularFechaVencimiento(tarjeta.diaVencimiento!)
        };
      }
      
      // Fallback si no se obtienen datos del servicio de cálculo
      return {
        tarjetaId: tarjeta.id,
        nombreTarjeta: tarjeta.nombre,
        banco: tarjeta.banco || 'No especificado',
        diaVencimiento: tarjeta.diaVencimiento!,
        diasHastaVencimiento: this.calcularDiasHastaVencimiento(tarjeta.diaVencimiento!),
        montoAPagar: 0,
        montoAdeudado: 0,
        porcentajeUso: 0,
        ultimosDigitos: tarjeta.ultimosDigitos,
        fechaVencimiento: this.calcularFechaVencimiento(tarjeta.diaVencimiento!),
        cuotasPendientes: 0,
        montoProximoMes: 0,
        gastosRecientes: 0,
        saldoDisponible: tarjeta.limite
      };
      
    } catch (error) {
      console.error(`Error al obtener datos de vencimiento para ${tarjeta.nombre}:`, error);
      
      // Retornar datos básicos en caso de error
      return {
        tarjetaId: tarjeta.id,
        nombreTarjeta: tarjeta.nombre,
        banco: tarjeta.banco || 'No especificado',
        diaVencimiento: tarjeta.diaVencimiento!,
        diasHastaVencimiento: this.calcularDiasHastaVencimiento(tarjeta.diaVencimiento!),
        montoAPagar: 0,
        montoAdeudado: 0,
        porcentajeUso: 0,
        ultimosDigitos: tarjeta.ultimosDigitos,
        fechaVencimiento: this.calcularFechaVencimiento(tarjeta.diaVencimiento!),
        cuotasPendientes: 0,
        montoProximoMes: 0,
        gastosRecientes: 0,
        saldoDisponible: tarjeta.limite
      };
    }
  }

  /**
   * Calcula los días hasta el vencimiento
   */
  private calcularDiasHastaVencimiento(diaVencimiento: number): number {
    const hoy = new Date();
    const fechaVencimiento = this.calcularFechaVencimiento(diaVencimiento);
    const diferencia = fechaVencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcula la fecha de vencimiento para el mes actual
   */
  private calcularFechaVencimiento(diaVencimiento: number): Date {
    const hoy = new Date();
    let año = hoy.getFullYear();
    let mes = hoy.getMonth();
    
    // Si el día de vencimiento ya pasó este mes, es para el próximo mes
    if (diaVencimiento < hoy.getDate()) {
      mes += 1;
      if (mes > 11) {
        mes = 0;
        año += 1;
      }
    }
    
    return new Date(año, mes, diaVencimiento);
  }

  /**
   * Verifica si es necesario hacer la verificación hoy
   */
  private verificarSiEsNecesario(): void {
    if (this.debeVerificarHoy()) {
      this.verificarVencimientos().subscribe({
        next: (resultados) => {
          console.log('✅ Verificación inicial completada:', resultados.length, 'notificaciones procesadas');
        },
        error: (error) => {
          console.error('❌ Error en verificación inicial:', error);
        }
      });
    }
  }

  /**
   * Determina si debe verificar hoy basado en la última verificación
   */
  private debeVerificarHoy(): boolean {
    const ultimaVerificacion = this.ultimaVerificacionSubject.value;
    const configuracion = this.notificacionService.obtenerConfiguracion();
    const ahora = new Date();
    
    // Verificar si ya se envió hoy a la hora configurada
    if (this.yaSeEnvioHoy()) {
      return false;
    }
    
    if (!ultimaVerificacion) {
      // Primera vez - verificar si es la hora correcta
      return this.esHoraCorrecta(ahora, configuracion.horaNotificacion);
    }
    
    const fechaUltimaVerificacion = new Date(ultimaVerificacion);
    
    // Si es un día diferente, verificar si es la hora correcta
    if (ahora.toDateString() !== fechaUltimaVerificacion.toDateString()) {
      return this.esHoraCorrecta(ahora, configuracion.horaNotificacion);
    }
    
    // Mismo día - verificar si es la hora correcta y no se ha enviado aún
    return this.esHoraCorrecta(ahora, configuracion.horaNotificacion);
  }

  /**
   * Verifica si la hora actual coincide con la hora configurada para notificaciones
   */
  private esHoraCorrecta(fechaActual: Date, horaConfiguracion: string): boolean {
    try {
      const [horaConfig, minutosConfig] = horaConfiguracion.split(':').map(Number);
      const horaActual = fechaActual.getHours();
      const minutosActuales = fechaActual.getMinutes();
      
      // Verificar si estamos en la hora exacta o dentro de los próximos 5 minutos
      // para evitar perder la notificación si el sistema se ejecuta con pequeños retrasos
      const horaCoincide = horaActual === horaConfig;
      const minutosEnRango = minutosActuales >= minutosConfig && minutosActuales < (minutosConfig + 5);
      
      console.log(`🕐 Verificando hora: ${horaActual}:${minutosActuales.toString().padStart(2, '0')} vs configurada: ${horaConfiguracion}`);
      
      return horaCoincide && minutosEnRango;
    } catch (error) {
      console.error('Error al verificar hora de notificación:', error);
      return false;
    }
  }

  /**
   * Actualiza la fecha de última verificación
   */
  private actualizarUltimaVerificacion(): void {
    const ahora = new Date();
    this.ultimaVerificacionSubject.next(ahora);
    localStorage.setItem(this.STORAGE_KEY_ULTIMA_VERIFICACION, ahora.toISOString());
    
    console.log(`✅ Última verificación actualizada: ${ahora.toLocaleString('es-AR')}`);
  }

  /**
   * Verifica si ya se envió una notificación hoy a la hora configurada
   */
  private yaSeEnvioHoy(): boolean {
    const ultimaVerificacion = this.ultimaVerificacionSubject.value;
    const configuracion = this.notificacionService.obtenerConfiguracion();
    
    if (!ultimaVerificacion) {
      return false;
    }
    
    const ahora = new Date();
    const fechaUltimaVerificacion = new Date(ultimaVerificacion);
    
    // Si es el mismo día
    if (ahora.toDateString() === fechaUltimaVerificacion.toDateString()) {
      const [horaConfig, minutosConfig] = configuracion.horaNotificacion.split(':').map(Number);
      const horaUltimaVerificacion = fechaUltimaVerificacion.getHours();
      const minutosUltimaVerificacion = fechaUltimaVerificacion.getMinutes();
      
      // Si la última verificación fue en la misma hora configurada
      return horaUltimaVerificacion === horaConfig && 
             minutosUltimaVerificacion >= minutosConfig && 
             minutosUltimaVerificacion < (minutosConfig + 5);
    }
    
    return false;
  }

  /**
   * Carga la fecha de última verificación desde localStorage
   */
  private cargarUltimaVerificacion(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_ULTIMA_VERIFICACION);
      if (stored) {
        const fecha = new Date(stored);
        this.ultimaVerificacionSubject.next(fecha);
      }
    } catch (error) {
      console.error('Error al cargar última verificación:', error);
    }
  }

  /**
   * Obtiene información de estado del servicio
   */
  getEstadoServicio(): {
    verificacionActiva: boolean;
    ultimaVerificacion: Date | null;
    proximaVerificacion: Date | null;
    configuracion: any;
  } {
    const ultimaVerificacion = this.ultimaVerificacionSubject.value;
    const proximaVerificacion = ultimaVerificacion 
      ? new Date(ultimaVerificacion.getTime() + this.INTERVALO_VERIFICACION)
      : new Date();
    
    return {
      verificacionActiva: this.verificacionActivaSubject.value,
      ultimaVerificacion,
      proximaVerificacion,
      configuracion: this.notificacionService.obtenerConfiguracion()
    };
  }

  /**
   * Configura el Background Sync Service para verificaciones automáticas
   */
  private configurarBackgroundSync(): void {
    // Iniciar verificación periódica usando Background Sync
    this.backgroundSyncService.iniciarVerificacionPeriodica();
    this.backgroundSyncService.programarVerificacionVencimientos();

    console.log('🔄 Background Sync configurado para verificación de vencimientos');
  }

  /**
   * Configura las notificaciones push para vencimientos
   */
  private async configurarPushNotifications(): Promise<void> {
    try {
      // Solicitar permisos si no están concedidos
      const permisosConcedidos = await this.pushNotificationService.solicitarPermisos();
      
      if (permisosConcedidos === 'granted') {
        console.log('✅ Permisos de notificación concedidos');
        
        // Intentar suscribir al usuario
        const suscripcionExitosa = await this.pushNotificationService.suscribir();
        
        if (suscripcionExitosa) {
          console.log('🔔 Usuario suscrito a notificaciones push');
        } else {
          console.log('⚠️ No se pudo suscribir al usuario a notificaciones push');
        }
      } else {
        console.log('⚠️ Permisos de notificación no concedidos');
      }
    } catch (error) {
      console.error('❌ Error configurando push notifications:', error);
    }
  }

  /**
   * Ejecutor para el Background Sync Service
   */
  private async ejecutarVerificacionBackground(): Promise<void> {
    try {
      if (!this.debeVerificarHoy()) {
        console.log('⏭️ No es necesario verificar vencimientos ahora');
        return;
      }

      console.log('🔍 Ejecutando verificación de vencimientos en background');
      
      const resultados = await this.verificarVencimientos().toPromise();
      
      if (resultados && resultados.length > 0) {
        console.log(`✅ Verificación background completada: ${resultados.length} notificaciones procesadas`);
      } else {
        console.log('✅ Verificación background completada: No hay vencimientos');
      }
      
    } catch (error) {
      console.error('❌ Error en verificación background:', error);
      throw error; // Re-lanzar para que el BackgroundSyncService maneje los reintentos
    }
  }

  /**
   * Reinicia el servicio de verificación
   */
  reiniciarServicio(): void {
    localStorage.removeItem(this.STORAGE_KEY_ULTIMA_VERIFICACION);
    this.ultimaVerificacionSubject.next(null);
    
    // Reiniciar también el background sync
    this.backgroundSyncService.reiniciar();
    
    this.verificarSiEsNecesario();
  }

  /**
   * Pausa las verificaciones automáticas
   */
  pausarVerificaciones(): void {
    this.backgroundSyncService.pausarTarea('verificacion-vencimientos');
    console.log('⏸️ Verificaciones automáticas pausadas');
  }

  /**
   * Reanuda las verificaciones automáticas
   */
  reanudarVerificaciones(): void {
    this.backgroundSyncService.reanudarTarea('verificacion-vencimientos');
    console.log('▶️ Verificaciones automáticas reanudadas');
  }

  /**
   * Obtiene el estado de la tarea de background sync
   */
  getEstadoBackgroundSync(): any {
    return this.backgroundSyncService.obtenerEstadoTarea('verificacion-vencimientos');
  }

  /**
   * Programa notificaciones para todas las tarjetas próximas a vencer
   */
  async programarNotificacionesVencimiento(): Promise<void> {
    try {
      const configuracion = this.notificacionService.obtenerConfiguracion();
      const tarjetas = await this.tarjetaService.getTarjetas$().toPromise() || [];
      
      for (const tarjeta of tarjetas) {
        const datosVencimiento = await this.obtenerDatosVencimiento(tarjeta);
        const fechaVencimiento = this.calcularFechaVencimiento(tarjeta.diaVencimiento);
        const tiempoHastaVencimiento = fechaVencimiento.getTime() - Date.now();
        
        // Programar notificación con anticipación
        const tiempoConAnticipacion = tiempoHastaVencimiento - (configuracion.diasAnticipacion * 24 * 60 * 60 * 1000);
        
        if (tiempoConAnticipacion > 0) {
          const fechaNotificacion = new Date(Date.now() + tiempoConAnticipacion);
          await this.pushNotificationService.programarNotificacionVencimiento(
            datosVencimiento,
            fechaNotificacion
          );
          console.log(`⏰ Notificación programada para ${tarjeta.nombre} en ${Math.round(tiempoConAnticipacion / (24 * 60 * 60 * 1000))} días`);
        }
      }
    } catch (error) {
      console.error('❌ Error programando notificaciones:', error);
    }
  }

  /**
   * Cancela todas las notificaciones programadas
   */
  async cancelarTodasLasNotificacionesProgramadas(): Promise<void> {
    try {
      const tarjetas = await this.tarjetaService.getTarjetas$().toPromise() || [];
      
      for (const tarjeta of tarjetas) {
        await this.pushNotificationService.cancelarNotificacionProgramada(tarjeta.id);
      }
      
      console.log('🚫 Todas las notificaciones programadas han sido canceladas');
    } catch (error) {
      console.error('❌ Error cancelando notificaciones:', error);
    }
  }

  /**
   * Envía una notificación de prueba
   */
  async enviarNotificacionPrueba(): Promise<void> {
    try {
      await this.pushNotificationService.enviarNotificacionPrueba();
      console.log('🧪 Notificación de prueba enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de prueba:', error);
    }
  }

  /**
   * Obtiene el estado completo del servicio incluyendo push notifications
   */
  getEstadoCompletoServicio(): {
    verificacionActiva: boolean;
    ultimaVerificacion: Date | null;
    proximaVerificacion: Date | null;
    configuracion: any;
    backgroundSync: any;
    pushNotifications: {
      soportado: boolean;
      permisos: string;
      suscrito: boolean;
    };
  } {
    const estadoBasico = this.getEstadoServicio();
    
    return {
      ...estadoBasico,
      backgroundSync: this.getEstadoBackgroundSync(),
      pushNotifications: {
        soportado: this.pushNotificationService.esSoportado(),
        permisos: Notification.permission,
        suscrito: this.pushNotificationService.estaUsuarioSuscrito()
      }
    };
  }
}