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
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .w-100 {
      width: 100%;
    }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover {
      background-color: #f5f5f5;
    }
    .no-data {
      padding: 20px;
      text-align: center;
      color: #666;
    }
    .currency-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 8px;
      background-color: #e3f2fd;
      color: #1976d2;
    }
    .currency-badge.usd {
      background-color: #e8f5e9;
      color: #388e3c;
    }
  `]
})
export class PrestamoListComponent implements OnInit {
  prestamos: Prestamo[] = [];
  displayedColumns: string[] = ['prestamista', 'monto', 'fecha', 'estado', 'acciones'];

  constructor(
    private prestamoService: PrestamoService,
    private dialog: MatDialog,
    private router: Router
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
    if (confirm('¿Está seguro de eliminar este préstamo?')) {
      this.prestamoService.eliminarPrestamo(prestamo.id);
    }
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
