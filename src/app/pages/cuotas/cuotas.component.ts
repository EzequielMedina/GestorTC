import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CuotaService } from '../../services/cuota.service';
import { GastoService } from '../../services/gasto';
import { TarjetaService } from '../../services/tarjeta';
import { NotificationService } from '../../services/notification.service';
import { ResumenService } from '../../services/resumen.service';
import { Cuota, ResumenCuotasMes, EstadoCuota } from '../../models/cuota.model';
import { Gasto } from '../../models/gasto.model';
import { Tarjeta } from '../../models/tarjeta.model';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { take } from 'rxjs/operators';

export interface CuotasPorTarjeta {
  tarjetaId: string;
  tarjetaNombre: string;
  cuotas: Cuota[];
  totalPendiente: number;
  totalPagado: number;
  cantidadPendientes: number;
  cantidadPagadas: number;
}

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
  cuotasPorTarjeta: CuotasPorTarjeta[] = [];
  mostrarVistaAgrupada: boolean = true;
  tarjetasExpandidas: Set<string> = new Set();
  gastos$: Observable<Gasto[]>;
  tarjetas$: Observable<Tarjeta[]>;
  resumenMes$: Observable<ResumenCuotasMes>;

  filtroEstado: 'TODAS' | 'PENDIENTE' | 'PAGADA' | 'ADELANTADA' = 'TODAS';
  filtroTarjeta: string = 'TODAS';
  mesSeleccionado: string = this.getMesActual();
  monthLabel: string = this.formatMonthLabel(this.mesSeleccionado);

  displayedColumns: string[] = ['numero', 'gasto', 'tarjeta', 'fechaVencimiento', 'monto', 'estado', 'acciones'];

  private subscriptions = new Subscription();

  totalDelMes$: Observable<number>;
  resumenTarjetasMes$: Observable<any[]>;

  constructor(
    private cuotaService: CuotaService,
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private notificationService: NotificationService,
    private resumenService: ResumenService
  ) {
    this.cuotas$ = this.cuotaService.getCuotas$();
    this.gastos$ = this.gastoService.getGastos$();
    this.tarjetas$ = this.tarjetaService.getTarjetas$();
    this.resumenMes$ = this.cuotaService.getResumenPorMes$(this.mesSeleccionado);
    this.totalDelMes$ = this.resumenService.getTotalDelMes$(this.mesSeleccionado);
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaDelMes$(this.mesSeleccionado);
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
          const mesKey = this.mesSeleccionado;
          
          // Primero filtrar cuotas reales por mes
          let todasLasCuotas: Cuota[] = cuotas.filter(c => {
            return c.fechaVencimiento.startsWith(mesKey);
          });

          // Agregar gastos sin cuotas que impactan en este mes (como cuotas virtuales)
          gastos.forEach(gasto => {
            const cantidadCuotas = Math.max(1, gasto.cantidadCuotas || 1);
            if (cantidadCuotas <= 1) {
              // Gasto sin cuotas: verificar si impacta en este mes
              const mesGasto = this.monthKeyFromISO(gasto.fecha);
              if (mesGasto === mesKey) {
                // Verificar si ya existe una cuota para este gasto (no debería, pero por si acaso)
                const yaExiste = todasLasCuotas.some(c => c.gastoId === gasto.id);
                if (!yaExiste) {
                  // Crear una "cuota virtual" para el gasto sin cuotas
                  const fechaGasto = new Date(gasto.fecha);
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  fechaGasto.setHours(0, 0, 0, 0);
                  
                  const estado: EstadoCuota = fechaGasto < hoy ? 'PAGADA' : 'PENDIENTE';
                  const cuotaVirtual: Cuota = {
                    id: `virtual_${gasto.id}`,
                    gastoId: gasto.id,
                    numeroCuota: 1,
                    fechaVencimiento: gasto.fecha,
                    monto: gasto.monto,
                    estado: estado,
                    fechaPago: estado === 'PAGADA' ? gasto.fecha : undefined
                  };
                  todasLasCuotas.push(cuotaVirtual);
                }
              }
            }
          });

          // Aplicar filtros adicionales
          let filtradas = todasLasCuotas;

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

          // Ordenar por fecha de vencimiento
          filtradas.sort((a, b) => 
            new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
          );

          // Agrupar por tarjeta usando todas las cuotas del mes (antes de filtros de estado/tarjeta)
          // para que el resumen por tarjeta muestre todos los datos
          this.agruparPorTarjeta(todasLasCuotas, gastos, tarjetas);

          return filtradas;
        })
      ).subscribe(cuotas => {
        this.cuotasFiltradas = cuotas;
      })
    );
  }

  agruparPorTarjeta(cuotas: Cuota[], gastos: Gasto[], tarjetas: Tarjeta[]): void {
    const agrupadas: { [tarjetaId: string]: CuotasPorTarjeta } = {};

    // Agrupar todas las cuotas (reales y virtuales) que ya vienen filtradas
    cuotas.forEach(cuota => {
      const gasto = gastos.find(g => g.id === cuota.gastoId);
      if (!gasto) return;

      const tarjetaId = gasto.tarjetaId;
      const tarjeta = tarjetas.find(t => t.id === tarjetaId);
      const tarjetaNombre = tarjeta?.nombre || 'Tarjeta no encontrada';

      if (!agrupadas[tarjetaId]) {
        agrupadas[tarjetaId] = {
          tarjetaId,
          tarjetaNombre,
          cuotas: [],
          totalPendiente: 0,
          totalPagado: 0,
          cantidadPendientes: 0,
          cantidadPagadas: 0
        };
      }

      agrupadas[tarjetaId].cuotas.push(cuota);
      
      if (cuota.estado === 'PENDIENTE') {
        agrupadas[tarjetaId].totalPendiente += cuota.monto;
        agrupadas[tarjetaId].cantidadPendientes++;
      } else if (cuota.estado === 'PAGADA') {
        agrupadas[tarjetaId].totalPagado += cuota.monto;
        agrupadas[tarjetaId].cantidadPagadas++;
      }
    });

    // Ordenar cuotas dentro de cada tarjeta por fecha de vencimiento
    Object.values(agrupadas).forEach(grupo => {
      grupo.cuotas.sort((a, b) => 
        new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
      );
    });

    this.cuotasPorTarjeta = Object.values(agrupadas).sort((a, b) => 
      a.tarjetaNombre.localeCompare(b.tarjetaNombre)
    );
  }

  private monthKeyFromISO(isoDate: string | Date): string {
    // Manejar tanto string como Date, igual que en ResumenService
    let fechaStr: string;
    if (isoDate instanceof Date) {
      fechaStr = isoDate.toISOString().split('T')[0];
    } else if (typeof isoDate === 'string') {
      fechaStr = isoDate;
    } else {
      return '';
    }
    // Retornar YYYY-MM
    return fechaStr.slice(0, 7);
  }

  cambiarMes(mes: string): void {
    if (mes && mes.length === 7) { // Asegurar formato YYYY-MM
      this.mesSeleccionado = mes;
      this.monthLabel = this.formatMonthLabel(mes);
      this.resumenMes$ = this.cuotaService.getResumenPorMes$(mes);
      this.totalDelMes$ = this.resumenService.getTotalDelMes$(mes);
      this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaDelMes$(mes);
      this.aplicarFiltros();
    }
  }

  prevMonth(): void {
    this.mesSeleccionado = this.addMonths(this.mesSeleccionado, -1);
    this.monthLabel = this.formatMonthLabel(this.mesSeleccionado);
    this.resumenMes$ = this.cuotaService.getResumenPorMes$(this.mesSeleccionado);
    this.totalDelMes$ = this.resumenService.getTotalDelMes$(this.mesSeleccionado);
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaDelMes$(this.mesSeleccionado);
    this.aplicarFiltros();
  }

  nextMonth(): void {
    this.mesSeleccionado = this.addMonths(this.mesSeleccionado, 1);
    this.monthLabel = this.formatMonthLabel(this.mesSeleccionado);
    this.resumenMes$ = this.cuotaService.getResumenPorMes$(this.mesSeleccionado);
    this.totalDelMes$ = this.resumenService.getTotalDelMes$(this.mesSeleccionado);
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaDelMes$(this.mesSeleccionado);
    this.aplicarFiltros();
  }

  private addMonths(key: string, delta: number): string {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, (m - 1) + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatMonthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
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

  getGastoOriginal(cuota: Cuota, gastos: Gasto[]): Gasto | null {
    return gastos.find(g => g.id === cuota.gastoId) || null;
  }

  getCantidadTotalCuotas(cuota: Cuota, gastos: Gasto[]): number {
    const gasto = gastos.find(g => g.id === cuota.gastoId);
    return gasto?.cantidadCuotas || 1;
  }

  getTotalAPagarTarjetas(tarjetas: any[]): number {
    return tarjetas.reduce((sum, t) => sum + (t.totalMes || 0), 0);
  }

  getTarjetasConPagos(tarjetas: any[]): number {
    return tarjetas.filter(t => (t.totalMes || 0) > 0).length;
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
    this.mesSeleccionado = this.getMesActual();
    this.cambiarMes(this.mesSeleccionado);
  }

  marcarTodasCuotasTarjetaComoPagadas(tarjetaId: string): void {
    const mesLabel = this.formatearMesLabel(this.mesSeleccionado);
    this.notificationService.confirm(
      'Marcar todas las cuotas como pagadas',
      `¿Desea marcar todas las cuotas pendientes de esta tarjeta del mes ${mesLabel} como pagadas?`
    ).subscribe(confirmado => {
      if (confirmado) {
        this.cuotaService.marcarTodasCuotasTarjetaComoPagadas(tarjetaId, undefined, this.mesSeleccionado).pipe(take(1)).subscribe({
          next: (cantidad) => {
            if (cantidad > 0) {
              this.notificationService.success(`${cantidad} cuota${cantidad !== 1 ? 's' : ''} marcada${cantidad !== 1 ? 's' : ''} como pagada${cantidad !== 1 ? 's' : ''} del mes ${mesLabel}`);
              this.aplicarFiltros();
            } else {
              this.notificationService.info(`No hay cuotas pendientes para esta tarjeta en el mes ${mesLabel}`);
            }
          },
          error: () => {
            this.notificationService.error('Error al marcar las cuotas como pagadas');
          }
        });
      }
    });
  }

  formatearMesLabel(mes: string): string {
    if (!mes) return '';
    const [anio, mesNum] = mes.split('-');
    const fecha = new Date(parseInt(anio), parseInt(mesNum) - 1, 1);
    return fecha.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
  }

  toggleVista(): void {
    this.mostrarVistaAgrupada = !this.mostrarVistaAgrupada;
  }

  toggleTarjeta(tarjetaId: string): void {
    if (this.tarjetasExpandidas.has(tarjetaId)) {
      this.tarjetasExpandidas.delete(tarjetaId);
    } else {
      this.tarjetasExpandidas.add(tarjetaId);
    }
  }

  isTarjetaExpandida(tarjetaId: string): boolean {
    return this.tarjetasExpandidas.has(tarjetaId);
  }

  expandirTodasTarjetas(): void {
    this.cuotasPorTarjeta.forEach(grupo => {
      this.tarjetasExpandidas.add(grupo.tarjetaId);
    });
  }

  colapsarTodasTarjetas(): void {
    this.tarjetasExpandidas.clear();
  }
}

