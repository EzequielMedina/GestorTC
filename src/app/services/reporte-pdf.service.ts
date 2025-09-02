import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TarjetaService } from './tarjeta.service';
import { GastoService } from './gasto.service';
import { Tarjeta } from '../models/tarjeta.model';
import { Gasto } from '../models/gasto.model';

export interface ReporteData {
  tarjetas: Tarjeta[];
  gastos: Gasto[];
  gastosCompartidos: Gasto[];
  totalGastos: number;
  totalGastosCompartidos: number;
  año: number;
  mes: number;
  nombreMes: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportePdfService {

  private readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService
  ) { }

  generarDatosReporte$(año: number, mes: number): Observable<ReporteData> {
    return combineLatest([
      this.tarjetaService.obtenerTarjetas(),
      this.gastoService.obtenerGastos()
    ]).pipe(
      map(([tarjetas, gastos]) => {
        // Filtrar gastos del mes y año especificados
        const gastosFiltrados = gastos.filter(gasto => {
          const fechaGasto = new Date(gasto.fecha);
          return fechaGasto.getFullYear() === año && fechaGasto.getMonth() === mes - 1;
        });

        // Separar gastos compartidos
        const gastosCompartidos = gastosFiltrados.filter(gasto => gasto.compartido);
        const gastosNoCompartidos = gastosFiltrados.filter(gasto => !gasto.compartido);

        // Calcular totales
        const totalGastos = gastosFiltrados.reduce((total, gasto) => total + gasto.monto, 0);
        const totalGastosCompartidos = gastosCompartidos.reduce((total, gasto) => total + gasto.monto, 0);

        // Filtrar tarjetas que tienen gastos en el período
        const tarjetasConGastos = tarjetas.filter(tarjeta => 
          gastosFiltrados.some(gasto => gasto.tarjetaId === tarjeta.id)
        );

        return {
          tarjetas: tarjetasConGastos,
          gastos: gastosFiltrados,
          gastosCompartidos,
          totalGastos,
          totalGastosCompartidos,
          año,
          mes,
          nombreMes: this.meses[mes - 1]
        };
      })
    );
  }

  async generarPDF(datos: ReporteData): Promise<Blob> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Título
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Reporte de Gastos - ${datos.nombreMes} ${datos.año}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Resumen
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumen:', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de gastos: $${datos.totalGastos.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Gastos compartidos: $${datos.totalGastosCompartidos.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Tarjetas con gastos: ${datos.tarjetas.length}`, 20, yPosition);
    yPosition += 15;

    // Gastos por tarjeta
    for (const tarjeta of datos.tarjetas) {
      const gastosTarjeta = datos.gastos.filter(g => g.tarjetaId === tarjeta.id);
      const totalTarjeta = gastosTarjeta.reduce((sum, g) => sum + g.monto, 0);
      const cuotaActual = this.calcularCuotaActual(tarjeta);

      // Verificar si necesitamos una nueva página
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${tarjeta.nombre} (Cuota ${cuotaActual}/${tarjeta.cuotas})`, 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total: $${totalTarjeta.toFixed(2)}`, 20, yPosition);
      yPosition += 10;

      // Gastos de la tarjeta
      for (const gasto of gastosTarjeta) {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        const fecha = new Date(gasto.fecha).toLocaleDateString();
        const compartidoText = gasto.compartido ? ' (Compartido)' : '';
        pdf.text(`  • ${fecha} - ${gasto.descripcion}: $${gasto.monto.toFixed(2)}${compartidoText}`, 25, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    return pdf.output('blob');
  }

  async generarPDFGastosCompartidos(datos: ReporteData): Promise<Blob> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Título
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Gastos Compartidos - ${datos.nombreMes} ${datos.año}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Resumen de gastos compartidos
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumen:', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total gastos compartidos: $${datos.totalGastosCompartidos.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Cantidad de gastos: ${datos.gastosCompartidos.length}`, 20, yPosition);
    yPosition += 15;

    // Agrupar gastos compartidos por tarjeta
    const gastosCompartidosPorTarjeta = new Map<string, { tarjeta: Tarjeta, gastos: Gasto[] }>();
    
    for (const gasto of datos.gastosCompartidos) {
      const tarjeta = datos.tarjetas.find(t => t.id === gasto.tarjetaId);
      if (tarjeta) {
        if (!gastosCompartidosPorTarjeta.has(tarjeta.id)) {
          gastosCompartidosPorTarjeta.set(tarjeta.id, { tarjeta, gastos: [] });
        }
        gastosCompartidosPorTarjeta.get(tarjeta.id)!.gastos.push(gasto);
      }
    }

    // Mostrar gastos compartidos por tarjeta
    for (const [tarjetaId, { tarjeta, gastos }] of gastosCompartidosPorTarjeta) {
      const totalTarjeta = gastos.reduce((sum, g) => sum + g.monto, 0);
      const cuotaActual = this.calcularCuotaActual(tarjeta);

      // Verificar si necesitamos una nueva página
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${tarjeta.nombre} (Cuota ${cuotaActual}/${tarjeta.cuotas})`, 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total compartido: $${totalTarjeta.toFixed(2)}`, 20, yPosition);
      yPosition += 10;

      // Gastos compartidos de la tarjeta
      for (const gasto of gastos) {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        const fecha = new Date(gasto.fecha).toLocaleDateString();
        pdf.text(`  • ${fecha} - ${gasto.descripcion}: $${gasto.monto.toFixed(2)}`, 25, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // Si no hay gastos compartidos
    if (datos.gastosCompartidos.length === 0) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'italic');
      pdf.text('No hay gastos compartidos en este período.', 20, yPosition);
    }

    return pdf.output('blob');
  }

  private calcularCuotaActual(tarjeta: Tarjeta): number {
    const fechaInicio = new Date(tarjeta.fechaInicio);
    const fechaActual = new Date();
    
    const mesesTranscurridos = (fechaActual.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                              (fechaActual.getMonth() - fechaInicio.getMonth());
    
    return Math.min(mesesTranscurridos + 1, tarjeta.cuotas);
  }
}
