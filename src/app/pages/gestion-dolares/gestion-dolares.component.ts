import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subscription, combineLatest } from 'rxjs';

import { CompraDolar, ResumenCompraDolar, DolarAPI } from '../../models/compra-dolar.model';
import { VentaDolar, BalanceDolar, TransaccionDolar } from '../../models/venta-dolar.model';
import { CompraDolarService } from '../../services/compra-dolar.service';
import { VentaDolarService } from '../../services/venta-dolar.service';
import { BalanceDolarService } from '../../services/balance-dolar.service';
import { DolarService } from '../../services/dolar.service';

@Component({
  selector: 'app-gestion-dolares',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDialogModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './gestion-dolares.component.html',
  styleUrls: ['./gestion-dolares.component.css']
})
export class GestionDolaresComponent implements OnInit, OnDestroy {
  // Forms
  compraForm!: FormGroup;
  ventaForm!: FormGroup;
  
  // Data
  compras: CompraDolar[] = [];
  ventas: VentaDolar[] = [];
  transacciones: TransaccionDolar[] = [];
  balance: BalanceDolar = {
    dolaresDisponibles: 0,
    dolaresVendidos: 0,
    valorTotalCompra: 0,
    valorTotalVenta: 0,
    gananciaTotal: 0,
    porcentajeGananciaTotal: 0,
    precioCompraPromedio: 0,
    valorActualDisponibles: 0
  };
  resumen: ResumenCompraDolar = {
    totalDolares: 0,
    totalPesosCompra: 0,
    totalPesosAPI: 0,
    variacionTotal: 0
  };
  dolarActual: DolarAPI | null = null;
  
  // Loading states
  cargandoDolar = false;
  guardandoCompra = false;
  guardandoVenta = false;
  
  // Tab index
  selectedTabIndex = 0;
  
  // Ya no necesitamos arrays para selectores de mes y año
  
  // Columnas para tablas
  comprasColumns: string[] = ['periodo', 'dolares', 'precioCompra', 'totalCompra', 'precioAPI', 'totalAPI', 'diferencia', 'acciones'];
  ventasColumns: string[] = ['periodo', 'dolares', 'precioVenta', 'totalVenta', 'ganancia', 'porcentajeGanancia', 'acciones'];
  transaccionesColumns: string[] = ['periodo', 'tipo', 'dolares', 'precio', 'total', 'ganancia', 'acciones'];
  
  private subscriptions = new Subscription();
  private fb = inject(FormBuilder);
  private compraDolarService = inject(CompraDolarService);
  private ventaDolarService = inject(VentaDolarService);
  private balanceDolarService = inject(BalanceDolarService);
  private dolarService = inject(DolarService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.suscribirACambios();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForms(): void {
    const fechaActual = new Date();
    
    this.compraForm = this.fb.group({
      fecha: [fechaActual, [Validators.required]],
      dolares: [null, [Validators.required, Validators.min(0.01)]],
      precioCompra: [null, [Validators.required, Validators.min(0.01)]]
    });

    this.ventaForm = this.fb.group({
      fecha: [fechaActual, [Validators.required]],
      dolares: [null, [Validators.required, Validators.min(0.01)]],
      precioVenta: [null, [Validators.required, Validators.min(0.01)]]
    });

    // Auto-completar precio de compra con precio de venta del dólar
    this.compraForm.get('dolares')?.valueChanges.subscribe(() => {
      if (this.dolarActual && !this.compraForm.get('precioCompra')?.value) {
        this.compraForm.patchValue({ precioCompra: this.dolarActual.venta });
      }
    });

    // Auto-completar precio de venta con precio de compra del dólar
    this.ventaForm.get('dolares')?.valueChanges.subscribe(() => {
      if (this.dolarActual && !this.ventaForm.get('precioVenta')?.value) {
        this.ventaForm.patchValue({ precioVenta: this.dolarActual.compra });
      }
    });
  }

  // Ya no necesitamos generar años

  private suscribirACambios(): void {
    // Suscripción a cambios en compras
    this.subscriptions.add(
      this.compraDolarService.obtenerCompras().subscribe((compras: CompraDolar[]) => {
        this.compras = compras;
        this.cdr.markForCheck();
        // Removed actualizarResumen() call to prevent infinite loop
        // The resumen will be updated separately
      })
    );

    // Suscripción a cambios en ventas
    this.subscriptions.add(
      this.ventaDolarService.obtenerVentas().subscribe((ventas: VentaDolar[]) => {
        this.ventas = ventas;
        this.cdr.markForCheck();
      })
    );

    // Suscripción a cambios en balance
    this.subscriptions.add(
      this.balanceDolarService.obtenerBalanceCompleto().subscribe((balance: BalanceDolar) => {
        this.balance = balance;
        this.cdr.markForCheck();
      })
    );

    // Suscripción a cambios en transacciones
    this.subscriptions.add(
      this.ventaDolarService.obtenerTransaccionesUnificadas().subscribe((transacciones: TransaccionDolar[]) => {
        this.transacciones = transacciones;
        this.cdr.markForCheck();
      })
    );

    // Suscripción separada para el resumen para evitar loops infinitos
    this.subscriptions.add(
      this.compraDolarService.obtenerResumen().subscribe((resumen: ResumenCompraDolar) => {
        this.resumen = resumen;
        this.cdr.markForCheck();
      })
    );
  }

  private cargarDatos(): void {
    this.cargandoDolar = true;
    
    const datos$ = combineLatest([
      this.dolarService.obtenerDolarOficial(),
      this.compraDolarService.obtenerCompras(),
      this.ventaDolarService.obtenerVentas(),
      this.balanceDolarService.obtenerBalanceCompleto(),
      this.ventaDolarService.obtenerTransaccionesUnificadas()
    ]);

    this.subscriptions.add(
      datos$.subscribe({
        next: ([dolar, compras, ventas, balance, transacciones]) => {
          this.dolarActual = dolar;
          this.compras = compras;
          this.ventas = ventas;
          this.balance = balance;
          this.transacciones = transacciones;
          this.cargandoDolar = false;
          // Resumen se actualiza automáticamente por suscripción
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          console.error('Error al cargar datos:', error);
          this.cargandoDolar = false;
          this.mostrarError('Error al cargar los datos');
        }
      })
    );
  }

  // actualizarResumen method removed - now handled by direct subscription

  // Métodos para compras
  onSubmitCompra(): void {
    if (this.compraForm.valid) {
      this.guardandoCompra = true;
      const formData = this.compraForm.value;
      const fecha = new Date(formData.fecha);
      
      const compraData = {
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
        dolares: formData.dolares,
        precioCompra: formData.precioCompra,
        // Persistimos la fecha seleccionada para mostrarla en historiales
        fechaCreacion: fecha
      };
      
      this.subscriptions.add(
        this.compraDolarService.guardarCompra({
          ...compraData,
          precioCompraTotal: compraData.dolares * compraData.precioCompra
        }).subscribe({
          next: (compra) => {
            this.mostrarExito('Compra guardada exitosamente');
            // Resetear el formulario completamente
            this.compraForm.reset();
            this.compraForm.patchValue({
              fecha: new Date()
            });
            this.guardandoCompra = false;
            // Marcar para verificación de cambios
            this.cdr.markForCheck();
            // Los datos se actualizarán automáticamente por las suscripciones existentes
          },
          error: (error) => {
            console.error('Error al guardar compra:', error);
            this.mostrarError('Error al guardar la compra');
            this.guardandoCompra = false;
            this.cdr.markForCheck();
          }
        })
      );
    } else {
      this.marcarCamposComoTocados(this.compraForm);
    }
  }

  // Métodos para ventas
  onSubmitVenta(): void {
    if (this.ventaForm.valid) {
      this.guardandoVenta = true;
      const formData = this.ventaForm.value;
      const fecha = new Date(formData.fecha);
      
      const dolares = formData.dolares;
      const precioVenta = formData.precioVenta;
      const ventaData = {
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
        dolares: dolares,
        precioVenta: precioVenta,
        precioVentaTotal: dolares * precioVenta,
        fechaCreacion: fecha
      };
      
      this.subscriptions.add(
        this.ventaDolarService.guardarVenta(ventaData).subscribe({
          next: (venta) => {
            this.mostrarExito('Venta registrada exitosamente');
            // Resetear el formulario completamente
            this.ventaForm.reset();
            this.ventaForm.patchValue({
              fecha: new Date()
            });
            this.guardandoVenta = false;
            // Marcar para verificación de cambios
            this.cdr.markForCheck();
            // Los datos se actualizarán automáticamente por las suscripciones existentes
          },
          error: (error) => {
            console.error('Error al guardar venta:', error);
            this.mostrarError(error.message || 'Error al registrar la venta');
            this.guardandoVenta = false;
            this.cdr.markForCheck();
          }
        })
      );
    } else {
      this.marcarCamposComoTocados(this.ventaForm);
    }
  }

  // Métodos de utilidad
  limpiarFormularioCompra(): void {
    this.compraForm.reset();
    this.compraForm.patchValue({
      fecha: new Date()
    });
  }

  limpiarFormularioVenta(): void {
    this.ventaForm.reset();
    this.ventaForm.patchValue({
      fecha: new Date()
    });
  }

  eliminarCompra(compra: CompraDolar): void {
    if (compra.id && confirm('¿Está seguro de que desea eliminar esta compra?')) {
      this.compraDolarService.eliminarCompra(compra.id).subscribe({
        next: () => {
          this.mostrarExito('Compra eliminada exitosamente');
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error al eliminar compra:', error);
          this.mostrarError('Error al eliminar la compra');
        }
      });
    }
  }

  eliminarVenta(venta: VentaDolar): void {
    if (venta.id && confirm('¿Está seguro de que desea eliminar esta venta?')) {
      this.ventaDolarService.eliminarVenta(venta.id).subscribe({
        next: () => {
          this.mostrarExito('Venta eliminada exitosamente');
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error al eliminar venta:', error);
          this.mostrarError('Error al eliminar la venta');
        }
      });
    }
  }

  editarCompra(compra: CompraDolar): void {
    this.compraForm.patchValue({
      mes: compra.mes,
      anio: compra.anio,
      dolares: compra.dolares,
      precioCompra: compra.precioCompra
    });
    this.selectedTabIndex = 0; // Cambiar a tab de compra
  }

  editarVenta(venta: VentaDolar): void {
    this.ventaForm.patchValue({
      mes: venta.mes,
      anio: venta.anio,
      dolares: venta.dolares,
      precioVenta: venta.precioVenta
    });
    this.selectedTabIndex = 1; // Cambiar a tab de venta
  }

  actualizarDolar(): void {
    this.cargandoDolar = true;
    this.subscriptions.add(
      this.dolarService.obtenerDolarOficial().subscribe({
        next: (dolar) => {
          this.dolarActual = dolar;
          this.cargandoDolar = false;
          this.mostrarExito('Precio del dólar actualizado');
          this.actualizarPreciosAPI();
        },
        error: (error) => {
          console.error('Error al actualizar dólar:', error);
          this.cargandoDolar = false;
          this.mostrarError('Error al actualizar el precio del dólar');
        }
      })
    );
  }

  forzarActualizacionPrecios(): void {
    this.subscriptions.add(
      this.compraDolarService.actualizarPreciosAPI().subscribe({
        next: (compras: any) => {
          this.compras = compras;
          this.mostrarExito('Precios actualizados correctamente');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error al forzar actualización de precios:', error);
          this.mostrarError('Error al actualizar los precios');
        }
      })
    );
  }

  limpiarVentasDuplicadas(): void {
    this.subscriptions.add(
      this.ventaDolarService.limpiarVentasDuplicadas().subscribe({
        next: (ventas) => {
          this.ventas = ventas;
          this.mostrarExito('Ventas duplicadas eliminadas correctamente');
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al limpiar ventas duplicadas:', error);
          this.mostrarError('Error al limpiar ventas duplicadas');
        }
      })
    );
  }

  private actualizarPreciosAPI(): void {
    this.subscriptions.add(
      this.compraDolarService.actualizarPreciosAPI().subscribe({
        next: (compras: any) => {
          // Los precios se actualizarán automáticamente por la suscripción
          console.log('Precios API actualizados correctamente');
        },
        error: (error: any) => {
          console.error('Error al actualizar precios API:', error);
          // El resumen se actualiza automáticamente por suscripción
        }
      })
    );
  }

  private marcarCamposComoTocados(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      form.get(key)?.markAsTouched();
    });
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Getters para validaciones
  get compraFormValid(): boolean {
    return this.compraForm.valid;
  }

  get ventaFormValid(): boolean {
    return this.ventaForm.valid;
  }

  get dolaresDisponiblesParaVenta(): number {
    return this.balance.dolaresDisponibles;
  }

  // Métodos de formato
  obtenerNombreMes(mes: number): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes - 1] || '';
  }

  formatearPesos(monto: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);
  }

  formatearDolares(monto: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(monto);
  }

  formatearPorcentaje(porcentaje: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'percent', minimumFractionDigits: 2 }).format(porcentaje / 100);
  }

  obtenerClaseDiferencia(diferencia: number): string {
    if (diferencia > 0) return 'positivo';
    if (diferencia < 0) return 'negativo';
    return 'neutro';
  }

  obtenerClaseTipo(tipo: string): string {
    return tipo === 'compra' ? 'tipo-compra' : 'tipo-venta';
  }

  // Validaciones de formularios
  get dolaresCompraInvalido(): boolean {
    const control = this.compraForm.get('dolares');
    return !!(control && control.invalid && control.touched);
  }

  get precioCompraInvalido(): boolean {
    const control = this.compraForm.get('precioCompra');
    return !!(control && control.invalid && control.touched);
  }

  get dolaresVentaInvalido(): boolean {
    const control = this.ventaForm.get('dolares');
    return !!(control && control.invalid && control.touched);
  }

  get precioVentaInvalido(): boolean {
    const control = this.ventaForm.get('precioVenta');
    return !!(control && control.invalid && control.touched);
  }

  get dolaresVentaExcedidos(): boolean {
    const dolares = this.ventaForm.get('dolares')?.value || 0;
    return dolares > this.balance.dolaresDisponibles;
  }

  // Función trackBy para mejorar la detección de cambios en las tablas
  trackByCompraId(index: number, compra: CompraDolar): number {
    return compra.id ?? index;
  }

  trackByVentaId(index: number, venta: VentaDolar): number {
    return venta.id ?? index;
  }

  trackByTransaccionId(index: number, transaccion: TransaccionDolar): string {
    return transaccion.id ? `${transaccion.tipo}-${transaccion.id}` : `${transaccion.tipo}-${index}`;
  }
}