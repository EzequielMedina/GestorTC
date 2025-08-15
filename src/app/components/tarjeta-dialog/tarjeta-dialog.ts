import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarjeta } from '../../models/tarjeta.model';

@Component({
  selector: 'app-tarjeta-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tarjeta-dialog.component.html',
  styleUrls: ['./tarjeta-dialog.component.css']
})
export class TarjetaDialogComponent {
  @Input() tarjeta: Tarjeta = {
    id: '',
    nombre: '',
    banco: '',
    limite: 0,
    ultimosDigitos: '',
    diaCierre: 0,
    diaVencimiento: 0
  };
  
  @Input() esEdicion = false;
  
  @Output() guardarTarjeta = new EventEmitter<Tarjeta>();
  @Output() cancelarDialog = new EventEmitter<void>();

  guardar(): void {
    if (this.tarjeta.nombre && this.tarjeta.limite > 0) {
      this.guardarTarjeta.emit(this.tarjeta);
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
