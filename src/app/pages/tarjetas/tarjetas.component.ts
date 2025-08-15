import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';

import { Tarjeta } from '../../models/tarjeta.model';
import { TarjetaService } from '../../services/tarjeta';
import { TarjetaDialogComponent } from '../../components/tarjeta-dialog/tarjeta-dialog';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-tarjetas',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSortModule,
    TarjetaDialogComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './tarjetas.component.html',
  styleUrls: ['./tarjetas.component.css']
})
export class TarjetasComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Datos de la tabla
  tarjetas: Tarjeta[] = [];
  columnasMostradas: string[] = ['nombre', 'banco', 'ultimosDigitos', 'vencimiento', 'acciones'];
  
  // Variables para paginación
  totalTarjetas = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 100];
  
  // Estado de carga
  loading = false;

  constructor(
    private tarjetaService: TarjetaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarTarjetas();
  }

  cargarTarjetas(): void {
    this.loading = true;
    this.tarjetaService.getTarjetas$().subscribe({
      next: (tarjetas: Tarjeta[]) => {
        this.tarjetas = tarjetas;
        this.totalTarjetas = tarjetas.length;
        this.loading = false;
        
        // Si hay un paginador, actualizar la longitud
        if (this.paginator) {
          this.paginator.length = this.totalTarjetas;
        }
      },
      error: (error: any) => {
        console.error('Error al cargar tarjetas:', error);
        this.mostrarMensaje('Error al cargar las tarjetas', 'error');
        this.loading = false;
      }
    });
  }

  agregarTarjeta(): void {
    const dialogRef = this.dialog.open(TarjetaDialogComponent, {
      width: '500px',
      data: { esEdicion: false }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarTarjetas();
        this.mostrarMensaje('Tarjeta agregada correctamente', 'success');
      }
    });
  }

  editarTarjeta(tarjeta: Tarjeta, event?: Event): void {
    // Detener la propagación del evento si se llama desde un clic en la fila
    if (event) {
      event.stopPropagation();
    }
    
    const dialogRef = this.dialog.open(TarjetaDialogComponent, {
      width: '500px',
      data: { esEdicion: true, tarjeta: { ...tarjeta } }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarTarjetas();
        this.mostrarMensaje('Tarjeta actualizada correctamente', 'success');
      }
    });
  }

  eliminarTarjeta(tarjeta: Tarjeta, event?: Event): void {
    // Detener la propagación del evento para evitar que se active el evento de edición
    if (event) {
      event.stopPropagation();
    }
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { 
        titulo: 'Eliminar Tarjeta',
        mensaje: `¿Estás seguro de que deseas eliminar la tarjeta ${tarjeta.nombre}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tarjetaService.eliminarTarjeta(tarjeta.id).subscribe({
          next: () => {
            this.cargarTarjetas();
            this.mostrarMensaje('Tarjeta eliminada correctamente', 'success');
          },
          error: (error) => {
            console.error('Error al eliminar tarjeta:', error);
            this.mostrarMensaje('Error al eliminar la tarjeta', 'error');
          }
        });
      }
    });
  }

  /**
   * Muestra un mensaje de notificación al usuario
   */
  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: tipo === 'success' ? 'snackbar-success' : 'snackbar-error',
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
  
  /**
   * Se ejecuta después de que la vista se ha inicializado
   */
  ngAfterViewInit(): void {
    // Inicializar ordenamiento y paginación después de que la vista se haya inicializado
    this.initSorting();
    this.initPagination();
  }
  
  /**
   * Maneja el cambio de página en la tabla
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    // En una implementación real, aquí cargarías los datos de la página actual
    // desde el servidor. Por ahora, el filtrado se hace en el cliente.
  }
  
  /**
   * Maneja el ordenamiento de la tabla
   */
  onSortChange(sort: Sort): void {
    // Implementar lógica de ordenamiento si es necesario
    console.log('Ordenamiento cambiado:', sort);
  }
  
  /**
   * Inicializa el ordenamiento de la tabla
   */
  private initSorting(): void {
    if (this.sort) {
      this.sort.sortChange.subscribe((sort: Sort) => {
        this.onSortChange(sort);
      });
    }
  }
  
  /**
   * Inicializa la paginación
   */
  private initPagination(): void {
    if (this.paginator) {
      this.paginator.page.subscribe((event: PageEvent) => {
        this.onPageChange(event);
      });
    }
  }
}
