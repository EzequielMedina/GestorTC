import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { Prestamo, Entrega } from '../../models/prestamo.model';
import { PrestamoService } from '../../services/prestamo.service';
import { EntregaFormComponent } from './entrega-form.component';
import { PrestamoFormComponent } from './prestamo-form.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-prestamo-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatChipsModule
  ],
  template: `
    <div class="container" *ngIf="prestamo">
      <div class="header">
        <button mat-icon-button (click)="volver()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Detalle de Préstamo</h1>
        <span class="spacer"></span>
        <button mat-raised-button color="primary" (click)="editarPrestamo()" style="margin-right: 8px;">
          <mat-icon>edit</mat-icon>
          Editar Préstamo
        </button>
        <button mat-raised-button color="accent" (click)="verAnalisis()">
          <mat-icon>analytics</mat-icon>
          Análisis y Proyecciones
        </button>
      </div>

      <div class="details-grid">
        <mat-card class="info-card">
          <mat-card-header>
            <mat-card-title>{{ prestamo.prestamista }}</mat-card-title>
            <mat-card-subtitle>Estado: 
              <mat-chip-option [color]="getColorEstado(prestamo.estado)" selected>
                {{ prestamo.estado }}
              </mat-chip-option>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="info-row">
              <span class="label">Monto Prestado:</span>
              <span class="value">{{ prestamo.montoPrestado | currency:(prestamo.moneda === 'USD' ? 'USD' : 'ARS') }}</span>
            </div>
            <div class="info-row">
              <span class="label">Moneda:</span>
              <span class="value">{{ prestamo.moneda === 'USD' ? 'Dólares (USD)' : 'Pesos Argentinos (ARS)' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha:</span>
              <span class="value">{{ prestamo.fechaPrestamo | date }}</span>
            </div>
            <div class="info-row">
              <span class="label">Total Pagado:</span>
              <span class="value success">{{ totalPagado | currency:(prestamo.moneda === 'USD' ? 'USD' : 'ARS') }}</span>
            </div>
            <div class="info-row">
              <span class="label">Restante:</span>
              <span class="value warn">{{ (prestamo.montoPrestado - totalPagado) | currency:(prestamo.moneda === 'USD' ? 'USD' : 'ARS') }}</span>
            </div>
            <div class="info-row" *ngIf="prestamo.notas">
              <span class="label">Notas:</span>
              <span class="value">{{ prestamo.notas }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="entregas-card">
          <div class="card-header-actions">
            <h2>Entregas / Pagos</h2>
            <button mat-mini-fab color="primary" (click)="nuevaEntrega()" matTooltip="Registrar Entrega">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          
          <table mat-table [dataSource]="prestamo.entregas || []" class="w-100">
            <!-- Fecha Column -->
            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef> Fecha </th>
              <td mat-cell *matCellDef="let entrega"> {{entrega.fecha | date}} </td>
            </ng-container>

            <!-- Monto Column -->
            <ng-container matColumnDef="monto">
              <th mat-header-cell *matHeaderCellDef> Monto </th>
              <td mat-cell *matCellDef="let entrega"> {{entrega.monto | currency:(prestamo.moneda === 'USD' ? 'USD' : 'ARS')}} </td>
            </ng-container>

            <!-- Tipo Column -->
            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef> Tipo </th>
              <td mat-cell *matCellDef="let entrega"> {{entrega.tipo}} </td>
            </ng-container>

            <!-- Acciones Column -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef> </th>
              <td mat-cell *matCellDef="let entrega">
                <button mat-icon-button color="primary" (click)="editarEntrega(entrega)" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="eliminarEntrega(entrega)" matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="!prestamo.entregas || prestamo.entregas.length === 0" class="no-data">
            <p>No hay entregas registradas</p>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: var(--spacing-lg);
      max-width: 1200px;
      margin: 0 auto;
      background: var(--bg);
      min-height: 100vh;
    }
    .header {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: var(--primary-gradient);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
    }
    .header h1 {
      margin: 0;
      color: var(--text-inverse);
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
    }
    .spacer {
      flex: 1;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: var(--spacing-lg);
    }
    @media (max-width: 768px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }
    mat-card {
      background: var(--surface) !important;
      border-radius: var(--radius) !important;
      box-shadow: var(--shadow-sm) !important;
      border: 1px solid var(--border-light) !important;
    }
    .info-card, .entregas-card {
      height: 100%;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--border-light);
    }
    .label {
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
    }
    .value {
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
    }
    .success {
      color: var(--success) !important;
      font-weight: var(--font-weight-semibold) !important;
    }
    .warn {
      color: var(--danger) !important;
      font-weight: var(--font-weight-semibold) !important;
    }
    .card-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-light);
      margin-bottom: var(--spacing-md);
    }
    .card-header-actions h2 {
      margin: 0;
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
    }
    .w-100 {
      width: 100%;
    }
    table {
      width: 100%;
    }
    ::ng-deep .mat-mdc-table {
      background: var(--surface) !important;
    }
    ::ng-deep .mat-mdc-header-row {
      background: var(--bg) !important;
    }
    ::ng-deep .mat-mdc-header-cell {
      color: var(--text-primary) !important;
      font-weight: var(--font-weight-semibold) !important;
      font-size: var(--font-size-sm) !important;
      border-bottom: 2px solid var(--border-light) !important;
    }
    ::ng-deep .mat-mdc-row {
      border-bottom: 1px solid var(--border-light) !important;
    }
    ::ng-deep .mat-mdc-cell {
      color: var(--text-primary) !important;
      font-size: var(--font-size-base) !important;
    }
    ::ng-deep .mat-mdc-row:hover {
      background: var(--bg) !important;
    }
    .no-data {
      padding: var(--spacing-2xl);
      text-align: center;
      color: var(--text-secondary);
    }
  `]
})
export class PrestamoDetailComponent implements OnInit {
  prestamo: Prestamo | undefined;
  displayedColumns: string[] = ['fecha', 'monto', 'tipo', 'acciones'];
  totalPagado: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private prestamoService: PrestamoService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.prestamoService.getPrestamoById(id).subscribe(p => {
        this.prestamo = p;
        this.calcularTotalPagado();
      });
    }
  }

  calcularTotalPagado(): void {
    if (this.prestamo && this.prestamo.entregas) {
      this.totalPagado = this.prestamo.entregas.reduce((acc, curr) => acc + curr.monto, 0);
    } else {
      this.totalPagado = 0;
    }
  }

  volver(): void {
    this.router.navigate(['/prestamos']);
  }

  verAnalisis(): void {
    if (this.prestamo) {
      this.router.navigate(['/prestamos', this.prestamo.id, 'analisis']);
    }
  }

  editarPrestamo(): void {
    if (!this.prestamo) return;

    const dialogRef = this.dialog.open(PrestamoFormComponent, {
      width: '500px',
      data: this.prestamo
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recargar el préstamo
        this.prestamoService.getPrestamoById(this.prestamo!.id).subscribe(p => {
          this.prestamo = p;
          this.calcularTotalPagado();
        });
      }
    });
  }

  nuevaEntrega(): void {
    if (!this.prestamo) return;

    const dialogRef = this.dialog.open(EntregaFormComponent, {
      width: '400px',
      data: { prestamoId: this.prestamo.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recargar el préstamo para ver la nueva entrega
        this.prestamoService.getPrestamoById(this.prestamo!.id).subscribe(p => {
          this.prestamo = p;
          this.calcularTotalPagado();
        });
      }
    });
  }

  editarEntrega(entrega: Entrega): void {
    if (!this.prestamo) return;

    const dialogRef = this.dialog.open(EntregaFormComponent, {
      width: '400px',
      data: { prestamoId: this.prestamo.id, entrega: entrega }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recargar el préstamo
        this.prestamoService.getPrestamoById(this.prestamo!.id).subscribe(p => {
          this.prestamo = p;
          this.calcularTotalPagado();
        });
      }
    });
  }

  eliminarEntrega(entrega: Entrega): void {
    if (!this.prestamo) return;

    this.notificationService.confirm(
      'Confirmar eliminación',
      '¿Está seguro de eliminar esta entrega?',
      'Eliminar',
      'Cancelar'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.prestamoService.eliminarEntrega(this.prestamo!.id, entrega.id);
        // Recargar
        this.prestamoService.getPrestamoById(this.prestamo!.id).subscribe(p => {
          this.prestamo = p;
          this.calcularTotalPagado();
        });
      }
    });
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'ACTIVO': return 'primary';
      case 'FINALIZADO': return 'accent';
      case 'CANCELADO': return 'warn';
      default: return '';
    }
  }
}
