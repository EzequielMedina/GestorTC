import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { CuotaService } from '../../services/cuota.service';
import { GastoService } from '../../services/gasto';
import { TarjetaService } from '../../services/tarjeta';
import { Cuota } from '../../models/cuota.model';
import { Gasto } from '../../models/gasto.model';
import { Tarjeta } from '../../models/tarjeta.model';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

interface DiaCalendario {
  fecha: Date;
  dia: number;
  esMesActual: boolean;
  cuotas: Cuota[];
  totalMonto: number;
}

@Component({
  selector: 'app-calendario-cuotas',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule
  ],
  templateUrl: './calendario-cuotas.component.html',
  styleUrls: ['./calendario-cuotas.component.css']
})
export class CalendarioCuotasComponent implements OnInit, OnDestroy {
  @Input() mes?: string; // YYYY-MM, si no se proporciona usa el mes actual

  mesActual: Date = new Date();
  diasCalendario: DiaCalendario[] = [];
  cuotas$: Observable<Cuota[]>;
  gastos$: Observable<Gasto[]>;
  tarjetas$: Observable<Tarjeta[]>;

  nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  private subscriptions = new Subscription();

  constructor(
    private cuotaService: CuotaService,
    private gastoService: GastoService,
    private tarjetaService: TarjetaService
  ) {
    this.cuotas$ = this.cuotaService.getCuotas$();
    this.gastos$ = this.gastoService.getGastos$();
    this.tarjetas$ = this.tarjetaService.getTarjetas$();
  }

  ngOnInit(): void {
    if (this.mes) {
      const [anio, mes] = this.mes.split('-').map(Number);
      this.mesActual = new Date(anio, mes - 1, 1);
    } else {
      const hoy = new Date();
      this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }
    this.generarCalendario();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  generarCalendario(): void {
    this.subscriptions.add(
      combineLatest([
        this.cuotas$,
        this.gastos$,
        this.tarjetas$
      ]).pipe(
        map(([cuotas, gastos, tarjetas]) => {
          const primerDia = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
          const ultimoDia = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 0);
          
          // Obtener primer día de la semana del mes
          const primerDiaSemana = primerDia.getDay();
          
          // Obtener último día del mes
          const ultimoDiaMes = ultimoDia.getDate();
          
          const dias: DiaCalendario[] = [];
          
          // Agregar días del mes anterior para completar la semana
          const mesAnterior = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 0);
          const diasMesAnterior = mesAnterior.getDate();
          
          for (let i = primerDiaSemana - 1; i >= 0; i--) {
            const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, diasMesAnterior - i);
            dias.push({
              fecha,
              dia: fecha.getDate(),
              esMesActual: false,
              cuotas: [],
              totalMonto: 0
            });
          }
          
          // Agregar días del mes actual
          for (let dia = 1; dia <= ultimoDiaMes; dia++) {
            const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), dia);
            const fechaStr = fecha.toISOString().split('T')[0];
            
            const cuotasDelDia = cuotas.filter(c => c.fechaVencimiento === fechaStr && c.estado === 'PENDIENTE');
            const totalMonto = cuotasDelDia.reduce((sum, c) => sum + c.monto, 0);
            
            dias.push({
              fecha,
              dia,
              esMesActual: true,
              cuotas: cuotasDelDia,
              totalMonto
            });
          }
          
          // Agregar días del mes siguiente para completar la semana
          const diasRestantes = 42 - dias.length; // 6 semanas * 7 días
          for (let dia = 1; dia <= diasRestantes; dia++) {
            const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, dia);
            dias.push({
              fecha,
              dia: fecha.getDate(),
              esMesActual: false,
              cuotas: [],
              totalMonto: 0
            });
          }
          
          return dias;
        })
      ).subscribe(dias => {
        this.diasCalendario = dias;
      })
    );
  }

  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.generarCalendario();
  }

  mesSiguiente(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.generarCalendario();
  }

  irAMesActual(): void {
    const hoy = new Date();
    this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.generarCalendario();
  }

  getNombreMes(): string {
    return this.nombresMeses[this.mesActual.getMonth()];
  }

  getAnio(): number {
    return this.mesActual.getFullYear();
  }

  getGastoDescripcion(cuota: Cuota, gastos: Gasto[]): string {
    const gasto = gastos.find(g => g.id === cuota.gastoId);
    return gasto?.descripcion || 'Gasto no encontrado';
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
  }
}

