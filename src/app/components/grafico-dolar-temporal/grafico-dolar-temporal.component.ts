import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ViewChildren, QueryList } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { ArgentinaDatosService } from '../../services/argentina-datos.service';
import { 
  CotizacionDolar, 
  RangoCotizacion, 
  DatoGraficoCotizacion, 
  ResumenCotizaciones,
  EstadoCargaCotizaciones 
} from '../../models/cotizacion-dolar.model';

@Component({
  selector: 'app-grafico-dolar-temporal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatSelectModule,
    BaseChartDirective
  ],
  templateUrl: './grafico-dolar-temporal.component.html',
  styleUrls: ['./grafico-dolar-temporal.component.css']
})
export class GraficoDolarTemporalComponent implements OnInit, OnDestroy {
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;

  private destroy$ = new Subject<void>();
  
  // Datos del gráfico
  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };
  
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Fecha'
        },
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Cotización (ARS)'
        },
        ticks: {
          callback: function(value) {
            return '$' + Number(value).toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          }
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Evolución del Dólar Oficial',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = Number(context.parsed.y).toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
              minimumFractionDigits: 2
            });
            return `${label}: ${value}`;
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };
  

  
  // Filtros
  public fechaDesde: Date = new Date();
  public fechaHasta: Date = new Date();
  public tipoValor: 'venta' | 'compra' | 'ambos' = 'venta';
  
  // Estado
  public estadoCarga: EstadoCargaCotizaciones = {
    cargando: false,
    error: null,
    progreso: 0,
    totalDias: 0,
    diasCargados: 0
  };
  
  public resumen: ResumenCotizaciones | null = null;
  public cotizaciones: CotizacionDolar[] = [];
  public fechaActual: Date = new Date();
  
  // Opciones de tipo de valor
  public tiposValor = [
    { value: 'venta', label: 'Precio de Venta' },
    { value: 'compra', label: 'Precio de Compra' },
    { value: 'ambos', label: 'Ambos Precios' }
  ];

  constructor(
    private argentinaDatosService: ArgentinaDatosService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private snackBar: MatSnackBar
  ) {
    // Inicializar fechas (últimos 30 días)
    this.fechaHasta = new Date();
    this.fechaDesde = new Date();
    this.fechaDesde.setDate(this.fechaDesde.getDate() - 30);
  }

  ngOnInit(): void {
    // Suscribirse al estado de carga
    this.argentinaDatosService.estadoCarga$
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => {
        this.estadoCarga = estado;
        this.cdr.detectChanges();
      });
    
    // Cargar datos iniciales
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los datos de cotización para el rango seleccionado
   */
  cargarDatos(): void {
    if (this.fechaDesde > this.fechaHasta) {
      this.mostrarError('La fecha desde debe ser menor o igual a la fecha hasta');
      return;
    }
    
    const rango: RangoCotizacion = {
      fechaDesde: this.formatearFecha(this.fechaDesde),
      fechaHasta: this.formatearFecha(this.fechaHasta)
    };
    
    console.log('Cargando cotizaciones para rango:', rango);
    
    this.argentinaDatosService.obtenerCotizacionesRango(rango)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cotizaciones) => {
          console.log('Cotizaciones obtenidas:', cotizaciones);
          this.cotizaciones = cotizaciones;
          this.actualizarGrafico();
          this.calcularResumen();
        },
        error: (error) => {
          console.error('Error al cargar cotizaciones:', error);
          this.mostrarError('Error al cargar las cotizaciones. Intente nuevamente.');
        }
      });
  }

  /**
   * Actualiza el gráfico con los datos actuales
   */
  private actualizarGrafico(): void {
    if (this.cotizaciones.length === 0) {
      this.lineChartData = {
        labels: [],
        datasets: []
      };
      return;
    }

    const datosVenta = this.argentinaDatosService.convertirParaGrafico(this.cotizaciones, true);
    const datosCompra = this.argentinaDatosService.convertirParaGrafico(this.cotizaciones, false);
    
    const labels = datosVenta.map(d => d.fechaFormateada);
    const datasets: any[] = [];
    
    if (this.tipoValor === 'venta' || this.tipoValor === 'ambos') {
      datasets.push({
        label: 'Precio de Venta',
        data: datosVenta.map(d => d.valor),
        borderColor: '#006666',
        backgroundColor: 'rgba(0, 102, 102, 0.1)',
        tension: 0.4,
        fill: this.tipoValor === 'venta',
        pointRadius: 3,
        pointHoverRadius: 5
      });
    }
    
    if (this.tipoValor === 'compra' || this.tipoValor === 'ambos') {
      datasets.push({
        label: 'Precio de Compra',
        data: datosCompra.map(d => d.valor),
        borderColor: '#008584',
        backgroundColor: 'rgba(0, 133, 132, 0.1)',
        tension: 0.4,
        fill: this.tipoValor === 'compra',
        pointRadius: 3,
        pointHoverRadius: 5
      });
    }
    
    this.lineChartData = {
      labels,
      datasets
    };
    
    // Actualizar título del gráfico
    if (this.lineChartOptions?.plugins?.title) {
      this.lineChartOptions.plugins.title.text = 
        `Evolución del Dólar Oficial (${this.formatearFechaLegible(this.fechaDesde)} - ${this.formatearFechaLegible(this.fechaHasta)})`;
    }
    
    // Forzar actualización del gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      if (this.charts) {
        this.charts.forEach(chart => {
          if (chart.chart) {
            chart.chart.update();
          }
        });
      }
    });
  }

  /**
   * Calcula el resumen estadístico
   */
  private calcularResumen(): void {
    if (this.cotizaciones.length === 0) {
      this.resumen = null;
      return;
    }
    
    const usarVenta = this.tipoValor !== 'compra';
    this.resumen = this.argentinaDatosService.calcularResumen(this.cotizaciones, usarVenta);
  }

  /**
   * Maneja el cambio de fecha desde
   */
  onFechaDesdeChange(fecha: Date): void {
    this.fechaDesde = fecha;
  }

  /**
   * Maneja el cambio de fecha hasta
   */
  onFechaHastaChange(fecha: Date): void {
    this.fechaHasta = fecha;
  }

  /**
   * Maneja el cambio de tipo de valor
   */
  onTipoValorChange(): void {
    this.actualizarGrafico();
    this.calcularResumen();
  }

  /**
   * Aplica los filtros y recarga los datos
   */
  aplicarFiltros(): void {
    this.cargarDatos();
  }

  /**
   * Establece un rango predefinido de fechas
   */
  establecerRango(dias: number): void {
    this.fechaHasta = new Date();
    this.fechaDesde = new Date();
    this.fechaDesde.setDate(this.fechaDesde.getDate() - dias);
    this.cargarDatos();
  }

  /**
   * Limpia el caché y recarga los datos
   */
  limpiarCache(): void {
    this.argentinaDatosService.limpiarCache();
    this.cargarDatos();
    this.mostrarMensaje('Caché limpiado. Recargando datos...');
  }

  /**
   * Formatea una fecha para la API (YYYY-MM-DD)
   */
  private formatearFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  /**
   * Formatea una fecha para mostrar al usuario
   */
  formatearFechaLegible(fecha: Date): string {
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Muestra un mensaje de error
   */
  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Muestra un mensaje informativo
   */
  private mostrarMensaje(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Obtiene el texto del progreso de carga
   */
  get textoProgreso(): string {
    if (!this.estadoCarga.cargando) return '';
    return `Cargando ${this.estadoCarga.diasCargados} de ${this.estadoCarga.totalDias} cotizaciones...`;
  }

  /**
   * Verifica si hay datos para mostrar
   */
  get tieneDatos(): boolean {
    return this.cotizaciones.length > 0;
  }

  /**
   * Obtiene el color de la variación
   */
  get colorVariacion(): string {
    if (!this.resumen) return '';
    return this.resumen.variacionTotal >= 0 ? 'var(--success-green)' : 'var(--danger-red)';
  }

  /**
   * Obtiene el ícono de la variación
   */
  get iconoVariacion(): string {
    if (!this.resumen) return 'trending_flat';
    return this.resumen.variacionTotal >= 0 ? 'trending_up' : 'trending_down';
  }
}