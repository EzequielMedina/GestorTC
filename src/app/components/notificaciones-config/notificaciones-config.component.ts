import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { NotificacionService } from '../../services/notificacion.service';
import { VencimientoService } from '../../services/vencimiento.service';
import { PushNotificationService, PushNotificationStatus } from '../../services/push-notification.service';
import { ConfiguracionUsuarioService, ConfiguracionNotificaciones } from '../../services/configuracion-usuario.service';
import { 
  TipoNotificacion,
  DatosVencimientoTarjeta,
  ResultadoNotificacion 
} from '../../models/notificacion.model';
import { TarjetaService } from '../../services/tarjeta';
import { CalculoVencimientoService } from '../../services/calculo-vencimiento.service';
import { Tarjeta } from '../../models/tarjeta.model';

@Component({
  selector: 'app-notificaciones-config',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './notificaciones-config.component.html',
  styleUrls: ['./notificaciones-config.component.css']
})
export class NotificacionesConfigComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Configuración actual
  configuracion: ConfiguracionNotificaciones | null = null;
  configuracionOriginal: ConfiguracionNotificaciones | null = null;
  
  // Estados del componente
  loading = false;
  guardando = false;
  probandoNotificacion = false;
  
  // Datos para testing
  tarjetas: Tarjeta[] = [];
  tarjetaSeleccionadaTest: string = '';
  
  // Información del servicio de vencimientos
  estadoServicio: any = null;
  
  // Estado de Push Notifications
  estadoPush: PushNotificationStatus = {
    isSupported: false,
    isServiceWorkerRegistered: false,
    isSubscribed: false,
    permission: 'default'
  };
  
  // Estado adicional
  gestionandoPush = false;
  
  // Opciones de configuración
  readonly tiposNotificacion = [
    { valor: TipoNotificacion.VENCIMIENTO_TARJETA, etiqueta: 'Vencimiento de Tarjetas' },
    { valor: TipoNotificacion.LIMITE_EXCEDIDO, etiqueta: 'Límite Excedido' },
    { valor: TipoNotificacion.RECORDATORIO_PAGO, etiqueta: 'Recordatorio de Pago' }
  ];
  
  readonly opcionesDiasAnticipacion = [
    { valor: 0, etiqueta: 'Solo el día de vencimiento' },
    { valor: 1, etiqueta: '1 día antes' },
    { valor: 2, etiqueta: '2 días antes' },
    { valor: 3, etiqueta: '3 días antes' },
    { valor: 5, etiqueta: '5 días antes' },
    { valor: 7, etiqueta: '1 semana antes' }
  ];
  
  readonly opcionesHorario = [
    { valor: '08:00', etiqueta: '8:00 AM' },
    { valor: '09:00', etiqueta: '9:00 AM' },
    { valor: '10:00', etiqueta: '10:00 AM' },
    { valor: '12:00', etiqueta: '12:00 PM' },
    { valor: '14:00', etiqueta: '2:00 PM' },
    { valor: '16:00', etiqueta: '4:00 PM' },
    { valor: '18:00', etiqueta: '6:00 PM' },
    { valor: '20:00', etiqueta: '8:00 PM' }
  ];

  constructor(
    private notificacionService: NotificacionService,
    private vencimientoService: VencimientoService,
    private tarjetaService: TarjetaService,
    private calculoVencimientoService: CalculoVencimientoService,
    private pushNotificationService: PushNotificationService,
    private configuracionUsuarioService: ConfiguracionUsuarioService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
    this.cargarTarjetas();
    this.suscribirEstadoPush();
    this.cargarEstadoServicio();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la configuración actual de notificaciones
   */
  private cargarConfiguracion(): void {
    this.loading = true;
    
    this.configuracionUsuarioService.configuracion$
       .pipe(takeUntil(this.destroy$))
       .subscribe({
         next: (config) => {
           this.configuracion = { ...config };
           this.configuracionOriginal = { ...config };
           this.loading = false;
         },
         error: (error: any) => {
           console.error('Error al cargar configuración:', error);
           this.snackBar.open('Error al cargar configuración', 'Cerrar', { duration: 3000 });
           this.loading = false;
         }
       });
  }

  /**
   * Carga la lista de tarjetas para testing
   */
  private cargarTarjetas(): void {
    this.tarjetaService.getTarjetas$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tarjetas: any) => {
          this.tarjetas = tarjetas;
          if (tarjetas.length > 0 && !this.tarjetaSeleccionadaTest) {
            this.tarjetaSeleccionadaTest = tarjetas[0].id;
          }
        },
        error: (error: any) => {
          console.error('Error al cargar tarjetas:', error);
        }
      });
  }

  /**
   * Se suscribe al estado de push notifications
   */
  private suscribirEstadoPush(): void {
    this.pushNotificationService.getStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.estadoPush = status;
        },
        error: (error) => {
          console.error('Error obteniendo estado push:', error);
        }
      });
  }

  /**
   * Carga el estado del servicio de vencimientos
   */
  cargarEstadoServicio(): void {
    this.estadoServicio = this.vencimientoService.getEstadoServicio();
  }

  /**
   * Gestiona la suscripción a push notifications
   */
  async gestionarSuscripcionPush(): Promise<void> {
    this.gestionandoPush = true;
    
    try {
      if (this.estadoPush.isSubscribed) {
        // Desuscribir
        const exito = await this.pushNotificationService.desuscribir();
        if (exito) {
          alert('✅ Desuscrito de notificaciones push');
        } else {
          alert('❌ Error al desuscribirse');
        }
      } else {
        // Suscribir
        const exito = await this.pushNotificationService.suscribir();
        if (exito) {
          alert('✅ Suscrito a notificaciones push');
        } else {
          alert('❌ Error al suscribirse. Verifica los permisos.');
        }
      }
    } catch (error) {
      console.error('Error gestionando suscripción push:', error);
      alert('Error en la gestión de notificaciones');
    } finally {
      this.gestionandoPush = false;
    }
  }

  /**
   * Solicita permisos para notificaciones push
   */
  async solicitarPermisosPush(): Promise<void> {
    try {
      const permission = await this.pushNotificationService.solicitarPermisos();
      
      if (permission === 'granted') {
        alert('✅ Permisos concedidos para notificaciones push');
      } else {
        alert('❌ Permisos denegados para notificaciones push');
      }
    } catch (error) {
      console.error('Error solicitando permisos push:', error);
      alert('Error solicitando permisos');
    }
  }

  /**
   * Guarda la configuración de notificaciones
   */
  async guardarConfiguracion(): Promise<void> {
    if (!this.configuracion) return;
    
    this.guardando = true;
    
    try {
        if (this.configuracion) {
          // Guardar en ConfiguracionUsuarioService (localStorage: gestor-tc-config-usuario)
          this.configuracionUsuarioService.guardarConfiguracion(this.configuracion);
          
          // SINCRONIZAR: También guardar en NotificacionService (localStorage: gestor-tc-config-notificaciones)
          const configNotificacion = {
          id: Date.now().toString(),
          emailHabilitado: this.configuracion.canales.email,
          pushHabilitado: this.configuracion.canales.push,
          diasAnticipacion: this.configuracion.tiempos.diasAnticipacion,
          horaNotificacion: this.configuracion.tiempos.horaNotificacion,
          tiposHabilitados: [TipoNotificacion.VENCIMIENTO_TARJETA],
          emailDestino: this.configuracion.emailDestino
        };
          
          this.notificacionService.guardarConfiguracion(configNotificacion).subscribe({
            next: () => console.log('✅ Configuración sincronizada con NotificacionService'),
            error: (error) => console.error('❌ Error sincronizando con NotificacionService:', error)
          });
        }
      this.configuracionOriginal = { ...this.configuracion };
      this.snackBar.open('✅ Configuración guardada correctamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      this.snackBar.open('❌ Error al guardar la configuración', 'Cerrar', { duration: 5000 });
    } finally {
      this.guardando = false;
    }
  }

  /**
   * Restaura la configuración original
   */
  restaurarConfiguracion(): void {
    if (this.configuracionOriginal) {
      this.configuracion = { ...this.configuracionOriginal };
    }
  }

  /**
   * Verifica si hay cambios pendientes
   */
  hayCambiosPendientes(): boolean {
    if (!this.configuracion || !this.configuracionOriginal) {
      return false;
    }
    
    return JSON.stringify(this.configuracion) !== JSON.stringify(this.configuracionOriginal);
  }

  /**
   * Alterna un tipo de notificación en la configuración
   */
  toggleTipoNotificacion(tipo: string): void {
    if (!this.configuracion) return;
    
    // La configuración se maneja a través de canales (push/email)
      if (tipo === 'push') {
        this.configuracion.canales.push = !this.configuracion.canales.push;
      } else if (tipo === 'email') {
        this.configuracion.canales.email = !this.configuracion.canales.email;
      }
  }

  /**
   * Verifica si un tipo de notificación está habilitado
   */
  esTipoHabilitado(tipo: string): boolean {
    if (!this.configuracion) return false;
    if (tipo === 'push') return this.configuracion.canales.push;
    if (tipo === 'email') return this.configuracion.canales.email;
    return false;
  }

  /**
   * Prueba el envío de una notificación
   */
  async probarNotificacion(): Promise<void> {
    if (!this.tarjetaSeleccionadaTest || this.probandoNotificacion) {
      return;
    }
    
    // Verificar que el email esté configurado si está habilitado
    if (this.configuracion?.canales.email && !this.configuracion.emailDestino) {
      alert('❌ Por favor configura un email de destino antes de probar');
      return;
    }
    
    this.probandoNotificacion = true;
    
    try {
      const tarjeta = this.tarjetas.find(t => t.id === this.tarjetaSeleccionadaTest);
      
      if (!tarjeta) {
        alert('❌ Tarjeta no encontrada');
        return;
      }
      
      // Obtener datos reales de vencimiento de la tarjeta
      this.calculoVencimientoService.getDatosVencimientoTarjeta$(this.tarjetaSeleccionadaTest)
        .subscribe(async (datosVencimiento) => {
          if (!datosVencimiento) {
            alert('❌ No se pudieron obtener los datos de vencimiento de la tarjeta');
            this.probandoNotificacion = false;
            return;
          }
          
          try {
            // Actualizar la configuración del servicio de notificación para incluir email
            if (this.configuracion) {
              const configNotificacion = {
               id: Date.now().toString(),
               emailHabilitado: this.configuracion.canales.email,
               pushHabilitado: this.configuracion.canales.push,
               diasAnticipacion: this.configuracion.tiempos.diasAnticipacion,
               horaNotificacion: this.configuracion.tiempos.horaNotificacion,
               tiposHabilitados: [TipoNotificacion.VENCIMIENTO_TARJETA],
               emailDestino: this.configuracion.emailDestino
             };
              this.notificacionService.guardarConfiguracion(configNotificacion).subscribe();
            }
            
            const resultado: ResultadoNotificacion = await this.notificacionService.enviarNotificacionVencimiento(datosVencimiento);
            
            if (resultado.exito) {
              const tipoEnvio = resultado.tipoEnvio === 'ambos' ? 'Email y Push' : 
                              resultado.tipoEnvio === 'email' ? 'Email' : 'Push';
              const emailInfo = this.configuracion?.canales.email ? `\nEmail: ${this.configuracion.emailDestino}` : '';
              alert(`✅ Notificación enviada correctamente con datos reales\n\n` +
                    `Tarjeta: ${datosVencimiento.nombreTarjeta}\n` +
                    `Monto a pagar: $${datosVencimiento.montoAPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n` +
                    `Tipo de envío: ${tipoEnvio}${emailInfo}\n` +
                    `Fecha: ${new Date(resultado.fechaEnvio).toLocaleString()}`);
            } else {
              alert(`❌ Error al enviar notificación\n\nError: ${resultado.error || resultado.mensaje}`);
            }
          } catch (error) {
            console.error('Error al enviar notificación:', error);
            alert('❌ Error al enviar la notificación');
          } finally {
            this.probandoNotificacion = false;
          }
        });
      
    } catch (error) {
      console.error('Error al obtener datos de vencimiento:', error);
      alert('❌ Error al obtener los datos de la tarjeta');
      this.probandoNotificacion = false;
    }
  }

  /**
   * Prueba específicamente las push notifications
   */
  async probarPushNotification(): Promise<void> {
    this.probandoNotificacion = true;
    
    try {
      const exito = await this.pushNotificationService.enviarNotificacionPrueba();
      
      if (exito) {
        alert('✅ Push notification de prueba enviada');
      } else {
        alert('❌ Error enviando push notification');
      }
    } catch (error) {
      console.error('Error probando push notification:', error);
      alert('Error enviando push notification de prueba');
    } finally {
      this.probandoNotificacion = false;
    }
  }

  /**
   * Ejecuta verificación manual de vencimientos
   */
  async verificarVencimientosManual(): Promise<void> {
    try {
      const resultados = await this.vencimientoService.verificarVencimientosManual().toPromise();
      
      if (resultados && resultados.length > 0) {
        const exitosos = resultados.filter(r => r.exito).length;
        const fallidos = resultados.length - exitosos;
        
        alert(`✅ Verificación completada\n\nNotificaciones enviadas: ${exitosos}\nErrores: ${fallidos}`);
      } else {
        alert('ℹ️ No hay tarjetas que venzan hoy');
      }
      
      this.cargarEstadoServicio();
    } catch (error) {
      console.error('Error en verificación manual:', error);
      alert('❌ Error al verificar vencimientos');
    }
  }

  /**
   * Reinicia el servicio de vencimientos
   */
  reiniciarServicio(): void {
    if (confirm('¿Estás seguro de que deseas reiniciar el servicio de verificación de vencimientos?')) {
      this.vencimientoService.reiniciarServicio();
      this.cargarEstadoServicio();
      alert('✅ Servicio reiniciado correctamente');
    }
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return 'Nunca';
    
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return fechaObj.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtiene el nombre de una tarjeta por ID
   */
  obtenerNombreTarjeta(id: string): string {
    const tarjeta = this.tarjetas.find(t => t.id === id);
    return tarjeta ? tarjeta.nombre : 'Tarjeta no encontrada';
  }

  /**
   * Maneja cambios en la configuración
   */
  onConfiguracionChange(): void {
    // Guardar automáticamente los cambios
    try {
      if (this.configuracion) {
        // Guardar en ConfiguracionUsuarioService
        this.configuracionUsuarioService.guardarConfiguracion(this.configuracion);
        
        // SINCRONIZAR: También guardar en NotificacionService
        const configNotificacion = {
          id: Date.now().toString(),
          emailHabilitado: this.configuracion.canales.email,
          pushHabilitado: this.configuracion.canales.push,
          diasAnticipacion: this.configuracion.tiempos.diasAnticipacion,
          horaNotificacion: this.configuracion.tiempos.horaNotificacion,
          tiposHabilitados: [TipoNotificacion.VENCIMIENTO_TARJETA],
          emailDestino: this.configuracion.emailDestino
        };
        
        this.notificacionService.guardarConfiguracion(configNotificacion).subscribe({
          next: () => console.log('✅ Configuración sincronizada automáticamente'),
          error: (error) => console.error('❌ Error en sincronización automática:', error)
        });
        
        console.log('Configuración actualizada automáticamente');
      }
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      this.snackBar.open('Error al actualizar configuración', 'Cerrar', { duration: 3000 });
    }
  }
}