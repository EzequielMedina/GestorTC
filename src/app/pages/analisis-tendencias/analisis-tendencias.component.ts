import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { TendenciaService } from '../../services/tendencia.service';
import { AnalisisTendencias, TipoTendencia } from '../../models/tendencia.model';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-analisis-tendencias',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    BaseChartDirective
  ],
  templateUrl: './analisis-tendencias.component.html',
  styleUrls: ['./analisis-tendencias.component.css']
})
export class AnalisisTendenciasComponent implements OnInit, OnDestroy {
  analisis$: Observable<AnalisisTendencias>;
  analisis?: AnalisisTendencias;

  // Gráfico de líneas: Comparación mensual
  lineChartType: ChartType = 'line';
  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `$${context.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            return '$' + Number(value).toLocaleString('es-AR');
          }
        }
      }
    }
  };

  // Gráfico de barras: Comparación anual
  barChartType: ChartType = 'bar';
  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `$${context.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            return '$' + Number(value).toLocaleString('es-AR');
          }
        }
      }
    }
  };

  private subscriptions = new Subscription();

  constructor(private tendenciaService: TendenciaService) {
    this.analisis$ = this.tendenciaService.obtenerAnalisisTendencias$();
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.analisis$.subscribe(analisis => {
        this.analisis = analisis;
        this.actualizarGraficos();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  actualizarGraficos(): void {
    if (!this.analisis) return;

    // Gráfico de líneas: Comparación mensual
    const meses = this.analisis.comparacionesMensuales.map(c => this.formatearMes(c.mes));
    const montos = this.analisis.comparacionesMensuales.map(c => c.monto);
    const variaciones = this.analisis.comparacionesMensuales.map(c => c.variacionPorcentual);

    this.lineChartData = {
      labels: meses,
      datasets: [
        {
          label: 'Gastos Mensuales',
          data: montos,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Variación %',
          data: variaciones,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };

    this.lineChartOptions = {
      ...this.lineChartOptions,
      scales: {
        ...this.lineChartOptions?.scales,
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: {
            callback: (value) => {
              return Number(value).toFixed(1) + '%';
            }
          }
        }
      }
    };

    // Gráfico de barras: Comparación anual
    const años = this.analisis.comparacionesAnuales.map(c => c.año.toString());
    const montosAnuales = this.analisis.comparacionesAnuales.map(c => c.monto);

    this.barChartData = {
      labels: años,
      datasets: [
        {
          label: 'Gastos Anuales',
          data: montosAnuales,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  formatearMes(mesKey: string): string {
    const [anio, mes] = mesKey.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(mes) - 1]} ${anio}`;
  }

  getTendenciaClass(tendencia: TipoTendencia): string {
    switch (tendencia) {
      case 'CRECIENTE':
        return 'tendencia-creciente';
      case 'DECRECIENTE':
        return 'tendencia-decreciente';
      default:
        return 'tendencia-estable';
    }
  }

  getTendenciaIcon(tendencia: TipoTendencia): string {
    switch (tendencia) {
      case 'CRECIENTE':
        return 'trending_up';
      case 'DECRECIENTE':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }
}

