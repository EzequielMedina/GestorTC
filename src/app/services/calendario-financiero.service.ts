import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { EventoFinanciero, EventosDia, EventosMes, PrioridadEvento } from '../models/evento-financiero.model';
import { Tarjeta } from '../models/tarjeta.model';
import { Prestamo } from '../models/prestamo.model';
import { Cuota } from '../models/cuota.model';
import { TarjetaService } from './tarjeta';
import { PrestamoService } from './prestamo.service';
import { CuotaService } from './cuota.service';
import { ResumenService } from './resumen.service';
import { GastosRecurrentesService } from './gastos-recurrentes.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarioFinancieroService {
  private eventosSubject = new BehaviorSubject<EventoFinanciero[]>([]);
  public eventos$ = this.eventosSubject.asObservable();

  constructor(
    private tarjetaService: TarjetaService,
    private prestamoService: PrestamoService,
    private cuotaService: CuotaService,
    private resumenService: ResumenService,
    private gastosRecurrentesService: GastosRecurrentesService
  ) {
    this.generarEventosAutomaticos();
  }

  /**
   * Genera eventos automáticamente desde tarjetas, cuotas y préstamos
   */
  private generarEventosAutomaticos(): void {
    combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.cuotaService.getCuotas$(),
      this.prestamoService.getPrestamos$(),
      this.gastosRecurrentesService.getInstanciasPendientes$(),
      this.gastosRecurrentesService.getGastosRecurrentes$()
    ]).subscribe(([tarjetas, cuotas, prestamos, instanciasServicios, series]) => {
      const eventos: EventoFinanciero[] = [];

      // Eventos de vencimiento de tarjetas
      tarjetas.forEach(tarjeta => {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = hoy.getMonth();
        
        // Generar eventos para los próximos 3 meses
        for (let i = 0; i < 3; i++) {
          const fechaVencimiento = new Date(anio, mes + i, tarjeta.diaVencimiento);
          const fechaStr = fechaVencimiento.toISOString().split('T')[0];
          
          eventos.push({
            id: uuidv4(),
            tipo: 'VENCIMIENTO_TARJETA',
            titulo: `Vencimiento: ${tarjeta.nombre}`,
            descripcion: `Fecha límite de pago de ${tarjeta.nombre}`,
            fecha: fechaStr,
            prioridad: this.calcularPrioridadVencimiento(fechaVencimiento),
            tarjetaId: tarjeta.id,
            recurrente: true,
            fechaCreacion: new Date().toISOString()
          });
        }
      });

      // Eventos de vencimiento de cuotas
      cuotas.filter(c => c.estado === 'PENDIENTE').forEach(cuota => {
        eventos.push({
          id: uuidv4(),
          tipo: 'VENCIMIENTO_CUOTA',
          titulo: `Cuota #${cuota.numeroCuota}`,
          descripcion: `Vencimiento de cuota - Monto: $${cuota.monto.toFixed(2)}`,
          fecha: cuota.fechaVencimiento,
          monto: cuota.monto,
          prioridad: this.calcularPrioridadVencimiento(new Date(cuota.fechaVencimiento)),
          cuotaId: cuota.id,
          recurrente: false,
          fechaCreacion: new Date().toISOString()
        });
      });

      // Eventos de préstamos
      prestamos.filter(p => p.estado === 'ACTIVO').forEach(prestamo => {
        prestamo.entregas.forEach(entrega => {
          eventos.push({
            id: uuidv4(),
            tipo: 'PAGO_PRESTAMO',
            titulo: `Pago: ${prestamo.prestamista}`,
            descripcion: `Entrega de ${entrega.monto} ${prestamo.moneda}`,
            fecha: entrega.fecha,
            monto: entrega.monto,
            prioridad: 'MEDIA',
            prestamoId: prestamo.id,
            recurrente: false,
            fechaCreacion: new Date().toISOString()
          });
        });
      });

      // Eventos de gastos recurrentes (servicios)
      instanciasServicios.forEach(instancia => {
        const serie = series.find(s => s.id === instancia.serieRecurrenteId);
        if (serie && !instancia.pagado) {
          eventos.push({
            id: uuidv4(),
            tipo: 'VENCIMIENTO_SERVICIO',
            titulo: serie.nombre,
            descripcion: serie.descripcion,
            fecha: instancia.fechaVencimiento,
            monto: instancia.monto,
            prioridad: this.calcularPrioridadVencimiento(new Date(instancia.fechaVencimiento)),
            gastoRecurrenteId: serie.id,
            instanciaGastoRecurrenteId: instancia.id,
            pagado: instancia.pagado,
            recurrente: true,
            fechaCreacion: new Date().toISOString()
          });
        }
      });

      this.eventosSubject.next(eventos);
    });
  }

  /**
   * Obtiene todos los eventos
   */
  getEventos$(): Observable<EventoFinanciero[]> {
    return this.eventos$;
  }

  /**
   * Obtiene eventos por fecha
   */
  getEventosPorFecha$(fecha: string): Observable<EventoFinanciero[]> {
    return this.eventos$.pipe(
      map(eventos => eventos.filter(e => e.fecha === fecha))
    );
  }

  /**
   * Obtiene eventos por mes
   */
  getEventosPorMes$(mes: string): Observable<EventosMes> {
    return this.eventos$.pipe(
      map(eventos => {
        const eventosDelMes = eventos.filter(e => e.fecha.startsWith(mes));
        const eventosPorDia: { [dia: string]: EventoFinanciero[] } = {};
        let totalMonto = 0;

        eventosDelMes.forEach(evento => {
          if (!eventosPorDia[evento.fecha]) {
            eventosPorDia[evento.fecha] = [];
          }
          eventosPorDia[evento.fecha].push(evento);
          if (evento.monto) {
            totalMonto += evento.monto;
          }
        });

        return {
          mes,
          eventos: eventosDelMes,
          eventosPorDia,
          totalMonto
        };
      })
    );
  }

  /**
   * Obtiene eventos por rango de fechas
   */
  getEventosPorRango$(fechaInicio: string, fechaFin: string): Observable<EventoFinanciero[]> {
    return this.eventos$.pipe(
      map(eventos => eventos.filter(e => e.fecha >= fechaInicio && e.fecha <= fechaFin))
    );
  }

  /**
   * Obtiene eventos próximos (próximos N días)
   */
  getEventosProximos$(dias: number = 7): Observable<EventoFinanciero[]> {
    return this.eventos$.pipe(
      map(eventos => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaLimite = new Date();
        fechaLimite.setDate(hoy.getDate() + dias);
        fechaLimite.setHours(23, 59, 59, 999);

        return eventos.filter(e => {
          const fechaEvento = new Date(e.fecha);
          return fechaEvento >= hoy && fechaEvento <= fechaLimite;
        }).sort((a, b) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
      })
    );
  }

  /**
   * Calcula la prioridad basada en la proximidad del vencimiento
   */
  private calcularPrioridadVencimiento(fecha: Date): PrioridadEvento {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias <= 1) return 'ALTA';
    if (diffDias <= 3) return 'MEDIA';
    return 'BAJA';
  }
}

