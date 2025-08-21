import { Component, OnInit, OnDestroy, ViewChildren, QueryList, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

import { PrediccionGasto, Alerta, Recomendacion, ScoreFinanciero, TendenciaAnalisis } from '../../models/dashboard-predictivo.model';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { PrediccionService } from '../../services/prediccion.service';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';

@Component({
  selector: 'app-dashboard-predictivo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard-predictivo.component.html',
  styleUrls: ['./dashboard-predictivo.component.css']
})
export class DashboardPredictivoComponent implements OnInit, OnDestroy {
  // Datos principales
  predicciones: PrediccionGasto[] = [];
  alertas: Alerta[] = [];
  recomendaciones: Recomendacion[] = [];
  scoreFinanciero: ScoreFinanciero | null = null;
  tendenciaAnalisis: TendenciaAnalisis | null = null;
  tarjetas: Tarjeta[] = [];
  gastos: Gasto[] = [];

  // Referencias a charts
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;
  private cdr = inject(ChangeDetectorRef);

  // Filtros
  mesesProyeccion = 3;
  tarjetaSeleccionada = 'todas';
  tipoAnalisis = 'general';
  filtroActual: any = {};

  // Configuración de gráficos
  public prediccionGastosData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public prediccionGastosOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Predicción de Gastos Futuros',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Monto Predicho ($)',
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 },
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Confianza (%)',
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 },
          callback: function(value: any) {
            return value + '%';
          }
        },
        grid: {
          drawOnChartArea: false
        }
      },
      x: {
        title: {
          display: true,
          text: 'Período',
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  public tendenciaData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public tendenciaOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Análisis de Tendencias',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Valor',
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Período',
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  public scoreDistribucionData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: []
  };

  public scoreDistribucionOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Distribución del Score Financiero',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    }
  };

  // Servicios
  private prediccionService = inject(PrediccionService);
  private tarjetaService = inject(TarjetaService);
  private gastoService = inject(GastoService);

  // Subscripciones
  private prediccionesSubscription: any;
  private alertasSubscription: any;
  private recomendacionesSubscription: any;
  private scoreSubscription: any;
  private tarjetasSubscription: any;
  private gastosSubscription: any;
  private isUpdating = false;

  ngOnInit(): void {
    this.cargarDatos();
    this.suscribirCambios();
  }

  ngOnDestroy(): void {
    if (this.prediccionesSubscription) {
      this.prediccionesSubscription.unsubscribe();
    }
    if (this.alertasSubscription) {
      this.alertasSubscription.unsubscribe();
    }
    if (this.recomendacionesSubscription) {
      this.recomendacionesSubscription.unsubscribe();
    }
    if (this.scoreSubscription) {
      this.scoreSubscription.unsubscribe();
    }
    if (this.tarjetasSubscription) {
      this.tarjetasSubscription.unsubscribe();
    }
    if (this.gastosSubscription) {
      this.gastosSubscription.unsubscribe();
    }
  }

  cargarDatos(): void {
    console.log('🔄 Dashboard: Iniciando carga de datos...');
    
    // Cargar datos base
    this.tarjetaService.getTarjetas$().subscribe(tarjetas => {
      this.tarjetas = tarjetas;
      console.log('📊 Dashboard: Tarjetas cargadas:', tarjetas.length);
    });
    
    this.gastoService.getGastos$().subscribe(gastos => {
      this.gastos = gastos;
      console.log('💰 Dashboard: Gastos cargados:', gastos.length);
      console.log('💰 Dashboard: Primeros 3 gastos:', gastos.slice(0, 3));
    });

    // Generar predicciones y análisis
    this.prediccionService.generarPredicciones();
    this.prediccionService.generarAlertas();
    this.prediccionService.generarRecomendaciones();
    this.prediccionService.calcularScoreFinanciero();
  }

  suscribirCambios(): void {
    this.prediccionesSubscription = this.prediccionService.getPredicciones$().subscribe(predicciones => {
      this.predicciones = predicciones;
      this.actualizarGraficoPredicciones();
    });

    this.alertasSubscription = this.prediccionService.getAlertas$().subscribe(alertas => {
      this.alertas = alertas;
    });

    this.recomendacionesSubscription = this.prediccionService.getRecomendaciones$().subscribe(recomendaciones => {
      this.recomendaciones = recomendaciones;
    });

    // Calcular score financiero
    this.prediccionService.calcularScoreFinanciero().then((score: ScoreFinanciero) => {
      this.scoreFinanciero = score;
      this.actualizarGraficoScore();
    });

    this.tarjetasSubscription = this.tarjetaService.getTarjetas$().subscribe(tarjetas => {
      console.log('📊 Tarjetas recibidas:', tarjetas.length);
      this.tarjetas = tarjetas;
      this.actualizarAnalisis();
    });

    this.gastosSubscription = this.gastoService.getGastos$().subscribe(gastos => {
      console.log('💰 Gastos recibidos:', gastos.length);
      this.gastos = gastos;
      this.actualizarAnalisis();
      this.cdr.detectChanges(); // Forzar detección de cambios
    });
  }

  actualizarAnalisis(): void {
    // Evitar múltiples llamadas simultáneas
    setTimeout(() => {
      this.prediccionService.generarPredicciones();
      this.prediccionService.generarAlertas();
      this.prediccionService.generarRecomendaciones();
      this.prediccionService.calcularScoreFinanciero();
    }, 100);
  }

  onFiltroChange(filtro: any): void {
    this.filtroActual = filtro;
    this.actualizarAnalisis();
  }

  onTipoAnalisisChange(): void {
    this.actualizarAnalisis();
  }

  onMesesProyeccionChange(): void {
    this.actualizarAnalisis();
  }

  actualizarGraficoPredicciones(): void {
    console.log('📊 Actualizando gráfico de predicciones...');
    console.log('Predicciones disponibles:', this.predicciones.length);
    
    if (!this.predicciones || this.predicciones.length === 0) {
      console.log('⚠️ No hay predicciones disponibles');
      this.prediccionGastosData = { labels: [], datasets: [] };
      return;
    }

    const prediccionesFiltradas = this.tarjetaSeleccionada === 'todas' 
      ? this.predicciones 
      : this.predicciones.filter(p => p.tarjetaId === this.tarjetaSeleccionada);

    console.log('Predicciones filtradas:', prediccionesFiltradas.length);
    console.log('Tarjeta seleccionada:', this.tarjetaSeleccionada);

    const labels = prediccionesFiltradas.map(p => 
      `${p.mes}/${p.anio}`
    );

    const datasets = [
      {
        label: 'Predicción de Gastos',
        data: prediccionesFiltradas.map(p => p.montoPredicho),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: false,
        tension: 0.4
      },
      {
          label: 'Nivel de Confianza (%)',
          data: prediccionesFiltradas.map(p => p.confianza),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1'
        }
    ];

    console.log('Labels del gráfico:', labels);
    console.log('Datos del primer dataset:', datasets[0].data);
    console.log('Datos del segundo dataset:', datasets[1].data);

    this.prediccionGastosData = { labels, datasets };
    // Solo actualizar charts si hay cambios significativos
    if (labels.length > 0) {
      console.log('✅ Actualizando charts con', labels.length, 'puntos de datos');
      this.actualizarCharts();
    } else {
      console.log('⚠️ No hay datos para mostrar en el gráfico');
    }
  }

  actualizarGraficoScore(): void {
    if (!this.scoreFinanciero) {
      this.scoreDistribucionData = { labels: [], datasets: [] };
      return;
    }

    const labels = this.scoreFinanciero.factores.map(f => f.nombre);
    const data = this.scoreFinanciero.factores.map(f => f.valor);
    const colors = this.generarColoresScore(this.scoreFinanciero.factores.length);

    this.scoreDistribucionData = {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };

    this.actualizarCharts();
  }

  private generarColoresScore(cantidad: number): string[] {
    const colores = [
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', 
      '#F44336', '#00BCD4', '#FFEB3B', '#795548'
    ];
    return colores.slice(0, cantidad);
  }

  getTendenciaIcon(tendencia: string): string {
    switch (tendencia) {
      case 'ascendente': return 'trending_up';
      case 'descendente': return 'trending_down';
      case 'estable': return 'trending_flat';
      default: return 'show_chart';
    }
  }

  getTendenciaColor(tendencia: string): string {
    switch (tendencia) {
      case 'ascendente': return '#F44336';
      case 'descendente': return '#4CAF50';
      case 'estable': return '#2196F3';
      default: return '#757575';
    }
  }

  private actualizarCharts(): void {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    setTimeout(() => {
      try {
        this.charts?.forEach(chart => {
          if (chart && chart.chart) {
            chart.update('none');
          }
        });
      } catch (error) {
        console.warn('Error updating charts:', error);
      } finally {
        this.isUpdating = false;
      }
    }, 200);
  }

  getAlertaIcon(tipo: string): string {
    switch (tipo) {
      case 'limite_cercano': return 'warning';
      case 'gasto_inusual': return 'trending_up';
      case 'patron_riesgo': return 'error';
      case 'oportunidad': return 'lightbulb';
      default: return 'info';
    }
  }

  getAlertaColor(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'warn';
      case 'media': return 'accent';
      case 'baja': return 'primary';
      default: return 'primary';
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  }

  getScoreLabel(score: number): string {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bueno';
    if (score >= 40) return 'Regular';
    return 'Necesita Mejora';
  }

  marcarAlertaComoLeida(alerta: Alerta): void {
    this.prediccionService.marcarAlertaComoLeida(alerta.id);
  }

  aplicarRecomendacion(recomendacion: Recomendacion): void {
    // Implementar lógica para aplicar recomendación
    console.log('Aplicando recomendación:', recomendacion);
  }

  exportarPredicciones(): void {
    // Implementar exportación de predicciones
    console.log('Exportando predicciones...');
  }

  configurarAlertas(): void {
    // Implementar configuración de alertas personalizadas
    console.log('Configurando alertas...');
  }

  // Métodos de debug
  cargarDatosPrueba(): void {
    console.log('🧪 Cargando datos de prueba...');
    
    // Crear tarjeta de prueba
    const tarjetaPrueba = {
      id: 'test-1',
      nombre: 'Tarjeta Prueba',
      limite: 50000,
      fechaVencimiento: '2025-12-31',
      banco: 'Banco Prueba'
    };
    
    // Crear gastos de prueba
    const gastosPrueba = [
      {
        id: 'gasto-1',
        tarjetaId: 'test-1',
        descripcion: 'Supermercado',
        monto: 15000,
        fecha: '2025-01-15'
      },
      {
        id: 'gasto-2',
        tarjetaId: 'test-1',
        descripcion: 'Combustible',
        monto: 8000,
        fecha: '2025-01-10'
      },
      {
        id: 'gasto-3',
        tarjetaId: 'test-1',
        descripcion: 'Restaurante',
        monto: 12000,
        fecha: '2025-01-08'
      }
    ];
    
    // Guardar en localStorage
    localStorage.setItem('gestor_tc_tarjetas', JSON.stringify([tarjetaPrueba]));
    localStorage.setItem('gestor_tc_gastos', JSON.stringify(gastosPrueba));
    
    // Recargar datos
    this.recargarDatos();
  }
  
  recargarDatos(): void {
    console.log('🔄 Recargando datos...');
    this.cargarDatos();
    this.suscribirCambios();
  }

  forzarGeneracionPredicciones(): void {
    console.log('🔄 Forzando generación de predicciones...');
    console.log('Gastos disponibles:', this.gastos.length);
    console.log('Tarjetas disponibles:', this.tarjetas.length);
    
    // Forzar la generación de predicciones
    this.prediccionService.generarPredicciones().then(() => {
      console.log('✅ Predicciones generadas forzadamente');
      // Actualizar gráficos después de generar predicciones
      setTimeout(() => {
        this.actualizarGraficoPredicciones();
        this.cdr.detectChanges();
      }, 500);
    }).catch(error => {
      console.error('❌ Error al generar predicciones:', error);
    });
  }

  forzarCalculoScore(): void {
    console.log('🎯 Forzando cálculo de score financiero...');
    console.log('Gastos disponibles:', this.gastos.length);
    console.log('Tarjetas disponibles:', this.tarjetas.length);
    
    // Forzar el cálculo del score
    this.prediccionService.calcularScoreFinanciero().then((score: ScoreFinanciero) => {
      console.log('✅ Score calculado forzadamente:', score);
      this.scoreFinanciero = score;
      this.actualizarGraficoScore();
      this.cdr.detectChanges();
    }).catch(error => {
      console.error('❌ Error al calcular score:', error);
    });
  }
}