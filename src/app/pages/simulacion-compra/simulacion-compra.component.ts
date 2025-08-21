import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
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


  
  anios: number[] = [];


  
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
        } else {
          this.tarjetaSeleccionada = null;
        }
        // Actualizar gráficos cuando cambia la tarjeta
        if (this.simulacionCalculada) {
        //   this.actualizarGraficos();
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
        //   this.actualizarGraficos();
        }
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
  
  // Método parseFechaLocal - igual que en graficos.component
  private parseFechaLocal(fechaStr: string): Date {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  



}