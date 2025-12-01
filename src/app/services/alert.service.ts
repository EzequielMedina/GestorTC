import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Alerta, TipoAlerta, PrioridadAlerta } from '../models/alert.model';
import { Tarjeta } from '../models/tarjeta.model';
import { Gasto } from '../models/gasto.model';
import { Prestamo } from '../models/prestamo.model';
import { TarjetaService } from './tarjeta';
import { GastoService } from './gasto';
import { PrestamoService } from './prestamo.service';
import { ResumenService } from './resumen.service';
import { DolarService } from './dolar.service';

const STORAGE_KEY = 'gestor_tc_alertas_vistas';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertasSubject = new BehaviorSubject<Alerta[]>([]);
  public alertas$ = this.alertasSubject.asObservable();
  private alertasVistas: Set<string> = new Set(this.loadVistasFromStorage());

  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private prestamoService: PrestamoService,
    private resumenService: ResumenService,
    private dolarService: DolarService
  ) {
    this.inicializarAlertas();
  }

  /**
   * Obtiene todas las alertas activas
   */
  obtenerAlertas$(): Observable<Alerta[]> {
    return this.alertas$;
  }

  /**
   * Obtiene solo las alertas no vistas
   */
  obtenerAlertasNoVistas$(): Observable<Alerta[]> {
    return this.alertas$.pipe(
      map(alertas => alertas.filter(a => !a.vista))
    );
  }

  /**
   * Obtiene alertas por prioridad
   */
  obtenerAlertasPorPrioridad$(prioridad: PrioridadAlerta): Observable<Alerta[]> {
    return this.alertas$.pipe(
      map(alertas => alertas.filter(a => a.prioridad === prioridad && !a.vista))
    );
  }

  /**
   * Marca una alerta como vista
   */
  marcarComoVista(alertaId: string): void {
    this.alertasVistas.add(alertaId);
    this.saveVistasToStorage();
    
    const alertas = this.alertasSubject.value.map(a => 
      a.id === alertaId ? { ...a, vista: true } : a
    );
    this.alertasSubject.next(alertas);
  }

  /**
   * Marca todas las alertas como vistas
   */
  marcarTodasComoVistas(): void {
    const alertas = this.alertasSubject.value.map(a => ({ ...a, vista: true }));
    this.alertasSubject.next(alertas);
    
    alertas.forEach(a => this.alertasVistas.add(a.id));
    this.saveVistasToStorage();
  }

  /**
   * Elimina una alerta
   */
  eliminarAlerta(alertaId: string): void {
    const alertas = this.alertasSubject.value.filter(a => a.id !== alertaId);
    this.alertasSubject.next(alertas);
  }

  /**
   * Inicializa y actualiza las alertas periódicamente
   */
  private inicializarAlertas(): void {
    // Actualizar alertas cada vez que cambien los datos
    combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$(),
      this.prestamoService.getPrestamos$(),
      this.resumenService.getResumenPorTarjeta$(),
      this.dolarService.obtenerDolarOficial()
    ]).subscribe(([tarjetas, gastos, prestamos, resumenTarjetas, dolar]) => {
      const alertas: Alerta[] = [];
      
      // Alertas de tarjetas
      alertas.push(...this.generarAlertasTarjetas(tarjetas, resumenTarjetas));
      
      // Alertas de préstamos
      alertas.push(...this.generarAlertasPrestamos(prestamos));
      
      // Alertas de dólar (básico, se puede mejorar)
      // alertas.push(...this.generarAlertasDolar(dolar));
      
      this.alertasSubject.next(alertas);
    });
  }

  /**
   * Genera alertas relacionadas con tarjetas
   */
  private generarAlertasTarjetas(tarjetas: Tarjeta[], resumenTarjetas: any[]): Alerta[] {
    const alertas: Alerta[] = [];
    const hoy = new Date();
    const fechaActual = hoy.getDate();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    tarjetas.forEach(tarjeta => {
      const resumen = resumenTarjetas.find(r => r.id === tarjeta.id);
      const porcentajeUso = resumen?.porcentajeUso || 0;

      // Alerta de vencimiento próximo (3 días antes)
      const diasHastaVencimiento = tarjeta.diaVencimiento - fechaActual;
      if (diasHastaVencimiento >= 0 && diasHastaVencimiento <= 3) {
        alertas.push({
          id: uuidv4(),
          tipo: 'TARJETA_VENCIMIENTO_PROXIMO',
          titulo: `Vencimiento próximo: ${tarjeta.nombre}`,
          mensaje: `El pago de ${tarjeta.nombre} vence en ${diasHastaVencimiento} día${diasHastaVencimiento !== 1 ? 's' : ''}`,
          prioridad: diasHastaVencimiento <= 1 ? 'alta' : 'media',
          fechaCreacion: new Date().toISOString(),
          vista: this.alertasVistas.has(`venc_${tarjeta.id}`),
          datosAdicionales: {
            tarjetaId: tarjeta.id,
            tarjetaNombre: tarjeta.nombre,
            diasRestantes: diasHastaVencimiento
          }
        });
      }

      // Alertas de límite alcanzado
      if (porcentajeUso >= 100) {
        alertas.push({
          id: uuidv4(),
          tipo: 'TARJETA_LIMITE_ALCANZADO',
          titulo: `Límite alcanzado: ${tarjeta.nombre}`,
          mensaje: `Has alcanzado el 100% del límite de ${tarjeta.nombre}`,
          prioridad: 'alta',
          fechaCreacion: new Date().toISOString(),
          vista: this.alertasVistas.has(`limite_100_${tarjeta.id}`),
          datosAdicionales: {
            tarjetaId: tarjeta.id,
            tarjetaNombre: tarjeta.nombre,
            porcentajeUso: 100
          }
        });
      } else if (porcentajeUso >= 90) {
        alertas.push({
          id: uuidv4(),
          tipo: 'TARJETA_LIMITE_ALCANZADO',
          titulo: `Límite casi alcanzado: ${tarjeta.nombre}`,
          mensaje: `Has usado el ${porcentajeUso.toFixed(1)}% del límite de ${tarjeta.nombre}`,
          prioridad: 'media',
          fechaCreacion: new Date().toISOString(),
          vista: this.alertasVistas.has(`limite_90_${tarjeta.id}`),
          datosAdicionales: {
            tarjetaId: tarjeta.id,
            tarjetaNombre: tarjeta.nombre,
            porcentajeUso: porcentajeUso
          }
        });
      } else if (porcentajeUso >= 80) {
        alertas.push({
          id: uuidv4(),
          tipo: 'TARJETA_LIMITE_ALCANZADO',
          titulo: `Atención: ${tarjeta.nombre}`,
          mensaje: `Has usado el ${porcentajeUso.toFixed(1)}% del límite de ${tarjeta.nombre}`,
          prioridad: 'baja',
          fechaCreacion: new Date().toISOString(),
          vista: this.alertasVistas.has(`limite_80_${tarjeta.id}`),
          datosAdicionales: {
            tarjetaId: tarjeta.id,
            tarjetaNombre: tarjeta.nombre,
            porcentajeUso: porcentajeUso
          }
        });
      }
    });

    return alertas;
  }

  /**
   * Genera alertas relacionadas con préstamos
   */
  private generarAlertasPrestamos(prestamos: Prestamo[]): Alerta[] {
    const alertas: Alerta[] = [];
    const hoy = new Date();

    prestamos
      .filter(p => p.estado === 'ACTIVO')
      .forEach(prestamo => {
        const totalPagado = prestamo.entregas.reduce((sum, e) => sum + e.monto, 0);
        const restante = prestamo.montoPrestado - totalPagado;

        if (restante > 0) {
          // Verificar si hay entregas pendientes (simplificado)
          const ultimaEntrega = prestamo.entregas[prestamo.entregas.length - 1];
          if (ultimaEntrega) {
            const fechaUltimaEntrega = new Date(ultimaEntrega.fecha);
            const diasDesdeUltimaEntrega = Math.floor((hoy.getTime() - fechaUltimaEntrega.getTime()) / (1000 * 60 * 60 * 24));
            
            // Alerta si pasaron más de 30 días desde la última entrega
            if (diasDesdeUltimaEntrega > 30) {
              alertas.push({
                id: uuidv4(),
                tipo: 'PRESTAMO_PAGO_PENDIENTE',
                titulo: `Préstamo pendiente: ${prestamo.prestamista}`,
                mensaje: `Faltan ${restante.toFixed(2)} ${prestamo.moneda} por pagar. Última entrega hace ${diasDesdeUltimaEntrega} días`,
                prioridad: 'media',
                fechaCreacion: new Date().toISOString(),
                vista: this.alertasVistas.has(`prestamo_${prestamo.id}`),
                datosAdicionales: {
                  prestamoId: prestamo.id,
                  restante: restante,
                  moneda: prestamo.moneda
                }
              });
            }
          }
        }
      });

    return alertas;
  }

  /**
   * Carga las alertas vistas desde localStorage
   */
  private loadVistasFromStorage(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar alertas vistas:', error);
    }
    return [];
  }

  /**
   * Guarda las alertas vistas en localStorage
   */
  private saveVistasToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.alertasVistas)));
    } catch (error) {
      console.error('Error al guardar alertas vistas:', error);
    }
  }
}

