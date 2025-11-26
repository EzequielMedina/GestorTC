import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tarjeta } from '../../models/tarjeta.model';
import { TarjetaService } from '../../services/tarjeta';
import { TarjetaDialogComponent } from '../../components/tarjeta-dialog/tarjeta-dialog';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-tarjetas',
  standalone: true,
  imports: [CommonModule, TarjetaDialogComponent],
  templateUrl: './tarjetas.component.html',
  styleUrls: ['./tarjetas.component.css']
})
export class TarjetasComponent implements OnInit {
  
  // Datos de la tabla
  tarjetas: Tarjeta[] = [];
  
  // Estado de carga
  loading = false;

  // Estado del modal
  mostrarModal = false;
  esEdicion = false;
  tarjetaSeleccionada: Tarjeta = {
    id: '',
    nombre: '',
    banco: '',
    limite: 0,
    ultimosDigitos: '',
    diaCierre: 0,
    diaVencimiento: 0
  };

  constructor(
    private tarjetaService: TarjetaService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarTarjetas();
  }

  cargarTarjetas(): void {
    this.loading = true;
    this.tarjetaService.getTarjetas$().subscribe({
      next: (tarjetas: Tarjeta[]) => {
        this.tarjetas = tarjetas;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar tarjetas:', error);
        this.loading = false;
      }
    });
  }

  agregarTarjeta(): void {
    this.esEdicion = false;
    this.tarjetaSeleccionada = {
      id: '',
      nombre: '',
      banco: '',
      limite: 0,
      ultimosDigitos: '',
      diaCierre: 0,
      diaVencimiento: 0
    };
    this.mostrarModal = true;
  }

  editarTarjeta(tarjeta: Tarjeta): void {
    this.esEdicion = true;
    this.tarjetaSeleccionada = { ...tarjeta };
    this.mostrarModal = true;
  }

  onGuardarTarjeta(tarjeta: Tarjeta): void {
    if (this.esEdicion) {
      const { id, ...cambios } = tarjeta;
      this.tarjetaService.actualizarTarjeta(id, cambios).subscribe({
        next: (tarjetaActualizada) => {
          if (tarjetaActualizada) {
            this.cargarTarjetas();
            this.cerrarModal();
            this.notificationService.success('Tarjeta actualizada correctamente');
          } else {
            this.notificationService.error('No se pudo actualizar la tarjeta');
          }
        },
        error: (error) => {
          console.error('Error al actualizar tarjeta:', error);
          this.notificationService.error('Error al actualizar la tarjeta');
        }
      });
    } else {
      const { id, ...nuevaTarjeta } = tarjeta;
      this.tarjetaService.agregarTarjeta(nuevaTarjeta).subscribe({
        next: () => {
          this.cargarTarjetas();
          this.cerrarModal();
          this.notificationService.success('Tarjeta agregada correctamente');
        },
        error: (error) => {
          console.error('Error al agregar tarjeta:', error);
          this.notificationService.error('Error al agregar la tarjeta');
        }
      });
    }
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.esEdicion = false;
    this.tarjetaSeleccionada = {
      id: '',
      nombre: '',
      banco: '',
      limite: 0,
      ultimosDigitos: '',
      diaCierre: 0,
      diaVencimiento: 0
    };
  }

  eliminarTarjeta(tarjeta: Tarjeta): void {
    this.notificationService.confirm(
      'Confirmar eliminación',
      `¿Estás seguro de que deseas eliminar la tarjeta ${tarjeta.nombre}?`,
      'Eliminar',
      'Cancelar'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.tarjetaService.eliminarTarjeta(tarjeta.id).subscribe({
          next: () => {
            this.cargarTarjetas();
            this.notificationService.success('Tarjeta eliminada correctamente');
          },
          error: (error) => {
            console.error('Error al eliminar tarjeta:', error);
            this.notificationService.error('Error al eliminar la tarjeta');
          }
        });
      }
    });
  }
}
