import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CuotaService } from '../../services/cuota.service';
import { GastoService } from '../../services/gasto';
import { TarjetaService } from '../../services/tarjeta';
import { NotificationService } from '../../services/notification.service';
import { Cuota, ResumenCuotasMes } from '../../models/cuota.model';
import { Gasto } from '../../models/gasto.model';
import { Tarjeta } from '../../models/tarjeta.model';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-cuotas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './cuotas.component.html',
  styleUrls: ['./cuotas.component.css']
})
export class CuotasComponent implements OnInit, OnDestroy {
  cuotas$: Observable<Cuota[]>;
  cuotasFiltradas: Cuota[] = [];
  gastos$: Observable<Gasto[]>;
  tarjetas$: Observable<Tarjeta[]>;
  resumenMes$: Observable<ResumenCuotasMes>;

  filtroEstado: 'TODAS' | 'PENDIENTE' | 'PAGADA' | 'ADELANTADA' = 'TODAS';
  filtroTarjeta: string = 'TODAS';
  fechaInicio?: Date;
  fechaFin?: Date;
  mesSeleccionado: string = this.getMesActual();

  displayedColumns: string[] = ['numero', 'gasto', 'tarjeta', 'fechaVencimiento', 'monto', 'estado', 'acciones'];

  private subscriptions = new Subscription();

  constructor(
    private cuotaService: CuotaService,
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private notificationService: NotificationService
  ) {
    this.cuotas$ = this.cuotaService.getCuotas$();
    this.gastos$ = this.gastoService.getGastos$();
    this.tarjetas$ = this.tarjetaService.getTarjetas$();
    this.resumenMes$ = this.cuotaService.getResumenPorMes$(this.mesSeleccionado);
  }

  ngOnInit(): void {
    this.aplicarFiltros();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  aplicarFiltros(): void {
    this.subscriptions.add(
      combineLatest([
        this.cuotas$,
        this.gastos$,
        this.tarjetas$
      ]).pipe(
        map(([cuotas, gastos, tarjetas]) => {
          let filtradas = [...cuotas];

          // Filtro por estado
          if (this.filtroEstado !== 'TODAS') {
            filtradas = filtradas.filter(c => c.estado === this.filtroEstado);
          }

          // Filtro por tarjeta
          if (this.filtroTarjeta !== 'TODAS') {
            const gastosDeTarjeta = gastos.filter(g => g.tarjetaId === this.filtroTarjeta);
            const gastosIds = new Set(gastosDeTarjeta.map(g => g.id));
            filtradas = filtradas.filter(c => gastosIds.has(c.gastoId));
          }

          // Filtro por rango de fechas
          if (this.fechaInicio && this.fechaFin) {
            const inicio = this.fechaInicio.toISOString().split('T')[0];
            const fin = this.fechaFin.toISOString().split('T')[0];
            filtradas = filtradas.filter(c => {
              return c.fechaVencimiento >= inicio && c.fechaVencimiento <= fin;
            });
          }

          // Ordenar por fecha de vencimiento
          filtradas.sort((a, b) => 
            new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
          );

          return filtradas;
        })
      ).subscribe(cuotas => {
        this.cuotasFiltradas = cuotas;
      })
    );
  }

  cambiarMes(mes: string): void {
    this.mesSeleccionado = mes;
    this.resumenMes$ = this.cuotaService.getResumenPorMes$(mes);
    this.aplicarFiltros();
  }

  marcarComoPagada(cuota: Cuota): void {
    this.cuotaService.marcarComoPagada(cuota.id).pipe(take(1)).subscribe({
      next: (exitoso) => {
        if (exitoso) {
          this.notificationService.success('Cuota marcada como pagada');
          this.aplicarFiltros();
        } else {
          this.notificationService.error('No se pudo marcar la cuota como pagada');
        }
      },
      error: () => {
        this.notificationService.error('Error al marcar la cuota como pagada');
      }
    });
  }

  adelantarCuota(cuota: Cuota): void {
    this.cuotaService.adelantarCuota(cuota.id).pipe(take(1)).subscribe({
      next: (exitoso) => {
        if (exitoso) {
          this.notificationService.success('Cuota adelantada');
          this.aplicarFiltros();
        } else {
          this.notificationService.error('No se pudo adelantar la cuota');
        }
      },
      error: () => {
        this.notificationService.error('Error al adelantar la cuota');
      }
    });
  }

  getGastoDescripcion(cuota: Cuota, gastos: Gasto[]): string {
    const gasto = gastos.find(g => g.id === cuota.gastoId);
    return gasto?.descripcion || 'Gasto no encontrado';
  }

  getTarjetaNombre(cuota: Cuota, gastos: Gasto[], tarjetas: Tarjeta[]): string {
    const gasto = gastos.find(g => g.id === cuota.gastoId);
    if (!gasto) return 'N/A';
    const tarjeta = tarjetas.find(t => t.id === gasto.tarjetaId);
    return tarjeta?.nombre || 'N/A';
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'PAGADA':
        return 'estado-pagada';
      case 'ADELANTADA':
        return 'estado-adelantada';
      default:
        return 'estado-pendiente';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'PAGADA':
        return 'check_circle';
      case 'ADELANTADA':
        return 'fast_forward';
      default:
        return 'schedule';
    }
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getMesActual(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${anio}-${mes}`;
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'TODAS';
    this.filtroTarjeta = 'TODAS';
    this.fechaInicio = undefined;
    this.fechaFin = undefined;
    this.aplicarFiltros();
  }
}

