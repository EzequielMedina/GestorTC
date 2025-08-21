import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, of, firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { 
  PrediccionGasto, 
  Alerta, 
  Recomendacion, 
  ScoreFinanciero, 
  TendenciaAnalisis,
  DatoTemporal,
  MetricaDashboard,
  ConfiguracionAlerta
} from '../models/dashboard-predictivo.model';
import { Gasto } from '../models/gasto.model';
import { Tarjeta } from '../models/tarjeta.model';
import { GastoService } from './gasto';
import { TarjetaService } from './tarjeta';
import { AlgoritmosPredicion } from '../utils/algoritmos-prediccion';

const STORAGE_KEYS = {
  predicciones: 'gestor_tc_predicciones',
  alertas: 'gestor_tc_alertas',
  recomendaciones: 'gestor_tc_recomendaciones',
  configuracionAlertas: 'gestor_tc_config_alertas'
};

@Injectable({
  providedIn: 'root'
})
export class PrediccionService {
  private prediccionesSubject = new BehaviorSubject<PrediccionGasto[]>(this.loadPrediccionesFromStorage());
  private alertasSubject = new BehaviorSubject<Alerta[]>(this.loadAlertasFromStorage());
  private recomendacionesSubject = new BehaviorSubject<Recomendacion[]>(this.loadRecomendacionesFromStorage());
  private configuracionAlertasSubject = new BehaviorSubject<ConfiguracionAlerta[]>(this.loadConfiguracionAlertasFromStorage());

  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService
  ) {
    // Generar predicciones automáticamente cuando cambien los datos
    this.inicializarGeneracionAutomatica();
  }

  // ===========================
  // PREDICCIONES
  // ===========================

  /**
   * Obtiene todas las predicciones como Observable
   */
  getPredicciones$(): Observable<PrediccionGasto[]> {
    return this.prediccionesSubject.asObservable();
  }

  /**
   * Obtiene predicciones filtradas por tarjeta
   * @param tarjetaId ID de la tarjeta
   */
  getPrediccionesPorTarjeta$(tarjetaId: string): Observable<PrediccionGasto[]> {
    return this.prediccionesSubject.pipe(
      map(predicciones => predicciones.filter(p => p.tarjetaId === tarjetaId))
    );
  }

  /**
   * Obtiene predicciones para un período específico
   * @param mes Mes (1-12)
   * @param anio Año
   */
  getPrediccionesPorPeriodo$(mes: number, anio: number): Observable<PrediccionGasto[]> {
    return this.prediccionesSubject.pipe(
      map(predicciones => predicciones.filter(p => p.mes === mes && p.anio === anio))
    );
  }

  /**
   * Genera predicciones para todas las tarjetas
   * @param mesesAdelante Número de meses a predecir (por defecto 3)
   */
  async generarPredicciones(mesesAdelante: number = 3): Promise<PrediccionGasto[]> {
    console.log('🔮 Iniciando generación de predicciones...');
    
    try {
      const gastos = await firstValueFrom(this.gastoService.getGastos$()) || [];
      const tarjetas = await firstValueFrom(this.tarjetaService.getTarjetas$()) || [];
      
      console.log('📊 Datos obtenidos:', { gastos: gastos.length, tarjetas: tarjetas.length });
      
      const nuevasPredicciones: PrediccionGasto[] = [];
      const fechaActual = new Date();

      for (const tarjeta of tarjetas) {
        const gastosTarjeta = gastos.filter(g => g.tarjetaId === tarjeta.id);
        
        console.log(`💳 Tarjeta ${tarjeta.nombre}: ${gastosTarjeta.length} gastos`);
        
        if (gastosTarjeta.length < 3) {
          console.log(`⚠️ Tarjeta ${tarjeta.nombre}: Insuficientes datos (${gastosTarjeta.length} < 3)`);
          continue;
        }

      // Convertir gastos a datos temporales
      const datosTemporales: DatoTemporal[] = this.convertirGastosADatosTemporales(gastosTarjeta);
      
      // Generar predicciones para los próximos meses
      for (let i = 1; i <= mesesAdelante; i++) {
        const fechaPrediccion = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + i, 1);
        
        try {
          const resultadoHibrido = AlgoritmosPredicion.prediccionHibrida(datosTemporales, i);
          
          const prediccion: PrediccionGasto = {
            id: uuidv4(),
            tarjetaId: tarjeta.id,
            mes: fechaPrediccion.getMonth() + 1,
            anio: fechaPrediccion.getFullYear(),
            montoPredicho: Math.round(resultadoHibrido.prediccion),
            confianza: Math.round(resultadoHibrido.confianza),
            algoritmo: 'hibrido',
            factores: this.identificarFactoresInfluyentes(gastosTarjeta),
            fechaGeneracion: new Date(),
            tendencia: this.determinarTendencia(datosTemporales),
            variacionEsperada: this.calcularVariacionEsperada(datosTemporales)
          };
          
          nuevasPredicciones.push(prediccion);
        } catch (error) {
          console.warn(`Error generando predicción para tarjeta ${tarjeta.id}:`, error);
        }
      }
    }

    // Actualizar predicciones (reemplazar las existentes)
    console.log(`✅ Predicciones generadas: ${nuevasPredicciones.length}`);
    this.actualizarPredicciones(nuevasPredicciones);

    return nuevasPredicciones;
    } catch (error) {
      console.error('❌ Error en generarPredicciones:', error);
      return [];
    }
  }

  /**
   * Actualiza las predicciones en el storage
   * @param predicciones Array de predicciones
   */
  private actualizarPredicciones(predicciones: PrediccionGasto[]): void {
    this.prediccionesSubject.next(predicciones);
    this.savePrediccionesToStorage(predicciones);
  }

  // ===========================
  // ALERTAS
  // ===========================

  /**
   * Obtiene todas las alertas como Observable
   */
  getAlertas$(): Observable<Alerta[]> {
    return this.alertasSubject.asObservable();
  }

  /**
   * Obtiene alertas no leídas
   */
  getAlertasNoLeidas$(): Observable<Alerta[]> {
    return this.alertasSubject.pipe(
      map(alertas => alertas.filter(a => !a.leida))
    );
  }

  /**
   * Marca una alerta como leída
   * @param alertaId ID de la alerta
   */
  marcarAlertaComoLeida(alertaId: string): void {
    const alertas = this.alertasSubject.value;
    const alertaIndex = alertas.findIndex(a => a.id === alertaId);
    
    if (alertaIndex !== -1) {
      alertas[alertaIndex].leida = true;
      this.alertasSubject.next([...alertas]);
      this.saveAlertasToStorage(alertas);
    }
  }

  /**
   * Genera alertas basadas en predicciones y datos actuales
   */
  async generarAlertas(): Promise<Alerta[]> {
    console.log('🚨 Iniciando generación de alertas...');
    
    try {
      const gastos = await firstValueFrom(this.gastoService.getGastos$()) || [];
      const tarjetas = await firstValueFrom(this.tarjetaService.getTarjetas$()) || [];
      const predicciones = this.prediccionesSubject.value;
      
      console.log('📊 Datos para alertas:', { gastos: gastos.length, tarjetas: tarjetas.length, predicciones: predicciones.length });
      
      const nuevasAlertas: Alerta[] = [];
      const fechaActual = new Date();

    for (const tarjeta of tarjetas) {
      const gastosTarjeta = gastos.filter(g => g.tarjetaId === tarjeta.id);
      const gastosMesActual = this.filtrarGastosPorMes(gastosTarjeta, fechaActual);
      const totalMesActual = gastosMesActual.reduce((sum, g) => sum + g.monto, 0);
      
      // Alerta: Límite cercano
      const porcentajeUso = (totalMesActual / tarjeta.limite) * 100;
      if (porcentajeUso > 80) {
        nuevasAlertas.push({
          id: uuidv4(),
          tipo: 'limite_cercano',
          prioridad: porcentajeUso > 95 ? 'alta' : 'media',
          titulo: `Límite cercano - ${tarjeta.nombre}`,
          mensaje: `Has utilizado ${porcentajeUso.toFixed(1)}% del límite de tu tarjeta ${tarjeta.nombre}`,
          tarjetaId: tarjeta.id,
          montoInvolucrado: totalMesActual,
          fechaGeneracion: new Date(),
          leida: false,
          accionRecomendada: 'Considera reducir gastos o usar otra tarjeta',
          icono: 'warning',
          color: porcentajeUso > 95 ? '#f44336' : '#ff9800'
        });
      }

      // Alerta: Gasto inusual
      const promedioHistorico = this.calcularPromedioGastosMensuales(gastosTarjeta);
      if (totalMesActual > promedioHistorico * 1.5) {
        nuevasAlertas.push({
          id: uuidv4(),
          tipo: 'gasto_inusual',
          prioridad: 'media',
          titulo: `Gasto inusual detectado - ${tarjeta.nombre}`,
          mensaje: `Tus gastos este mes (${totalMesActual.toLocaleString()}) están ${((totalMesActual/promedioHistorico - 1) * 100).toFixed(0)}% por encima del promedio`,
          tarjetaId: tarjeta.id,
          montoInvolucrado: totalMesActual - promedioHistorico,
          fechaGeneracion: new Date(),
          leida: false,
          accionRecomendada: 'Revisa tus gastos recientes y ajusta tu presupuesto',
          icono: 'trending_up',
          color: '#ff9800'
        });
      }

      // Alerta: Predicción de exceso
      const prediccionMesActual = predicciones.find(p => 
        p.tarjetaId === tarjeta.id && 
        p.mes === fechaActual.getMonth() + 1 && 
        p.anio === fechaActual.getFullYear()
      );
      
      if (prediccionMesActual && prediccionMesActual.montoPredicho > tarjeta.limite * 0.9) {
        nuevasAlertas.push({
          id: uuidv4(),
          tipo: 'patron_riesgoso',
          prioridad: 'alta',
          titulo: `Riesgo de exceder límite - ${tarjeta.nombre}`,
          mensaje: `Según las predicciones, podrías exceder el 90% del límite este mes`,
          tarjetaId: tarjeta.id,
          montoInvolucrado: prediccionMesActual.montoPredicho,
          fechaGeneracion: new Date(),
          leida: false,
          accionRecomendada: 'Planifica tus gastos restantes cuidadosamente',
          icono: 'error',
          color: '#f44336'
        });
      }
    }

    // Actualizar alertas
    console.log(`🚨 Alertas generadas: ${nuevasAlertas.length}`);
    const alertasExistentes = this.alertasSubject.value;
    const todasLasAlertas = [...alertasExistentes, ...nuevasAlertas];
    this.alertasSubject.next(todasLasAlertas);
    this.saveAlertasToStorage(todasLasAlertas);
    
    return nuevasAlertas;
    } catch (error) {
      console.error('❌ Error en generarAlertas:', error);
      return [];
    }
  }

  // ===========================
  // RECOMENDACIONES
  // ===========================

  /**
   * Obtiene todas las recomendaciones como Observable
   */
  getRecomendaciones$(): Observable<Recomendacion[]> {
    return this.recomendacionesSubject.asObservable();
  }

  /**
   * Obtiene recomendaciones activas (no aplicadas y vigentes)
   */
  getRecomendacionesActivas$(): Observable<Recomendacion[]> {
    return this.recomendacionesSubject.pipe(
      map(recomendaciones => {
        const ahora = new Date();
        return recomendaciones.filter(r => 
          !r.aplicada && 
          (ahora.getTime() - r.fechaGeneracion.getTime()) / (1000 * 60 * 60 * 24) <= r.vigencia
        );
      })
    );
  }

  /**
   * Marca una recomendación como aplicada
   * @param recomendacionId ID de la recomendación
   */
  marcarRecomendacionComoAplicada(recomendacionId: string): void {
    const recomendaciones = this.recomendacionesSubject.value;
    const recomendacionIndex = recomendaciones.findIndex(r => r.id === recomendacionId);
    
    if (recomendacionIndex !== -1) {
      recomendaciones[recomendacionIndex].aplicada = true;
      this.recomendacionesSubject.next([...recomendaciones]);
      this.saveRecomendacionesToStorage(recomendaciones);
    }
  }

  /**
   * Genera recomendaciones personalizadas
   */
  async generarRecomendaciones(): Promise<Recomendacion[]> {
    const gastos = await this.gastoService.getGastos$().pipe(map(g => g)).toPromise() || [];
    const tarjetas = await this.tarjetaService.getTarjetas$().pipe(map(t => t)).toPromise() || [];
    
    const nuevasRecomendaciones: Recomendacion[] = [];
    
    // Recomendación: Optimización de tarjetas
    const analisisUso = this.analizarUsoTarjetas(gastos, tarjetas);
    if (analisisUso.tarjetasSubutilizadas.length > 0) {
      nuevasRecomendaciones.push({
        id: uuidv4(),
        categoria: 'optimizacion',
        titulo: 'Optimiza el uso de tus tarjetas',
        descripcion: `Tienes ${analisisUso.tarjetasSubutilizadas.length} tarjeta(s) con bajo uso. Considera concentrar gastos para maximizar beneficios.`,
        impactoEstimado: 0,
        dificultad: 'facil',
        tarjetasAfectadas: analisisUso.tarjetasSubutilizadas,
        fechaGeneracion: new Date(),
        vigencia: 30,
        aplicada: false,
        puntuacion: 75,
        pasos: [
          'Revisa los beneficios de cada tarjeta',
          'Concentra gastos en la tarjeta con mejores beneficios',
          'Considera cancelar tarjetas no utilizadas'
        ],
        etiquetas: ['optimizacion', 'tarjetas', 'beneficios']
      });
    }

    // Recomendación: Control de gastos
    const gastosRecientes = this.filtrarGastosPorMes(gastos, new Date());
    const categoriasMayorGasto = this.analizarCategorias(gastosRecientes);
    
    if (categoriasMayorGasto.length > 0) {
      const categoriaTop = categoriasMayorGasto[0];
      nuevasRecomendaciones.push({
        id: uuidv4(),
        categoria: 'ahorro',
        titulo: `Reduce gastos en ${categoriaTop.categoria}`,
        descripcion: `Has gastado $${categoriaTop.monto.toLocaleString()} en ${categoriaTop.categoria} este mes. Considera establecer un límite.`,
        impactoEstimado: categoriaTop.monto * 0.2, // 20% de ahorro potencial
        dificultad: 'medio',
        tarjetasAfectadas: [],
        fechaGeneracion: new Date(),
        vigencia: 15,
        aplicada: false,
        puntuacion: 85,
        pasos: [
          `Establece un presupuesto mensual para ${categoriaTop.categoria}`,
          'Busca alternativas más económicas',
          'Monitorea tus gastos semanalmente'
        ],
        etiquetas: ['ahorro', 'presupuesto', categoriaTop.categoria.toLowerCase()]
      });
    }

    // Actualizar recomendaciones
    const recomendacionesExistentes = this.recomendacionesSubject.value;
    const todasLasRecomendaciones = [...recomendacionesExistentes, ...nuevasRecomendaciones];
    this.recomendacionesSubject.next(todasLasRecomendaciones);
    this.saveRecomendacionesToStorage(todasLasRecomendaciones);
    
    return nuevasRecomendaciones;
  }

  // ===========================
  // SCORE FINANCIERO
  // ===========================

  /**
   * Calcula el score financiero actual
   */
  async calcularScoreFinanciero(): Promise<ScoreFinanciero> {
    try {
      console.log('🎯 Iniciando cálculo de score financiero...');
      
      const gastos = await firstValueFrom(this.gastoService.getGastos$()) || [];
      const tarjetas = await firstValueFrom(this.tarjetaService.getTarjetas$()) || [];
      
      console.log('📊 Datos para score:', { gastos: gastos.length, tarjetas: tarjetas.length });
    
    const fechaActual = new Date();
    const gastosMesActual = this.filtrarGastosPorMes(gastos, fechaActual);
    const gastosMesAnterior = this.filtrarGastosPorMes(gastos, new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
    
    // Calcular factores del score
    const utilizacionCredito = this.calcularUtilizacionCredito(gastosMesActual, tarjetas);
    const diversificacionGastos = this.calcularDiversificacionGastos(gastosMesActual);
    const consistenciaPagos = this.calcularConsistenciaPagos(gastos);
    const controlPresupuesto = this.calcularControlPresupuesto(gastos, tarjetas);
    const planificacionFinanciera = this.calcularPlanificacionFinanciera(gastos);
    
    // Calcular puntuación total (0-1000)
    const puntuacion = Math.round(
      utilizacionCredito * 2.5 + // 25% del score
      diversificacionGastos * 1.5 + // 15% del score
      consistenciaPagos * 2.0 + // 20% del score
      controlPresupuesto * 2.5 + // 25% del score
      planificacionFinanciera * 1.5 // 15% del score
    );
    
    // Determinar nivel
    let nivel: 'excelente' | 'muy_bueno' | 'bueno' | 'regular' | 'malo';
    if (puntuacion >= 800) nivel = 'excelente';
    else if (puntuacion >= 700) nivel = 'muy_bueno';
    else if (puntuacion >= 600) nivel = 'bueno';
    else if (puntuacion >= 400) nivel = 'regular';
    else nivel = 'malo';
    
    // Calcular comparativo con mes anterior
    const scoreAnterior = await this.calcularScoreFinancieroParaMes(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
    const diferencia = puntuacion - scoreAnterior;
    const porcentajeCambio = scoreAnterior > 0 ? (diferencia / scoreAnterior) * 100 : 0;
    
    let tendencia: 'mejorando' | 'empeorando' | 'estable';
    if (Math.abs(diferencia) < 20) tendencia = 'estable';
    else if (diferencia > 0) tendencia = 'mejorando';
    else tendencia = 'empeorando';
    
    const scoreResult = {
      puntuacion,
      nivel,
      factores: [
        {
          nombre: 'Utilización de Crédito',
          valor: utilizacionCredito,
          peso: 0.25,
          descripcion: 'Porcentaje de límite utilizado',
          estado: this.determinarEstadoFactor(utilizacionCredito)
        },
        {
          nombre: 'Diversificación de Gastos',
          valor: diversificacionGastos,
          peso: 0.15,
          descripcion: 'Variedad en categorías de gastos',
          estado: this.determinarEstadoFactor(diversificacionGastos)
        },
        {
          nombre: 'Consistencia en Pagos',
          valor: consistenciaPagos,
          peso: 0.20,
          descripcion: 'Regularidad en el patrón de gastos',
          estado: this.determinarEstadoFactor(consistenciaPagos)
        },
        {
          nombre: 'Control de Presupuesto',
          valor: controlPresupuesto,
          peso: 0.25,
          descripcion: 'Manejo de límites y presupuestos',
          estado: this.determinarEstadoFactor(controlPresupuesto)
        },
        {
          nombre: 'Planificación Financiera',
          valor: planificacionFinanciera,
          peso: 0.15,
          descripcion: 'Uso de cuotas y planificación',
          estado: this.determinarEstadoFactor(planificacionFinanciera)
        }
      ],
      tendencia,
      fechaCalculo: new Date(),
      recomendacionesMejora: this.generarRecomendacionesMejoraScore({
        utilizacionCredito,
        diversificacionGastos,
        consistenciaPagos,
        controlPresupuesto,
        planificacionFinanciera
      }),
      comparativoMesAnterior: {
        puntuacion: scoreAnterior,
        diferencia,
        porcentajeCambio
      },
      desglose: {
        utilizacionCredito,
        diversificacionGastos,
        consistenciaPagos,
        controlPresupuesto,
        planificacionFinanciera
      }
    };
    
    console.log('✅ Score financiero calculado:', {
      puntuacion: scoreResult.puntuacion,
      nivel: scoreResult.nivel,
      factores: scoreResult.factores.length,
      tendencia: scoreResult.tendencia
    });
    
    return scoreResult;
    
    } catch (error) {
      console.error('❌ Error calculando score financiero:', error);
      // Retornar un score por defecto en caso de error
      return {
        puntuacion: 500,
        nivel: 'regular',
        factores: [],
        tendencia: 'estable',
        fechaCalculo: new Date(),
        recomendacionesMejora: ['Error al calcular el score. Verifica tus datos.'],
        comparativoMesAnterior: {
          puntuacion: 500,
          diferencia: 0,
          porcentajeCambio: 0
        },
        desglose: {
          utilizacionCredito: 0,
          diversificacionGastos: 0,
          consistenciaPagos: 0,
          controlPresupuesto: 0,
          planificacionFinanciera: 0
        }
      };
    }
  }

  // ===========================
  // MÉTRICAS DEL DASHBOARD
  // ===========================

  /**
   * Obtiene las métricas principales para el dashboard
   */
  async getMetricasDashboard(): Promise<MetricaDashboard[]> {
    const gastos = await firstValueFrom(this.gastoService.getGastos$()) || [];
    const tarjetas = await firstValueFrom(this.tarjetaService.getTarjetas$()) || [];
    const predicciones = this.prediccionesSubject.value;
    
    const fechaActual = new Date();
    const gastosMesActual = this.filtrarGastosPorMes(gastos, fechaActual);
    const gastosMesAnterior = this.filtrarGastosPorMes(gastos, new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
    
    const totalMesActual = gastosMesActual.reduce((sum, g) => sum + g.monto, 0);
    const totalMesAnterior = gastosMesAnterior.reduce((sum, g) => sum + g.monto, 0);
    const limiteTotal = tarjetas.reduce((sum, t) => sum + t.limite, 0);
    
    const prediccionMesActual = predicciones
      .filter(p => p.mes === fechaActual.getMonth() + 1 && p.anio === fechaActual.getFullYear())
      .reduce((sum, p) => sum + p.montoPredicho, 0);
    
    const scoreFinanciero = await this.calcularScoreFinanciero();
    
    return [
      {
        nombre: 'Gastos del Mes',
        valor: totalMesActual,
        valorAnterior: totalMesAnterior,
        unidad: '$',
        formato: 'moneda',
        tendencia: totalMesActual > totalMesAnterior ? 'negativa' : 'positiva',
        icono: 'credit_card',
        color: '#2196f3'
      },
      {
        nombre: 'Predicción Mensual',
        valor: prediccionMesActual,
        unidad: '$',
        formato: 'moneda',
        tendencia: 'neutral',
        icono: 'trending_up',
        color: '#ff9800'
      },
      {
        nombre: 'Utilización de Crédito',
        valor: (totalMesActual / limiteTotal) * 100,
        unidad: '%',
        formato: 'porcentaje',
        tendencia: (totalMesActual / limiteTotal) > 0.8 ? 'negativa' : 'positiva',
        icono: 'account_balance',
        color: '#4caf50'
      },
      {
        nombre: 'Score Financiero',
        valor: scoreFinanciero.puntuacion,
        valorAnterior: scoreFinanciero.comparativoMesAnterior.puntuacion,
        unidad: 'pts',
        formato: 'entero',
        tendencia: scoreFinanciero.tendencia === 'mejorando' ? 'positiva' : scoreFinanciero.tendencia === 'empeorando' ? 'negativa' : 'neutral',
        icono: 'star',
        color: '#9c27b0'
      }
    ];
  }

  // ===========================
  // MÉTODOS PRIVADOS DE ANÁLISIS
  // ===========================

  private convertirGastosADatosTemporales(gastos: Gasto[]): DatoTemporal[] {
    // Agrupar gastos por mes y sumar montos
    const gastosPorMes = new Map<string, number>();
    
    gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const claveMs = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      const montoActual = gastosPorMes.get(claveMs) || 0;
      gastosPorMes.set(claveMs, montoActual + gasto.monto);
    });
    
    // Convertir a array de DatoTemporal
    return Array.from(gastosPorMes.entries())
      .map(([clave, monto]) => {
        const [anio, mes] = clave.split('-').map(Number);
        return {
          fecha: new Date(anio, mes, 1),
          valor: monto
        };
      })
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }

  private identificarFactoresInfluyentes(gastos: Gasto[]): string[] {
    const factores: string[] = [];
    
    // Analizar patrones en los gastos
    const gastosConCuotas = gastos.filter(g => g.cantidadCuotas && g.cantidadCuotas > 1);
    if (gastosConCuotas.length > gastos.length * 0.3) {
      factores.push('Alto uso de cuotas');
    }
    
    const gastosCompartidos = gastos.filter(g => g.compartidoCon);
    if (gastosCompartidos.length > gastos.length * 0.2) {
      factores.push('Gastos compartidos frecuentes');
    }
    
    // Analizar estacionalidad
    const datosTemporales = this.convertirGastosADatosTemporales(gastos);
    const estacionalidad = AlgoritmosPredicion.detectarEstacionalidad(datosTemporales);
    if (estacionalidad.detectada) {
      factores.push(`Patrón ${estacionalidad.patron}`);
    }
    
    return factores;
  }

  private determinarTendencia(datos: DatoTemporal[]): 'creciente' | 'decreciente' | 'estable' {
    if (datos.length < 2) return 'estable';
    
    try {
      const regresion = AlgoritmosPredicion.regresionLineal(datos);
      if (Math.abs(regresion.pendiente) < 100) return 'estable';
      return regresion.pendiente > 0 ? 'creciente' : 'decreciente';
    } catch {
      return 'estable';
    }
  }

  private calcularVariacionEsperada(datos: DatoTemporal[]): number {
    if (datos.length < 2) return 0;
    
    const valores = datos.map(d => d.valor);
    const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
    const desviacionEstandar = Math.sqrt(varianza);
    
    return promedio > 0 ? (desviacionEstandar / promedio) * 100 : 0;
  }

  private filtrarGastosPorMes(gastos: Gasto[], fecha: Date): Gasto[] {
    return gastos.filter(gasto => {
      const fechaGasto = new Date(gasto.fecha);
      return fechaGasto.getMonth() === fecha.getMonth() && 
             fechaGasto.getFullYear() === fecha.getFullYear();
    });
  }

  private calcularPromedioGastosMensuales(gastos: Gasto[]): number {
    const gastosPorMes = new Map<string, number>();
    
    gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      const montoActual = gastosPorMes.get(clave) || 0;
      gastosPorMes.set(clave, montoActual + gasto.monto);
    });
    
    const totales = Array.from(gastosPorMes.values());
    return totales.length > 0 ? totales.reduce((sum, total) => sum + total, 0) / totales.length : 0;
  }

  private analizarUsoTarjetas(gastos: Gasto[], tarjetas: Tarjeta[]): { tarjetasSubutilizadas: string[] } {
    const usoTarjetas = new Map<string, number>();
    
    // Calcular uso por tarjeta en los últimos 3 meses
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 3);
    
    gastos
      .filter(g => new Date(g.fecha) >= fechaLimite)
      .forEach(gasto => {
        const usoActual = usoTarjetas.get(gasto.tarjetaId) || 0;
        usoTarjetas.set(gasto.tarjetaId, usoActual + gasto.monto);
      });
    
    const tarjetasSubutilizadas = tarjetas
      .filter(tarjeta => (usoTarjetas.get(tarjeta.id) || 0) < tarjeta.limite * 0.1) // Menos del 10% del límite
      .map(tarjeta => tarjeta.id);
    
    return { tarjetasSubutilizadas };
  }

  private analizarCategorias(gastos: Gasto[]): { categoria: string; monto: number }[] {
    // Simplificado: usar descripción como categoría
    const categorias = new Map<string, number>();
    
    gastos.forEach(gasto => {
      // Extraer primera palabra de la descripción como categoría
      const categoria = gasto.descripcion.split(' ')[0].toLowerCase();
      const montoActual = categorias.get(categoria) || 0;
      categorias.set(categoria, montoActual + gasto.monto);
    });
    
    return Array.from(categorias.entries())
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5); // Top 5 categorías
  }

  private calcularUtilizacionCredito(gastos: Gasto[], tarjetas: Tarjeta[]): number {
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const limiteTotal = tarjetas.reduce((sum, t) => sum + t.limite, 0);
    
    if (limiteTotal === 0) return 0;
    
    const utilizacion = (totalGastos / limiteTotal) * 100;
    
    // Score: mejor utilización entre 10-30%
    if (utilizacion >= 10 && utilizacion <= 30) return 100;
    if (utilizacion < 10) return 70 + utilizacion * 3; // Penalizar subutilización
    if (utilizacion <= 50) return 100 - (utilizacion - 30) * 1.5; // Penalizar sobreutilización gradualmente
    return Math.max(0, 70 - (utilizacion - 50) * 2); // Penalizar fuertemente > 50%
  }

  private calcularDiversificacionGastos(gastos: Gasto[]): number {
    const categorias = this.analizarCategorias(gastos);
    
    if (categorias.length === 0) return 0;
    if (categorias.length === 1) return 30;
    if (categorias.length >= 5) return 100;
    
    return 30 + (categorias.length - 1) * 17.5; // Escala lineal
  }

  private calcularConsistenciaPagos(gastos: Gasto[]): number {
    // Analizar regularidad en los gastos mensuales
    const gastosPorMes = new Map<string, number>();
    
    gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      const montoActual = gastosPorMes.get(clave) || 0;
      gastosPorMes.set(clave, montoActual + gasto.monto);
    });
    
    const montosMenuales = Array.from(gastosPorMes.values());
    
    if (montosMenuales.length < 2) return 50;
    
    const promedio = montosMenuales.reduce((sum, monto) => sum + monto, 0) / montosMenuales.length;
    const varianza = montosMenuales.reduce((sum, monto) => sum + Math.pow(monto - promedio, 2), 0) / montosMenuales.length;
    const coeficienteVariacion = promedio > 0 ? Math.sqrt(varianza) / promedio : 1;
    
    // Menor variación = mayor consistencia
    return Math.max(0, Math.min(100, 100 - coeficienteVariacion * 100));
  }

  private calcularControlPresupuesto(gastos: Gasto[], tarjetas: Tarjeta[]): number {
    // Analizar si se mantiene dentro de límites
    let score = 0;
    let tarjetasEvaluadas = 0;
    
    tarjetas.forEach(tarjeta => {
      const gastosTarjeta = gastos.filter(g => g.tarjetaId === tarjeta.id);
      const totalGastos = gastosTarjeta.reduce((sum, g) => sum + g.monto, 0);
      const utilizacion = totalGastos / tarjeta.limite;
      
      if (utilizacion <= 0.8) score += 100;
      else if (utilizacion <= 0.9) score += 70;
      else if (utilizacion <= 1.0) score += 40;
      else score += 0;
      
      tarjetasEvaluadas++;
    });
    
    return tarjetasEvaluadas > 0 ? score / tarjetasEvaluadas : 50;
  }

  private calcularPlanificacionFinanciera(gastos: Gasto[]): number {
    const gastosConCuotas = gastos.filter(g => g.cantidadCuotas && g.cantidadCuotas > 1);
    const gastosCompartidos = gastos.filter(g => g.compartidoCon);
    
    let score = 50; // Base
    
    // Bonus por usar cuotas (planificación)
    if (gastosConCuotas.length > 0) {
      const porcentajeCuotas = gastosConCuotas.length / gastos.length;
      score += Math.min(30, porcentajeCuotas * 100);
    }
    
    // Bonus por gastos compartidos (organización)
    if (gastosCompartidos.length > 0) {
      const porcentajeCompartidos = gastosCompartidos.length / gastos.length;
      score += Math.min(20, porcentajeCompartidos * 100);
    }
    
    return Math.min(100, score);
  }

  private async calcularScoreFinancieroParaMes(fecha: Date): Promise<number> {
    // Versión simplificada para comparación histórica
    const gastos = await firstValueFrom(this.gastoService.getGastos$()) || [];
    const tarjetas = await firstValueFrom(this.tarjetaService.getTarjetas$()) || [];
    
    const gastosMes = this.filtrarGastosPorMes(gastos, fecha);
    
    if (gastosMes.length === 0) return 500; // Score neutral si no hay datos
    
    const utilizacionCredito = this.calcularUtilizacionCredito(gastosMes, tarjetas);
    const controlPresupuesto = this.calcularControlPresupuesto(gastosMes, tarjetas);
    
    return Math.round(utilizacionCredito * 2.5 + controlPresupuesto * 2.5 + 250); // Simplificado
  }

  private determinarEstadoFactor(valor: number): 'excelente' | 'bueno' | 'regular' | 'malo' {
    if (valor >= 80) return 'excelente';
    if (valor >= 60) return 'bueno';
    if (valor >= 40) return 'regular';
    return 'malo';
  }

  private generarRecomendacionesMejoraScore(desglose: any): string[] {
    const recomendaciones: string[] = [];
    
    if (desglose.utilizacionCredito < 60) {
      recomendaciones.push('Mantén una utilización de crédito entre 10-30% para optimizar tu score');
    }
    
    if (desglose.diversificacionGastos < 60) {
      recomendaciones.push('Diversifica tus gastos en diferentes categorías');
    }
    
    if (desglose.consistenciaPagos < 60) {
      recomendaciones.push('Mantén un patrón más consistente en tus gastos mensuales');
    }
    
    if (desglose.controlPresupuesto < 60) {
      recomendaciones.push('Mejora el control de tus límites de crédito');
    }
    
    if (desglose.planificacionFinanciera < 60) {
      recomendaciones.push('Utiliza más herramientas de planificación como cuotas y gastos compartidos');
    }
    
    return recomendaciones;
  }

  private inicializarGeneracionAutomatica(): void {
    // Generar predicciones y alertas automáticamente cada vez que cambien los gastos
    this.gastoService.getGastos$().subscribe(() => {
      // Debounce para evitar múltiples ejecuciones
      setTimeout(() => {
        this.generarPredicciones();
        this.generarAlertas();
        this.generarRecomendaciones();
      }, 1000);
    });
  }

  // ===========================
  // MÉTODOS DE STORAGE
  // ===========================

  private loadPrediccionesFromStorage(): PrediccionGasto[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.predicciones);
      if (data) {
        const predicciones = JSON.parse(data);
        // Convertir fechas de string a Date
        return predicciones.map((p: any) => ({
          ...p,
          fechaGeneracion: new Date(p.fechaGeneracion)
        }));
      }
    } catch (error) {
      console.error('Error loading predicciones from storage:', error);
    }
    return [];
  }

  private savePrediccionesToStorage(predicciones: PrediccionGasto[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.predicciones, JSON.stringify(predicciones));
    } catch (error) {
      console.error('Error saving predicciones to storage:', error);
    }
  }

  private loadAlertasFromStorage(): Alerta[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.alertas);
      if (data) {
        const alertas = JSON.parse(data);
        return alertas.map((a: any) => ({
          ...a,
          fechaGeneracion: new Date(a.fechaGeneracion),
          fechaVencimiento: a.fechaVencimiento ? new Date(a.fechaVencimiento) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading alertas from storage:', error);
    }
    return [];
  }

  private saveAlertasToStorage(alertas: Alerta[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.alertas, JSON.stringify(alertas));
    } catch (error) {
      console.error('Error saving alertas to storage:', error);
    }
  }

  private loadRecomendacionesFromStorage(): Recomendacion[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.recomendaciones);
      if (data) {
        const recomendaciones = JSON.parse(data);
        return recomendaciones.map((r: any) => ({
          ...r,
          fechaGeneracion: new Date(r.fechaGeneracion)
        }));
      }
    } catch (error) {
      console.error('Error loading recomendaciones from storage:', error);
    }
    return [];
  }

  private saveRecomendacionesToStorage(recomendaciones: Recomendacion[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.recomendaciones, JSON.stringify(recomendaciones));
    } catch (error) {
      console.error('Error saving recomendaciones to storage:', error);
    }
  }

  private loadConfiguracionAlertasFromStorage(): ConfiguracionAlerta[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.configuracionAlertas);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading configuracion alertas from storage:', error);
      return [];
    }
  }

  private saveConfiguracionAlertasToStorage(configuracion: ConfiguracionAlerta[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.configuracionAlertas, JSON.stringify(configuracion));
    } catch (error) {
      console.error('Error saving configuracion alertas to storage:', error);
    }
  }
}