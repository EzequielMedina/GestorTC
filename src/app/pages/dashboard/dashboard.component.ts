import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    RouterLink,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;

  // Configuración de gráfico de barras (tarjetas)
  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      label: 'Uso (%)',
      data: [],
      backgroundColor: '#3b82f6'
    }]
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => `${context.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          font: {
            size: 11
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  // Configuración de gráfico de pastel (categorías)
  pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  };

  pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.dashboardService.getDashboardStats$().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.actualizarGraficos();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del dashboard:', error);
        this.loading = false;
      }
    });
  }

  actualizarGraficos(): void {
    if (!this.stats) return;

    // Gráfico de barras - Tarjetas
    this.barChartData = {
      labels: this.stats.tarjetasConMayorUso.map(t => t.nombre),
      datasets: [{
        label: 'Uso (%)',
        data: this.stats.tarjetasConMayorUso.map(t => t.porcentajeUso),
        backgroundColor: '#3b82f6'
      }]
    };

    // Gráfico de pastel - Categorías
    const colores = this.stats.gastosPorCategoria.map(item => item.categoria.color);
    this.pieChartData = {
      labels: this.stats.gastosPorCategoria.map(item => item.categoria.nombre),
      datasets: [{
        data: this.stats.gastosPorCategoria.map(item => item.total),
        backgroundColor: colores
      }]
    };
  }
}

