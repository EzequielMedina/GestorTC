import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { switchMap, filter, catchError } from 'rxjs/operators';
import { TarjetaService } from './tarjeta';
import { ResumenService } from './resumen.service';
import { NotificacionService } from './notificacion.service';
import { CalculoVencimientoService } from './calculo-vencimiento.service';
import { Tarjeta } from '../models/tarjeta.model';
import { DatosVencimientoTarjeta, ResultadoNotificacion } from '../models/notificacion.model';

@Injectable({
  providedIn: 'root'
})
export class VencimientoService {
  private readonly STORAGE_KEY_ULTIMA_VERIFICACION = 'gestor-tc-ultima-verificacion';
  private readonly INTERVALO_VERIFICACION = 60 * 60 * 1000; // 1 hora en milisegundos
  
  private verificacionActivaSubject = new BehaviorSubject<boolean>(false);
  private ultimaVerificacionSubject = new BehaviorSubject<Date | null>(null);
  
  constructor(
    private tarjetaService: TarjetaService,
    private resumenService: ResumenService,
    private notificacionService: NotificacionService,
    private calculoVencimientoService: CalculoVencimientoService
  ) {
    this.cargarUltimaVerificacion();
    this.iniciarVerificacionPeriodica();
  }

  /**
   * Obtiene el estado de verificación activa
   */
  getVerificacionActiva$(): Observable<boolean> {
    return this.verificacionActivaSubject.asObservable();
  }

  /**
   * Obtiene la fecha de la última verificación
   */
  getUltimaVerificacion$(): Observable<Date | null> {
    return this.ultimaVerificacionSubject.asObservable();
  }

  /**
   * Inicia la verificación periódica automática
   */
  iniciarVerificacionPeriodica(): void {
    // Verificar inmediatamente si no se ha verificado hoy
    this.verificarSiEsNecesario();

    // Configurar verificación periódica cada hora
    interval(this.INTERVALO_VERIFICACION)
      .pipe(
        filter(() => this.debeVerificarHoy()),
        switchMap(() => this.verificarVencimientos()),
        catchError(error => {
          console.error('Error en verificación periódica:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Verifica manualmente los vencimientos
   */
  verificarVencimientosManual(): Observable<ResultadoNotificacion[]> {
    return this.verificarVencimientos();
  }

  /**
   * Verifica si hay tarjetas que vencen hoy y envía notificaciones
   */
  private verificarVencimientos(): Observable<ResultadoNotificacion[]> {
    this.verificacionActivaSubject.next(true);
    
    return new Observable(observer => {
      this.procesarVerificacion()
        .then(resultados => {
          observer.next(resultados);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        })
        .finally(() => {
          this.verificacionActivaSubject.next(false);
        });
    });
  }

  /**
   * Procesa la verificación de vencimientos
   */
  private async procesarVerificacion(): Promise<ResultadoNotificacion[]> {
    try {
      const configuracion = this.notificacionService.obtenerConfiguracion();
      const tarjetas = await this.tarjetaService.getTarjetas$().toPromise() || [];
      const hoy = new Date();
      const diaHoy = hoy.getDate();
      
      console.log(`🔍 Verificando vencimientos para el día ${diaHoy}`);
      
      const tarjetasQueVencen = this.filtrarTarjetasQueVencen(tarjetas, diaHoy, configuracion.diasAnticipacion);
      
      if (tarjetasQueVencen.length === 0) {
        console.log('✅ No hay tarjetas que venzan hoy');
        this.actualizarUltimaVerificacion();
        return [];
      }

      console.log(`📋 Encontradas ${tarjetasQueVencen.length} tarjeta(s) que vence(n):`, 
        tarjetasQueVencen.map(t => t.nombre));

      const resultados: ResultadoNotificacion[] = [];
      
      for (const tarjeta of tarjetasQueVencen) {
        try {
          const datosVencimiento = await this.obtenerDatosVencimiento(tarjeta);
          const resultado = await this.notificacionService.enviarNotificacionVencimiento(datosVencimiento);
          resultados.push(resultado);
          
          console.log(`📧 Notificación enviada para ${tarjeta.nombre}:`, resultado.exito ? '✅' : '❌');
        } catch (error) {
          console.error(`Error al procesar tarjeta ${tarjeta.nombre}:`, error);
          resultados.push({
            exito: false,
            mensaje: `Error al procesar ${tarjeta.nombre}: ${error}`,
            tipoEnvio: 'ambos',
            fechaEnvio: new Date().toISOString(),
            error: error?.toString()
          });
        }
      }

      this.actualizarUltimaVerificacion();
      return resultados;
      
    } catch (error) {
      console.error('Error en procesarVerificacion:', error);
      throw error;
    }
  }

  /**
   * Filtra las tarjetas que vencen según el día y la anticipación configurada
   */
  private filtrarTarjetasQueVencen(
    tarjetas: Tarjeta[], 
    diaHoy: number, 
    diasAnticipacion: number
  ): Tarjeta[] {
    return this.calculoVencimientoService.filtrarTarjetasQueVencen(tarjetas, diaHoy, diasAnticipacion);
  }

  /**
   * Obtiene las tarjetas que están próximas a vencer
   */
  getTarjetasProximasAVencer$(diasAnticipacion: number = 3): Observable<DatosVencimientoTarjeta[]> {
    return this.calculoVencimientoService.getTarjetasProximasAVencer$(diasAnticipacion);
  }

  /**
   * Obtiene los datos detallados de vencimiento para una tarjeta específica
   */
  getDatosVencimientoTarjeta$(tarjetaId: string): Observable<DatosVencimientoTarjeta | null> {
    return this.calculoVencimientoService.getDatosVencimientoTarjeta$(tarjetaId);
  }

  /**
   * Obtiene los datos completos de vencimiento para una tarjeta
   */
  private async obtenerDatosVencimiento(tarjeta: Tarjeta): Promise<DatosVencimientoTarjeta> {
    try {
      const datosVencimiento = await this.calculoVencimientoService.getDatosVencimientoTarjeta$(tarjeta.id).toPromise();
      
      if (datosVencimiento) {
        return {
          ...datosVencimiento,
          banco: tarjeta.banco || 'No especificado',
          diaVencimiento: tarjeta.diaVencimiento!,
          ultimosDigitos: tarjeta.ultimosDigitos,
          fechaVencimiento: this.calcularFechaVencimiento(tarjeta.diaVencimiento!)
        };
      }
      
      // Fallback si no se obtienen datos del servicio de cálculo
      return {
        tarjetaId: tarjeta.id,
        nombreTarjeta: tarjeta.nombre,
        banco: tarjeta.banco || 'No especificado',
        diaVencimiento: tarjeta.diaVencimiento!,
        diasHastaVencimiento: this.calcularDiasHastaVencimiento(tarjeta.diaVencimiento!),
        montoAPagar: 0,
        montoAdeudado: 0,
        porcentajeUso: 0,
        ultimosDigitos: tarjeta.ultimosDigitos,
        fechaVencimiento: this.calcularFechaVencimiento(tarjeta.diaVencimiento!),
        cuotasPendientes: 0,
        montoProximoMes: 0,
        gastosRecientes: 0,
        saldoDisponible: tarjeta.limite
      };
      
    } catch (error) {
      console.error(`Error al obtener datos de vencimiento para ${tarjeta.nombre}:`, error);
      
      // Retornar datos básicos en caso de error
      return {
        tarjetaId: tarjeta.id,
        nombreTarjeta: tarjeta.nombre,
        banco: tarjeta.banco || 'No especificado',
        diaVencimiento: tarjeta.diaVencimiento!,
        diasHastaVencimiento: this.calcularDiasHastaVencimiento(tarjeta.diaVencimiento!),
        montoAPagar: 0,
        montoAdeudado: 0,
        porcentajeUso: 0,
        ultimosDigitos: tarjeta.ultimosDigitos,
        fechaVencimiento: this.calcularFechaVencimiento(tarjeta.diaVencimiento!),
        cuotasPendientes: 0,
        montoProximoMes: 0,
        gastosRecientes: 0,
        saldoDisponible: tarjeta.limite
      };
    }
  }

  /**
   * Calcula los días hasta el vencimiento
   */
  private calcularDiasHastaVencimiento(diaVencimiento: number): number {
    const hoy = new Date();
    const fechaVencimiento = this.calcularFechaVencimiento(diaVencimiento);
    const diferencia = fechaVencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcula la fecha de vencimiento para el mes actual
   */
  private calcularFechaVencimiento(diaVencimiento: number): Date {
    const hoy = new Date();
    let año = hoy.getFullYear();
    let mes = hoy.getMonth();
    
    // Si el día de vencimiento ya pasó este mes, es para el próximo mes
    if (diaVencimiento < hoy.getDate()) {
      mes += 1;
      if (mes > 11) {
        mes = 0;
        año += 1;
      }
    }
    
    return new Date(año, mes, diaVencimiento);
  }

  /**
   * Verifica si es necesario hacer la verificación hoy
   */
  private verificarSiEsNecesario(): void {
    if (this.debeVerificarHoy()) {
      this.verificarVencimientos().subscribe({
        next: (resultados) => {
          console.log('✅ Verificación inicial completada:', resultados.length, 'notificaciones procesadas');
        },
        error: (error) => {
          console.error('❌ Error en verificación inicial:', error);
        }
      });
    }
  }

  /**
   * Determina si debe verificar hoy basado en la última verificación
   */
  private debeVerificarHoy(): boolean {
    const ultimaVerificacion = this.ultimaVerificacionSubject.value;
    
    if (!ultimaVerificacion) {
      return true; // Primera vez
    }
    
    const hoy = new Date();
    const fechaUltimaVerificacion = new Date(ultimaVerificacion);
    
    // Verificar si es un día diferente
    return hoy.toDateString() !== fechaUltimaVerificacion.toDateString();
  }

  /**
   * Actualiza la fecha de última verificación
   */
  private actualizarUltimaVerificacion(): void {
    const ahora = new Date();
    this.ultimaVerificacionSubject.next(ahora);
    localStorage.setItem(this.STORAGE_KEY_ULTIMA_VERIFICACION, ahora.toISOString());
  }

  /**
   * Carga la fecha de última verificación desde localStorage
   */
  private cargarUltimaVerificacion(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_ULTIMA_VERIFICACION);
      if (stored) {
        const fecha = new Date(stored);
        this.ultimaVerificacionSubject.next(fecha);
      }
    } catch (error) {
      console.error('Error al cargar última verificación:', error);
    }
  }

  /**
   * Obtiene información de estado del servicio
   */
  getEstadoServicio(): {
    verificacionActiva: boolean;
    ultimaVerificacion: Date | null;
    proximaVerificacion: Date | null;
    configuracion: any;
  } {
    const ultimaVerificacion = this.ultimaVerificacionSubject.value;
    const proximaVerificacion = ultimaVerificacion 
      ? new Date(ultimaVerificacion.getTime() + this.INTERVALO_VERIFICACION)
      : new Date();
    
    return {
      verificacionActiva: this.verificacionActivaSubject.value,
      ultimaVerificacion,
      proximaVerificacion,
      configuracion: this.notificacionService.obtenerConfiguracion()
    };
  }

  /**
   * Reinicia el servicio de verificación
   */
  reiniciarServicio(): void {
    localStorage.removeItem(this.STORAGE_KEY_ULTIMA_VERIFICACION);
    this.ultimaVerificacionSubject.next(null);
    this.verificarSiEsNecesario();
  }
}