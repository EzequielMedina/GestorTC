import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  SimulacionCompra,
  AnalisisRiesgo,
  ImpactoLimite,
  MetricasComportamiento,
  ProyeccionesFinancieras,
  ComparativasHistoricas,
  Recomendacion,
  DatosGraficosSimulacion,
  ConfiguracionSimulacion,
  ResultadoSimulacion,
  ProyeccionMensual
} from '../models/simulacion-compra.model';
import { Tarjeta } from '../models/tarjeta.model';
import { Gasto } from '../models/gasto.model';
import { TarjetaService } from './tarjeta';
import { GastoService } from './gasto';
import { ResumenService } from './resumen.service';

@Injectable({
  providedIn: 'root'
})
export class SimulacionCompraService {
  private readonly TASA_INTERES_DEFAULT = 0.035; // 3.5% mensual
  private readonly TASA_INFLACION_DEFAULT = 0.006; // 0.6% mensual
  private readonly COMISION_MANTENIMIENTO_DEFAULT = 500; // pesos

  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private resumenService: ResumenService
  ) {}

  /**
   * Simula una compra y genera análisis completo
   */
  simularCompra(
    tarjetaId: string,
    descripcion: string,
    monto: number,
    cantidadCuotas: number = 1,
    configuracion?: Partial<ConfiguracionSimulacion>
  ): Observable<ResultadoSimulacion> {
    const startTime = Date.now();
    const config = this.getConfiguracionCompleta(configuracion);

    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$(),
      this.resumenService.getResumenPorTarjeta$()
    ]).pipe(
      map(([tarjetas, gastos, resumenTarjetas]) => {
        const tarjeta = tarjetas.find(t => t.id === tarjetaId);
        if (!tarjeta) {
          throw new Error('Tarjeta no encontrada');
        }

        const gastosHistoricos = gastos.filter(g => g.tarjetaId === tarjetaId);
        const resumenTarjeta = resumenTarjetas.find(r => r.id === tarjetaId);

        const simulacion: SimulacionCompra = {
          id: uuidv4(),
          tarjetaId,
          descripcion,
          monto,
          fecha: new Date().toISOString().split('T')[0],
          cantidadCuotas,
          analisisRiesgo: this.calcularAnalisisRiesgo(tarjeta, monto, cantidadCuotas, gastosHistoricos, resumenTarjeta),
          impactoLimite: this.calcularImpactoLimite(tarjeta, monto, resumenTarjeta),
          metricasComportamiento: this.calcularMetricasComportamiento(gastosHistoricos),
          proyeccionesFinancieras: this.calcularProyeccionesFinancieras(tarjeta, monto, cantidadCuotas, config, resumenTarjeta),
          comparativasHistoricas: this.calcularComparativasHistoricas(monto, gastosHistoricos),
          recomendaciones: this.generarRecomendaciones(tarjeta, monto, cantidadCuotas, gastosHistoricos, resumenTarjeta)
        };

        const datosGraficos = this.generarDatosGraficos(simulacion, gastosHistoricos, tarjeta);
        const duracionCalculoMs = Date.now() - startTime;

        return {
          simulacion,
          datosGraficos,
          configuracion: config,
          timestamp: new Date().toISOString(),
          duracionCalculoMs
        };
      })
    );
  }

  /**
   * Calcula el análisis de riesgo de la compra
   */
  private calcularAnalisisRiesgo(
    tarjeta: Tarjeta,
    monto: number,
    cantidadCuotas: number,
    gastosHistoricos: Gasto[],
    resumenTarjeta: any
  ): AnalisisRiesgo {
    let puntuacionRiesgo = 0;
    const factoresRiesgo: string[] = [];

    // Factor 1: Porcentaje del límite que representa la compra
    const porcentajeLimite = (monto / tarjeta.limite) * 100;
    if (porcentajeLimite > 50) {
      puntuacionRiesgo += 30;
      factoresRiesgo.push('Compra representa más del 50% del límite');
    } else if (porcentajeLimite > 30) {
      puntuacionRiesgo += 20;
      factoresRiesgo.push('Compra representa más del 30% del límite');
    } else if (porcentajeLimite > 15) {
      puntuacionRiesgo += 10;
    }

    // Factor 2: Uso actual de la tarjeta
    const usoActual = resumenTarjeta?.porcentajeUso || 0;
    if (usoActual > 80) {
      puntuacionRiesgo += 25;
      factoresRiesgo.push('Uso actual de la tarjeta superior al 80%');
    } else if (usoActual > 60) {
      puntuacionRiesgo += 15;
      factoresRiesgo.push('Uso actual de la tarjeta superior al 60%');
    }

    // Factor 3: Frecuencia de compras recientes
    const gastosUltimos30Dias = this.getGastosUltimosDias(gastosHistoricos, 30);
    if (gastosUltimos30Dias.length > 10) {
      puntuacionRiesgo += 15;
      factoresRiesgo.push('Alta frecuencia de compras en los últimos 30 días');
    }

    // Factor 4: Cantidad de cuotas
    if (cantidadCuotas > 12) {
      puntuacionRiesgo += 20;
      factoresRiesgo.push('Financiación a largo plazo (más de 12 cuotas)');
    } else if (cantidadCuotas > 6) {
      puntuacionRiesgo += 10;
      factoresRiesgo.push('Financiación a mediano plazo');
    }

    // Factor 5: Comparación con promedio histórico
    const promedioHistorico = this.calcularPromedioGastos(gastosHistoricos, 90);
    if (monto > promedioHistorico * 3) {
      puntuacionRiesgo += 20;
      factoresRiesgo.push('Compra 3x superior al promedio histórico');
    } else if (monto > promedioHistorico * 2) {
      puntuacionRiesgo += 10;
      factoresRiesgo.push('Compra 2x superior al promedio histórico');
    }

    // Determinar nivel de riesgo
    let nivelRiesgo: 'bajo' | 'medio' | 'alto' | 'critico';
    if (puntuacionRiesgo >= 70) {
      nivelRiesgo = 'critico';
    } else if (puntuacionRiesgo >= 50) {
      nivelRiesgo = 'alto';
    } else if (puntuacionRiesgo >= 30) {
      nivelRiesgo = 'medio';
    } else {
      nivelRiesgo = 'bajo';
    }

    // Calcular probabilidad de sobreendeudamiento
    const probabilidadSobreendeudamiento = Math.min(100, puntuacionRiesgo + (usoActual * 0.5));

    // Calcular tiempo de recuperación
    const promedioMensual = this.calcularPromedioGastos(gastosHistoricos, 90) || monto * 0.1;
    const tiempoRecuperacion = Math.ceil((monto / cantidadCuotas) / (promedioMensual * 0.3)) * 30;

    return {
      nivelRiesgo,
      puntuacionRiesgo: Math.min(100, puntuacionRiesgo),
      factoresRiesgo,
      probabilidadSobreendeudamiento,
      tiempoRecuperacion
    };
  }

  /**
   * Calcula el impacto en el límite de crédito
   */
  private calcularImpactoLimite(
    tarjeta: Tarjeta,
    monto: number,
    resumenTarjeta: any
  ): ImpactoLimite {
    const limiteActual = tarjeta.limite;
    // Si no hay resumen, simular un gasto actual del 25% del límite para demostración
    const gastoActual = resumenTarjeta?.totalGastos ?? (limiteActual * 0.25);
    const limiteDisponible = limiteActual - gastoActual;
    const limitePostCompra = limiteDisponible - monto;
    
    const porcentajeUsoActual = (gastoActual / limiteActual) * 100;
    const porcentajeUsoPostCompra = ((gastoActual + monto) / limiteActual) * 100;
    const incrementoUso = porcentajeUsoPostCompra - porcentajeUsoActual;
    
    const alertaLimite = porcentajeUsoPostCompra > 80;
    
    // Calcular días hasta límite si continúa el patrón actual
    const promedioMensual = gastoActual / 30; // aproximación diaria
    const diasHastaLimite = promedioMensual > 0 ? Math.ceil(limitePostCompra / promedioMensual) : undefined;

    return {
      limiteActual,
      limiteDisponible,
      limitePostCompra: Math.max(0, limitePostCompra),
      porcentajeUsoActual,
      porcentajeUsoPostCompra: Math.min(100, porcentajeUsoPostCompra),
      incrementoUso,
      alertaLimite,
      diasHastaLimite
    };
  }

  /**
   * Calcula métricas de comportamiento de gasto
   */
  private calcularMetricasComportamiento(gastosHistoricos: Gasto[]): MetricasComportamiento {
    const gastosUltimos90Dias = this.getGastosUltimosDias(gastosHistoricos, 90);
    const gastosUltimos180Dias = this.getGastosUltimosDias(gastosHistoricos, 180);
    
    const promedioMensual = this.calcularPromedioGastos(gastosUltimos90Dias, 90);
    const desviacionEstandar = this.calcularDesviacionEstandar(gastosUltimos90Dias.map(g => g.monto));
    
    // Calcular tendencia
    const promedio30Dias = this.calcularPromedioGastos(this.getGastosUltimosDias(gastosHistoricos, 30), 30);
    const promedio60Dias = this.calcularPromedioGastos(this.getGastosUltimosDias(gastosHistoricos, 60), 60);
    
    let tendenciaGasto: 'creciente' | 'decreciente' | 'estable';
    const diferenciaTendencia = promedio30Dias - promedio60Dias;
    if (Math.abs(diferenciaTendencia) < promedioMensual * 0.1) {
      tendenciaGasto = 'estable';
    } else if (diferenciaTendencia > 0) {
      tendenciaGasto = 'creciente';
    } else {
      tendenciaGasto = 'decreciente';
    }
    
    const frecuenciaCompras = gastosUltimos90Dias.length / 3; // por mes
    
    // Categoría más frecuente (simplificado)
    const categorias = gastosHistoricos.map(g => g.descripcion.split(' ')[0]);
    const categoriaFrecuente = this.getMostFrequent(categorias) || 'General';
    
    // Patrón de estacionalidad (simplificado)
    const patronEstacionalidad = this.detectarEstacionalidad(gastosHistoricos);
    
    // Índice de impulsividad basado en variabilidad
    const indiceImpulsividad = Math.min(100, (desviacionEstandar / promedioMensual) * 50);

    return {
      promedioMensual,
      desviacionEstandar,
      tendenciaGasto,
      frecuenciaCompras,
      categoriaGastoMasFrecuente: categoriaFrecuente,
      patronEstacionalidad,
      indiceImpulsividad
    };
  }

  /**
   * Calcula proyecciones financieras
   */
  private calcularProyeccionesFinancieras(
    tarjeta: Tarjeta,
    monto: number,
    cantidadCuotas: number,
    config: ConfiguracionSimulacion,
    resumenTarjeta: any
  ): ProyeccionesFinancieras {
    const tasaInteresMensual = config.tasaInteresAnual / 12;
    const montoCuota = monto / cantidadCuotas;
    const saldoActual = resumenTarjeta?.totalGastos || 0;
    
    const proyeccion3Meses = this.generarProyeccionMeses(3, tarjeta, saldoActual + monto, montoCuota, tasaInteresMensual);
    const proyeccion6Meses = this.generarProyeccionMeses(6, tarjeta, saldoActual + monto, montoCuota, tasaInteresMensual);
    const proyeccion12Meses = this.generarProyeccionMeses(12, tarjeta, saldoActual + monto, montoCuota, tasaInteresMensual);
    
    const costoFinancieroEstimado = config.incluirIntereses ? 
      (monto * tasaInteresMensual * cantidadCuotas) : 0;
    
    const montoMinimoMensual = Math.max(montoCuota, tarjeta.limite * 0.05); // 5% del límite mínimo
    const tiempoAmortizacionCompleta = Math.ceil(monto / montoMinimoMensual);

    return {
      proyeccion3Meses,
      proyeccion6Meses,
      proyeccion12Meses,
      costoFinancieroEstimado,
      tasaInteresAplicable: config.tasaInteresAnual,
      montoMinimoMensual,
      tiempoAmortizacionCompleta
    };
  }

  /**
   * Genera proyección para N meses
   */
  private generarProyeccionMeses(
    meses: number,
    tarjeta: Tarjeta,
    saldoInicial: number,
    montoCuota: number,
    tasaInteres: number
  ): ProyeccionMensual[] {
    const proyeccion: ProyeccionMensual[] = [];
    let saldoActual = saldoInicial;
    const fechaActual = new Date();

    for (let i = 1; i <= meses; i++) {
      const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + i, 1);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      const interesesMes = saldoActual * tasaInteres;
      const pagoMinimo = Math.max(montoCuota, tarjeta.limite * 0.05);
      
      saldoActual = Math.max(0, saldoActual + interesesMes - pagoMinimo);
      const limiteDisponible = tarjeta.limite - saldoActual;
      const porcentajeUso = (saldoActual / tarjeta.limite) * 100;

      proyeccion.push({
        mes: mesKey,
        saldoEstimado: saldoActual,
        pagoMinimo,
        interesesAcumulados: interesesMes,
        limiteDisponible: Math.max(0, limiteDisponible),
        porcentajeUso: Math.min(100, porcentajeUso)
      });
    }

    return proyeccion;
  }

  /**
   * Calcula comparativas históricas
   */
  private calcularComparativasHistoricas(
    monto: number,
    gastosHistoricos: Gasto[]
  ): ComparativasHistoricas {
    const gastosOrdenados = [...gastosHistoricos].sort((a, b) => b.monto - a.monto);
    const posicionEnRanking = gastosOrdenados.findIndex(g => g.monto <= monto) + 1;
    
    const promedioUltimos3Meses = this.calcularPromedioGastos(this.getGastosUltimosDias(gastosHistoricos, 90), 90);
    const promedioUltimos6Meses = this.calcularPromedioGastos(this.getGastosUltimosDias(gastosHistoricos, 180), 180);
    const promedioUltimos12Meses = this.calcularPromedioGastos(this.getGastosUltimosDias(gastosHistoricos, 365), 365);
    
    const mayorCompraHistorica = gastosOrdenados.length > 0 ? gastosOrdenados[0].monto : 0;
    
    // Similitud con patrón histórico basado en rango de montos frecuentes
    const montosComunes = gastosHistoricos.map(g => g.monto).sort((a, b) => a - b);
    const q1 = montosComunes[Math.floor(montosComunes.length * 0.25)] || 0;
    const q3 = montosComunes[Math.floor(montosComunes.length * 0.75)] || 0;
    const similitudConPatronHistorico = (monto >= q1 && monto <= q3) ? 80 : 
      (monto < q1) ? 60 : 40;
    
    const impactoEnPromedioMensual = promedioUltimos3Meses > 0 ? 
      ((monto - promedioUltimos3Meses) / promedioUltimos3Meses) * 100 : 0;

    return {
      promedioUltimos3Meses,
      promedioUltimos6Meses,
      promedioUltimos12Meses,
      mayorCompraHistorica,
      posicionEnRanking: Math.min(100, posicionEnRanking),
      similitudConPatronHistorico,
      impactoEnPromedioMensual
    };
  }

  /**
   * Genera recomendaciones inteligentes
   */
  private generarRecomendaciones(
    tarjeta: Tarjeta,
    monto: number,
    cantidadCuotas: number,
    gastosHistoricos: Gasto[],
    resumenTarjeta: any
  ): Recomendacion[] {
    const recomendaciones: Recomendacion[] = [];
    const usoActual = resumenTarjeta?.porcentajeUso || 0;
    const porcentajeCompra = (monto / tarjeta.limite) * 100;

    // Recomendación financiera
    if (usoActual + porcentajeCompra > 80) {
      recomendaciones.push({
        tipo: 'precaucion',
        prioridad: 'alta',
        titulo: 'Alto uso de límite crediticio',
        descripcion: 'Esta compra llevará tu uso de crédito por encima del 80%. Considera pagar saldo pendiente antes de realizar la compra.',
        accionSugerida: 'Pagar al menos $' + Math.ceil((usoActual + porcentajeCompra - 70) * tarjeta.limite / 100),
        iconoSugerido: 'warning'
      });
    }

    // Recomendación temporal
    if (cantidadCuotas > 6) {
      const interesEstimado = monto * 0.035 * cantidadCuotas;
      recomendaciones.push({
        tipo: 'financiera',
        prioridad: 'media',
        titulo: 'Considera reducir las cuotas',
        descripcion: `Financiar en ${cantidadCuotas} cuotas generará aproximadamente $${interesEstimado.toFixed(2)} en intereses.`,
        accionSugerida: 'Reducir a 6 cuotas o menos',
        beneficioEstimado: interesEstimado * 0.6,
        iconoSugerido: 'savings'
      });
    }

    // Recomendación alternativa
    const promedioMensual = this.calcularPromedioGastos(gastosHistoricos, 90);
    if (monto > promedioMensual * 2) {
      recomendaciones.push({
        tipo: 'alternativa',
        prioridad: 'media',
        titulo: 'Compra superior al patrón habitual',
        descripcion: 'Esta compra es significativamente mayor a tu promedio mensual. ¿Has considerado alternativas?',
        accionSugerida: 'Evaluar opciones de financiamiento externo',
        iconoSugerido: 'lightbulb'
      });
    }

    // Recomendación temporal óptima
    const diasHastaCierre = this.calcularDiasHastaCierre(tarjeta.diaCierre);
    if (diasHastaCierre < 5) {
      recomendaciones.push({
        tipo: 'temporal',
        prioridad: 'baja',
        titulo: 'Momento óptimo de compra',
        descripcion: `Faltan ${diasHastaCierre} días para el cierre. Considera esperar al próximo período para mayor tiempo de financiamiento.`,
        accionSugerida: 'Esperar al próximo período',
        beneficioEstimado: 30,
        iconoSugerido: 'schedule'
      });
    }

    return recomendaciones;
  }

  /**
   * Genera datos para gráficos
   */
  private generarDatosGraficos(
    simulacion: SimulacionCompra,
    gastosHistoricos: Gasto[],
    tarjeta: Tarjeta
  ): DatosGraficosSimulacion {
    return {
      impactoLimite: this.generarGraficoImpactoLimite(simulacion.impactoLimite),
      proyeccionTemporal: this.generarGraficoProyeccionTemporal(simulacion.proyeccionesFinancieras),
      comparativoHistorico: this.generarGraficoComparativoHistorico(simulacion.monto, gastosHistoricos),
      distribucionRiesgo: this.generarGraficoDistribucionRiesgo(simulacion.analisisRiesgo)
    };
  }

  // Métodos auxiliares
  private getConfiguracionCompleta(config?: Partial<ConfiguracionSimulacion>): ConfiguracionSimulacion {
    return {
      incluirIntereses: true,
      tasaInteresAnual: this.TASA_INTERES_DEFAULT * 12,
      considerarInflacion: false,
      tasaInflacionAnual: this.TASA_INFLACION_DEFAULT * 12,
      incluirComisiones: false,
      comisionMantenimiento: this.COMISION_MANTENIMIENTO_DEFAULT,
      alertasPersonalizadas: true,
      ...config
    };
  }

  private getGastosUltimosDias(gastos: Gasto[], dias: number): Gasto[] {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    return gastos.filter(gasto => {
      const fechaGasto = new Date(gasto.fecha);
      return fechaGasto >= fechaLimite;
    });
  }

  private calcularPromedioGastos(gastos: Gasto[], dias: number): number {
    if (gastos.length === 0) return 0;
    const total = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
    return (total / dias) * 30; // promedio mensual
  }

  private calcularDesviacionEstandar(valores: number[]): number {
    if (valores.length === 0) return 0;
    const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
    return Math.sqrt(varianza);
  }

  private getMostFrequent<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    const frequency: { [key: string]: number } = {};
    let maxCount = 0;
    let mostFrequent: T | null = null;

    array.forEach(item => {
      const key = String(item);
      frequency[key] = (frequency[key] || 0) + 1;
      if (frequency[key] > maxCount) {
        maxCount = frequency[key];
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  private detectarEstacionalidad(gastos: Gasto[]): boolean {
    // Implementación simplificada - detecta si hay patrones por mes
    const gastosPorMes: { [key: number]: number } = {};
    
    gastos.forEach(gasto => {
      const mes = new Date(gasto.fecha).getMonth();
      gastosPorMes[mes] = (gastosPorMes[mes] || 0) + gasto.monto;
    });

    const valores = Object.values(gastosPorMes);
    if (valores.length < 3) return false;

    const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    const desviacion = this.calcularDesviacionEstandar(valores);
    
    return (desviacion / promedio) > 0.3; // Si la desviación es > 30% del promedio
  }

  private calcularDiasHastaCierre(diaCierre: number): number {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    
    if (diaActual <= diaCierre) {
      return diaCierre - diaActual;
    } else {
      const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaCierre);
      return Math.ceil((proximoMes.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  // Métodos para generar datos de gráficos
  private generarGraficoImpactoLimite(impacto: ImpactoLimite) {
    return {
      labels: ['Usado Actual', 'Después de Compra', 'Disponible'],
      datasets: [{
        label: 'Límite de Crédito',
        data: [
          impacto.limiteActual - impacto.limiteDisponible,
          impacto.limiteActual - impacto.limitePostCompra,
          impacto.limitePostCompra
        ],
        backgroundColor: ['#ff6b6b', '#ffa726', '#66bb6a'],
        borderColor: ['#e53e3e', '#f57c00', '#43a047']
      }]
    };
  }

  private generarGraficoProyeccionTemporal(proyecciones: ProyeccionesFinancieras) {
    return {
      labels: proyecciones.proyeccion6Meses.map(p => p.mes),
      datasets: [{
        label: 'Saldo Proyectado',
        data: proyecciones.proyeccion6Meses.map(p => p.saldoEstimado),
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        tension: 0.4
      }]
    };
  }

  private generarGraficoComparativoHistorico(monto: number, gastosHistoricos: Gasto[]) {
    const ultimosMeses = this.getUltimosMesesGastos(gastosHistoricos, 6);
    
    return {
      labels: [...ultimosMeses.map(m => m.mes), 'Compra Simulada'],
      datasets: [{
        label: 'Gastos Mensuales',
        data: [...ultimosMeses.map(m => m.total), monto],
        backgroundColor: [...Array(ultimosMeses.length).fill('#e3f2fd'), '#ff5722'],
        borderColor: [...Array(ultimosMeses.length).fill('#2196f3'), '#d32f2f']
      }]
    };
  }

  private generarGraficoDistribucionRiesgo(analisis: AnalisisRiesgo) {
    const distribucion = {
      'Bajo': analisis.nivelRiesgo === 'bajo' ? 100 : 0,
      'Medio': analisis.nivelRiesgo === 'medio' ? 100 : 0,
      'Alto': analisis.nivelRiesgo === 'alto' ? 100 : 0,
      'Crítico': analisis.nivelRiesgo === 'critico' ? 100 : 0
    };

    return {
      labels: Object.keys(distribucion),
      datasets: [{
        data: Object.values(distribucion),
        backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#9c27b0'],
        borderColor: ['#388e3c', '#f57c00', '#d32f2f', '#7b1fa2']
      }]
    };
  }

  private getUltimosMesesGastos(gastos: Gasto[], meses: number): Array<{mes: string, total: number}> {
    const resultado: Array<{mes: string, total: number}> = [];
    const fechaActual = new Date();

    for (let i = meses - 1; i >= 0; i--) {
      const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesKey));
      const total = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);
      
      resultado.push({ mes: mesKey, total });
    }

    return resultado;
  }
}