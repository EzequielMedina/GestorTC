import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import jsPDF from 'jspdf';
import { Gasto } from '../models/gasto.model';
import { Tarjeta } from '../models/tarjeta.model';
import { GastoService } from './gasto';
import { TarjetaService } from './tarjeta';
import { ResumenService } from './resumen.service';

export interface ReporteData {
  mes: string;
  año: number;
  totalGastos: number;
  gastosPorTarjeta: Array<{
    nombreTarjeta: string;
    totalTarjeta: number;
    gastos: Array<{
      descripcion: string;
      monto: number;
      fecha: string;
      cuotaInfo?: string;
    }>;
  }>;
  gastosCompartidos: Array<{
    descripcion: string;
    monto: number;
    compartidoCon: string;
    porcentajeCompartido: number;
  }>;
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
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private resumenService: ResumenService
  ) {}

  /**
   * Genera los datos del reporte para un mes específico
   */
  generarDatosReporte$(año: number, mes: number): Observable<ReporteData> {
    const monthKey = `${año}-${String(mes).padStart(2, '0')}`;
    
    return combineLatest([
      this.gastoService.getGastos$(),
      this.tarjetaService.getTarjetas$(),
      this.resumenService.getDetalleGastosAgrupadosPorTarjeta$(monthKey)
    ]).pipe(
      map(([gastos, tarjetas, detalleGastos]) => {
        const gastosDelMes = this.filtrarGastosDelMes(gastos, año, mes);
        const gastosCompartidos = gastosDelMes.filter(g => g.compartidoCon);
        
        const gastosPorTarjeta = detalleGastos.map(detalle => ({
          nombreTarjeta: detalle.nombreTarjeta,
          totalTarjeta: detalle.totalTarjeta,
          gastos: detalle.gastos.map(g => ({
            descripcion: g.descripcion,
            monto: g.montoCuota,
            fecha: this.obtenerFechaOriginal(gastos, g.descripcion),
            cuotaInfo: g.cantidadCuotas > 1 ? `Cuota ${g.cuotaActual}/${g.cantidadCuotas}` : undefined
          }))
        }));

        const totalGastos = gastosPorTarjeta.reduce((sum, tarjeta) => sum + tarjeta.totalTarjeta, 0);

        return {
          mes: this.meses[mes - 1],
          año,
          totalGastos,
          gastosPorTarjeta,
          gastosCompartidos: gastosCompartidos.map(g => ({
            descripcion: g.descripcion,
            monto: g.monto,
            compartidoCon: g.compartidoCon!,
            porcentajeCompartido: g.porcentajeCompartido || 0
          }))
        };
      })
    );
  }

  /**
   * Genera un PDF con el reporte de gastos del mes
   */
  async generarPDF(datosReporte: ReporteData): Promise<Blob> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Configurar fuentes
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    
    // Título
    const titulo = `Reporte de Gastos - ${datosReporte.mes} ${datosReporte.año}`;
    const tituloWidth = pdf.getTextWidth(titulo);
    pdf.text(titulo, (pageWidth - tituloWidth) / 2, yPosition);
    yPosition += 15;

    // Línea separadora
    pdf.setLineWidth(0.5);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Resumen general
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Resumen General', 20, yPosition);
    yPosition += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text(`Total de gastos del mes: $${datosReporte.totalGastos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 20, yPosition);
    yPosition += 15;

    // Gastos por tarjeta
    for (const tarjeta of datosReporte.gastosPorTarjeta) {
      // Verificar si necesitamos una nueva página
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(`${tarjeta.nombreTarjeta}`, 20, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Total: $${tarjeta.totalTarjeta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 20, yPosition);
      yPosition += 10;

      // Gastos individuales
      for (const gasto of tarjeta.gastos) {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        const descripcion = gasto.descripcion.length > 50 
          ? gasto.descripcion.substring(0, 47) + '...'
          : gasto.descripcion;
        
        const montoText = `$${gasto.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        const cuotaText = gasto.cuotaInfo ? ` (${gasto.cuotaInfo})` : '';
        
        pdf.text(`• ${descripcion}${cuotaText}`, 25, yPosition);
        pdf.text(montoText, pageWidth - 20 - pdf.getTextWidth(montoText), yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // Gastos compartidos
    if (datosReporte.gastosCompartidos.length > 0) {
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Gastos Compartidos', 20, yPosition);
      yPosition += 15;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      for (const gasto of datosReporte.gastosCompartidos) {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        const montoCompartido = (gasto.monto * gasto.porcentajeCompartido) / 100;
        pdf.text(`• ${gasto.descripcion}`, 25, yPosition);
        yPosition += 6;
        pdf.text(`  Compartido con: ${gasto.compartidoCon} (${gasto.porcentajeCompartido}%)`, 30, yPosition);
        yPosition += 6;
        pdf.text(`  Monto compartido: $${montoCompartido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 30, yPosition);
        yPosition += 10;
      }
    }

    // Pie de página
    const fechaGeneracion = new Date().toLocaleDateString('es-AR');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text(`Generado el ${fechaGeneracion} - Gestor TC`, 20, pageHeight - 10);

    return pdf.output('blob');
  }

  /**
   * Filtra los gastos que impactan en un mes específico (considerando cuotas)
   */
  private filtrarGastosDelMes(gastos: Gasto[], año: number, mes: number): Gasto[] {
    const monthKey = `${año}-${String(mes).padStart(2, '0')}`;
    
    return gastos.filter(gasto => {
      const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
      
      if (cuotas <= 1) {
        // Gasto de una sola vez
        return this.monthKeyFromISO(gasto.fecha) === monthKey;
      }
      
      // Gasto con cuotas - verificar si el mes está dentro del rango de cuotas
      const firstISO = this.firstMonthISOFromGasto(gasto);
      for (let i = 0; i < cuotas; i++) {
        const cuotaISO = this.addMonths(firstISO, i);
        if (cuotaISO.slice(0, 7) === monthKey) {
          return true;
        }
      }
      return false;
    });
  }

  private monthKeyFromISO(isoDate: string): string {
    return isoDate.slice(0, 7);
  }

  private firstMonthISOFromGasto(g: Gasto): string {
    const base = g.primerMesCuota || (this.monthKeyFromISO(g.fecha) + '-01');
    const [y, m] = base.slice(0, 7).split('-');
    return `${y}-${m}-01`;
  }

  private addMonths(isoYYYYMMDD: string, months: number): string {
    const [y, m, d] = isoYYYYMMDD.split('-').map(Number);
    const date = new Date(y, m - 1, d || 1);
    date.setMonth(date.getMonth() + months);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  }

  private obtenerFechaOriginal(gastos: Gasto[], descripcion: string): string {
    const gasto = gastos.find(g => g.descripcion === descripcion);
    return gasto ? gasto.fecha : '';
  }
}