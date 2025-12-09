import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { CalendarioFinancieroService } from '../../services/calendario-financiero.service';
import { EventoFinanciero, EventosMes } from '../../models/evento-financiero.model';
import { Observable, Subscription } from 'rxjs';

interface DiaCalendario {
  fecha: Date;
  dia: number;
  esMesActual: boolean;
  eventos: EventoFinanciero[];
  totalMonto: number;
}

@Component({
  selector: 'app-calendario-financiero',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTabsModule
  ],
  templateUrl: './calendario-financiero.component.html',
  styleUrls: ['./calendario-financiero.component.css']
})
export class CalendarioFinancieroComponent implements OnInit, OnDestroy {
  eventos$: Observable<EventoFinanciero[]>;
  eventosProximos$: Observable<EventoFinanciero[]>;
  eventosMes$: Observable<EventosMes>;

  mesActual: Date = new Date();
  diasCalendario: DiaCalendario[] = [];
  eventosDelDia: EventoFinanciero[] = [];
  fechaSeleccionada?: Date;

  nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  vistaActiva: 'MES' | 'SEMANA' | 'DIA' = 'MES';

  private subscriptions = new Subscription();

  constructor(private calendarioService: CalendarioFinancieroService) {
    this.eventos$ = this.calendarioService.getEventos$();
    this.eventosProximos$ = this.calendarioService.getEventosProximos$(7);
    const mesKey = this.getMesKey(this.mesActual);
    this.eventosMes$ = this.calendarioService.getEventosPorMes$(mesKey);
  }

  ngOnInit(): void {
    this.generarCalendario();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  generarCalendario(): void {
    this.subscriptions.add(
      this.eventosMes$.subscribe(eventosMes => {
        const primerDia = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
        const ultimoDia = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 0);
        const primerDiaSemana = primerDia.getDay();
        const ultimoDiaMes = ultimoDia.getDate();

        const dias: DiaCalendario[] = [];

        // Días del mes anterior
        const mesAnterior = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 0);
        const diasMesAnterior = mesAnterior.getDate();

        for (let i = primerDiaSemana - 1; i >= 0; i--) {
          const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, diasMesAnterior - i);
          dias.push({
            fecha,
            dia: fecha.getDate(),
            esMesActual: false,
            eventos: [],
            totalMonto: 0
          });
        }

        // Días del mes actual
        for (let dia = 1; dia <= ultimoDiaMes; dia++) {
          const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), dia);
          const fechaStr = fecha.toISOString().split('T')[0];
          const eventosDelDia = eventosMes.eventosPorDia[fechaStr] || [];
          const totalMonto = eventosDelDia.reduce((sum, e) => sum + (e.monto || 0), 0);

          dias.push({
            fecha,
            dia,
            esMesActual: true,
            eventos: eventosDelDia,
            totalMonto
          });
        }

        // Días del mes siguiente
        const diasRestantes = 42 - dias.length;
        for (let dia = 1; dia <= diasRestantes; dia++) {
          const fecha = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, dia);
          dias.push({
            fecha,
            dia: fecha.getDate(),
            esMesActual: false,
            eventos: [],
            totalMonto: 0
          });
        }

        this.diasCalendario = dias;
      })
    );
  }

  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    const mesKey = this.getMesKey(this.mesActual);
    this.eventosMes$ = this.calendarioService.getEventosPorMes$(mesKey);
    this.generarCalendario();
  }

  mesSiguiente(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    const mesKey = this.getMesKey(this.mesActual);
    this.eventosMes$ = this.calendarioService.getEventosPorMes$(mesKey);
    this.generarCalendario();
  }

  irAMesActual(): void {
    const hoy = new Date();
    this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const mesKey = this.getMesKey(this.mesActual);
    this.eventosMes$ = this.calendarioService.getEventosPorMes$(mesKey);
    this.generarCalendario();
  }

  seleccionarDia(dia: DiaCalendario): void {
    if (dia.esMesActual) {
      this.fechaSeleccionada = dia.fecha;
      this.eventosDelDia = dia.eventos;
    }
  }

  getNombreMes(): string {
    return this.nombresMeses[this.mesActual.getMonth()];
  }

  getAnio(): number {
    return this.mesActual.getFullYear();
  }

  getMesKey(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${anio}-${mes}`;
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
  }

  getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'VENCIMIENTO_TARJETA':
        return 'credit_card';
      case 'VENCIMIENTO_CUOTA':
        return 'schedule';
      case 'PAGO_PRESTAMO':
        return 'account_balance';
      default:
        return 'event';
    }
  }

  getPrioridadClass(prioridad: string): string {
    return `prioridad-${prioridad.toLowerCase()}`;
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  esMismaFecha(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getDate() === fecha2.getDate() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getFullYear() === fecha2.getFullYear();
  }
}

