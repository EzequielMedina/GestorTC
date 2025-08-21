/**
 * Algoritmos de predicción para el Dashboard Predictivo
 * Contiene implementaciones de regresión lineal, media móvil exponencial y detección de estacionalidad
 */

import { DatoTemporal } from '../models/dashboard-predictivo.model';

/**
 * Resultado de una predicción con algoritmo de regresión lineal
 */
export interface ResultadoRegresionLineal {
  pendiente: number;
  intercepto: number;
  correlacion: number;
  prediccion: number;
  confianza: number;
}

/**
 * Resultado de análisis de estacionalidad
 */
export interface ResultadoEstacionalidad {
  detectada: boolean;
  patron: 'mensual' | 'trimestral' | 'anual' | 'ninguno';
  intensidad: number;
  factoresEstacionales: number[];
}

/**
 * Clase que contiene todos los algoritmos de predicción
 */
export class AlgoritmosPredicion {

  /**
   * Implementa regresión lineal simple para predecir valores futuros
   * @param datos Array de datos temporales históricos
   * @param periodosAdelante Número de períodos a predecir hacia adelante
   * @returns Resultado de la regresión lineal con predicción
   */
  static regresionLineal(datos: DatoTemporal[], periodosAdelante: number = 1): ResultadoRegresionLineal {
    if (datos.length < 2) {
      throw new Error('Se necesitan al menos 2 puntos de datos para regresión lineal');
    }

    // Convertir fechas a números (días desde el primer dato)
    const fechaBase = datos[0].fecha.getTime();
    const puntosX = datos.map(d => (d.fecha.getTime() - fechaBase) / (1000 * 60 * 60 * 24));
    const puntosY = datos.map(d => d.valor);

    const n = datos.length;
    const sumaX = puntosX.reduce((sum, x) => sum + x, 0);
    const sumaY = puntosY.reduce((sum, y) => sum + y, 0);
    const sumaXY = puntosX.reduce((sum, x, i) => sum + x * puntosY[i], 0);
    const sumaX2 = puntosX.reduce((sum, x) => sum + x * x, 0);
    const sumaY2 = puntosY.reduce((sum, y) => sum + y * y, 0);

    // Calcular pendiente e intercepto
    const pendiente = (n * sumaXY - sumaX * sumaY) / (n * sumaX2 - sumaX * sumaX);
    const intercepto = (sumaY - pendiente * sumaX) / n;

    // Calcular coeficiente de correlación
    const numeradorR = n * sumaXY - sumaX * sumaY;
    const denominadorR = Math.sqrt((n * sumaX2 - sumaX * sumaX) * (n * sumaY2 - sumaY * sumaY));
    const correlacion = denominadorR !== 0 ? numeradorR / denominadorR : 0;

    // Predecir valor futuro
    const ultimoX = puntosX[puntosX.length - 1];
    const xFuturo = ultimoX + periodosAdelante;
    const prediccion = pendiente * xFuturo + intercepto;

    // Calcular confianza basada en correlación y cantidad de datos
    const confianza = Math.min(95, Math.abs(correlacion) * 100 * Math.log(n) / Math.log(10));

    return {
      pendiente,
      intercepto,
      correlacion,
      prediccion: Math.max(0, prediccion), // No permitir predicciones negativas
      confianza
    };
  }

  /**
   * Implementa media móvil exponencial para suavizar datos y predecir
   * @param datos Array de datos temporales
   * @param alpha Factor de suavizado (0-1), por defecto 0.3
   * @param periodosAdelante Períodos a predecir
   * @returns Predicción basada en media móvil exponencial
   */
  static mediaMovilExponencial(datos: DatoTemporal[], alpha: number = 0.3, periodosAdelante: number = 1): number {
    if (datos.length === 0) {
      throw new Error('Se necesitan datos para calcular media móvil exponencial');
    }

    if (alpha < 0 || alpha > 1) {
      throw new Error('Alpha debe estar entre 0 y 1');
    }

    // Ordenar datos por fecha
    const datosOrdenados = [...datos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    
    let ema = datosOrdenados[0].valor;
    
    // Calcular EMA para todos los puntos
    for (let i = 1; i < datosOrdenados.length; i++) {
      ema = alpha * datosOrdenados[i].valor + (1 - alpha) * ema;
    }

    // Para múltiples períodos, aplicar la tendencia
    if (periodosAdelante > 1 && datosOrdenados.length >= 2) {
      const tendencia = this.calcularTendencia(datosOrdenados.slice(-6)); // Últimos 6 puntos
      ema += tendencia * (periodosAdelante - 1);
    }

    return Math.max(0, ema);
  }

  /**
   * Detecta patrones estacionales en los datos
   * @param datos Array de datos temporales (mínimo 12 meses)
   * @returns Resultado del análisis de estacionalidad
   */
  static detectarEstacionalidad(datos: DatoTemporal[]): ResultadoEstacionalidad {
    if (datos.length < 12) {
      return {
        detectada: false,
        patron: 'ninguno',
        intensidad: 0,
        factoresEstacionales: []
      };
    }

    // Ordenar datos por fecha
    const datosOrdenados = [...datos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    
    // Agrupar por mes
    const datosPorMes: { [mes: number]: number[] } = {};
    
    datosOrdenados.forEach(dato => {
      const mes = dato.fecha.getMonth(); // 0-11
      if (!datosPorMes[mes]) {
        datosPorMes[mes] = [];
      }
      datosPorMes[mes].push(dato.valor);
    });

    // Calcular promedio por mes
    const promediosPorMes: number[] = [];
    for (let mes = 0; mes < 12; mes++) {
      if (datosPorMes[mes] && datosPorMes[mes].length > 0) {
        const promedio = datosPorMes[mes].reduce((sum, val) => sum + val, 0) / datosPorMes[mes].length;
        promediosPorMes[mes] = promedio;
      } else {
        promediosPorMes[mes] = 0;
      }
    }

    // Calcular promedio general
    const promedioGeneral = promediosPorMes.reduce((sum, val) => sum + val, 0) / 12;
    
    // Calcular factores estacionales
    const factoresEstacionales = promediosPorMes.map(promedio => 
      promedioGeneral > 0 ? promedio / promedioGeneral : 1
    );

    // Calcular intensidad de estacionalidad (desviación estándar de factores)
    const varianza = factoresEstacionales.reduce((sum, factor) => 
      sum + Math.pow(factor - 1, 2), 0
    ) / 12;
    const intensidad = Math.sqrt(varianza);

    // Determinar si hay estacionalidad significativa
    const detectada = intensidad > 0.15; // Umbral del 15%
    
    let patron: 'mensual' | 'trimestral' | 'anual' | 'ninguno' = 'ninguno';
    if (detectada) {
      // Analizar si el patrón es mensual, trimestral o anual
      const variacionTrimestral = this.calcularVariacionTrimestral(factoresEstacionales);
      if (variacionTrimestral > 0.1) {
        patron = 'trimestral';
      } else {
        patron = 'mensual';
      }
    }

    return {
      detectada,
      patron,
      intensidad,
      factoresEstacionales
    };
  }

  /**
   * Predicción híbrida que combina múltiples algoritmos
   * @param datos Array de datos temporales
   * @param periodosAdelante Períodos a predecir
   * @returns Predicción combinada con nivel de confianza
   */
  static prediccionHibrida(datos: DatoTemporal[], periodosAdelante: number = 1): { prediccion: number; confianza: number; algoritmos: string[] } {
    if (datos.length < 3) {
      throw new Error('Se necesitan al menos 3 puntos de datos para predicción híbrida');
    }

    const algoritmos: string[] = [];
    let predicciones: number[] = [];
    let pesos: number[] = [];

    try {
      // Regresión lineal
      const regresion = this.regresionLineal(datos, periodosAdelante);
      predicciones.push(regresion.prediccion);
      pesos.push(Math.abs(regresion.correlacion));
      algoritmos.push('regresion_lineal');
    } catch (error) {
      // Si falla la regresión, continuar con otros métodos
    }

    try {
      // Media móvil exponencial
      const ema = this.mediaMovilExponencial(datos, 0.3, periodosAdelante);
      predicciones.push(ema);
      pesos.push(0.7); // Peso fijo para EMA
      algoritmos.push('media_movil');
    } catch (error) {
      // Si falla EMA, continuar
    }

    // Análisis de estacionalidad
    const estacionalidad = this.detectarEstacionalidad(datos);
    if (estacionalidad.detectada && datos.length >= 12) {
      const mesActual = new Date().getMonth();
      const factorEstacional = estacionalidad.factoresEstacionales[mesActual] || 1;
      const promedioReciente = datos.slice(-3).reduce((sum, d) => sum + d.valor, 0) / 3;
      const prediccionEstacional = promedioReciente * factorEstacional;
      
      predicciones.push(prediccionEstacional);
      pesos.push(estacionalidad.intensidad);
      algoritmos.push('estacional');
    }

    if (predicciones.length === 0) {
      // Fallback: promedio de los últimos valores
      const ultimosValores = datos.slice(-Math.min(3, datos.length));
      const promedio = ultimosValores.reduce((sum, d) => sum + d.valor, 0) / ultimosValores.length;
      return {
        prediccion: promedio,
        confianza: 30,
        algoritmos: ['promedio_simple']
      };
    }

    // Calcular predicción ponderada
    const sumaPesos = pesos.reduce((sum, peso) => sum + peso, 0);
    const prediccionFinal = predicciones.reduce((sum, pred, i) => 
      sum + pred * (pesos[i] / sumaPesos), 0
    );

    // Calcular confianza basada en consistencia de predicciones
    const desviacion = this.calcularDesviacionEstandar(predicciones);
    const promedioPred = predicciones.reduce((sum, pred) => sum + pred, 0) / predicciones.length;
    const coeficienteVariacion = promedioPred > 0 ? desviacion / promedioPred : 1;
    const confianza = Math.max(20, Math.min(95, 90 - coeficienteVariacion * 100));

    return {
      prediccion: Math.max(0, prediccionFinal),
      confianza,
      algoritmos
    };
  }

  /**
   * Calcula la tendencia de los datos recientes
   * @param datos Datos para calcular tendencia
   * @returns Tendencia promedio por período
   */
  private static calcularTendencia(datos: DatoTemporal[]): number {
    if (datos.length < 2) return 0;
    
    let sumaTendencias = 0;
    for (let i = 1; i < datos.length; i++) {
      sumaTendencias += datos[i].valor - datos[i-1].valor;
    }
    
    return sumaTendencias / (datos.length - 1);
  }

  /**
   * Calcula la variación trimestral de factores estacionales
   * @param factores Array de factores estacionales mensuales
   * @returns Variación trimestral
   */
  private static calcularVariacionTrimestral(factores: number[]): number {
    const trimestres = [
      factores.slice(0, 3),   // Q1
      factores.slice(3, 6),   // Q2
      factores.slice(6, 9),   // Q3
      factores.slice(9, 12)   // Q4
    ];

    const promediosTrimestre = trimestres.map(trim => 
      trim.reduce((sum, val) => sum + val, 0) / trim.length
    );

    return this.calcularDesviacionEstandar(promediosTrimestre);
  }

  /**
   * Calcula la desviación estándar de un array de números
   * @param valores Array de valores numéricos
   * @returns Desviación estándar
   */
  private static calcularDesviacionEstandar(valores: number[]): number {
    if (valores.length === 0) return 0;
    
    const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
    
    return Math.sqrt(varianza);
  }

  /**
   * Detecta anomalías en los datos usando el método IQR
   * @param datos Array de datos temporales
   * @returns Array de índices de datos anómalos
   */
  static detectarAnomalias(datos: DatoTemporal[]): number[] {
    if (datos.length < 4) return [];

    const valores = datos.map(d => d.valor).sort((a, b) => a - b);
    const n = valores.length;
    
    // Calcular cuartiles
    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = valores[q1Index];
    const q3 = valores[q3Index];
    const iqr = q3 - q1;
    
    // Límites para anomalías
    const limiteInferior = q1 - 1.5 * iqr;
    const limiteSuperior = q3 + 1.5 * iqr;
    
    // Encontrar índices de anomalías
    const anomalias: number[] = [];
    datos.forEach((dato, index) => {
      if (dato.valor < limiteInferior || dato.valor > limiteSuperior) {
        anomalias.push(index);
      }
    });
    
    return anomalias;
  }

  /**
   * Calcula métricas de precisión de predicciones pasadas
   * @param predicciones Array de predicciones realizadas
   * @param valoresReales Array de valores reales correspondientes
   * @returns Métricas de precisión
   */
  static calcularPrecision(predicciones: number[], valoresReales: number[]): {
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  } {
    if (predicciones.length !== valoresReales.length || predicciones.length === 0) {
      throw new Error('Los arrays deben tener la misma longitud y no estar vacíos');
    }

    const n = predicciones.length;
    let sumErrorAbsoluto = 0;
    let sumErrorPorcentual = 0;
    let sumErrorCuadrado = 0;

    for (let i = 0; i < n; i++) {
      const error = Math.abs(predicciones[i] - valoresReales[i]);
      sumErrorAbsoluto += error;
      
      if (valoresReales[i] !== 0) {
        sumErrorPorcentual += (error / Math.abs(valoresReales[i])) * 100;
      }
      
      sumErrorCuadrado += Math.pow(predicciones[i] - valoresReales[i], 2);
    }

    return {
      mae: sumErrorAbsoluto / n,
      mape: sumErrorPorcentual / n,
      rmse: Math.sqrt(sumErrorCuadrado / n)
    };
  }
}