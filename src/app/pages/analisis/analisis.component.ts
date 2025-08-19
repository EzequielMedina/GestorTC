import {Component, inject, OnDestroy, OnInit, ViewChildren, QueryList, ChangeDetectorRef, NgZone} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { ChartConfiguration, ChartDataset, ChartOptions, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import 'chart.js/auto'; // Importar automáticamente todos los componentes necesarios
import { forkJoin, map, Observable, of } from 'rxjs';

@Component({
  selector: 'app-analisis',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule
  ],
  templateUrl: './analisis.component.html',
  styleUrls: ['./analisis.component.css']
})
export class AnalisisComponent implements OnInit, OnDestroy {
  // Datos
  tarjetas: Tarjeta[] = [];
  gastos: Gasto[] = [];

  // Referencias a todos los charts
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  // Filtros UI
  mesesLista = [
    { value: 1, label: 'Ene' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dic' },
  ];
  aniosLista: number[] = [];

  // Filtro para gráfico de torta
  filtroPieMes!: number;
  filtroPieAnio!: number;

  // Filtros para proyección (rango)
  proyeccionDesdeMes!: number;
  proyeccionDesdeAnio!: number;
  proyeccionHastaMes!: number;
  proyeccionHastaAnio!: number;

  public pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: []
  };

  public proyeccionData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  // Handlers filtros gráfico de torta
  onPieMesChange(eventOrValue: any) {
    const raw = (eventOrValue && typeof eventOrValue === 'object' && 'value' in eventOrValue)
      ? (eventOrValue as any).value
      : eventOrValue;
    const value = typeof raw === 'number' ? raw : parseInt(`${raw}`, 10);
    this.filtroPieMes = Number.isFinite(value) ? value : this.filtroPieMes;
    console.log('[Filtro Pie] Mes cambiado a:', this.filtroPieMes);
    this.actualizarGraficoPastel();
  }

  onPieAnioChange(eventOrValue: any) {
    const raw = (eventOrValue && typeof eventOrValue === 'object' && 'value' in eventOrValue)
      ? (eventOrValue as any).value
      : eventOrValue;
    const value = typeof raw === 'number' ? raw : parseInt(`${raw}`, 10);
    this.filtroPieAnio = Number.isFinite(value) ? value : this.filtroPieAnio;
    console.log('[Filtro Pie] Año cambiado a:', this.filtroPieAnio);
    this.actualizarGraficoPastel();
  }

  // Handlers filtros proyección
  onProyDesdeMesChange(eventOrValue: any) {
    const raw = (eventOrValue && typeof eventOrValue === 'object' && 'value' in eventOrValue)
      ? (eventOrValue as any).value
      : eventOrValue;
    const value = typeof raw === 'number' ? raw : parseInt(`${raw}`, 10);
    this.proyeccionDesdeMes = Number.isFinite(value) ? value : this.proyeccionDesdeMes;
  }
  onProyDesdeAnioChange(eventOrValue: any) {
    const raw = (eventOrValue && typeof eventOrValue === 'object' && 'value' in eventOrValue)
      ? (eventOrValue as any).value
      : eventOrValue;
    const value = typeof raw === 'number' ? raw : parseInt(`${raw}`, 10);
    this.proyeccionDesdeAnio = Number.isFinite(value) ? value : this.proyeccionDesdeAnio;
  }
  onProyHastaMesChange(eventOrValue: any) {
    const raw = (eventOrValue && typeof eventOrValue === 'object' && 'value' in eventOrValue)
      ? (eventOrValue as any).value
      : eventOrValue;
    const value = typeof raw === 'number' ? raw : parseInt(`${raw}`, 10);
    this.proyeccionHastaMes = Number.isFinite(value) ? value : this.proyeccionHastaMes;
  }
  onProyHastaAnioChange(eventOrValue: any) {
    const raw = (eventOrValue && typeof eventOrValue === 'object' && 'value' in eventOrValue)
      ? (eventOrValue as any).value
      : eventOrValue;
    const value = typeof raw === 'number' ? raw : parseInt(`${raw}`, 10);
    this.proyeccionHastaAnio = Number.isFinite(value) ? value : this.proyeccionHastaAnio;
  }
  aplicarFiltroProyeccion() {
    // Validar rango
    const desde = new Date(this.proyeccionDesdeAnio, this.proyeccionDesdeMes - 1, 1);
    const hasta = new Date(this.proyeccionHastaAnio, this.proyeccionHastaMes - 1, 1);
    if (desde > hasta) {
      console.warn('Rango inválido: desde es mayor que hasta');
      return;
    }
    this.actualizarProyeccionPagos();
  }

  // Helpers para Datepicker (mostrar fecha actual de filtros)
  getPieFecha(): Date { return new Date(this.filtroPieAnio, this.filtroPieMes - 1, 1); }
  getProyDesdeFecha(): Date { return new Date(this.proyeccionDesdeAnio, this.proyeccionDesdeMes - 1, 1); }
  getProyHastaFecha(): Date { return new Date(this.proyeccionHastaAnio, this.proyeccionHastaMes - 1, 1); }

  // Handlers Datepicker (selección de mes)
  onPieMonthSelected(date: Date, datepicker: any) {
    this.filtroPieMes = date.getMonth() + 1;
    this.filtroPieAnio = date.getFullYear();
    datepicker.close();
    this.actualizarGraficoPastel();
  }
  onProyDesdeMonthSelected(date: Date, datepicker: any) {
    this.proyeccionDesdeMes = date.getMonth() + 1;
    this.proyeccionDesdeAnio = date.getFullYear();
    datepicker.close();
  }
  onProyHastaMonthSelected(date: Date, datepicker: any) {
    this.proyeccionHastaMes = date.getMonth() + 1;
    this.proyeccionHastaAnio = date.getFullYear();
    datepicker.close();
  }

  public pieChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Distribución por Tarjeta',
        font: { size: 16 }
      },
      legend: {
        position: 'bottom',
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 8, left: 8 }
    }
  };

  public proyeccionOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Proyección de Pagos (Próximos 12 Meses)',
        font: { size: 16 }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 8, left: 8 }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Monto a Pagar ($)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Meses'
        }
      }
    }
  };

  // Inyectar servicios
  private tarjetaService = inject(TarjetaService);
  private gastoService = inject(GastoService);

  // Suscripciones
  private tarjetasSubscription: any;
  private gastosSubscription: any;

  constructor() {}

  ngOnInit(): void {
    // Inicializar listas de años y valores por defecto de filtros
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    this.aniosLista = Array.from({ length: 11 }, (_, i) => anioActual - 5 + i);

    this.filtroPieMes = hoy.getMonth() + 1;
    this.filtroPieAnio = anioActual;

    this.proyeccionDesdeMes = this.filtroPieMes;
    this.proyeccionDesdeAnio = anioActual;
    // Por defecto 12 meses de rango
    const hasta = new Date(anioActual, this.filtroPieMes - 1 + 11, 1);
    this.proyeccionHastaMes = hasta.getMonth() + 1;
    this.proyeccionHastaAnio = hasta.getFullYear();

    this.cargarDatos();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    if (this.tarjetasSubscription) {
      this.tarjetasSubscription.unsubscribe();
    }
    if (this.gastosSubscription) {
      this.gastosSubscription.unsubscribe();
    }
  }

  private cargarDatos(): void {
    // Suscribirse a los cambios de tarjetas
    this.tarjetasSubscription = this.tarjetaService.getTarjetas$().subscribe({
      next: (tarjetas) => {
        console.log('Tarjetas cargadas:', tarjetas);
        this.tarjetas = tarjetas || [];
        this.actualizarGraficos();
      },
      error: (error) => {
        console.error('Error al cargar tarjetas:', error);
      }
    });

    // Suscribirse a los cambios de gastos
    this.gastosSubscription = this.gastoService.getGastos$().subscribe({
      next: (gastos) => {
        console.log('Gastos cargados:', gastos);
        this.gastos = gastos || [];
        this.actualizarGraficos();
      },
      error: (error) => {
        console.error('Error al cargar gastos:', error);
      }
    });
  }

  private actualizarGraficos(): void {
    console.log('Actualizando gráficos...');
    // Eliminamos el gráfico lineal por requerimiento del usuario
    this.actualizarGraficoPastel();
    this.actualizarProyeccionPagos();
    console.log('Gráficos actualizados');
  }

  // (el gráfico lineal fue removido)

  private actualizarGraficoPastel(): void {
    console.log('Actualizando gráfico de pastel...');
    const mesSel = this.filtroPieMes;
    const anioSel = this.filtroPieAnio;
    console.log(`[Pie] Filtrando por mes/año: ${mesSel}/${anioSel}`);

    // Agrupar monto a pagar en ese mes por tarjeta (considerando cuotas)
    const gastosPorTarjeta: { [key: string]: number } = {};
    this.tarjetas.forEach(t => (gastosPorTarjeta[t.nombre] = 0));

    this.gastos.forEach(gasto => {
      const tarjeta = this.tarjetas.find(t => t.id === gasto.tarjetaId);
      if (!tarjeta) return;

      // Sin cuotas o 1 cuota: cuenta si la fecha del gasto cae en el mes/año
      if (!gasto.cantidadCuotas || gasto.cantidadCuotas <= 1) {
        const f = this.parseFechaLocal(gasto.fecha);
        if (f.getMonth() + 1 === mesSel && f.getFullYear() === anioSel) {
          gastosPorTarjeta[tarjeta.nombre] += gasto.monto;
        }
        return;
      }

      // Con cuotas: ver si el mes/año seleccionado contienen alguna cuota
      const inicio = gasto.primerMesCuota ? this.parseFechaLocal(gasto.primerMesCuota) : this.parseFechaLocal(gasto.fecha);
      const startY = inicio.getFullYear();
      const startM = inicio.getMonth(); // 0-11
      const idxSel = (anioSel - startY) * 12 + ((mesSel - 1) - startM);
      const cant = (gasto.cantidadCuotas || 1);
      // Logs de depuración para cuotas
      if (idxSel >= -1 && idxSel <= cant + 1) {
        console.log(`[Pie][Cuotas] Tarjeta:${tarjeta.nombre} inicio:${startM+1}/${startY} sel:${mesSel}/${anioSel} idxSel:${idxSel} cuotas:${cant}`);
      }
      if (idxSel >= 0 && idxSel < cant) {
        gastosPorTarjeta[tarjeta.nombre] += gasto.monto / cant;
      }
    });
    console.log('Gastos por tarjeta (mes/cuotas):', gastosPorTarjeta);

    // Preparar datos para el gráfico
    const labels = Object.keys(gastosPorTarjeta).filter(k => gastosPorTarjeta[k] > 0);
    const data = labels.map(k => gastosPorTarjeta[k]);

    console.log('Etiquetas del gráfico de pastel:', labels);
    console.log('Datos del gráfico de pastel:', data);

    // Colores para cada tarjeta
    const backgroundColors = this.generarColores(labels.length);

    this.pieChartData = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        hoverOffset: 4
      }]
    };
    // Forzar actualización del gráfico (compatibilidad)
    // 1) Disparar detección de cambios para asegurar que el template reciba el nuevo objeto
    this.cdr.detectChanges();
    // 2) Buscar el chart de tipo 'pie' y actualizar (con fallback al primero)
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        const list = this.charts?.toArray() ?? [];
        const pie = list.find(d => (d as any).chart?.config?.type === 'pie') || list[0];
        if (pie) {
          if (typeof (pie as any).update === 'function') {
            (pie as any).update();
          } else if ((pie as any).chart && typeof (pie as any).chart.update === 'function') {
            (pie as any).chart.update();
          }
        }
      }, 0);
    });
  }

  private actualizarProyeccionPagos(): void {
    console.log('Actualizando proyección de pagos...');
    const mesesProyeccion: Array<{ mes: number; anio: number; fecha: Date }> = [];

    // Generar meses entre [desde, hasta] inclusivo
    let m = this.proyeccionDesdeMes - 1; // 0-11
    let y = this.proyeccionDesdeAnio;
    const finM = this.proyeccionHastaMes - 1;
    const finY = this.proyeccionHastaAnio;

    while (y < finY || (y === finY && m <= finM)) {
      mesesProyeccion.push({ mes: m + 1, anio: y, fecha: new Date(y, m, 1) });
      m++;
      if (m > 11) { m = 0; y++; }
    }

    // Calcular el total a pagar por mes
    const montos = mesesProyeccion.map(({ mes, anio }) => {
      return this.calcularTotalAPagarEnMes(mes, anio);
    });

    this.proyeccionData = {
      labels: mesesProyeccion.map(m => `${this.obtenerNombreMes(m.mes)}/${m.anio}`),
      datasets: [
        {
          data: montos,
          label: 'Total a Pagar',
          tension: 0.3,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true
        }
      ]
    };
  }

  private calcularTotalAPagarEnMes(mes: number, anio: number): number {
    // Obtener el primer y último día del mes
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    let total = 0;

    // Procesar cada gasto
    this.gastos.forEach(gasto => {
      // Si el gasto no tiene cuotas o tiene 1 cuota, verificar si vence este mes
      if (!gasto.cantidadCuotas || gasto.cantidadCuotas <= 1) {
        const fechaGasto = this.parseFechaLocal(gasto.fecha);
        if (fechaGasto.getMonth() + 1 === mes && fechaGasto.getFullYear() === anio) {
          total += gasto.monto;
        }
        return; // Pasar al siguiente gasto
      }

      // Para gastos a cuotas, verificar si alguna cuota vence este mes
      const primerMesCuota = gasto.primerMesCuota ? this.parseFechaLocal(gasto.primerMesCuota) : this.parseFechaLocal(gasto.fecha);

      // Calcular la fecha de cada cuota
      for (let i = 0; i < (gasto.cantidadCuotas || 1); i++) {
        const fechaCuota = new Date(
          primerMesCuota.getFullYear(),
          primerMesCuota.getMonth() + i,
          Math.min(primerMesCuota.getDate(), 28) // Evitar problemas con meses que tienen menos de 31 días
        );

        // Ajustar el año si es necesario (por ejemplo, si las cuotas cruzan años)
        fechaCuota.setFullYear(primerMesCuota.getFullYear() + Math.floor((primerMesCuota.getMonth() + i) / 12));

        // Verificar si esta cuota corresponde al mes y año actual
        if (fechaCuota.getMonth() + 1 === mes && fechaCuota.getFullYear() === anio) {
          // Sumar el monto de la cuota (monto total dividido por la cantidad de cuotas)
          total += gasto.monto / gasto.cantidadCuotas;
          break; // No necesitamos verificar más cuotas para este gasto
        }
      }
    });

    console.log(`Total a pagar en ${mes}/${anio}:`, total);
    return total;
  }

  private agruparGastosPorMes(): { [key: string]: number } {
    return this.gastos.reduce((acumulador, gasto) => {
      const fecha = this.parseFechaLocal(gasto.fecha);
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();
      const clave = `${anio}-${mes.toString().padStart(2, '0')}`;

      if (!acumulador[clave]) {
        acumulador[clave] = 0;
      }

      acumulador[clave] += gasto.monto;
      return acumulador;
    }, {} as { [key: string]: number });
  }

  private agruparGastosPorTarjeta(): { [key: string]: number } {
    const resultado: { [key: string]: number } = {};

    this.tarjetas.forEach(tarjeta => {
      resultado[tarjeta.nombre] = 0;
    });

    this.gastos.forEach(gasto => {
      const tarjeta = this.tarjetas.find(t => t.id === gasto.tarjetaId);
      if (tarjeta) {
        resultado[tarjeta.nombre] += gasto.monto;
      }
    });

    // Eliminar tarjetas sin gastos
    Object.keys(resultado).forEach(key => {
      if (resultado[key] === 0) {
        delete resultado[key];
      }
    });

    return resultado;
  }

  private obtenerUltimosMeses(cantidad: number): Array<{mes: number, anio: number}> {
    const hoy = new Date();
    const meses = [];

    for (let i = cantidad - 1; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear()
      });
    }

    return meses;
  }

  private obtenerNombreMes(numeroMes: number): string {
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return meses[numeroMes - 1] || '';
  }

  // Parsear fechas en horario local para evitar desfases por UTC
  private parseFechaLocal(fecha: any): Date {
    if (fecha instanceof Date) {
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }
    if (typeof fecha === 'string') {
      // Formato ISO corto YYYY-MM-DD
      const isoCorto = fecha.substring(0, 10);
      const mIso = /^\d{4}-\d{2}-\d{2}$/.exec(isoCorto);
      if (mIso) {
        const [y, m, d] = isoCorto.split('-').map(n => parseInt(n, 10));
        return new Date(y, m - 1, d);
      }
      // Formato YYYY-MM (sin día)
      const mIsoYm = /^(\d{4})-(\d{2})$/.exec(fecha);
      if (mIsoYm) {
        const y = parseInt(mIsoYm[1], 10);
        const m = parseInt(mIsoYm[2], 10);
        return new Date(y, m - 1, 1);
      }
      // Formato DD/MM/YYYY
      const mSlash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
      if (mSlash) {
        const d = parseInt(mSlash[1], 10);
        const m = parseInt(mSlash[2], 10);
        const y = parseInt(mSlash[3], 10);
        return new Date(y, m - 1, d);
      }
      // Formato MM/YYYY
      const mSlashMy = /^(\d{2})\/(\d{4})$/.exec(fecha);
      if (mSlashMy) {
        const m = parseInt(mSlashMy[1], 10);
        const y = parseInt(mSlashMy[2], 10);
        return new Date(y, m - 1, 1);
      }
      // Fallback: crear y normalizar a local
      const dObj = new Date(fecha);
      return new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate());
    }
    // Timestamps numéricos
    if (typeof fecha === 'number') {
      const dObj = new Date(fecha);
      return new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate());
    }
    // Último recurso
    const dObj = new Date(fecha);
    return new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate());
  }

  private generarColores(cantidad: number): string[] {
    const colores = [
      '#3f51b5', '#f44336', '#4caf50', '#ff9800', '#9c27b0',
      '#00bcd4', '#8bc34a', '#ff5722', '#607d8b', '#e91e63'
    ];

    // Si necesitamos más colores de los predefinidos, generamos aleatorios
    if (cantidad > colores.length) {
      for (let i = colores.length; i < cantidad; i++) {
        colores.push(`#${Math.floor(Math.random()*16777215).toString(16)}`);
      }
    }

    return colores.slice(0, cantidad);
  }
}
