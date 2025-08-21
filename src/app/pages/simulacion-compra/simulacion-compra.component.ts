import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { Tarjeta } from '../../models/tarjeta.model';
import { TarjetaService } from '../../services/tarjeta';
import { ResumenService, ResumenTarjeta } from '../../services/resumen.service';
import { GastoService } from '../../services/gasto';
import { Gasto } from '../../models/gasto.model';

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
    BaseChartDirective,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatOptionModule,
    MatDividerModule
  ],
  templateUrl: './simulacion-compra.component.html',
  styleUrls: ['./simulacion-compra.component.css']
})
export class SimulacionCompraComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Referencias a los gráficos
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;

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

  // Filtros para gráficos (próximos 6 meses por defecto)
  filtroMesesGrafico: number = 6;
  fechaInicioGrafico: Date = new Date();

  // Configuraciones de gráficos - Basadas en graficos.component
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
        text: 'Proyección de Pagos por Mes (Próximos 6 Meses)',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 }
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
          font: { size: 11 }
        },
        ticks: { font: { size: 10 } }
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
        text: 'Total de Todas las Tarjetas por Mes (Próximos 6 Meses)',
        font: { size: 16 },
        padding: { bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 }
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
          font: { size: 11 }
        },
        ticks: { font: { size: 10 } }
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

  // Lista de meses para etiquetas
  private mesesLista = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
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
        } else {
          this.tarjetaSeleccionada = null;
        }
        // Actualizar gráficos cuando cambia la tarjeta
        if (this.simulacionCalculada) {
          this.actualizarGraficos();
        }
      });

    // Suscribirse a cambios en cualquier campo del formulario para recalcular
    this.compraForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        if (this.compraForm.valid && this.tarjetaSeleccionada) {
          this.calcularResultados();
        } else if (this.simulacionCalculada) {
          // Actualizar gráficos incluso si el formulario no es válido
          this.actualizarGraficos();
        }
      });
  }

  cargarTarjetas(): void {
    this.tarjetaService.getTarjetas$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tarjetas: Tarjeta[]) => {
          this.tarjetas = tarjetas;
          this.actualizarGraficos();
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
          this.actualizarGraficos();
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
    
    // Actualizar gráficos con la nueva simulación
    this.actualizarGraficos();
    
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

  private actualizarGraficos(): void {
    if (this.tarjetas.length > 0 && this.gastos.length > 0) {
      this.actualizarGraficoProyeccion();
      this.actualizarGraficoTotal();
      this.zone.run(() => {
        this.cdr.detectChanges();
        this.charts?.forEach(chart => chart.update());
      });
    }
  }

  private actualizarGraficoProyeccion(): void {
    const fechaInicio = new Date();
    fechaInicio.setDate(1); // Primer día del mes actual
    
    const meses = [];
    const datasets: any[] = [];
    
    // Generar etiquetas para los próximos 6 meses
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setMonth(fecha.getMonth() + i);
      meses.push(fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
    }
    
    // Crear dataset para cada tarjeta
    this.tarjetas.forEach((tarjeta, index) => {
      const pagosPorMes = [];
      
      for (let i = 0; i < 6; i++) {
        const fecha = new Date(fechaInicio);
        fecha.setMonth(fecha.getMonth() + i);
        
        let pagoMes = 0;
        
        // Calcular pagos existentes de esta tarjeta para este mes
         this.gastos
           .filter(gasto => gasto.tarjetaId === tarjeta.id)
           .forEach(gasto => {
             if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
               const fechaGasto = new Date(gasto.fecha);
               const mesesTranscurridos = (fecha.getFullYear() - fechaGasto.getFullYear()) * 12 + 
                                        (fecha.getMonth() - fechaGasto.getMonth());
               
               if (mesesTranscurridos >= 0 && mesesTranscurridos < gasto.cantidadCuotas) {
                 pagoMes += gasto.monto / gasto.cantidadCuotas;
               }
             } else {
               const fechaGasto = new Date(gasto.fecha);
               if (fechaGasto.getMonth() === fecha.getMonth() && 
                   fechaGasto.getFullYear() === fecha.getFullYear()) {
                 pagoMes += gasto.monto;
               }
             }
           });
        
        // Agregar cuota de la nueva compra si es la tarjeta seleccionada
        if (this.simulacionCalculada && 
            this.compraForm.get('tarjetaId')?.value === tarjeta.id) {
          pagoMes += this.montoCuota;
        }
        
        pagosPorMes.push(pagoMes);
      }
      
      // Colores para las tarjetas
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ];
      
      datasets.push({
        label: tarjeta.nombre,
        data: pagosPorMes,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.1,
        fill: false
      });
    });
    
    this.proyeccionRangoData = {
      labels: meses,
      datasets: datasets
    };
  }

  private actualizarGraficoTotal(): void {
    const fechaInicio = new Date();
    fechaInicio.setDate(1); // Primer día del mes actual
    
    const meses = [];
    const totalesPorMes = [];
    
    // Generar etiquetas para los próximos 6 meses
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setMonth(fecha.getMonth() + i);
      meses.push(fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
      
      let totalMes = 0;
      
      // Calcular total de todas las tarjetas para este mes
       this.gastos.forEach(gasto => {
         if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1) {
           const fechaGasto = new Date(gasto.fecha);
           const mesesTranscurridos = (fecha.getFullYear() - fechaGasto.getFullYear()) * 12 + 
                                    (fecha.getMonth() - fechaGasto.getMonth());
           
           if (mesesTranscurridos >= 0 && mesesTranscurridos < gasto.cantidadCuotas) {
             totalMes += gasto.monto / gasto.cantidadCuotas;
           }
         } else {
           const fechaGasto = new Date(gasto.fecha);
           if (fechaGasto.getMonth() === fecha.getMonth() && 
               fechaGasto.getFullYear() === fecha.getFullYear()) {
             totalMes += gasto.monto;
           }
         }
       });
      
      // Agregar cuota de la nueva compra si está calculada
      if (this.simulacionCalculada) {
        totalMes += this.montoCuota;
      }
      
      totalesPorMes.push(totalMes);
    }
    
    this.totalPorMesData = {
      labels: meses,
      datasets: [{
        label: 'Total Todas las Tarjetas',
        data: totalesPorMes,
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.1,
        fill: true,
        borderWidth: 3
      }]
    };
  }
}