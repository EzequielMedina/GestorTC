import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Gasto } from '../../models/gasto.model';
import { Tarjeta } from '../../models/tarjeta.model';

@Component({
  selector: 'app-gasto-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gasto-dialog.component.html',
  styleUrls: ['./gasto-dialog.component.css']
})
export class GastoDialogComponent {
  @Input() gasto: Gasto = {
    id: '',
    tarjetaId: '',
    descripcion: '',
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10)
  };

  @Input() tarjetas: Tarjeta[] = [];
  @Input() esEdicion = false;

  @Output() guardarGasto = new EventEmitter<Gasto>();
  @Output() cancelarDialog = new EventEmitter<void>();

  // helpers UI
  get esConCuotas(): boolean {
    return !!this.gasto.cantidadCuotas && this.gasto.cantidadCuotas > 1;
  }

  private calcularMesDesdeFechaISO(fechaISO: string): string {
    const d = new Date(fechaISO);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  onCantidadCuotasChange(valor: number | null): void {
    // Normalizar a entero >=1 o undefined
    const n = valor ? Math.max(1, Math.floor(+valor)) : undefined;
    this.gasto.cantidadCuotas = n;
    if (this.esConCuotas) {
      // Si hay cuotas y no hay primer mes seleccionado, proponer por defecto el mes de la fecha
      if (!this.gasto.primerMesCuota && this.gasto.fecha) {
        this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
      }
    } else {
      // sin cuotas limpiamos campos relacionados
      this.gasto.primerMesCuota = undefined;
      this.gasto.montoPorCuota = undefined;
    }
  }

  onFechaChange(nuevaFechaISO: string): void {
    this.gasto.fecha = nuevaFechaISO;
    if (this.esConCuotas && !this.gasto.primerMesCuota) {
      this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
    }
  }

  guardar(): void {
    if (this.gasto.descripcion && this.gasto.monto > 0 && this.gasto.tarjetaId && this.gasto.fecha) {
      // Normalizar cuotas
      if (!this.esConCuotas) {
        this.gasto.cantidadCuotas = undefined;
        this.gasto.primerMesCuota = undefined;
        this.gasto.montoPorCuota = undefined;
      } else {
        // si hay cuotas pero no se especifica montoPorCuota, calcularlo
        // Asegurar primerMesCuota requerido
        if (!this.gasto.primerMesCuota) {
          // autocompletar por defecto con el mes de la fecha para mejorar UX
          this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
        }
        if (!this.gasto.primerMesCuota) {
          // si por alguna razón sigue vacío, no continuar
          return;
        }

        if (this.gasto.cantidadCuotas) {
          this.gasto.montoPorCuota = parseFloat((this.gasto.monto / this.gasto.cantidadCuotas).toFixed(2));
        }
      }

      // Normalizar compartido
      if (!this.gasto.compartidoCon) {
        this.gasto.compartidoCon = undefined;
        this.gasto.porcentajeCompartido = undefined;
      } else if (this.gasto.compartidoCon && (this.gasto.porcentajeCompartido === undefined || this.gasto.porcentajeCompartido === null)) {
        this.gasto.porcentajeCompartido = 50;
      }

      this.guardarGasto.emit(this.gasto);
    }
  }

  cancelar(): void {
    this.cancelarDialog.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cancelar();
    }
  }
}
