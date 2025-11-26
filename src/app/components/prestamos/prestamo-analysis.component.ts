import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSliderModule } from '@angular/material/slider';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Prestamo } from '../../models/prestamo.model';
import { PrestamoService } from '../../services/prestamo.service';
import { PrestamoProjectionService, ProjectionScenario } from '../../services/prestamo-projection.service';

@Component({
  selector: 'app-prestamo-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatSliderModule,
    BaseChartDirective
  ],
  template: `
    <div class="container" *ngIf="prestamo">
      <div class="header">
        <button mat-icon-button (click)="volver()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Análisis y Proyecciones - {{ prestamo.prestamista }}</h1>
      </div>

      <!-- Estadísticas Generales -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon" style="background-color: #4caf50;">
            <mat-icon>paid</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">Total Pagado</div>
            <div class="stat-value">{{ statistics.totalPaid | currency }}</div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon" style="background-color: #f44336;">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">Saldo Restante</div>
            <div class="stat-value">{{ statistics.remainingBalance | currency }}</div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon" style="background-color: #2196f3;">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">Progreso</div>
            <div class="stat-value">{{ statistics.progress | number:'1.1-1' }}%</div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon" style="background-color: #ff9800;">
            <mat-icon>calendar_today</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">Pagos Realizados</div>
            <div class="stat-value">{{ statistics.totalPayments }}</div>
          </div>
        </mat-card>
      </div>

      <!-- Tabs para diferentes vistas -->
      <mat-tab-group>
        <!-- Tab 1: Gráficos de Progreso -->
        <mat-tab label="Progreso Actual">
          <div class="tab-content">
            <div class="charts-grid">
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Distribución del Préstamo</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart
                    [data]="progressChartData"
                    [type]="'doughnut'"
                    [options]="doughnutChartOptions">
                  </canvas>
                </mat-card-content>
              </mat-card>

              <mat-card>
                <mat-card-header>
                  <mat-card-title>Línea de Tiempo de Pagos</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <canvas baseChart
                    [data]="timelineChartData"
                    [type]="'line'"
                    [options]="lineChartOptions">
                  </canvas>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Tab 2: Proyecciones Personalizadas -->
        <mat-tab label="Proyección Personalizada">
          <div class="tab-content">
            <mat-card class="projection-controls">
              <mat-card-header>
                <mat-card-title>Configurar Proyección</mat-card-title>
                <mat-card-subtitle>Ajusta el pago mensual para ver cómo afecta la fecha de finalización</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="control-group">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Pago Mensual</mat-label>
                    <input matInput type="number" [(ngModel)]="customMonthlyPayment" 
                           (ngModelChange)="updateCustomProjection()" 
                           [min]="minMonthlyPayment">
                    <span matPrefix>$&nbsp;</span>
                  </mat-form-field>

                  <div class="slider-container">
                    <label>Ajustar Pago: {{ customMonthlyPayment | currency }}</label>
                    <mat-slider 
                      [min]="minMonthlyPayment" 
                      [max]="maxMonthlyPayment" 
                      [step]="1000"
                      [(ngModel)]="customMonthlyPayment"
                      (ngModelChange)="updateCustomProjection()"
                      class="full-width">
                      <input matSliderThumb>
                    </mat-slider>
                  </div>
                </div>

                <div class="projection-summary" *ngIf="customProjection">
                  <div class="summary-item highlight-item">
                    <span class="label">💰 Si pagas {{ customMonthlyPayment | currency }} por mes:</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">📅 Fecha de Finalización:</span>
                    <span class="value success">{{ customProjection.completionDate | date:'longDate' }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">⏱️ Meses Restantes:</span>
                    <span class="value">{{ customProjection.totalMonths }} meses</span>
                  </div>
                  <div class="summary-item">
                    <span class="label">📊 Total a Pagar:</span>
                    <span class="value">{{ customMonthlyPayment * customProjection.totalMonths | currency }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card *ngIf="customProjection">
              <mat-card-header>
                <mat-card-title>Proyección de Pagos</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <canvas baseChart
                  [data]="projectionChartData"
                  [type]="'line'"
                  [options]="lineChartOptions">
                </canvas>
              </mat-card-content>
            </mat-card>

            <!-- Tabla detallada de pagos mes a mes -->
            <mat-card *ngIf="customProjection && customProjection.projections.length > 0">
              <mat-card-header>
                <mat-card-title>Detalle Mes a Mes</mat-card-title>
                <mat-card-subtitle>Proyección de cómo se cancelaría el préstamo</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="table-container">
                  <table class="projection-table">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th>Fecha</th>
                        <th>Pago</th>
                        <th>Saldo Restante</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let proj of customProjection.projections; let i = index" 
                          [class.final-payment]="i === customProjection.projections.length - 1">
                        <td>{{ proj.month }}</td>
                        <td>{{ proj.date | date:'MMM yyyy' }}</td>
                        <td class="amount">{{ proj.payment | currency }}</td>
                        <td class="amount" [class.zero-balance]="proj.remainingBalance === 0">
                          {{ proj.remainingBalance | currency }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Tab 3: Escenarios Comparativos -->
        <mat-tab label="Escenarios de Pago">
          <div class="tab-content">
            <div class="scenarios-grid">
              <mat-card *ngFor="let scenario of scenarios" class="scenario-card">
                <mat-card-header>
                  <mat-card-title>{{ scenario.name }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="scenario-detail">
                    <div class="detail-row">
                      <span class="label">Pago Mensual:</span>
                      <span class="value highlight">{{ scenario.monthlyPayment | currency }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Duración:</span>
                      <span class="value">{{ scenario.totalMonths }} meses</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Finalización:</span>
                      <span class="value">{{ scenario.completionDate | date:'MMM yyyy' }}</span>
                    </div>
                  </div>
                  <button mat-raised-button color="primary" 
                          (click)="applyScenario(scenario)"
                          class="full-width">
                    Aplicar Este Escenario
                  </button>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      display: flex;
      align-items: center;
      padding: 16px;
    }
    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
    }
    .stat-icon mat-icon {
      color: white;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .stat-content {
      flex: 1;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }
    .tab-content {
      padding: 24px 0;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }
    .projection-controls {
      margin-bottom: 24px;
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .full-width {
      width: 100%;
    }
    .slider-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .slider-container label {
      font-size: 14px;
      color: #666;
    }
    .projection-summary {
      margin-top: 24px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .summary-item.highlight-item {
      font-size: 16px;
      font-weight: 600;
      color: #2196f3;
      border-bottom: 2px solid #2196f3;
      padding-bottom: 12px;
      margin-bottom: 8px;
    }
    .summary-item .label {
      font-weight: 500;
      color: #666;
    }
    .summary-item .value {
      font-weight: 600;
      color: #333;
    }
    .summary-item .value.success {
      color: #4caf50;
      font-size: 16px;
    }
    .table-container {
      overflow-x: auto;
      margin-top: 16px;
    }
    .projection-table {
      width: 100%;
      border-collapse: collapse;
    }
    .projection-table thead {
      background-color: #f5f5f5;
    }
    .projection-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #666;
      border-bottom: 2px solid #ddd;
    }
    .projection-table td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .projection-table tr:hover {
      background-color: #f9f9f9;
    }
    .projection-table tr.final-payment {
      background-color: #e8f5e9;
      font-weight: 600;
    }
    .projection-table .amount {
      text-align: right;
      font-family: monospace;
    }
    .projection-table .zero-balance {
      color: #4caf50;
      font-weight: 600;
    }
    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }
    .scenario-card {
      height: 100%;
    }
    .scenario-detail {
      margin-bottom: 16px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row .label {
      color: #666;
    }
    .detail-row .value {
      font-weight: 500;
    }
    .detail-row .value.highlight {
      color: #2196f3;
      font-size: 18px;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
      .scenarios-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PrestamoAnalysisComponent implements OnInit {
  prestamo: Prestamo | undefined;
  statistics: any = {};
  scenarios: ProjectionScenario[] = [];
  customMonthlyPayment: number = 0;
  minMonthlyPayment: number = 0;
  maxMonthlyPayment: number = 0;
  customProjection: ProjectionScenario | null = null;

  progressChartData: any;
  timelineChartData: any;
  projectionChartData: any;

  doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private prestamoService: PrestamoService,
    private projectionService: PrestamoProjectionService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.prestamoService.getPrestamoById(id).subscribe(p => {
        if (p) {
          this.prestamo = p;
          this.loadAnalysis();
        }
      });
    }
  }

  loadAnalysis(): void {
    if (!this.prestamo) return;

    // Cargar estadísticas
    this.statistics = this.projectionService.getStatistics(this.prestamo);

    // Cargar escenarios predefinidos
    this.scenarios = this.projectionService.generateScenarios(this.prestamo);

    // Configurar proyección personalizada inicial
    this.minMonthlyPayment = Math.ceil(this.statistics.remainingBalance / 24); // Mínimo: 24 meses
    this.maxMonthlyPayment = this.statistics.remainingBalance; // Máximo: pago completo
    this.customMonthlyPayment = this.scenarios[0]?.monthlyPayment || this.minMonthlyPayment;

    // Generar gráficos
    this.progressChartData = this.projectionService.generateProgressChartData(this.prestamo);
    this.timelineChartData = this.projectionService.generatePaymentTimelineData(this.prestamo);

    // Generar proyección personalizada inicial
    this.updateCustomProjection();
  }

  updateCustomProjection(): void {
    if (!this.prestamo) return;

    const projections = this.projectionService.generateProjection(
      this.prestamo,
      this.customMonthlyPayment
    );

    this.customProjection = {
      name: 'Proyección Personalizada',
      monthlyPayment: this.customMonthlyPayment,
      projections,
      completionDate: projections[projections.length - 1]?.date || '',
      totalMonths: projections.length
    };

    this.projectionChartData = this.projectionService.generateProjectionChartData(projections);
  }

  applyScenario(scenario: ProjectionScenario): void {
    this.customMonthlyPayment = scenario.monthlyPayment;
    this.updateCustomProjection();
  }

  volver(): void {
    if (this.prestamo) {
      this.router.navigate(['/prestamos', this.prestamo.id]);
    } else {
      this.router.navigate(['/prestamos']);
    }
  }
}
