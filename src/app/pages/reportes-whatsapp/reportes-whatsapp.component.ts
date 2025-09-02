import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportePdfService, ReporteData } from '../../services/reporte-pdf.service';

@Component({
  selector: 'app-reportes-whatsapp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './reportes-whatsapp.component.html',
  styleUrl: './reportes-whatsapp.component.css'
})
export class ReportesWhatsappComponent implements OnInit {
  reporteForm: FormGroup;
  generandoPdf = false;
  generandoPdfCompartidos = false;
  enviandoWhatsapp = false;
  
  meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  anios: number[] = [];
  datosReporte: ReporteData | null = null;
  pdfBlob: Blob | null = null;

  constructor(
    private fb: FormBuilder,
    private reportePdfService: ReportePdfService,
    private snackBar: MatSnackBar
  ) {
    this.reporteForm = this.fb.group({
      mes: [new Date().getMonth() + 1, Validators.required],
      anio: [new Date().getFullYear(), Validators.required],
      numeroWhatsapp: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]]
    });
  }

  ngOnInit(): void {
    this.generarListaAños();
  }

  private generarListaAños(): void {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= anioActual - 5; i--) {
      this.anios.push(i);
    }
  }

  async generarReporte(): Promise<void> {
    if (this.reporteForm.invalid) {
      this.mostrarMensaje('Por favor, complete todos los campos correctamente', 'error');
      return;
    }

    const { mes, anio } = this.reporteForm.value;
    this.generandoPdf = true;
    this.datosReporte = null;
    this.pdfBlob = null;

    try {
      // Obtener datos del reporte
      this.reportePdfService.generarDatosReporte$(anio, mes).subscribe(async (datos) => {
        try {
          this.datosReporte = datos;
          
          if (datos.totalGastos === 0) {
            this.mostrarMensaje('No hay gastos registrados para el mes seleccionado', 'warning');
            this.generandoPdf = false;
            return;
          }

          // Generar PDF
          this.pdfBlob = await this.reportePdfService.generarPDF(datos);
          this.mostrarMensaje('Reporte generado exitosamente', 'success');
        } catch (error) {
          console.error('Error al generar PDF:', error);
          this.mostrarMensaje('Error al generar el reporte PDF', 'error');
        } finally {
          this.generandoPdf = false;
        }
      });
    } catch (error) {
      console.error('Error al obtener datos del reporte:', error);
      this.mostrarMensaje('Error al obtener los datos del reporte', 'error');
      this.generandoPdf = false;
    }
  }

  descargarPdf(): void {
    if (!this.pdfBlob || !this.datosReporte) {
      this.mostrarMensaje('No hay reporte generado para descargar', 'error');
      return;
    }

    const url = window.URL.createObjectURL(this.pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-gastos-${this.datosReporte.mes}-${this.datosReporte.año}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async enviarPorWhatsapp(): Promise<void> {
    if (!this.pdfBlob || !this.datosReporte) {
      this.mostrarMensaje('Primero debe generar el reporte', 'error');
      return;
    }

    const numeroWhatsapp = this.reporteForm.get('numeroWhatsapp')?.value;
    if (!numeroWhatsapp) {
      this.mostrarMensaje('Ingrese un número de WhatsApp válido', 'error');
      return;
    }

    this.enviandoWhatsapp = true;

    try {
      // Crear mensaje para WhatsApp
      const mensaje = this.crearMensajeWhatsapp();
      
      // Abrir WhatsApp Web con el mensaje
      const numeroLimpio = numeroWhatsapp.replace(/[^\d]/g, '');
      const urlWhatsapp = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
      
      // Abrir en nueva ventana
      window.open(urlWhatsapp, '_blank');
      
      this.mostrarMensaje('Se abrió WhatsApp Web. Adjunte manualmente el archivo PDF descargado.', 'info');
      
      // Descargar automáticamente el PDF para que el usuario lo pueda adjuntar
      this.descargarPdf();
      
    } catch (error) {
      console.error('Error al enviar por WhatsApp:', error);
      this.mostrarMensaje('Error al abrir WhatsApp', 'error');
    } finally {
      this.enviandoWhatsapp = false;
    }
  }

  private crearMensajeWhatsapp(): string {
    if (!this.datosReporte) return '';
    
    const { mes, año, totalGastos, gastosPorTarjeta } = this.datosReporte;
    
    let mensaje = `📊 *Reporte de Gastos - ${mes} ${año}*\n\n`;
    mensaje += `💰 *Total del mes:* $${totalGastos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n`;
    
    mensaje += `📋 *Resumen por tarjeta:*\n`;
    gastosPorTarjeta.forEach(tarjeta => {
      mensaje += `• ${tarjeta.nombreTarjeta}: $${tarjeta.totalTarjeta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n`;
    });
    
    mensaje += `\n📎 *IMPORTANTE: Descarga automática del PDF iniciada*\n`;
    mensaje += `📋 *Por favor, adjunta manualmente el archivo PDF descargado a este chat*`;
    
    return mensaje;
  }

  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    const config = {
      duration: 4000,
      horizontalPosition: 'end' as const,
      verticalPosition: 'top' as const,
      panelClass: [`snackbar-${tipo}`]
    };
    
    this.snackBar.open(mensaje, 'Cerrar', config);
  }

  /**
   * Calcula el total de gastos compartidos
   */
  calcularTotalGastosCompartidos(): number {
    if (!this.datosReporte?.gastosCompartidos) {
      return 0;
    }
    
    return this.datosReporte.gastosCompartidos.reduce((total, gasto) => {
      return total + (gasto.monto * gasto.porcentajeCompartido / 100);
    }, 0);
  }

  get mesSeleccionado(): string {
    const mesValor = this.reporteForm.get('mes')?.value;
    const mes = this.meses.find(m => m.valor === mesValor);
    return mes ? mes.nombre : '';
  }

  get anioSeleccionado(): number {
    return this.reporteForm.get('anio')?.value || new Date().getFullYear();
  }

  get puedeGenerar(): boolean {
    return this.reporteForm.valid && !this.generandoPdf;
  }

  get puedeEnviar(): boolean {
    const numeroWhatsappControl = this.reporteForm.get('numeroWhatsapp');
    return this.pdfBlob !== null && 
           numeroWhatsappControl !== null && 
           numeroWhatsappControl.valid === true && 
           !this.enviandoWhatsapp;
  }

  get tieneGastosCompartidos(): boolean {
    return !!(this.datosReporte?.gastosCompartidos && this.datosReporte.gastosCompartidos.length > 0);
  }

  async generarReporteGastosCompartidos(): Promise<void> {
    if (!this.puedeGenerar) {
      return;
    }

    try {
      this.generandoPdfCompartidos = true;
      const año = this.reporteForm.get('anio')?.value;
      const mes = this.reporteForm.get('mes')?.value;

      // Obtener datos del reporte
      this.reportePdfService.generarDatosReporte$(año, mes).subscribe(async (datos) => {
        try {
          if (datos.gastosCompartidos.length === 0) {
            this.mostrarMensaje('No hay gastos compartidos en el mes seleccionado', 'warning');
            return;
          }

          // Generar PDF solo de gastos compartidos
          this.pdfBlob = await this.reportePdfService.generarPDFGastosCompartidos(datos);
          
          // Descargar automáticamente
          this.descargarPdfCompartidos();
          
          this.mostrarMensaje('Reporte de gastos compartidos generado exitosamente', 'success');
        } catch (error) {
          console.error('Error al generar PDF de gastos compartidos:', error);
          this.mostrarMensaje('Error al generar el reporte de gastos compartidos', 'error');
        } finally {
          this.generandoPdfCompartidos = false;
        }
      });
    } catch (error) {
      console.error('Error al obtener datos para reporte de gastos compartidos:', error);
      this.mostrarMensaje('Error al obtener los datos del reporte', 'error');
      this.generandoPdfCompartidos = false;
    }
  }

  private descargarPdfCompartidos(): void {
    if (!this.pdfBlob) {
      return;
    }

    const url = window.URL.createObjectURL(this.pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gastos-compartidos-${this.mesSeleccionado}-${this.anioSeleccionado}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async enviarGastosCompartidosPorWhatsapp(): Promise<void> {
    if (!this.reporteForm.valid || !this.tieneGastosCompartidos) {
      return;
    }

    try {
      this.enviandoWhatsapp = true;
      
      // Generar el PDF de gastos compartidos
      const año = this.reporteForm.get('anio')?.value;
      const mes = this.reporteForm.get('mes')?.value;
      
      this.reportePdfService.generarDatosReporte$(año, mes).subscribe(async (datos) => {
        try {
          const pdfBlob = await this.reportePdfService.generarPDFGastosCompartidos(datos);
          
          // Crear mensaje específico para gastos compartidos
          const mensaje = this.crearMensajeGastosCompartidos();
          const numeroWhatsapp = this.reporteForm.get('numeroWhatsapp')?.value;
          const numeroLimpio = numeroWhatsapp.replace(/[^\d]/g, '');
          const mensajeCodificado = encodeURIComponent(mensaje);
          const urlWhatsapp = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
          
          // Descargar el PDF automáticamente
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `gastos-compartidos-${this.mesSeleccionado}-${this.anioSeleccionado}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          // Abrir WhatsApp nativo
          window.open(urlWhatsapp, '_blank');
          
          this.mostrarMensaje('PDF de gastos compartidos descargado y WhatsApp abierto', 'success');
        } catch (error) {
          console.error('Error al generar PDF de gastos compartidos:', error);
          this.mostrarMensaje('Error al generar el PDF de gastos compartidos', 'error');
        } finally {
          this.enviandoWhatsapp = false;
        }
      });
    } catch (error) {
      console.error('Error al enviar gastos compartidos por WhatsApp:', error);
      this.mostrarMensaje('Error al procesar el envío', 'error');
      this.enviandoWhatsapp = false;
    }
  }

  private crearMensajeGastosCompartidos(): string {
    if (!this.datosReporte) return '';
    
    const totalCompartidos = this.calcularTotalGastosCompartidos();
    
    let mensaje = `🧾 *Reporte de Gastos Compartidos*\n`;
    mensaje += `📅 Período: ${this.mesSeleccionado} ${this.anioSeleccionado}\n\n`;
    mensaje += `💸 *Total gastos compartidos: $${totalCompartidos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}*\n\n`;
    mensaje += `📋 *Detalle de gastos compartidos:*\n`;
    
    this.datosReporte.gastosCompartidos.forEach((gasto, index) => {
      const montoCompartido = (gasto.monto * gasto.porcentajeCompartido / 100);
      mensaje += `${index + 1}. ${gasto.descripcion}\n`;
      mensaje += `   💰 Total: $${gasto.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
      if (gasto.cuotaInfo) {
        mensaje += ` (${gasto.cuotaInfo})`;
      }
      mensaje += `\n   👥 Compartido con: ${gasto.compartidoCon}\n`;
      mensaje += `   📊 Tu parte (${gasto.porcentajeCompartido}%): $${montoCompartido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n`;
    });
    
    mensaje += `📎 *IMPORTANTE: Descarga automática del PDF iniciada*\n`;
    mensaje += `📋 *Por favor, adjunta manualmente el archivo PDF descargado a este chat*`;
    
    return mensaje;
  }
}