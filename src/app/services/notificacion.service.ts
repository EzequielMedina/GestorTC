import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { 
  Notificacion, 
  TipoNotificacion, 
  ConfiguracionNotificaciones, 
  ResultadoNotificacion,
  TemplateEmail,
  ConfiguracionPush,
  DatosVencimientoTarjeta
} from '../models/notificacion.model';
import { v4 as uuidv4 } from 'uuid';
import { EmailVencimientoTemplate } from '../templates/email-vencimiento.template';
import { PushVencimientoTemplate } from '../templates/push-vencimiento.template';
import { PushNotificationService } from './push-notification.service';
import { EmailService, EmailData } from './email.service';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private readonly STORAGE_KEY_NOTIFICACIONES = 'gestor-tc-notificaciones';
  private readonly STORAGE_KEY_CONFIGURACION = 'gestor-tc-config-notificaciones';
  
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  private configuracionSubject = new BehaviorSubject<ConfiguracionNotificaciones | null>(null);
  
  constructor(
    private pushNotificationService: PushNotificationService,
    private emailService: EmailService
  ) {
    this.cargarNotificaciones();
    this.cargarConfiguracion();
  }

  /**
   * Obtiene todas las notificaciones como Observable
   */
  getNotificaciones$(): Observable<Notificacion[]> {
    return this.notificacionesSubject.asObservable();
  }

  /**
   * Obtiene la configuración de notificaciones como Observable
   */
  getConfiguracion$(): Observable<ConfiguracionNotificaciones | null> {
    return this.configuracionSubject.asObservable();
  }

  /**
   * Obtiene notificaciones no leídas
   */
  getNotificacionesNoLeidas$(): Observable<Notificacion[]> {
    return this.notificacionesSubject.pipe(
      map(notificaciones => notificaciones.filter(n => !n.leida))
    );
  }

  /**
   * Crea una nueva notificación
   */
  crearNotificacion(
    tipo: TipoNotificacion,
    titulo: string,
    mensaje: string,
    datos?: any
  ): Observable<Notificacion> {
    const notificacion: Notificacion = {
      id: uuidv4(),
      tipo,
      titulo,
      mensaje,
      fecha: new Date().toISOString(),
      leida: false,
      datos
    };

    const notificaciones = [...this.notificacionesSubject.value, notificacion];
    this.actualizarNotificaciones(notificaciones);
    
    return of(notificacion);
  }

  /**
   * Marca una notificación como leída
   */
  marcarComoLeida(id: string): Observable<boolean> {
    const notificaciones = this.notificacionesSubject.value.map(n => 
      n.id === id ? { ...n, leida: true } : n
    );
    
    this.actualizarNotificaciones(notificaciones);
    return of(true);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  marcarTodasComoLeidas(): Observable<boolean> {
    const notificaciones = this.notificacionesSubject.value.map(n => ({ ...n, leida: true }));
    this.actualizarNotificaciones(notificaciones);
    return of(true);
  }

  /**
   * Elimina una notificación
   */
  eliminarNotificacion(id: string): Observable<boolean> {
    const notificaciones = this.notificacionesSubject.value.filter(n => n.id !== id);
    this.actualizarNotificaciones(notificaciones);
    return of(true);
  }

  /**
   * Elimina todas las notificaciones leídas
   */
  limpiarNotificacionesLeidas(): Observable<boolean> {
    const notificaciones = this.notificacionesSubject.value.filter(n => !n.leida);
    this.actualizarNotificaciones(notificaciones);
    return of(true);
  }

  /**
   * Guarda la configuración de notificaciones
   */
  guardarConfiguracion(configuracion: ConfiguracionNotificaciones): Observable<ConfiguracionNotificaciones> {
    this.configuracionSubject.next(configuracion);
    localStorage.setItem(this.STORAGE_KEY_CONFIGURACION, JSON.stringify(configuracion));
    return of(configuracion);
  }

  /**
   * Obtiene la configuración actual o crea una por defecto
   */
  obtenerConfiguracion(): ConfiguracionNotificaciones {
    const config = this.configuracionSubject.value;
    if (config) {
      return config;
    }

    // Configuración por defecto
    const configDefault: ConfiguracionNotificaciones = {
      id: uuidv4(),
      emailHabilitado: false,
      pushHabilitado: true,
      diasAnticipacion: 3,
      horaNotificacion: '09:00',
      tiposHabilitados: [TipoNotificacion.VENCIMIENTO_TARJETA]
    };

    this.guardarConfiguracion(configDefault);
    return configDefault;
  }

  /**
   * Envía notificación de vencimiento de tarjeta
   */
  async enviarNotificacionVencimiento(
    datosVencimiento: DatosVencimientoTarjeta
  ): Promise<ResultadoNotificacion> {
    const configuracion = this.obtenerConfiguracion();
    
    if (!configuracion.tiposHabilitados.includes(TipoNotificacion.VENCIMIENTO_TARJETA)) {
      return {
        exito: false,
        mensaje: 'Notificaciones de vencimiento deshabilitadas',
        tipoEnvio: 'ambos',
        fechaEnvio: new Date().toISOString()
      };
    }

    const titulo = `💳 Vencimiento de Tarjeta - ${datosVencimiento.nombreTarjeta}`;
    const mensaje = `Tu tarjeta ${datosVencimiento.nombreTarjeta} (${datosVencimiento.banco}) vence hoy. Monto a pagar: $${datosVencimiento.montoAPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    // Crear notificación en el sistema
    await this.crearNotificacion(
      TipoNotificacion.VENCIMIENTO_TARJETA,
      titulo,
      mensaje,
      datosVencimiento
    ).toPromise();

    let resultadoEmail = true;
    let resultadoPush = true;
    let errores: string[] = [];

    // Enviar por email si está habilitado
    if (configuracion.emailHabilitado && configuracion.emailDestino) {
      try {
        await this.enviarEmail(datosVencimiento, configuracion.emailDestino);
      } catch (error) {
        resultadoEmail = false;
        errores.push(`Error en email: ${error}`);
      }
    }

    // Enviar notificación push si está habilitada
    if (configuracion.pushHabilitado) {
      try {
        await this.enviarNotificacionPush(datosVencimiento);
      } catch (error) {
        resultadoPush = false;
        errores.push(`Error en push: ${error}`);
      }
    }

    const exito = (configuracion.emailHabilitado ? resultadoEmail : true) && 
                  (configuracion.pushHabilitado ? resultadoPush : true);

    return {
      exito,
      mensaje: exito ? 'Notificación enviada correctamente' : 'Error al enviar notificación',
      tipoEnvio: configuracion.emailHabilitado && configuracion.pushHabilitado ? 'ambos' : 
                 configuracion.emailHabilitado ? 'email' : 'push',
      fechaEnvio: new Date().toISOString(),
      error: errores.length > 0 ? errores.join('; ') : undefined
    };
  }

  /**
   * Solicita permisos para notificaciones push
   */
  async solicitarPermisosPush(): Promise<boolean> {
    const permission = await this.pushNotificationService.solicitarPermisos();
    return permission === 'granted';
  }

  /**
   * Suscribe al usuario para recibir push notifications
   */
  async suscribirPushNotifications(): Promise<boolean> {
    return await this.pushNotificationService.suscribir();
  }

  /**
   * Desuscribe al usuario de las push notifications
   */
  async desuscribirPushNotifications(): Promise<boolean> {
    return await this.pushNotificationService.desuscribir();
  }

  /**
   * Verifica si el navegador soporta notificaciones push
   */
  soportaPushNotifications(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Obtiene el estado del servicio de push notifications
   */
  getEstadoPushNotifications(): Observable<any> {
    return this.pushNotificationService.getStatus();
  }

  /**
   * Verifica si las notificaciones push están disponibles
   */
  pushDisponible(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Envía una notificación push
   */
  private async enviarNotificacionPush(datos: DatosVencimientoTarjeta): Promise<void> {
    try {
      // Usar el servicio de push notifications
      const exito = await this.pushNotificationService.enviarNotificacionVencimiento(datos);
      if (!exito) {
        throw new Error('Error enviando notificación push');
      }
    } catch (error) {
      console.error('Error enviando notificación push:', error);
      
      // Fallback: intentar con notificación local simple
      if (this.pushDisponible()) {
        try {
          const simpleOptions = PushVencimientoTemplate.generarNotificacionSimple(datos);
          const notificacionSimple = new Notification(simpleOptions.title!, {
            body: simpleOptions.body,
            icon: simpleOptions.icon,
            tag: simpleOptions.tag,
            data: simpleOptions.data
          });
          
          notificacionSimple.onclick = () => {
            window.focus();
            notificacionSimple.close();
            window.location.href = '/tarjetas';
          };
          
          console.log('🔔 Notificación push simple enviada como fallback');
        } catch (fallbackError) {
          console.error('Error enviando notificación push simple:', fallbackError);
          throw new Error('No se pudo enviar la notificación push');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Envía una notificación de prueba
   */
  async enviarNotificacionPrueba(): Promise<ResultadoNotificacion> {
    const configuracion = this.obtenerConfiguracion();
    
    if (!configuracion.pushHabilitado && !configuracion.emailHabilitado) {
      return {
        exito: false,
        mensaje: 'Las notificaciones están deshabilitadas',
        tipoEnvio: 'ambos',
        fechaEnvio: new Date().toISOString()
      };
    }

    try {
      const datosVencimientoPrueba: DatosVencimientoTarjeta = {
        tarjetaId: 'test-id',
        nombreTarjeta: 'Tarjeta de Prueba',
        banco: 'Banco de Prueba',
        fechaVencimiento: new Date(),
        diaVencimiento: new Date().getDate(),
        diasHastaVencimiento: 3,
        montoAPagar: 15000,
        montoAdeudado: 12000,
        porcentajeUso: 75,
        ultimosDigitos: '1234',
        cuotasPendientes: 2,
        montoProximoMes: 8000,
        gastosRecientes: 5,
        saldoDisponible: 5000
      };

      let exitoEmail = true;
      let exitoPush = true;
      let errores: string[] = [];

      if (configuracion.emailHabilitado && configuracion.emailDestino) {
        try {
          await this.enviarEmail(datosVencimientoPrueba, configuracion.emailDestino);
        } catch (error) {
          exitoEmail = false;
          errores.push(`Error en email: ${error}`);
        }
      }

      if (configuracion.pushHabilitado) {
        try {
          // Usar el servicio de push notifications para la prueba
          exitoPush = await this.pushNotificationService.enviarNotificacionPrueba();
        } catch (error) {
          exitoPush = false;
          errores.push(`Error en push: ${error}`);
        }
      }

      const exito = (configuracion.emailHabilitado ? exitoEmail : true) && 
                    (configuracion.pushHabilitado ? exitoPush : true);
      
      return {
        exito,
        mensaje: exito ? 'Notificación de prueba enviada correctamente' : 'Error enviando notificación de prueba',
        tipoEnvio: configuracion.emailHabilitado && configuracion.pushHabilitado ? 'ambos' : 
                   configuracion.emailHabilitado ? 'email' : 'push',
        fechaEnvio: new Date().toISOString(),
        error: errores.length > 0 ? errores.join('; ') : undefined
      };
      
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      return {
        exito: false,
        mensaje: `Error: ${error}`,
        tipoEnvio: 'ambos',
        fechaEnvio: new Date().toISOString()
      };
    }
  }

  /**
   * Envía un email personalizado (para testing)
   */
  async enviarEmailPersonalizado(emailDestino: string, asunto: string, html: string, texto: string, useRealService: boolean = true): Promise<{ success: boolean; error?: string }> {
    try {
      const emailData: EmailData = {
        to: emailDestino,
        subject: asunto,
        html: html,
        text: texto
      };

      const resultado = await this.emailService.enviar(emailData, useRealService);
      
      if (resultado.success) {
        console.log('✅ Email enviado exitosamente a:', emailDestino);
        return { success: true };
      } else {
        console.error('❌ Error enviando email:', resultado.error);
        return { success: false, error: resultado.error };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error enviando email personalizado:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Envía notificación por email
   */
  private async enviarEmail(datos: DatosVencimientoTarjeta, emailDestino: string): Promise<void> {
    try {
      // Generar el contenido del email usando el template
      const htmlContent = EmailVencimientoTemplate.generarHTML(datos);
      const textContent = EmailVencimientoTemplate.generarTextoPlano(datos);
      const asunto = `💳 Recordatorio: Vencimiento de ${datos.nombreTarjeta}`;
      
      const emailData: EmailData = {
        to: emailDestino,
        subject: asunto,
        html: htmlContent,
        text: textContent
      };

      const resultado = await this.emailService.enviar(emailData, true);
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error enviando email');
      }
      
      console.log('✅ Email de vencimiento enviado exitosamente a:', emailDestino);
    } catch (error) {
      console.error('❌ Error enviando email de vencimiento:', error);
      throw error;
    }
  }

  /**
   * Genera template de email para vencimiento
   */
  private generarTemplateEmail(datos: DatosVencimientoTarjeta): TemplateEmail {
    const asunto = `💳 Recordatorio: Vencimiento de ${datos.nombreTarjeta}`;
    
    const cuerpoTexto = `
Hola,

Te recordamos que tu tarjeta ${datos.nombreTarjeta} del ${datos.banco} vence hoy (día ${datos.diaVencimiento}).

Monto a pagar: $${datos.montoAPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
${datos.ultimosDigitos ? `Últimos dígitos: ****${datos.ultimosDigitos}` : ''}

No olvides realizar el pago para evitar intereses y mantener tu historial crediticio.

Saludos,
Gestor TC
    `;

    const cuerpoHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Vencimiento</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1976d2, #42a5f5); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .tarjeta-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #1976d2; }
        .monto { font-size: 1.2em; font-weight: bold; color: #1976d2; }
        .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
        .emoji { font-size: 1.2em; }
    </style>
</head>
<body>
    <div class="header">
        <h1><span class="emoji">💳</span> Recordatorio de Vencimiento</h1>
    </div>
    <div class="content">
        <p>Hola,</p>
        <p>Te recordamos que tu tarjeta <strong>${datos.nombreTarjeta}</strong> del <strong>${datos.banco}</strong> vence hoy (día <strong>${datos.diaVencimiento}</strong>).</p>
        
        <div class="tarjeta-info">
            <p><strong>Tarjeta:</strong> ${datos.nombreTarjeta}</p>
            <p><strong>Banco:</strong> ${datos.banco}</p>
            ${datos.ultimosDigitos ? `<p><strong>Últimos dígitos:</strong> ****${datos.ultimosDigitos}</p>` : ''}
            <p class="monto"><strong>Monto a pagar:</strong> $${datos.montoAPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
        
        <p><strong>No olvides realizar el pago para evitar intereses y mantener tu historial crediticio.</strong></p>
        
        <div class="footer">
            <p>Saludos,<br><strong>Gestor TC</strong></p>
        </div>
    </div>
</body>
</html>
    `;

    return { asunto, cuerpoHtml, cuerpoTexto };
  }

  /**
   * Carga notificaciones desde localStorage
   */
  private cargarNotificaciones(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_NOTIFICACIONES);
      if (stored) {
        const notificaciones = JSON.parse(stored) as Notificacion[];
        this.notificacionesSubject.next(notificaciones);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  }

  /**
   * Carga configuración desde localStorage
   */
  private cargarConfiguracion(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CONFIGURACION);
      if (stored) {
        const configuracion = JSON.parse(stored) as ConfiguracionNotificaciones;
        this.configuracionSubject.next(configuracion);
      }
    } catch (error) {
      console.error('Error al cargar configuración de notificaciones:', error);
    }
  }

  /**
   * Actualiza las notificaciones y las guarda en localStorage
   */
  private actualizarNotificaciones(notificaciones: Notificacion[]): void {
    // Mantener solo las últimas 100 notificaciones
    const notificacionesLimitadas = notificaciones
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 100);
    
    this.notificacionesSubject.next(notificacionesLimitadas);
    localStorage.setItem(this.STORAGE_KEY_NOTIFICACIONES, JSON.stringify(notificacionesLimitadas));
  }
}

// Agregar import faltante
import { map } from 'rxjs/operators';