import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { Prestamo } from '../../models/prestamo.model';
import { PrestamoService } from '../../services/prestamo.service';
import { PrestamoFormComponent } from './prestamo-form.component';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-prestamo-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <div class="container">
      <div class="header">
        <h1>Préstamos</h1>
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon>add</mat-icon>
          Nuevo Préstamo
        </button>
      </div>

      <mat-card>
        <table mat-table [dataSource]="prestamos" class="w-100">
          <!-- Prestamista Column -->
          <ng-container matColumnDef="prestamista">
            <th mat-header-cell *matHeaderCellDef> Prestamista </th>
            <td mat-cell *matCellDef="let prestamo"> {{prestamo.prestamista}} </td>
          </ng-container>

          <!-- Monto Column -->
          <ng-container matColumnDef="monto">
            <th mat-header-cell *matHeaderCellDef> Monto </th>
            <td mat-cell *matCellDef="let prestamo">
              <span class="currency-badge" [class.usd]="prestamo.moneda === 'USD'">
                {{ prestamo.moneda }}
              </span>
              {{ prestamo.montoPrestado | currency:(prestamo.moneda === 'USD' ? 'USD' : 'ARS') }}
            </td>
          </ng-container>

          <!-- Fecha Column -->
          <ng-container matColumnDef="fecha">
            <th mat-header-cell *matHeaderCellDef> Fecha </th>
            <td mat-cell *matCellDef="let prestamo"> {{prestamo.fechaPrestamo | date}} </td>
          </ng-container>

          <!-- Estado Column -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef> Estado </th>
            <td mat-cell *matCellDef="let prestamo">
              <mat-chip-option [color]="getColorEstado(prestamo.estado)" selected>
                {{prestamo.estado}}
              </mat-chip-option>
            </td>
          </ng-container>

          <!-- Acciones Column -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef> Acciones </th>
            <td mat-cell *matCellDef="let prestamo">
              <button mat-icon-button color="primary" (click)="verDetalle(prestamo, $event)" matTooltip="Ver detalle">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="eliminarPrestamo(prestamo, $event)" matTooltip="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="verDetalle(row)" class="clickable-row"></tr>
        </table>

        <div *ngIf="prestamos.length === 0" class="no-data">
          <p>No hay préstamos registrados</p>
        </div>
      </mat-card>
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
      justify-content: space-between;
      align-items: center;
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
    .w-100 {
      width: 100%;
    }
    mat-card {
      background: var(--surface) !important;
      border-radius: var(--radius) !important;
      box-shadow: var(--shadow-sm) !important;
      border: 1px solid var(--border-light) !important;
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
    .clickable-row {
      cursor: pointer;
      transition: all var(--transition-base);
    }
    .clickable-row:hover {
      background: var(--bg) !important;
      transform: translateX(4px);
    }
    .no-data {
      padding: var(--spacing-2xl);
      text-align: center;
      color: var(--text-secondary);
    }
    .currency-badge {
      display: inline-block;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      margin-right: var(--spacing-sm);
      background: rgba(13, 115, 119, 0.1);
      color: var(--primary);
      border: 1px solid var(--primary);
    }
    .currency-badge.usd {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border-color: var(--success);
    }
  `]
})
export class PrestamoListComponent implements OnInit {
  prestamos: Prestamo[] = [];
  displayedColumns: string[] = ['prestamista', 'monto', 'fecha', 'estado', 'acciones'];

  constructor(
    private prestamoService: PrestamoService,
    private dialog: MatDialog,
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.prestamoService.getPrestamos$().subscribe(data => {
      this.prestamos = data;
    });
  }

  abrirFormulario(): void {
    const dialogRef = this.dialog.open(PrestamoFormComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // El servicio ya actualiza el BehaviorSubject, así que la lista se actualizará automáticamente
      }
    });
  }

  verDetalle(prestamo: Prestamo, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/prestamos', prestamo.id]);
  }

  eliminarPrestamo(prestamo: Prestamo, event: Event): void {
    event.stopPropagation();
    this.notificationService.confirm(
      'Confirmar eliminación',
      '¿Está seguro de eliminar este préstamo?',
      'Eliminar',
      'Cancelar'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.prestamoService.eliminarPrestamo(prestamo.id);
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
