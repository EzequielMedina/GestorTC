import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Tarjeta } from '../../models/tarjeta.model';
import { TarjetaService } from '../../services/tarjeta';
import { ResumenService, ResumenTarjeta } from '../../services/resumen.service';
import { GastoService } from '../../services/gasto';
import { Gasto } from '../../models/gasto.model';

// Chart.js imports
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-simulacion-compra',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatOptionModule,
    MatDividerModule,
    BaseChartDirective
  ],
  templateUrl: './simulacion-compra.component.html',
  styleUrls: ['./simulacion-compra.component.css']
})
export class SimulacionCompraComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // ViewChildren para los gráficos
  @ViewChildren(BaseChartDirective) charts!: QueryList<BaseChartDirective>;

  // Formulario
  compraForm: FormGroup;
  
  // Datos
  tarjetas: Tarjeta[] = [];
  gastos: Gasto[] = [];
  tarjetaSeleccionada: Tarjeta | null = null;
  
  // Resultados de cálculos
  montoCuota = 0;
  totalTarjetaConCompra = 0;
  totalMensualTodasTarjetas = 0;
  simulacionCalculada: boolean = false;
  
  // Resumen naranja - proyección mensual
  resumenMensualProyectado: Array<{
    mes: string;
    mesLabel: string;
    cuotaCompra: number;
    totalTarjetaSeleccionada: number;
    totalTodasTarjetas: number;
  }> = [];

  // Configuración de gráficos
  // Gráfico de proyección por tarjeta
  public proyeccionPorTarjetaData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  public proyeccionPorTarjetaOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Proyección de Pagos por Mes (Con Simulación)',
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

  // Gráfico de total por mes
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
        text: 'Total de Todas las Tarjetas por Mes (Con Simulación)',
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
  
  anios: number[] = [];
  
  // Lista de meses para etiquetas
  mesesLista = [
    { value: 1, label: 'Ene' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Ago' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dic' }
  ];


  
  constructor(
    private fb: FormBuilder,
    private tarjetaService: TarjetaService,
    private resumenService: ResumenService,
    private gastoService: GastoService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    this.compraForm = this.createForm();
    this.initializeAnios();
  }
  
  private initializeAnios(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 5; year++) {
      this.anios.push(year);
    }
  }

  ngOnInit(): void {
    this.cargarTarjetas();
    this.cargarGastos();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      tarjetaId: ['', Validators.required],
      descripcion: ['', [Validators.required, Validators.minLength(3)]],
      monto: [0, [Validators.required, Validators.min(1)]],
      cantidadCuotas: [1, [Validators.required, Validators.min(1)]],
      fechaPrimeraCuota: [new Date(), Validators.required]
    });
  }

  private setupFormSubscriptions(): void {
    // Suscribirse a cambios en la tarjeta seleccionada
    this.compraForm.get('tarjetaId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tarjetaId => {
        if (tarjetaId) {
          this.tarjetaSeleccionada = this.tarjetas.find(t => t.id === tarjetaId) || null;
          // Establecer fecha de primera cuota basada en día de vencimiento
          if (this.tarjetaSeleccionada) {
            this.establecerFechaPrimeraCuota();
          }
        } else {
          this.tarjetaSeleccionada = null;
        }
        // Actualizar gráficos cuando cambia la tarjeta
        if (this.simulacionCalculada) {
        //   this.actualizarGraficos();
        }
      });

    // Suscribirse a cambios en la tarjeta seleccionada para establecer fecha de primera cuota
    this.compraForm.get('tarjetaId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.establecerFechaPrimeraCuota();
      });
      
    // Suscribirse a otros cambios del formulario sin calcular automáticamente
    this.compraForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        // Solo actualizar la fecha de primera cuota si cambia la tarjeta
        // Los resultados se calculan únicamente al presionar "Simular"
      });
  }

  cargarTarjetas(): void {
    this.tarjetaService.getTarjetas$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tarjetas: Tarjeta[]) => {
          this.tarjetas = tarjetas;
        },
        error: (error: any) => {
          console.error('Error al cargar tarjetas:', error);
        }
      });
  }

  private cargarGastos(): void {
    this.gastoService.getGastos$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (gastos) => {
          this.gastos = gastos;
        },
        error: (error) => {
          console.error('Error al cargar gastos:', error);
        }
      });
  }

  private calcularResultados(): void {
    if (!this.compraForm.valid || !this.tarjetaSeleccionada) {
      return;
    }

    const monto = this.compraForm.value.monto;
    const cantidadCuotas = this.compraForm.value.cantidadCuotas;

    // Calcular monto de cuota individual
    this.montoCuota = monto / cantidadCuotas;

    // Calcular total de la tarjeta con la nueva compra (usando pago mínimo estimado)
    const pagoMinimo = this.tarjetaSeleccionada.limite * 0.05;
    this.totalTarjetaConCompra = pagoMinimo + this.montoCuota;

    // Calcular total mensual de todas las tarjetas
    this.calcularTotalMensualTodasTarjetas();
    
    // Calcular resumen naranja (proyección mensual)
    this.calcularResumenNaranja();
    
    // Marcar como calculado
    this.simulacionCalculada = true;
  }

  private calcularTotalMensualTodasTarjetas(): void {
    let totalMensual = 0;

    // Sumar pagos mínimos de todas las tarjetas
    this.tarjetas.forEach(tarjeta => {
      if (tarjeta.id === this.tarjetaSeleccionada?.id) {
        // Para la tarjeta seleccionada, incluir la nueva cuota
        const pagoMinimo = tarjeta.limite * 0.05; // 5% del límite como estimación
        totalMensual += pagoMinimo + this.montoCuota;
      } else {
        // Para las demás tarjetas, solo el pago mínimo
        const pagoMinimo = tarjeta.limite * 0.05;
        totalMensual += pagoMinimo;
      }
    });

    this.totalMensualTodasTarjetas = totalMensual;
  }

  simularCompra(): void {
    if (this.compraForm.valid && this.tarjetaSeleccionada) {
      this.calcularResultados();
      this.simulacionCalculada = true;
      console.log('Simulación calculada:', this.compraForm.value);
    }
  }

  onSubmit(): void {
    if (this.compraForm.valid) {
      console.log('Compra registrada:', this.compraForm.value);
      // Aquí puedes agregar la lógica para guardar la compra
    }
  }

  limpiarFormulario(): void {
    this.compraForm.reset();
    this.tarjetaSeleccionada = null;
    this.montoCuota = 0;
    this.totalTarjetaConCompra = 0;
    this.totalMensualTodasTarjetas = 0;
    this.simulacionCalculada = false;
    this.resumenMensualProyectado = [];
    
    // Establecer fecha por defecto
    this.compraForm.patchValue({
      fechaPrimeraCuota: new Date(),
      cantidadCuotas: 1
    });
  }

  // Getters para el template
  get isFormValid(): boolean {
    return this.compraForm.valid;
  }

  get saldoDisponible(): number {
    return this.tarjetaSeleccionada ? this.tarjetaSeleccionada.limite : 0;
  }

  get porcentajeUso(): number {
    if (!this.tarjetaSeleccionada) return 0;
    const pagoMinimo = this.tarjetaSeleccionada.limite * 0.05;
    return (pagoMinimo / this.tarjetaSeleccionada.limite) * 100;
  }

  get porcentajeUsoConCompra(): number {
    if (!this.tarjetaSeleccionada || !this.compraForm.valid) return 0;
    const montoCompra = this.compraForm.get('monto')?.value || 0;
    return ((this.pagoMinimoTarjetaSeleccionada + montoCompra) / this.tarjetaSeleccionada.limite) * 100;
  }

  // Cálculo del pago mínimo (5% del límite como estimación)
  get pagoMinimoTarjetaSeleccionada(): number {
    if (!this.tarjetaSeleccionada) return 0;
    const pagoMinimo = this.tarjetaSeleccionada.limite * 0.05;
    return Math.round(pagoMinimo * 100) / 100;
  }

  // Alias para mantener compatibilidad con el template
  get cuotaMensual(): number {
    return this.montoCuota;
  }

  private calcularResumenNaranja(): void {
    if (!this.tarjetaSeleccionada || !this.compraForm.valid) {
      this.resumenMensualProyectado = [];
      return;
    }

    const cantidadCuotas = this.compraForm.get('cantidadCuotas')?.value || 1;
    const fechaPrimeraCuota = this.compraForm.get('fechaPrimeraCuota')?.value;
    
    if (!fechaPrimeraCuota) {
      this.resumenMensualProyectado = [];
      return;
    }

    const fechaInicio = new Date(fechaPrimeraCuota);
    this.resumenMensualProyectado = [];

    // Generar proyección para cada mes de las cuotas
    for (let i = 0; i < cantidadCuotas; i++) {
      const fechaMes = new Date(fechaInicio);
      fechaMes.setMonth(fechaMes.getMonth() + i);
      
      const mesKey = this.formatearMesKey(fechaMes);
      const mesLabel = this.formatearMesLabel(fechaMes);

      // Obtener datos reales del resumen para este mes
      this.resumenService.getResumenPorTarjetaDelMes$(mesKey)
        .pipe(takeUntil(this.destroy$))
        .subscribe(resumenTarjetas => {
          const resumenTarjetaSeleccionada = resumenTarjetas.find(r => r.id === this.tarjetaSeleccionada!.id);
          const totalTarjetaActual = resumenTarjetaSeleccionada?.totalMes || 0;
          
          // Calcular total de todas las tarjetas para este mes
          const totalTodasTarjetasActual = resumenTarjetas.reduce((sum, r) => sum + r.totalMes, 0);

          // Agregar la cuota de la nueva compra
          const totalTarjetaConNuevaCompra = totalTarjetaActual + this.montoCuota;
          const totalTodasTarjetasConNuevaCompra = totalTodasTarjetasActual + this.montoCuota;

          // Buscar si ya existe este mes en la proyección
          const indiceExistente = this.resumenMensualProyectado.findIndex(r => r.mes === mesKey);
          
          const resumenMes = {
            mes: mesKey,
            mesLabel: mesLabel,
            cuotaCompra: this.montoCuota,
            totalTarjetaSeleccionada: totalTarjetaConNuevaCompra,
            totalTodasTarjetas: totalTodasTarjetasConNuevaCompra
          };

          if (indiceExistente >= 0) {
            this.resumenMensualProyectado[indiceExistente] = resumenMes;
          } else {
            this.resumenMensualProyectado.push(resumenMes);
          }

          // Ordenar por mes
          this.resumenMensualProyectado.sort((a, b) => a.mes.localeCompare(b.mes));
          
          // Actualizar gráficos cuando se complete el cálculo
          setTimeout(() => {
            this.actualizarGraficoProyeccionConSimulacion();
            this.actualizarGraficoTotalConSimulacion();
          }, 100);
        });
    }
  }

  private formatearMesKey(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private formatearMesLabel(fecha: Date): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  }

  private establecerFechaPrimeraCuota(): void {
    if (!this.tarjetaSeleccionada) return;

    const hoy = new Date();
    const diaCierre = this.tarjetaSeleccionada.diaCierre;
    const diaVencimiento = this.tarjetaSeleccionada.diaVencimiento;

    const diaHoy = hoy.getDate();
    
    let fechaPrimeraCuota: Date;
    
    // Si la compra está dentro del día del vencimiento de la tarjeta
    // la fecha de la primera cuota es un mes más
    // Si está por fuera, son dos meses más
    if (diaHoy <= diaCierre) {
      // Dentro del período, primera cuota en 1 mes
      fechaPrimeraCuota = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaVencimiento);
    } else {
      // Fuera del período, primera cuota en 2 meses
      fechaPrimeraCuota = new Date(hoy.getFullYear(), hoy.getMonth() + 2, diaVencimiento);
    }
    
    // Actualizar el formulario
    this.compraForm.patchValue({
      fechaPrimeraCuota: fechaPrimeraCuota
    });
  }

  // Actualizar gráfico de proyección por tarjeta con simulación
  private actualizarGraficoProyeccionConSimulacion(): void {
    if (!this.tarjetas.length || !this.gastos.length || !this.resumenMensualProyectado.length) {
      return;
    }

    // Determinar rango de fechas basado en la simulación
    const fechaInicio = new Date(this.resumenMensualProyectado[0].mes + '-01');
    const fechaFin = new Date(this.resumenMensualProyectado[this.resumenMensualProyectado.length - 1].mes + '-01');
    
    // Extender el rango para mostrar más contexto (3 meses antes y después)
    fechaInicio.setMonth(fechaInicio.getMonth() - 3);
    fechaFin.setMonth(fechaFin.getMonth() + 3);

    const mesesEnRango = (fechaFin.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                         (fechaFin.getMonth() - fechaInicio.getMonth()) + 1;

    // Generar etiquetas para los meses
    const labels: string[] = [];
    const montosPorMesPorTarjeta = new Map<string, number[]>();

    // Inicializar arrays para cada tarjeta
    this.tarjetas.forEach(tarjeta => {
      montosPorMesPorTarjeta.set(tarjeta.id, Array(mesesEnRango).fill(0));
    });

    // Generar etiquetas de meses y años
    for (let i = 0; i < mesesEnRango; i++) {
      const fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + i, 1);
      const mes = this.mesesLista[fecha.getMonth()].label;
      const anio = fecha.getFullYear();
      labels.push(`${mes}/${anio}`);
    }

    // Calcular montos por tarjeta para cada mes en el rango (gastos existentes)
    this.gastos.forEach(gasto => {
      const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
      let montoCuota = 0;
      if (gasto.montoPorCuota) {
        montoCuota = gasto.montoPorCuota;
      } else {
        montoCuota = gasto.monto / cuotas;
      }

      let fechaPrimerMes;
      if (gasto.primerMesCuota) {
        fechaPrimerMes = this.parseFechaLocal(gasto.primerMesCuota);
      } else if (cuotas > 1) {
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
      } else {
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
      }

      for (let i = 0; i < cuotas; i++) {
        const fechaCuota = new Date(
          fechaPrimerMes.getFullYear(),
          fechaPrimerMes.getMonth() + i,
          Math.min(fechaPrimerMes.getDate(), 28)
        );
        
        fechaCuota.setFullYear(fechaPrimerMes.getFullYear() + Math.floor((fechaPrimerMes.getMonth() + i) / 12));
        
        if (fechaCuota >= fechaInicio && fechaCuota <= fechaFin) {
          const mesesDiferencia = (fechaCuota.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                                 (fechaCuota.getMonth() - fechaInicio.getMonth());
          
          const montosPorMes = montosPorMesPorTarjeta.get(gasto.tarjetaId);
          if (montosPorMes && mesesDiferencia >= 0 && mesesDiferencia < mesesEnRango) {
            montosPorMes[mesesDiferencia] += montoCuota;
          }
        }
      }
    });

    // Agregar los montos de la simulación
    if (this.tarjetaSeleccionada) {
      const montosTarjetaSeleccionada = montosPorMesPorTarjeta.get(this.tarjetaSeleccionada.id);
      if (montosTarjetaSeleccionada) {
        this.resumenMensualProyectado.forEach(resumen => {
          const fechaSimulacion = new Date(resumen.mes + '-01');
          if (fechaSimulacion >= fechaInicio && fechaSimulacion <= fechaFin) {
            const mesesDiferencia = (fechaSimulacion.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                                   (fechaSimulacion.getMonth() - fechaInicio.getMonth());
            if (mesesDiferencia >= 0 && mesesDiferencia < mesesEnRango) {
              montosTarjetaSeleccionada[mesesDiferencia] += resumen.cuotaCompra;
            }
          }
        });
      }
    }

    // Preparar datasets para el gráfico
    const datasets: any[] = [];
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

    let colorIndex = 0;
    this.tarjetas.forEach(tarjeta => {
      const montosPorMes = montosPorMesPorTarjeta.get(tarjeta.id) || [];
      const tieneMontos = montosPorMes.some(monto => monto > 0);
      
      if (tieneMontos) {
        datasets.push({
          label: tarjeta.nombre,
          data: montosPorMes,
          backgroundColor: colores[colorIndex % colores.length],
          borderColor: colores[colorIndex % colores.length].replace('0.7', '1'),
          borderWidth: 1
        });
        colorIndex++;
      }
    });

    this.proyeccionPorTarjetaData = {
      labels: labels,
      datasets: datasets
    };

    this.actualizarGraficos();
  }

  // Actualizar gráfico de total por mes con simulación
  private actualizarGraficoTotalConSimulacion(): void {
    if (!this.tarjetas.length || !this.gastos.length || !this.resumenMensualProyectado.length) {
      return;
    }

    // Determinar rango de fechas basado en la simulación
    const fechaInicio = new Date(this.resumenMensualProyectado[0].mes + '-01');
    const fechaFin = new Date(this.resumenMensualProyectado[this.resumenMensualProyectado.length - 1].mes + '-01');
    
    // Extender el rango para mostrar más contexto (3 meses antes y después)
    fechaInicio.setMonth(fechaInicio.getMonth() - 3);
    fechaFin.setMonth(fechaFin.getMonth() + 3);

    const mesesEnRango = (fechaFin.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                         (fechaFin.getMonth() - fechaInicio.getMonth()) + 1;

    // Crear array para almacenar el total por mes
    const totalPorMes = new Array(mesesEnRango).fill(0);

    // Crear etiquetas para los meses en el rango
    const etiquetasMeses = [];
    for (let i = 0; i < mesesEnRango; i++) {
      const fecha = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + i, 1);
      etiquetasMeses.push(`${this.mesesLista[fecha.getMonth()].label}/${fecha.getFullYear()}`);
    }

    // Calcular total por mes (gastos existentes)
    this.gastos.forEach(gasto => {
      const cuotas = Math.max(1, gasto.cantidadCuotas || 1);
      let montoCuota = 0;
      if (gasto.montoPorCuota) {
        montoCuota = gasto.montoPorCuota;
      } else {
        montoCuota = gasto.monto / cuotas;
      }
      
      let fechaPrimerMes;
      if (gasto.primerMesCuota) {
        fechaPrimerMes = this.parseFechaLocal(gasto.primerMesCuota);
      } else if (cuotas > 1) {
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
      } else {
        fechaPrimerMes = this.parseFechaLocal(gasto.fecha);
      }

      for (let i = 0; i < cuotas; i++) {
        const fechaCuota = new Date(
          fechaPrimerMes.getFullYear(),
          fechaPrimerMes.getMonth() + i,
          Math.min(fechaPrimerMes.getDate(), 28)
        );
        
        fechaCuota.setFullYear(fechaPrimerMes.getFullYear() + Math.floor((fechaPrimerMes.getMonth() + i) / 12));
        
        if (fechaCuota >= fechaInicio && fechaCuota <= fechaFin) {
          const mesesDiferencia = (fechaCuota.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                                 (fechaCuota.getMonth() - fechaInicio.getMonth());
          
          if (mesesDiferencia >= 0 && mesesDiferencia < mesesEnRango) {
            totalPorMes[mesesDiferencia] += montoCuota;
          }
        }
      }
    });

    // Agregar los montos de la simulación
    this.resumenMensualProyectado.forEach(resumen => {
      const fechaSimulacion = new Date(resumen.mes + '-01');
      if (fechaSimulacion >= fechaInicio && fechaSimulacion <= fechaFin) {
        const mesesDiferencia = (fechaSimulacion.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                               (fechaSimulacion.getMonth() - fechaInicio.getMonth());
        if (mesesDiferencia >= 0 && mesesDiferencia < mesesEnRango) {
          totalPorMes[mesesDiferencia] += resumen.cuotaCompra;
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

    this.actualizarGraficos();
  }

  // Método para actualizar los gráficos
  private actualizarGraficos(): void {
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
  
  // Método parseFechaLocal - igual que en graficos.component
  private parseFechaLocal(fechaStr: string): Date {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  



}