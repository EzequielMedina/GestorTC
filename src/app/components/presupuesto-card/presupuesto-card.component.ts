import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { PresupuestoSeguimiento } from '../../models/presupuesto.model';

@Component({
  selector: 'app-presupuesto-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule
  ],
  templateUrl: './presupuesto-card.component.html',
  styleUrls: ['./presupuesto-card.component.css']
})
export class PresupuestoCardComponent {
  @Input() presupuesto!: PresupuestoSeguimiento;
  @Input() nombreCategoria?: string;
  @Input() nombreTarjeta?: string;
  @Input() onEditar?: (id: string) => void;
  @Input() onEliminar?: (id: string) => void;

  getColorEstado(): string {
    switch (this.presupuesto.estado) {
      case 'excedido':
        return '#dc2626';
      case 'cerca':
        return '#ca8a04';
      default:
        return '#10b981';
    }
  }

  getIconoEstado(): string {
    switch (this.presupuesto.estado) {
      case 'excedido':
        return 'warning';
      case 'cerca':
        return 'info';
      default:
        return 'check_circle';
    }
  }

  getPorcentajeLimitado(): number {
    return Math.min(this.presupuesto.porcentajeUsado, 100);
  }
}

