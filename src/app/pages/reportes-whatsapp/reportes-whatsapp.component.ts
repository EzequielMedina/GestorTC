import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportePdfService, ReporteData } from '../../services/reporte-pdf.service';

@Component({
  selector: 'app-reportes-whatsapp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './reportes-whatsapp.component.html',
  styleUrl: './reportes-whatsapp.component.css'
})
export class ReportesWhatsappComponent implements OnInit {
  reporteForm: FormGroup;
  cargando = false;
  datosReporte: ReporteData | null = null;

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

  años: number[] = [];

  constructor(
    private fb: FormBuilder,
    private reporteService: ReportePdfService,
    private snackBar: MatSnackBar
  ) {
    this.reporteForm = this.fb.group({
      año: [new Date().getFullYear(), Validators.required],
      mes: [new Date().getMonth() + 1, Validators.required],
      numeroWhatsapp: ['', [Validators.required, Validators.pattern(/^\d{10,15}$/)]]
    });
  }

  ngOnInit() {
    // Generar años (5 años hacia atrás y 2 hacia adelante)
    const añoActual = new Date().getFullYear();
    for (let i = añoActual - 5; i <= añoActual + 2; i++) {
      this.años.push(i);
    }
  }

  generarReporte() {
    if (this.reporteForm.valid) {
      this.cargando = true;
      const { año, mes } = this.reporteForm.value;
      
      this.reporteService.generarDatosReporte$(año, mes).subscribe({
        next: (datos) => {
          this.datosReporte = datos;
          this.cargando = false;
          this.snackBar.open('Reporte generado exitosamente', 'Cerrar', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error al generar reporte:', error);
          this.cargando = false;
          this.snackBar.open('Error al generar el reporte', 'Cerrar', {
            duration: 3000
          });
        }
      });
    }
  }

  async descargarPDF() {
    if (!this.datosReporte) return;
    
    try {
      this.cargando = true;
      const pdfBlob = await this.reporteService.generarPDF(this.datosReporte);
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${this.datosReporte.nombreMes}-${this.datosReporte.año}.pdf`;
      link.click();
      
      window.URL.revokeObjectURL(url);
      this.cargando = false;
      
      this.snackBar.open('PDF descargado exitosamente', 'Cerrar', {
        duration: 3000
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.cargando = false;
      this.snackBar.open('Error al generar el PDF', 'Cerrar', {
        duration: 3000
      });
    }
  }

  async descargarPDFGastosCompartidos() {
    if (!this.datosReporte) return;
    
    try {
      this.cargando = true;
      const pdfBlob = await this.reporteService.generarPDFGastosCompartidos(this.datosReporte);
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gastos-compartidos-${this.datosReporte.nombreMes}-${this.datosReporte.año}.pdf`;
      link.click();
      
      window.URL.revokeObjectURL(url);
      this.cargando = false;
      
      this.snackBar.open('PDF de gastos compartidos descargado exitosamente', 'Cerrar', {
        duration: 3000
      });
    } catch (error) {
      console.error('Error al generar PDF de gastos compartidos:', error);
      this.cargando = false;
      this.snackBar.open('Error al generar el PDF de gastos compartidos', 'Cerrar', {
        duration: 3000
      });
    }
  }

  async enviarPorWhatsapp() {
    if (!this.datosReporte || !this.reporteForm.valid) return;
    
    try {
      this.cargando = true;
      
      // Generar PDF
      const pdfBlob = await this.reporteService.generarPDF(this.datosReporte);
      
      // Crear mensaje para WhatsApp
      const mensaje = this.crearMensaje();
      
      // Descargar PDF automáticamente
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${this.datosReporte.nombreMes}-${this.datosReporte.año}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      // Abrir WhatsApp Web
      const numeroWhatsapp = this.reporteForm.get('numeroWhatsapp')?.value;
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${numeroWhatsapp}&text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappUrl, '_blank');
      
      this.cargando = false;
      this.snackBar.open('PDF descargado y WhatsApp abierto. Adjunta el archivo manualmente.', 'Cerrar', {
        duration: 5000
      });
    } catch (error) {
      console.error('Error al enviar por WhatsApp:', error);
      this.cargando = false;
      this.snackBar.open('Error al procesar el envío', 'Cerrar', {
        duration: 3000
      });
    }
  }

  async enviarGastosCompartidosPorWhatsapp() {
    if (!this.datosReporte || !this.reporteForm.valid) return;
    
    try {
      this.cargando = true;
      
      // Generar PDF de gastos compartidos
      const pdfBlob = await this.reporteService.generarPDFGastosCompartidos(this.datosReporte);
      
      // Crear mensaje específico para gastos compartidos
      const mensaje = this.crearMensajeGastosCompartidos();
      
      // Descargar PDF automáticamente
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gastos-compartidos-${this.datosReporte.nombreMes}-${this.datosReporte.año}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      // Abrir WhatsApp Web
      const numeroWhatsapp = this.reporteForm.get('numeroWhatsapp')?.value;
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${numeroWhatsapp}&text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappUrl, '_blank');
      
      this.cargando = false;
      this.snackBar.open('PDF de gastos compartidos descargado y WhatsApp abierto. Adjunta el archivo manualmente.', 'Cerrar', {
        duration: 5000
      });
    } catch (error) {
      console.error('Error al enviar gastos compartidos por WhatsApp:', error);
      this.cargando = false;
      this.snackBar.open('Error al procesar el envío de gastos compartidos', 'Cerrar', {
        duration: 3000
      });
    }
  }

  private crearMensaje(): string {
    if (!this.datosReporte) return '';
    
    return `🏦 *Reporte de Gastos - ${this.datosReporte.nombreMes} ${this.datosReporte.año}*\n\n` +
           `💰 Total de gastos: $${this.datosReporte.totalGastos.toFixed(2)}\n` +
           `🤝 Gastos compartidos: $${this.datosReporte.totalGastosCompartidos.toFixed(2)}\n` +
           `💳 Tarjetas con gastos: ${this.datosReporte.tarjetas.length}\n\n` +
           `📎 Adjunto el reporte completo en PDF.`;
  }

  private crearMensajeGastosCompartidos(): string {
    if (!this.datosReporte) return '';
    
    return `🤝 *Gastos Compartidos - ${this.datosReporte.nombreMes} ${this.datosReporte.año}*\n\n` +
           `💰 Total gastos compartidos: $${this.datosReporte.totalGastosCompartidos.toFixed(2)}\n` +
           `📊 Cantidad de gastos: ${this.datosReporte.gastosCompartidos.length}\n\n` +
           `📎 Adjunto el detalle de gastos compartidos en PDF.`;
  }

  get tieneGastosCompartidos(): boolean {
    return this.datosReporte?.gastosCompartidos && this.datosReporte.gastosCompartidos.length > 0 || false;
  }
}
