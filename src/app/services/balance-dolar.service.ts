import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { BalanceDolar, TransaccionDolar, ResumenDolarCompleto } from '../models/venta-dolar.model';
import { CompraDolarService } from './compra-dolar.service';
import { VentaDolarService } from './venta-dolar.service';
import { DolarService } from './dolar.service';

@Injectable({
  providedIn: 'root'
})
export class BalanceDolarService {

  constructor(
    private compraDolarService: CompraDolarService,
    private ventaDolarService: VentaDolarService,
    private dolarService: DolarService
  ) {}

  /**
   * Obtiene el balance consolidado completo
   */
  obtenerBalanceCompleto(): Observable<BalanceDolar> {
    return this.ventaDolarService.obtenerBalance();
  }

  /**
   * Obtiene el resumen completo con análisis avanzado
   */
  obtenerResumenCompleto(): Observable<ResumenDolarCompleto> {
    return combineLatest([
      this.ventaDolarService.obtenerBalance(),
      this.ventaDolarService.obtenerTransaccionesUnificadas(),
      this.compraDolarService.obtenerCompras(),
      this.ventaDolarService.obtenerVentas()
    ]).pipe(
      map(([balance, transacciones, compras, ventas]) => {
        // Encontrar mejor y peor operación
        const ventasConGanancia = ventas.filter(v => v.ganancia !== undefined);
        const mejorOperacion = ventasConGanancia.length > 0 
          ? ventasConGanancia.reduce((mejor, actual) => 
              (actual.porcentajeGanancia || 0) > (mejor.porcentajeGanancia || 0) ? actual : mejor
            )
          : undefined;
        
        const peorOperacion = ventasConGanancia.length > 0
          ? ventasConGanancia.reduce((peor, actual) => 
              (actual.porcentajeGanancia || 0) < (peor.porcentajeGanancia || 0) ? actual : peor
            )
          : undefined;

        // Calcular rendimiento mensual
        const rendimientoMensual = this.calcularRendimientoMensual(compras, ventas);

        // Convertir mejor y peor operación a TransaccionDolar
        const mejorTransaccion: TransaccionDolar | undefined = mejorOperacion ? {
          id: mejorOperacion.id,
          tipo: 'venta',
          mes: mejorOperacion.mes,
          anio: mejorOperacion.anio,
          dolares: mejorOperacion.dolares,
          precio: mejorOperacion.precioVenta,
          total: mejorOperacion.precioVentaTotal,
          ganancia: mejorOperacion.ganancia,
          porcentajeGanancia: mejorOperacion.porcentajeGanancia,
          fechaCreacion: mejorOperacion.fechaCreacion
        } : undefined;

        const peorTransaccion: TransaccionDolar | undefined = peorOperacion ? {
          id: peorOperacion.id,
          tipo: 'venta',
          mes: peorOperacion.mes,
          anio: peorOperacion.anio,
          dolares: peorOperacion.dolares,
          precio: peorOperacion.precioVenta,
          total: peorOperacion.precioVentaTotal,
          ganancia: peorOperacion.ganancia,
          porcentajeGanancia: peorOperacion.porcentajeGanancia,
          fechaCreacion: peorOperacion.fechaCreacion
        } : undefined;

        return {
          balance,
          transacciones,
          mejorOperacion: mejorTransaccion,
          peorOperacion: peorTransaccion,
          rendimientoMensual
        };
      })
    );
  }

  /**
   * Calcula métricas de rendimiento
   */
  obtenerMetricasRendimiento(): Observable<{
    roi: number;
    roiAnualizado: number;
    volatilidad: number;
    sharpeRatio: number;
    drawdownMaximo: number;
    tiempoInversion: number; // en meses
  }> {
    return combineLatest([
      this.compraDolarService.obtenerCompras(),
      this.ventaDolarService.obtenerVentas()
    ]).pipe(
      map(([compras, ventas]) => {
        if (compras.length === 0) {
          return {
            roi: 0,
            roiAnualizado: 0,
            volatilidad: 0,
            sharpeRatio: 0,
            drawdownMaximo: 0,
            tiempoInversion: 0
          };
        }

        // Calcular ROI total
        const inversionTotal = compras.reduce((total, c) => total + c.precioCompraTotal, 0);
        const gananciasRealizadas = ventas.reduce((total, v) => total + (v.ganancia || 0), 0);
        const roi = inversionTotal > 0 ? (gananciasRealizadas / inversionTotal) * 100 : 0;

        // Calcular tiempo de inversión
        const primeraCompra = compras.reduce((min, c) => 
          (c.anio < min.anio || (c.anio === min.anio && c.mes < min.mes)) ? c : min
        );
        const ultimaTransaccion = [...compras, ...ventas].reduce((max, t) => 
          (t.anio > max.anio || (t.anio === max.anio && t.mes > max.mes)) ? t : max
        );
        
        const tiempoInversion = (ultimaTransaccion.anio - primeraCompra.anio) * 12 + 
                               (ultimaTransaccion.mes - primeraCompra.mes) + 1;

        // ROI anualizado
        const roiAnualizado = tiempoInversion > 0 ? 
          (Math.pow(1 + roi / 100, 12 / tiempoInversion) - 1) * 100 : 0;

        // Calcular volatilidad (desviación estándar de rendimientos mensuales)
        const rendimientosMensuales = this.calcularRendimientoMensual(compras, ventas)
          .map(r => r.rendimiento);
        const volatilidad = this.calcularDesviacionEstandar(rendimientosMensuales);

        // Sharpe Ratio (asumiendo tasa libre de riesgo del 5% anual)
        const tasaLibreRiesgo = 5;
        const excessReturn = roiAnualizado - tasaLibreRiesgo;
        const sharpeRatio = volatilidad > 0 ? excessReturn / volatilidad : 0;

        // Drawdown máximo
        const drawdownMaximo = this.calcularDrawdownMaximo(compras, ventas);

        return {
          roi,
          roiAnualizado,
          volatilidad,
          sharpeRatio,
          drawdownMaximo,
          tiempoInversion
        };
      })
    );
  }

  /**
   * Obtiene recomendaciones basadas en el análisis
   */
  obtenerRecomendaciones(): Observable<{
    accion: 'comprar' | 'vender' | 'mantener';
    razon: string;
    confianza: number; // 0-100
  }> {
    return combineLatest([
      this.obtenerMetricasRendimiento(),
      this.ventaDolarService.obtenerBalance(),
      this.dolarService.obtenerDolarOficial()
    ]).pipe(
      map(([metricas, balance, precioActual]) => {
        let accion: 'comprar' | 'vender' | 'mantener' = 'mantener';
        let razon = 'Mantener posición actual';
        let confianza = 50;

        // Lógica de recomendación basada en métricas
        if (metricas.roi > 15 && balance.dolaresDisponibles > 0) {
          accion = 'vender';
          razon = `Excelente rendimiento del ${metricas.roi.toFixed(1)}%. Considerar tomar ganancias.`;
          confianza = 75;
        } else if (metricas.roi < -10) {
          accion = 'mantener';
          razon = `Rendimiento negativo del ${metricas.roi.toFixed(1)}%. Esperar recuperación.`;
          confianza = 60;
        } else if (metricas.sharpeRatio > 1.5) {
          accion = 'comprar';
          razon = `Excelente ratio riesgo-retorno (${metricas.sharpeRatio.toFixed(2)}). Oportunidad de compra.`;
          confianza = 80;
        } else if (metricas.volatilidad > 30) {
          accion = 'mantener';
          razon = `Alta volatilidad (${metricas.volatilidad.toFixed(1)}%). Esperar estabilización.`;
          confianza = 65;
        }

        return { accion, razon, confianza };
      })
    );
  }

  /**
   * Calcula el rendimiento mensual
   */
  private calcularRendimientoMensual(compras: any[], ventas: any[]): { mes: number; anio: number; rendimiento: number }[] {
    const rendimientos: { mes: number; anio: number; rendimiento: number }[] = [];
    
    // Agrupar por mes/año
    const mesesUnicos = new Set<string>();
    [...compras, ...ventas].forEach(t => {
      mesesUnicos.add(`${t.anio}-${t.mes}`);
    });

    mesesUnicos.forEach(mesAnio => {
      const [anio, mes] = mesAnio.split('-').map(Number);
      
      const comprasDelMes = compras.filter(c => c.anio === anio && c.mes === mes);
      const ventasDelMes = ventas.filter(v => v.anio === anio && v.mes === mes);
      
      const inversionMes = comprasDelMes.reduce((total, c) => total + c.precioCompraTotal, 0);
      const gananciasMes = ventasDelMes.reduce((total, v) => total + (v.ganancia || 0), 0);
      
      const rendimiento = inversionMes > 0 ? (gananciasMes / inversionMes) * 100 : 0;
      
      rendimientos.push({ mes, anio, rendimiento });
    });

    return rendimientos.sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });
  }

  /**
   * Calcula la desviación estándar
   */
  private calcularDesviacionEstandar(valores: number[]): number {
    if (valores.length === 0) return 0;
    
    const media = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    const varianza = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / valores.length;
    
    return Math.sqrt(varianza);
  }

  /**
   * Calcula el drawdown máximo
   */
  private calcularDrawdownMaximo(compras: any[], ventas: any[]): number {
    let valorMaximo = 0;
    let drawdownMaximo = 0;
    let valorActual = 0;

    // Simular evolución del valor de la cartera
    const transacciones = [...compras, ...ventas].sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });

    transacciones.forEach(transaccion => {
      if ('precioCompra' in transaccion) {
        // Es una compra
        valorActual += transaccion.precioCompraTotal;
      } else {
        // Es una venta
        valorActual += transaccion.ganancia || 0;
      }

      if (valorActual > valorMaximo) {
        valorMaximo = valorActual;
      }

      const drawdownActual = valorMaximo > 0 ? ((valorMaximo - valorActual) / valorMaximo) * 100 : 0;
      if (drawdownActual > drawdownMaximo) {
        drawdownMaximo = drawdownActual;
      }
    });

    return drawdownMaximo;
  }

  /**
   * Exporta datos para análisis externo
   */
  exportarDatosAnalisis(): Observable<{
    balance: BalanceDolar;
    transacciones: TransaccionDolar[];
    metricas: any;
    recomendaciones: any;
  }> {
    return combineLatest([
      this.obtenerBalanceCompleto(),
      this.ventaDolarService.obtenerTransaccionesUnificadas(),
      this.obtenerMetricasRendimiento(),
      this.obtenerRecomendaciones()
    ]).pipe(
      map(([balance, transacciones, metricas, recomendaciones]) => ({
        balance,
        transacciones,
        metricas,
        recomendaciones
      }))
    );
  }
}