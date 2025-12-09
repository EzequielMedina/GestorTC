import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalisisTendencias, ComparacionMes, ComparacionAnual, MetricasTendencia, PatronGasto, TipoTendencia } from '../models/tendencia.model';
import { Gasto } from '../models/gasto.model';
import { GastoService } from './gasto';
import { CategoriaService } from './categoria.service';
import { TarjetaService } from './tarjeta';
import { ResumenService } from './resumen.service';

@Injectable({
  providedIn: 'root'
})
export class TendenciaService {
  constructor(
    private gastoService: GastoService,
    private categoriaService: CategoriaService,
    private tarjetaService: TarjetaService,
    private resumenService: ResumenService
  ) {}

  /**
   * Obtiene análisis completo de tendencias
   */
  obtenerAnalisisTendencias$(): Observable<AnalisisTendencias> {
    return combineLatest([
      this.gastoService.getGastos$(),
      this.categoriaService.getCategorias$(),
      this.tarjetaService.getTarjetas$()
    ]).pipe(
      map(([gastos, categorias, tarjetas]) => {
        const comparacionesMensuales = this.calcularComparacionesMensuales(gastos);
        const comparacionesAnuales = this.calcularComparacionesAnuales(gastos);
        const metricas = this.calcularMetricas(gastos);
        const tendenciaPorCategoria = this.calcularTendenciasPorCategoria(gastos, categorias);
        const tendenciaPorTarjeta = this.calcularTendenciasPorTarjeta(gastos, tarjetas);

        return {
          comparacionesMensuales,
          comparacionesAnuales,
          metricas,
          tendenciaPorCategoria,
          tendenciaPorTarjeta
        };
      })
    );
  }

  /**
   * Calcula comparaciones mes a mes (últimos 12 meses)
   */
  private calcularComparacionesMensuales(gastos: Gasto[]): ComparacionMes[] {
    const hoy = new Date();
    const comparaciones: ComparacionMes[] = [];
    
    // Agrupar gastos por mes
    const gastosPorMes: { [mes: string]: number } = {};
    
    gastos.forEach(gasto => {
      const mes = this.obtenerMesKey(gasto.fecha);
      if (!gastosPorMes[mes]) {
        gastosPorMes[mes] = 0;
      }
      
      // Si tiene cuotas, distribuir el monto
      if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
        const montoPorCuota = gasto.montoPorCuota || (gasto.monto / gasto.cantidadCuotas);
        const primerMes = gasto.primerMesCuota || mes;
        
        for (let i = 0; i < gasto.cantidadCuotas; i++) {
          const mesCuota = this.agregarMeses(primerMes, i);
          if (!gastosPorMes[mesCuota]) {
            gastosPorMes[mesCuota] = 0;
          }
          gastosPorMes[mesCuota] += montoPorCuota;
        }
      } else {
        gastosPorMes[mes] += gasto.monto;
      }
    });

    // Generar comparaciones para últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = this.formatearMes(fecha);
      const mesAnterior = i > 0 ? this.formatearMes(new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1)) : null;
      
      const monto = gastosPorMes[mes] || 0;
      const montoAnterior = mesAnterior ? (gastosPorMes[mesAnterior] || 0) : 0;
      
      const variacionAbsoluta = monto - montoAnterior;
      const variacionPorcentual = montoAnterior > 0 
        ? ((variacionAbsoluta / montoAnterior) * 100) 
        : (monto > 0 ? 100 : 0);

      comparaciones.push({
        mes,
        monto,
        variacionPorcentual,
        variacionAbsoluta
      });
    }

    return comparaciones;
  }

  /**
   * Calcula comparaciones año a año
   */
  private calcularComparacionesAnuales(gastos: Gasto[]): ComparacionAnual[] {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const comparaciones: ComparacionAnual[] = [];
    
    // Agrupar gastos por año
    const gastosPorAnio: { [anio: number]: number } = {};
    
    gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const anio = fecha.getFullYear();
      if (!gastosPorAnio[anio]) {
        gastosPorAnio[anio] = 0;
      }
      gastosPorAnio[anio] += gasto.monto;
    });

    // Generar comparaciones para últimos 3 años
    for (let i = 2; i >= 0; i--) {
      const anio = anioActual - i;
      const anioAnterior = i > 0 ? anioActual - i + 1 : null;
      
      const monto = gastosPorAnio[anio] || 0;
      const montoAnterior = anioAnterior ? (gastosPorAnio[anioAnterior] || 0) : 0;
      
      const variacionAbsoluta = monto - montoAnterior;
      const variacionPorcentual = montoAnterior > 0 
        ? ((variacionAbsoluta / montoAnterior) * 100) 
        : (monto > 0 ? 100 : 0);

      comparaciones.push({
        año: anio,
        monto,
        variacionPorcentual,
        variacionAbsoluta
      });
    }

    return comparaciones;
  }

  /**
   * Calcula métricas generales de tendencia
   */
  private calcularMetricas(gastos: Gasto[]): MetricasTendencia {
    const comparaciones = this.calcularComparacionesMensuales(gastos);
    const ultimos12Meses = comparaciones.slice(-12);
    
    const montos = ultimos12Meses.map(c => c.monto);
    const promedioMensual = montos.reduce((sum, m) => sum + m, 0) / montos.length;
    
    // Promedio móvil de 3 meses
    const ultimos3Meses = montos.slice(-3);
    const promedioMovil = ultimos3Meses.reduce((sum, m) => sum + m, 0) / ultimos3Meses.length;
    
    // Tendencia general
    const ultimoMes = montos[montos.length - 1];
    const penultimoMes = montos[montos.length - 2];
    const diferencia = ultimoMes - penultimoMes;
    const porcentajeCambio = penultimoMes > 0 ? (diferencia / penultimoMes) * 100 : 0;
    
    let tendenciaGeneral: TipoTendencia = 'ESTABLE';
    if (Math.abs(porcentajeCambio) < 5) {
      tendenciaGeneral = 'ESTABLE';
    } else if (porcentajeCambio > 0) {
      tendenciaGeneral = 'CRECIENTE';
    } else {
      tendenciaGeneral = 'DECRECIENTE';
    }
    
    // Variación último mes
    const variacionUltimoMes = comparaciones.length > 0 
      ? comparaciones[comparaciones.length - 1].variacionPorcentual 
      : 0;
    
    // Variación último año
    const comparacionesAnuales = this.calcularComparacionesAnuales(gastos);
    const variacionUltimoAnio = comparacionesAnuales.length > 0
      ? comparacionesAnuales[comparacionesAnuales.length - 1].variacionPorcentual
      : 0;
    
    // Pico máximo y valle mínimo
    let picoMaximo = { mes: '', monto: 0 };
    let valleMinimo = { mes: '', monto: Infinity };
    
    comparaciones.forEach(c => {
      if (c.monto > picoMaximo.monto) {
        picoMaximo = { mes: c.mes, monto: c.monto };
      }
      if (c.monto < valleMinimo.monto && c.monto > 0) {
        valleMinimo = { mes: c.mes, monto: c.monto };
      }
    });
    
    // Detectar patrones
    const patrones = this.detectarPatrones(gastos);
    
    return {
      promedioMensual,
      promedioMovil,
      tendenciaGeneral,
      variacionUltimoMes,
      variacionUltimoAnio,
      picoMaximo,
      valleMinimo: valleMinimo.monto === Infinity ? { mes: '', monto: 0 } : valleMinimo,
      patrones
    };
  }

  /**
   * Detecta patrones de gasto
   */
  private detectarPatrones(gastos: Gasto[]): PatronGasto[] {
    const patrones: PatronGasto[] = [];
    
    // Patrón: fin de mes
    const gastosFinMes = gastos.filter(g => {
      const fecha = new Date(g.fecha);
      return fecha.getDate() >= 25;
    });
    const frecuenciaFinMes = gastosFinMes.length / gastos.length;
    if (frecuenciaFinMes > 0.3) {
      patrones.push({
        tipo: 'FIN_MES',
        descripcion: 'Mayor gasto al final del mes',
        frecuencia: frecuenciaFinMes
      });
    }
    
    // Patrón: días de la semana (simplificado)
    const gastosFinSemana = gastos.filter(g => {
      const fecha = new Date(g.fecha);
      const diaSemana = fecha.getDay();
      return diaSemana === 0 || diaSemana === 6; // Sábado o domingo
    });
    const frecuenciaFinSemana = gastosFinSemana.length / gastos.length;
    if (frecuenciaFinSemana > 0.25) {
      patrones.push({
        tipo: 'DIA_SEMANA',
        descripcion: 'Mayor gasto en fines de semana',
        frecuencia: frecuenciaFinSemana
      });
    }
    
    return patrones;
  }

  /**
   * Calcula tendencias por categoría
   */
  private calcularTendenciasPorCategoria(gastos: Gasto[], categorias: any[]): { [categoriaId: string]: MetricasTendencia } {
    const tendencias: { [categoriaId: string]: MetricasTendencia } = {};
    
    categorias.forEach(categoria => {
      const gastosCategoria = gastos.filter(g => g.categoriaId === categoria.id);
      if (gastosCategoria.length > 0) {
        tendencias[categoria.id] = this.calcularMetricas(gastosCategoria);
      }
    });
    
    return tendencias;
  }

  /**
   * Calcula tendencias por tarjeta
   */
  private calcularTendenciasPorTarjeta(gastos: Gasto[], tarjetas: any[]): { [tarjetaId: string]: MetricasTendencia } {
    const tendencias: { [tarjetaId: string]: MetricasTendencia } = {};
    
    tarjetas.forEach(tarjeta => {
      const gastosTarjeta = gastos.filter(g => g.tarjetaId === tarjeta.id);
      if (gastosTarjeta.length > 0) {
        tendencias[tarjeta.id] = this.calcularMetricas(gastosTarjeta);
      }
    });
    
    return tendencias;
  }

  // Utilidades
  private obtenerMesKey(fecha: string): string {
    const d = new Date(fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatearMes(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  }

  private agregarMeses(mesKey: string, meses: number): string {
    const [anio, mes] = mesKey.split('-').map(Number);
    const fecha = new Date(anio, mes - 1 + meses, 1);
    return this.formatearMes(fecha);
  }
}

