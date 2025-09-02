import { Component, OnInit, OnDestroy, ViewChildren, QueryList, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { CompraDolar } from '../../models/compra-dolar.model';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { CompraDolarService } from '../../services/compra-dolar.service';
import { ResumenService } from '../../services/resumen.service';
import { GraficoDolarTemporalComponent } from '../../components/grafico-dolar-temporal/grafico-dolar-temporal.component';

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    GraficoDolarTemporalComponent
  ],
  templateUrl: './graficos.component.html',
  styleUrls: ['./graficos.component.css']
})
export class GraficosComponent implements OnInit, OnDestroy {
  // Datos
  tarjetas: Tarjeta[] = [];
  gastos: Gasto[] = [];
  comprasDolar: CompraDolar[] = [];
  tieneComprasDolar = false;

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

  // Filtro para gráfico mensual por tarjeta
  filtroMes!: number;
  filtroAnio!: number;

  // Filtros para proyección (rango)
  proyeccionDesdeMes!: number;
  proyeccionDesdeAnio!: number;
  proyeccionHastaMes!: number;
  proyeccionHastaAnio!: number;

  // Filtros para gráfico de total por mes
  totalDesdeMes!: number;
  totalDesdeAnio!: number;
  totalHastaMes!: number;
  totalHastaAnio!: number;

  // Configuración del gráfico mensual por tarjeta
  public montosPorTarjetaData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  // Gráficos de Compra de Dólares
  public evolucionDolarData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public evolucionDolarOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Evolución de Compras de Dólares',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cantidad (USD)',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Meses',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  public comparacionPreciosData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  public comparacionPreciosOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Precio Compra vs Precio Actual',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Precio ($)',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Compras',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  public distribucionComprasData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: []
  };

  public distribucionComprasOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Distribución de Compras por Año',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    }
  };

  public variacionAcumuladaData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public variacionAcumuladaOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Variación Acumulada en el Tiempo',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Variación ($)',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Meses',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  public montosPorTarjetaOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Montos por Tarjeta - Mensual',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Monto ($)',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Tarjetas',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  // Configuración del gráfico de proyección por rango
  public proyeccionRangoData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public proyeccionRangoOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Proyección de Pagos por Rango',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Monto a Pagar ($)',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Meses',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  // Configuración del gráfico de total por mes
  public totalPorMesData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public totalPorMesOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Total de Todas las Tarjetas por Mes',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 16, left: 8 }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Monto Total ($)',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Meses',
          font: {
            size: 11
          }
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  // Inyectar servicios
  private tarjetaService = inject(TarjetaService);
  private gastoService = inject(GastoService);
  private compraDolarService = inject(CompraDolarService);
  private resumenService = inject(ResumenService);

  // Subscripciones
  private tarjetasSubscription: any;
  private gastosSubscription: any;
  private comprasDolarSubscription: any;

  ngOnInit(): void {
    // Inicializar fechas actuales
    const fechaActual = new Date();
    this.filtroMes = fechaActual.getMonth() + 1;
    this.filtroAnio = fechaActual.getFullYear();

    // Inicializar rango de proyección (próximos 6 meses desde el actual)
    this.proyeccionDesdeMes = this.filtroMes;
    this.proyeccionDesdeAnio = this.filtroAnio;
    
    // Calcular fecha 6 meses después
    const fechaHasta = new Date(fechaActual);
    fechaHasta.setMonth(fechaHasta.getMonth() + 5); // 6 meses incluyendo el actual
    this.proyeccionHastaMes = fechaHasta.getMonth() + 1;
    this.proyeccionHastaAnio = fechaHasta.getFullYear();

    // Inicializar rango para el gráfico de total por mes (próximos 6 meses desde el actual)
    this.totalDesdeMes = this.filtroMes;
    this.totalDesdeAnio = this.filtroAnio;
    
    // Calcular fecha 6 meses después para el total
    const fechaHastaTotal = new Date(fechaActual);
    fechaHastaTotal.setMonth(fechaHastaTotal.getMonth() + 5); // 6 meses incluyendo el actual
    this.totalHastaMes = fechaHastaTotal.getMonth() + 1;
    this.totalHastaAnio = fechaHastaTotal.getFullYear();

    // Generar lista de años (desde 2020 hasta 2 años en el futuro)
    const anioActual = new Date().getFullYear();
    for (let i = 2020; i <= anioActual + 2; i++) {
      this.aniosLista.push(i);
    }

    // Cargar datos
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    if (this.tarjetasSubscription) {
      this.tarjetasSubscription.unsubscribe();
    }
    if (this.gastosSubscription) {
      this.gastosSubscription.unsubscribe();
    }
    if (this.comprasDolarSubscription) {
      this.comprasDolarSubscription.unsubscribe();
    }
  }

  cargarDatos(): void {
    // Cargar tarjetas
    this.tarjetasSubscription = this.tarjetaService.getTarjetas$().subscribe(tarjetas => {
      this.tarjetas = tarjetas;
      
      // Cargar gastos después de tener las tarjetas
      this.gastosSubscription = this.gastoService.getGastos$().subscribe(gastos => {
        this.gastos = gastos;
        
        // Actualizar gráficos
        this.actualizarGraficoMensual();
        this.actualizarGraficoProyeccion();
        this.actualizarGraficoTotal();
      });
    });

    // Suscribirse a cambios en compras de dólares
    this.comprasDolarSubscription = this.compraDolarService.obtenerCompras().subscribe(compras => {
      this.comprasDolar = compras;
      this.tieneComprasDolar = compras.length > 0;
      if (this.tieneComprasDolar) {
        this.actualizarGraficosComprasDolar();
      }
    });
  }

  // Obtener fecha para el filtro mensual
  getFiltroFecha(): Date {
    return new Date(this.filtroAnio, this.filtroMes - 1, 1);
  }

  // Obtener fecha para el filtro de proyección (desde)
  getProyDesdeFecha(): Date {
    return new Date(this.proyeccionDesdeAnio, this.proyeccionDesdeMes - 1, 1);
  }

  // Obtener fecha para el filtro de proyección (hasta)
  getProyHastaFecha(): Date {
    return new Date(this.proyeccionHastaAnio, this.proyeccionHastaMes - 1, 1);
  }

  // Obtener fecha para el filtro de total (desde)
  getTotalDesdeFecha(): Date {
    return new Date(this.totalDesdeAnio, this.totalDesdeMes - 1, 1);
  }

  // Obtener fecha para el filtro de total (hasta)
  getTotalHastaFecha(): Date {
    return new Date(this.totalHastaAnio, this.totalHastaMes - 1, 1);
  }

  // Actualizar filtro mensual al seleccionar mes
  onFiltroMonthSelected(date: Date, datepicker: any): void {
    this.filtroMes = date.getMonth() + 1;
    this.filtroAnio = date.getFullYear();
    datepicker.close();
    this.actualizarGraficoMensual();
  }

  // Actualizar filtro de proyección (desde) al seleccionar mes
  onProyDesdeMonthSelected(date: Date, datepicker: any): void {
    this.proyeccionDesdeMes = date.getMonth() + 1;
    this.proyeccionDesdeAnio = date.getFullYear();
    datepicker.close();
  }

  // Actualizar filtro de proyección (hasta) al seleccionar mes
  onProyHastaMonthSelected(date: Date, datepicker: any): void {
    this.proyeccionHastaMes = date.getMonth() + 1;
    this.proyeccionHastaAnio = date.getFullYear();
    datepicker.close();
  }

  // Actualizar filtro de total (desde) al seleccionar mes
  onTotalDesdeMonthSelected(date: Date, datepicker: any): void {
    this.totalDesdeMes = date.getMonth() + 1;
    this.totalDesdeAnio = date.getFullYear();
    datepicker.close();
  }

  // Actualizar filtro de total (hasta) al seleccionar mes
  onTotalHastaMonthSelected(date: Date, datepicker: any): void {
    this.totalHastaMes = date.getMonth() + 1;
    this.totalHastaAnio = date.getFullYear();
    datepicker.close();
  }

  // Aplicar filtro de proyección
  aplicarFiltroProyeccion(): void {
    this.actualizarGraficoProyeccion();
  }

  // Aplicar filtro de total
  aplicarFiltroTotal(): void {
    this.actualizarGraficoTotal();
  }

  // Actualizar gráfico de total por mes
  actualizarGraficoTotal(): void {
    if (!this.tarjetas.length || !this.gastos.length) return;

    // Crear fechas desde y hasta para el rango seleccionado
    const fechaDesde = new Date(this.totalDesdeAnio, this.totalDesdeMes - 1, 1);
    const fechaHasta = new Date(this.totalHastaAnio, this.totalHastaMes, 0); // Último día del mes

    // Calcular el número de meses en el rango
    const mesesEnRango = (this.totalHastaAnio - this.totalDesdeAnio) * 12 + 
                         (this.totalHastaMes - this.totalDesdeMes) + 1;

    // Crear array para almacenar el total por mes
    const totalPorMes = new Array(mesesEnRango).fill(0);

    // Crear etiquetas para los meses en el rango
    const etiquetasMeses = [];
    for (let i = 0; i < mesesEnRango; i++) {
      const fecha = new Date(fechaDesde);
      fecha.setMonth(fecha.getMonth() + i);
      etiquetasMeses.push(`${this.mesesLista[fecha.getMonth()].label}/${fecha.getFullYear()}`);
    }

    // Calcular total por mes
    this.gastos.forEach(gasto => {
      // Verificar si el gasto tiene cuotas
      const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
      
      // Calcular el monto por cuota correctamente
      let montoCuota = 0;
      if (gasto.montoPorCuota) {
        // Si ya tiene un monto por cuota definido, usarlo
        montoCuota = gasto.montoPorCuota;
      } else {
        // Si no tiene monto por cuota, calcularlo dividiendo el monto total
        montoCuota = gasto.monto / cuotas;
      }
      
      // Determinar el primer mes de cuota
      let fechaPrimerMes;
      if (gasto.primerMesCuota) {
        // Si tiene primer mes de cuota definido, usarlo
        fechaPrimerMes = this.parseFechaLocal(gasto.primerMesCuota);
      } else if (cuotas > 1) {
        // Si tiene cuotas pero no tiene primer mes definido, usar el mes de la fecha del gasto
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
        // Asegurar que sea el primer día del mes
        fechaPrimerMes.setDate(1);
      } else {
        // Si no tiene cuotas, usar el mes de la fecha del gasto
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
        // Asegurar que sea el primer día del mes
        fechaPrimerMes.setDate(1);
      }
      
      // Iterar por cada cuota
      for (let i = 0; i < cuotas; i++) {
        const fechaCuota = new Date(
          fechaPrimerMes.getFullYear(),
          fechaPrimerMes.getMonth() + i,
          Math.min(fechaPrimerMes.getDate(), 28) // Evitar problemas con meses que tienen menos de 31 días
        );
        
        // Ajustar el año si es necesario (por ejemplo, si las cuotas cruzan años)
        fechaCuota.setFullYear(fechaPrimerMes.getFullYear() + Math.floor((fechaPrimerMes.getMonth() + i) / 12));
        
        // Verificar si la cuota está en el rango seleccionado
        if (fechaCuota >= fechaDesde && fechaCuota <= fechaHasta) {
          // Calcular el índice del mes en el array
          const mesesDiferencia = (fechaCuota.getFullYear() - fechaDesde.getFullYear()) * 12 + 
                                 (fechaCuota.getMonth() - fechaDesde.getMonth());
          
          // Actualizar el total para ese mes
          if (mesesDiferencia >= 0 && mesesDiferencia < mesesEnRango) {
            totalPorMes[mesesDiferencia] += montoCuota;
          }
        }
      }
    });

    // Preparar datos para el gráfico
    this.totalPorMesData = {
      labels: etiquetasMeses,
      datasets: [
        {
          label: 'Total de Todas las Tarjetas',
          data: totalPorMes,
          borderColor: '#006666',
          backgroundColor: 'rgba(0, 102, 102, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    };

    // Actualizar título del gráfico
    this.totalPorMesOptions.plugins!.title!.text = 
      `Total de Todas las Tarjetas por Mes (${this.mesesLista[this.totalDesdeMes-1].label}/${this.totalDesdeAnio} - ${this.mesesLista[this.totalHastaMes-1].label}/${this.totalHastaAnio})`;

    // Actualizar el gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.charts) {
          this.charts.forEach(chart => {
            chart.update();
          });
        }
      }, 0);
    });
  }

  // Método para parsear fechas de manera consistente
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
    }
    // Si no se pudo parsear, devolver la fecha actual
    console.warn('No se pudo parsear la fecha:', fecha);
    return new Date();
  }

  // Actualizar gráfico mensual por tarjeta
  actualizarGraficoMensual(): void {
    if (!this.tarjetas.length || !this.gastos.length) return;

    const mesKey = `${this.filtroAnio}-${this.filtroMes.toString().padStart(2, '0')}`;
    const montosPorTarjeta = new Map<string, number>();
    
    // Inicializar montos en 0 para todas las tarjetas
    this.tarjetas.forEach(tarjeta => {
      montosPorTarjeta.set(tarjeta.id, 0);
    });

    // Calcular montos por tarjeta para el mes seleccionado
    this.gastos.forEach(gasto => {
      // Verificar si el gasto tiene cuotas
      const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
      
      // Calcular el monto por cuota correctamente
      let montoCuota = 0;
      if (gasto.montoPorCuota) {
        // Si ya tiene un monto por cuota definido, usarlo
        montoCuota = gasto.montoPorCuota;
      } else {
        // Si no tiene monto por cuota, calcularlo dividiendo el monto total
        montoCuota = gasto.monto / cuotas;
      }
      
      // Determinar el primer mes de cuota
      let fechaPrimerMes;
      if (gasto.primerMesCuota) {
        // Si tiene primer mes de cuota definido, usarlo
        fechaPrimerMes = this.parseFechaLocal(gasto.primerMesCuota);
      } else if (cuotas > 1) {
        // Si tiene cuotas pero no tiene primer mes definido, usar el mes de la fecha del gasto
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
        // Asegurar que sea el primer día del mes
        fechaPrimerMes.setDate(1);
      } else {
        // Si no tiene cuotas, usar el mes de la fecha del gasto
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
        // Asegurar que sea el primer día del mes
        fechaPrimerMes.setDate(1);
      }
      
      // Iterar por cada cuota y verificar si corresponde al mes seleccionado
      for (let i = 0; i < cuotas; i++) {
        const fechaCuota = new Date(
          fechaPrimerMes.getFullYear(),
          fechaPrimerMes.getMonth() + i,
          Math.min(fechaPrimerMes.getDate(), 28) // Evitar problemas con meses que tienen menos de 31 días
        );
        
        // Ajustar el año si es necesario (por ejemplo, si las cuotas cruzan años)
        fechaCuota.setFullYear(fechaPrimerMes.getFullYear() + Math.floor((fechaPrimerMes.getMonth() + i) / 12));
        
        // Verificar si esta cuota corresponde al mes y año seleccionados
        if (fechaCuota.getMonth() + 1 === this.filtroMes && fechaCuota.getFullYear() === this.filtroAnio) {
          // Esta cuota corresponde al mes seleccionado
          const montoActual = montosPorTarjeta.get(gasto.tarjetaId) || 0;
          montosPorTarjeta.set(gasto.tarjetaId, montoActual + montoCuota);
        }
      }
    });


    // Preparar datos para el gráfico
    const labels: string[] = [];
    const data: number[] = [];
    const backgroundColors: string[] = [];

    // Colores para las tarjetas (se pueden ajustar)
    const colores = [
      'rgba(0, 102, 102, 0.7)',
      'rgba(0, 133, 132, 0.7)',
      'rgba(0, 153, 153, 0.7)',
      'rgba(51, 153, 153, 0.7)',
      'rgba(102, 204, 204, 0.7)',
      'rgba(153, 255, 255, 0.7)',
      'rgba(0, 76, 76, 0.7)',
      'rgba(0, 179, 179, 0.7)',
      'rgba(25, 128, 128, 0.7)',
      'rgba(76, 179, 179, 0.7)'
    ];

    // Mapear tarjetas a nombres y montos
    const tarjetasMap = new Map(this.tarjetas.map(t => [t.id, t.nombre]));
    let colorIndex = 0;

    // Ordenar por nombre de tarjeta
    const tarjetasOrdenadas = Array.from(montosPorTarjeta.entries())
      .sort((a, b) => (tarjetasMap.get(a[0]) || '').localeCompare(tarjetasMap.get(b[0]) || ''));

    tarjetasOrdenadas.forEach(([tarjetaId, monto]) => {
      const nombreTarjeta = tarjetasMap.get(tarjetaId) || 'Desconocida';
      labels.push(nombreTarjeta);
      data.push(monto);
      backgroundColors.push(colores[colorIndex % colores.length]);
      colorIndex++;
    });

    // Actualizar datos del gráfico
    this.montosPorTarjetaData = {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
        borderWidth: 1
      }]
    };

    // Actualizar título del gráfico
    this.montosPorTarjetaOptions = {
      ...this.montosPorTarjetaOptions,
      plugins: {
        ...this.montosPorTarjetaOptions.plugins,
        title: {
          ...this.montosPorTarjetaOptions.plugins?.title,
          text: `Montos por Tarjeta - ${this.mesesLista[this.filtroMes - 1].label}/${this.filtroAnio}`
        }
      }
    };

    // Actualizar gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.charts?.forEach(chart => {
        if (chart && chart.chart) {
          chart.chart.update();
        }
      });
    });
  }

  // Actualizar gráfico de proyección por rango
  actualizarGraficoProyeccion(): void {
    if (!this.tarjetas.length || !this.gastos.length) return;

    // Validar fechas
    const fechaDesde = new Date(this.proyeccionDesdeAnio, this.proyeccionDesdeMes - 1, 1);
    const fechaHasta = new Date(this.proyeccionHastaAnio, this.proyeccionHastaMes, 0); // Último día del mes

    if (fechaHasta < fechaDesde) {
      console.error('La fecha hasta debe ser mayor o igual a la fecha desde');
      return;
    }

    // Calcular número de meses en el rango
    const mesesEnRango = (this.proyeccionHastaAnio - this.proyeccionDesdeAnio) * 12 + 
                         (this.proyeccionHastaMes - this.proyeccionDesdeMes) + 1;

    // Generar etiquetas para los meses
    const labels: string[] = [];
    const montosPorMesPorTarjeta = new Map<string, number[]>();

    // Inicializar arrays para cada tarjeta
    this.tarjetas.forEach(tarjeta => {
      montosPorMesPorTarjeta.set(tarjeta.id, Array(mesesEnRango).fill(0));
    });

    // Generar etiquetas de meses y años
    for (let i = 0; i < mesesEnRango; i++) {
      const fecha = new Date(fechaDesde);
      fecha.setMonth(fecha.getMonth() + i);
      const mes = this.mesesLista[fecha.getMonth()].label;
      const anio = fecha.getFullYear();
      labels.push(`${mes}/${anio}`);
    }

    // Calcular montos por tarjeta para cada mes en el rango
    this.gastos.forEach(gasto => {
      // Verificar si el gasto tiene cuotas
      const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
      
      // Calcular el monto por cuota correctamente
      let montoCuota = 0;
      if (gasto.montoPorCuota) {
        // Si ya tiene un monto por cuota definido, usarlo
        montoCuota = gasto.montoPorCuota;
      } else {
        // Si no tiene monto por cuota, calcularlo dividiendo el monto total
        montoCuota = gasto.monto / cuotas;
      }
      
      // Determinar el primer mes de cuota
      let fechaPrimerMes;
      if (gasto.primerMesCuota) {
        // Si tiene primer mes de cuota definido, usarlo
        fechaPrimerMes = this.parseFechaLocal(gasto.primerMesCuota);
      } else if (cuotas > 1) {
        // Si tiene cuotas pero no tiene primer mes definido, usar el mes de la fecha del gasto
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
        // Asegurar que sea el primer día del mes
        fechaPrimerMes.setDate(1);
      } else {
        // Si no tiene cuotas, usar el mes de la fecha del gasto
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
        // Asegurar que sea el primer día del mes
        fechaPrimerMes.setDate(1);
      }
      
      // Iterar por cada cuota
      for (let i = 0; i < cuotas; i++) {
        const fechaCuota = new Date(
          fechaPrimerMes.getFullYear(),
          fechaPrimerMes.getMonth() + i,
          Math.min(fechaPrimerMes.getDate(), 28) // Evitar problemas con meses que tienen menos de 31 días
        );
        
        // Ajustar el año si es necesario (por ejemplo, si las cuotas cruzan años)
        fechaCuota.setFullYear(fechaPrimerMes.getFullYear() + Math.floor((fechaPrimerMes.getMonth() + i) / 12));
        
        // Verificar si la cuota está en el rango seleccionado
        if (fechaCuota >= fechaDesde && fechaCuota <= fechaHasta) {
          // Calcular el índice del mes en el array
          const mesesDiferencia = (fechaCuota.getFullYear() - fechaDesde.getFullYear()) * 12 + 
                                 (fechaCuota.getMonth() - fechaDesde.getMonth());
          
          // Actualizar el monto para la tarjeta en ese mes
          const montosPorMes = montosPorMesPorTarjeta.get(gasto.tarjetaId);
          if (montosPorMes && mesesDiferencia >= 0 && mesesDiferencia < mesesEnRango) {
            montosPorMes[mesesDiferencia] += montoCuota;
          }
        }
      }
    });

    // Preparar datasets para el gráfico
    const datasets: any[] = [];

    // Colores para las tarjetas
    const colores = [
      'rgba(0, 102, 102, 0.7)',
      'rgba(0, 133, 132, 0.7)',
      'rgba(0, 153, 153, 0.7)',
      'rgba(51, 153, 153, 0.7)',
      'rgba(102, 204, 204, 0.7)',
      'rgba(153, 255, 255, 0.7)',
      'rgba(0, 76, 76, 0.7)',
      'rgba(0, 179, 179, 0.7)',
      'rgba(25, 128, 128, 0.7)',
      'rgba(76, 179, 179, 0.7)'
    ];

    // Crear un dataset por cada tarjeta
    let colorIndex = 0;
    this.tarjetas.forEach(tarjeta => {
      const montosPorMes = montosPorMesPorTarjeta.get(tarjeta.id) || [];
      const color = colores[colorIndex % colores.length];
      
      datasets.push({
        label: tarjeta.nombre,
        data: montosPorMes,
        backgroundColor: color,
        borderColor: color.replace('0.7', '1'),
        borderWidth: 2,
        fill: false,
        tension: 0.1
      });
      
      colorIndex++;
    });

    // Actualizar datos del gráfico
    this.proyeccionRangoData = {
      labels,
      datasets
    };

    // Actualizar título del gráfico
    this.proyeccionRangoOptions = {
      ...this.proyeccionRangoOptions,
      plugins: {
        ...this.proyeccionRangoOptions.plugins,
        title: {
          ...this.proyeccionRangoOptions.plugins?.title,
          text: `Proyección de Pagos por Mes (${this.mesesLista[this.proyeccionDesdeMes-1].label}/${this.proyeccionDesdeAnio} - ${this.mesesLista[this.proyeccionHastaMes-1].label}/${this.proyeccionHastaAnio})`
        }
      }
    };

    // Actualizar gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      this.charts?.forEach(chart => {
        if (chart && chart.chart) {
          chart.chart.update();
        }
      });
    });
  }

  // Métodos para gráficos de compra de dólares
  actualizarGraficosComprasDolar(): void {
    this.actualizarGraficoEvolucionDolar();
    this.actualizarGraficoComparacionPrecios();
    this.actualizarGraficoDistribucionCompras();
    this.actualizarGraficoVariacionAcumulada();
  }

  actualizarGraficoEvolucionDolar(): void {
    if (!this.comprasDolar || this.comprasDolar.length === 0) {
      this.evolucionDolarData = {
        labels: [],
        datasets: []
      };
      return;
    }

    // Ordenar compras por fecha (año, mes)
    const comprasOrdenadas = [...this.comprasDolar].sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });

    // Crear etiquetas y datos
    const labels: string[] = [];
    const datosCompras: number[] = [];
    const datosAcumulados: number[] = [];
    let acumulado = 0;

    comprasOrdenadas.forEach(compra => {
      const nombreMes = this.obtenerNombreMesCorto(compra.mes);
      labels.push(`${nombreMes} ${compra.anio}`);
      datosCompras.push(compra.dolares || 0);
      acumulado += compra.dolares || 0;
      datosAcumulados.push(acumulado);
    });

    this.evolucionDolarData = {
      labels: labels,
      datasets: [
        {
          label: 'Compras Mensuales (USD)',
          data: datosCompras,
          borderColor: '#006666',
          backgroundColor: 'rgba(0, 102, 102, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: 'Acumulado (USD)',
          data: datosAcumulados,
          borderColor: '#008584',
          backgroundColor: 'rgba(0, 133, 132, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    // Forzar actualización del gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      if (this.charts) {
        this.charts.forEach(chart => chart.update());
      }
    });
  }

  actualizarGraficoComparacionPrecios(): void {
    if (!this.comprasDolar || this.comprasDolar.length === 0) {
      this.comparacionPreciosData = {
        labels: [],
        datasets: []
      };
      return;
    }

    // Ordenar compras por fecha (año, mes)
    const comprasOrdenadas = [...this.comprasDolar].sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });

    // Crear etiquetas y datos
    const labels: string[] = [];
    const preciosCompra: number[] = [];
    const preciosActuales: number[] = [];

    comprasOrdenadas.forEach(compra => {
      const nombreMes = this.obtenerNombreMesCorto(compra.mes);
      labels.push(`${nombreMes} ${compra.anio}`);
      preciosCompra.push(compra.precioCompra || 0);
      preciosActuales.push(compra.precioAPI || 0);
    });

    this.comparacionPreciosData = {
      labels: labels,
      datasets: [
        {
          label: 'Precio de Compra',
          data: preciosCompra,
          backgroundColor: '#006666',
          borderColor: '#006666',
          borderWidth: 1
        },
        {
          label: 'Precio Actual (API)',
          data: preciosActuales,
          backgroundColor: '#008584',
          borderColor: '#008584',
          borderWidth: 1
        }
      ]
    };

    // Forzar actualización del gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      if (this.charts) {
        this.charts.forEach(chart => chart.update());
      }
    });
  }

  actualizarGraficoDistribucionCompras(): void {
    if (!this.comprasDolar || this.comprasDolar.length === 0) {
      this.distribucionComprasData = {
        labels: [],
        datasets: []
      };
      return;
    }

    // Agrupar compras por año
    const comprasPorAnio: { [key: number]: number } = {};
    
    this.comprasDolar.forEach(compra => {
      const anio = compra.anio;
      if (!comprasPorAnio[anio]) {
        comprasPorAnio[anio] = 0;
      }
      comprasPorAnio[anio] += compra.dolares || 0;
    });

    // Convertir a arrays para el gráfico
    const anios = Object.keys(comprasPorAnio).sort();
    const valores = anios.map(anio => comprasPorAnio[parseInt(anio)]);
    
    // Generar colores dinámicamente
    const colores = this.generarColores(anios.length);

    this.distribucionComprasData = {
      labels: anios,
      datasets: [
        {
          label: 'Dólares Comprados (USD)',
          data: valores,
          backgroundColor: colores,
          borderColor: colores.map(color => color.replace('0.8', '1')),
          borderWidth: 2
        }
      ]
    };

    // Forzar actualización del gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      if (this.charts) {
        this.charts.forEach(chart => chart.update());
      }
    });
  }

  private generarColores(cantidad: number): string[] {
    const coloresBase = [
      'rgba(0, 102, 102, 0.8)',     // --color3: #006666
      'rgba(0, 133, 132, 0.8)',     // --color4: #008584
      'rgba(0, 102, 102, 0.6)',     // Variación más clara del primario
      'rgba(0, 133, 132, 0.6)',     // Variación más clara del secundario
      'rgba(204, 204, 204, 0.8)',   // --color5: #cccccc
      'rgba(0, 102, 102, 0.4)',     // Variación muy clara del primario
      'rgba(0, 133, 132, 0.4)',     // Variación muy clara del secundario
      'rgba(169, 169, 169, 0.8)'    // Gris intermedio
    ];
    
    const colores: string[] = [];
    for (let i = 0; i < cantidad; i++) {
      colores.push(coloresBase[i % coloresBase.length]);
    }
    
    return colores;
   }

  actualizarGraficoVariacionAcumulada(): void {
    if (!this.comprasDolar || this.comprasDolar.length === 0) {
      this.variacionAcumuladaData = {
        labels: [],
        datasets: []
      };
      return;
    }

    // Ordenar compras por fecha (año, mes)
    const comprasOrdenadas = [...this.comprasDolar].sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return a.mes - b.mes;
    });

    // Crear etiquetas y datos
    const labels: string[] = [];
    const variacionAcumulada: number[] = [];
    const variacionPorcentual: number[] = [];
    let inversionAcumulada = 0;
    let valorActualAcumulado = 0;

    comprasOrdenadas.forEach(compra => {
      const nombreMes = this.obtenerNombreMesCorto(compra.mes);
      labels.push(`${nombreMes} ${compra.anio}`);
      
      // Calcular inversión y valor actual acumulados
      const inversionCompra = (compra.dolares || 0) * (compra.precioCompra || 0);
      const valorActualCompra = (compra.dolares || 0) * (compra.precioAPI || 0);
      
      inversionAcumulada += inversionCompra;
      valorActualAcumulado += valorActualCompra;
      
      // Calcular variación en pesos
      const variacion = valorActualAcumulado - inversionAcumulada;
      variacionAcumulada.push(variacion);
      
      // Calcular variación porcentual
      const porcentaje = inversionAcumulada > 0 ? (variacion / inversionAcumulada) * 100 : 0;
      variacionPorcentual.push(porcentaje);
    });

    this.variacionAcumuladaData = {
      labels: labels,
      datasets: [
        {
          label: 'Variación en Pesos ($)',
          data: variacionAcumulada,
          borderColor: '#006666',
          backgroundColor: 'rgba(0, 102, 102, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Variación Porcentual (%)',
          data: variacionPorcentual,
          borderColor: '#008584',
          backgroundColor: 'rgba(0, 133, 132, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y1'
        }
      ]
    };

    // Actualizar opciones para incluir doble eje Y
    this.variacionAcumuladaOptions = {
      ...this.variacionAcumuladaOptions,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Variación ($)',
            font: { size: 11 }
          },
          ticks: {
            font: { size: 10 }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Variación (%)',
            font: { size: 11 }
          },
          ticks: {
            font: { size: 10 }
          },
          grid: {
            drawOnChartArea: false
          }
        },
        x: {
          title: {
            display: true,
            text: 'Meses',
            font: { size: 11 }
          },
          ticks: {
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    };

    // Forzar actualización del gráfico
    this.zone.run(() => {
      this.cdr.detectChanges();
      if (this.charts) {
        this.charts.forEach(chart => chart.update());
      }
    });
  }

  private obtenerNombreMesCorto(mes: number): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[mes - 1] || 'Inv';
  }
}