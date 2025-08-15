import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tarjeta } from '../../models/tarjeta.model';
import { TarjetaService } from '../../services/tarjeta';
import { TarjetaDialogComponent } from '../../components/tarjeta-dialog/tarjeta-dialog';

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
    private tarjetaService: TarjetaService
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
            alert('Tarjeta actualizada correctamente');
          } else {
            alert('No se pudo actualizar la tarjeta');
          }
        },
        error: (error) => {
          console.error('Error al actualizar tarjeta:', error);
          alert('Error al actualizar la tarjeta');
        }
      });
    } else {
      const { id, ...nuevaTarjeta } = tarjeta;
      this.tarjetaService.agregarTarjeta(nuevaTarjeta).subscribe({
        next: () => {
          this.cargarTarjetas();
          this.cerrarModal();
          alert('Tarjeta agregada correctamente');
        },
        error: (error) => {
          console.error('Error al agregar tarjeta:', error);
          alert('Error al agregar la tarjeta');
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
    if (confirm(`¿Estás seguro de que deseas eliminar la tarjeta ${tarjeta.nombre}?`)) {
      this.tarjetaService.eliminarTarjeta(tarjeta.id).subscribe({
        next: () => {
          this.cargarTarjetas();
          alert('Tarjeta eliminada correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar tarjeta:', error);
          alert('Error al eliminar la tarjeta');
        }
      });
    }
  }
}
