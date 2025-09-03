import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { NotificacionService } from '../../services/notificacion.service';
import { VencimientoService } from '../../services/vencimiento.service';
import { TarjetaService } from '../../services/tarjeta';
import { ConfiguracionUsuarioService } from '../../services/configuracion-usuario.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { Tarjeta } from '../../models/tarjeta.model';
import { DatosVencimientoTarjeta } from '../../models/notificacion.model';
import { EmailVencimientoTemplate } from '../../templates/email-vencimiento.template';
import { PushVencimientoTemplate } from '../../templates/push-vencimiento.template';

interface TestNotificacion {
  id: string;
  tipo: 'email' | 'push';
  titulo: string;
  descripcion: string;
  tarjetaId?: string;
  diasAnticipacion: number;
  montoEjemplo: number;
  urgencia: 'baja' | 'media' | 'alta';
}

interface PreviewData {
  email?: {
    html: string;
    texto: string;
    asunto: string;
  };
  push?: {
       title?: string;
       body?: string;
       icon?: string;
       badge?: string;
       image?: string;
       actions?: any[];
     };
}

@Component({
  selector: 'app-test-notificaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './test-notificaciones.component.html',
  styleUrls: ['./test-notificaciones.component.css']
})
export class TestNotificacionesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = false;
  tarjetas: Tarjeta[] = [];
  
  // Configuración de prueba
  testConfig = {
    tarjetaSeleccionada: '',
    diasAnticipacion: 3,
    montoEjemplo: 15000,
    urgencia: 'media' as 'baja' | 'media' | 'alta',
    incluirDetalles: true,
    tipoNotificacion: 'ambos' as 'email' | 'push' | 'ambos',
    emailDestino: '',
    usarServicioReal: false
  };
  
  // Datos de preview
  previewData: PreviewData = {};
  
  // Tests predefinidos
  testsPredefinidos: TestNotificacion[] = [
    {
      id: 'vencimiento-proximo',
      tipo: 'email',
      titulo: 'Vencimiento Próximo',
      descripcion: 'Notificación 3 días antes del vencimiento',
      diasAnticipacion: 3,
      montoEjemplo: 25000,
      urgencia: 'media'
    },
    {
      id: 'vencimiento-urgente',
      tipo: 'push',
      titulo: 'Vencimiento Urgente',
      descripcion: 'Notificación el día del vencimiento',
      diasAnticipacion: 0,
      montoEjemplo: 45000,
      urgencia: 'alta'
    },
    {
      id: 'recordatorio-pago',
      tipo: 'email',
      titulo: 'Recordatorio de Pago',
      descripcion: 'Recordatorio 1 día después del vencimiento',
      diasAnticipacion: -1,
      montoEjemplo: 18000,
      urgencia: 'alta'
    },
    {
      id: 'aviso-temprano',
      tipo: 'push',
      titulo: 'Aviso Temprano',
      descripcion: 'Notificación 7 días antes del vencimiento',
      diasAnticipacion: 7,
      montoEjemplo: 12000,
      urgencia: 'baja'
    }
  ];
  
  // Opciones para formularios
  opcionesUrgencia = [
    { valor: 'baja', etiqueta: 'Baja', color: '#4caf50' },
    { valor: 'media', etiqueta: 'Media', color: '#ff9800' },
    { valor: 'alta', etiqueta: 'Alta', color: '#f44336' }
  ];
  
  opcionesTipoNotificacion = [
    { valor: 'email', etiqueta: 'Solo Email', icono: 'email' },
    { valor: 'push', etiqueta: 'Solo Push', icono: 'notifications' },
    { valor: 'ambos', etiqueta: 'Email y Push', icono: 'send' }
  ];
  
  constructor(
    private notificacionService: NotificacionService,
    private vencimientoService: VencimientoService,
    private tarjetaService: TarjetaService,
    private configuracionUsuarioService: ConfiguracionUsuarioService,
    private pushNotificationService: PushNotificationService,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.cargarTarjetas();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private cargarTarjetas(): void {
    this.tarjetaService.getTarjetas$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tarjetas: Tarjeta[]) => {
          this.tarjetas = tarjetas;
          if (tarjetas.length > 0 && !this.testConfig.tarjetaSeleccionada) {
            this.testConfig.tarjetaSeleccionada = tarjetas[0].id;
          }
        },
        error: (error: any) => {
          console.error('Error al cargar tarjetas:', error);
          this.mostrarError('Error al cargar las tarjetas');
        }
      });
  }
  
  generarPreview(): void {
    if (!this.testConfig.tarjetaSeleccionada) {
      this.mostrarError('Selecciona una tarjeta para generar el preview');
      return;
    }
    
    this.loading = true;
    
    try {
      const tarjeta = this.tarjetas.find(t => t.id === this.testConfig.tarjetaSeleccionada);
      if (!tarjeta) {
        throw new Error('Tarjeta no encontrada');
      }
      
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + this.testConfig.diasAnticipacion);
      
      const datosVencimiento: DatosVencimientoTarjeta = {
        tarjetaId: tarjeta.id,
        nombreTarjeta: tarjeta.nombre,
        banco: tarjeta.banco || 'Banco de Prueba',
        diaVencimiento: tarjeta.diaVencimiento || new Date().getDate(),
        montoAPagar: this.testConfig.montoEjemplo,
        montoAdeudado: this.testConfig.montoEjemplo,
        fechaVencimiento,
        diasHastaVencimiento: this.testConfig.diasAnticipacion,
        porcentajeUso: 75,
        saldoDisponible: tarjeta.limite - this.testConfig.montoEjemplo,
        ultimosDigitos: tarjeta.ultimosDigitos,
        gastosRecientes: 5,
        cuotasPendientes: 2,
        montoProximoMes: this.testConfig.montoEjemplo * 0.6
      };
      
      // Generar preview de email
      if (this.testConfig.tipoNotificacion === 'email' || this.testConfig.tipoNotificacion === 'ambos') {
        this.previewData.email = {
          html: EmailVencimientoTemplate.generarHTML(datosVencimiento),
          texto: EmailVencimientoTemplate.generarTextoPlano(datosVencimiento),
          asunto: `💳 Recordatorio: Vencimiento de ${datosVencimiento.nombreTarjeta}`
        };
      }
      
      // Generar preview de push
      if (this.testConfig.tipoNotificacion === 'push' || this.testConfig.tipoNotificacion === 'ambos') {
        this.previewData.push = PushVencimientoTemplate.generarNotificacion(datosVencimiento);
      }
      
      this.mostrarExito('Preview generado correctamente');
    } catch (error) {
      console.error('Error al generar preview:', error);
      this.mostrarError('Error al generar el preview');
    } finally {
      this.loading = false;
    }
  }
  
  ejecutarTestPredefinido(test: TestNotificacion): void {
    if (!this.testConfig.tarjetaSeleccionada) {
      this.mostrarError('Selecciona una tarjeta para ejecutar el test');
      return;
    }
    
    // Aplicar configuración del test
    this.testConfig.diasAnticipacion = test.diasAnticipacion;
    this.testConfig.montoEjemplo = test.montoEjemplo;
    this.testConfig.urgencia = test.urgencia;
    this.testConfig.tipoNotificacion = test.tipo;
    
    // Generar preview
    this.generarPreview();
    
    this.mostrarInfo(`Test "${test.titulo}" ejecutado`);
  }
  
  async enviarNotificacionPrueba(): Promise<void> {
    if (!this.previewData.email && !this.previewData.push) {
      this.mostrarError('Genera un preview antes de enviar la notificación');
      return;
    }
    
    this.loading = true;
    
    try {
      // Enviar email de prueba
      if (this.previewData.email) {
        const emailDestino = this.testConfig.emailDestino || 'test@example.com';
        const resultado = await this.notificacionService.enviarEmailPersonalizado(
          emailDestino,
          this.previewData.email.asunto,
          this.previewData.email.html,
          this.previewData.email.texto,
          this.testConfig.usarServicioReal
        );
        
        if (!resultado.success) {
          throw new Error(resultado.error || 'Error enviando email');
        }
      }
      
      // Enviar push de prueba
      if (this.previewData.push) {
        await this.notificacionService.enviarNotificacionPrueba();
      }
      
      const tipoServicio = this.testConfig.usarServicioReal ? 'real' : 'simulado';
      this.mostrarExito(`Notificación de prueba enviada (${tipoServicio})`);
    } catch (error) {
      console.error('Error al enviar notificación de prueba:', error);
      this.mostrarError('Error al enviar la notificación de prueba: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      this.loading = false;
    }
  }

  async enviarEmailAhora(): Promise<void> {
    if (!this.testConfig.emailDestino) {
      this.mostrarError('Ingresa un email de destino');
      return;
    }

    if (!this.previewData.email) {
      this.mostrarError('Genera un preview de email antes de enviar');
      return;
    }

    this.loading = true;

    try {
      const resultado = await this.notificacionService.enviarEmailPersonalizado(
        this.testConfig.emailDestino,
        this.previewData.email.asunto,
        this.previewData.email.html,
        this.previewData.email.texto,
        true // Siempre usar servicio real para este botón
      );

      if (resultado.success) {
        this.mostrarExito(`Email enviado exitosamente a ${this.testConfig.emailDestino}`);
      } else {
        throw new Error(resultado.error || 'Error enviando email');
      }
    } catch (error) {
      console.error('Error al enviar email:', error);
      this.mostrarError('Error al enviar email: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      this.loading = false;
    }
  }

  validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private generarDetallesEjemplo() {
    return {
      gastosRecientes: [
        { descripcion: 'Supermercado', monto: 8500, fecha: new Date() },
        { descripcion: 'Combustible', monto: 4200, fecha: new Date() },
        { descripcion: 'Restaurante', monto: 2300, fecha: new Date() }
      ],
      porcentajeUso: Math.round((this.testConfig.montoEjemplo / 50000) * 100),
      limiteDisponible: 50000 - this.testConfig.montoEjemplo
    };
  }
  
  getTarjetaNombre(id: string): string {
    const tarjeta = this.tarjetas.find(t => t.id === id);
    return tarjeta ? `${tarjeta.nombre} - ${tarjeta.banco}` : 'Tarjeta no encontrada';
  }
  
  getUrgenciaColor(urgencia: string): string {
    const opcion = this.opcionesUrgencia.find(o => o.valor === urgencia);
    return opcion ? opcion.color : '#666';
  }
  
  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }
  
  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }
  
  private mostrarInfo(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-info']
    });
  }
}