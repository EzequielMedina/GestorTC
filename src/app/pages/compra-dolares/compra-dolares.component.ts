import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, combineLatest } from 'rxjs';

import { CompraDolar, ResumenCompraDolar, DolarAPI } from '../../models/compra-dolar.model';
import { CompraDolarService } from '../../services/compra-dolar.service';
import { DolarService } from '../../services/dolar.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-compra-dolares',
  standalone: true,
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
    MatProgressSpinnerModule
  ],
  templateUrl: './compra-dolares.component.html',
  styleUrls: ['./compra-dolares.component.css']
})
export class CompraDolaresComponent implements OnInit, OnDestroy {
  compraForm: FormGroup;
  compras: CompraDolar[] = [];
  resumen: ResumenCompraDolar = {
    totalDolares: 0,
    totalPesosCompra: 0,
    totalPesosAPI: 0,
    variacionTotal: 0
  };
  dolarActual: DolarAPI | null = null;
  cargandoDolar = false;
  guardandoCompra = false;
  
  // Opciones para el selector de mes
  meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];
  
  // Años disponibles (desde 2020 hasta 3 años en el futuro)
  anios: number[] = [];
  
  // Columnas para la tabla
  displayedColumns: string[] = ['periodo', 'dolares', 'precioCompra', 'totalCompra', 'precioAPI', 'totalAPI', 'diferencia', 'acciones'];
  
  private subscriptions = new Subscription();
  private fb = inject(FormBuilder);
  private compraDolarService = inject(CompraDolarService);
  private dolarService = inject(DolarService);
  private snackBar = inject(MatSnackBar);
  private notificationService = inject(NotificationService);

  constructor() {
    this.compraForm = this.fb.group({
      mes: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      anio: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]],
      dolares: [null, [Validators.required, Validators.min(0.01)]],
      precioCompra: [null, [Validators.required, Validators.min(0.01)]]
    });
    
    // Generar años
    const anioActual = new Date().getFullYear();
    for (let i = 2020; i <= anioActual + 3; i++) {
      this.anios.push(i);
    }
    
    // Suscribirse a cambios en la cantidad de dólares para calcular precio automáticamente
    this.compraForm.get('dolares')?.valueChanges.subscribe(dolares => {
      this.calcularPrecioTotal(dolares);
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.suscribirACambios();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private cargarDatos(): void {
    // Cargar dólar actual
    this.cargandoDolar = true;
    this.subscriptions.add(
      this.dolarService.obtenerDolarOficial().subscribe({
        next: (dolar) => {
          this.dolarActual = dolar;
          this.cargandoDolar = false;
          // Actualizar precios API de las compras existentes
          this.actualizarPreciosAPI();
        },
        error: (error) => {
          console.error('Error al cargar dólar:', error);
          this.cargandoDolar = false;
          this.mostrarError('Error al cargar el precio del dólar');
        }
      })
    );
  }

  private suscribirACambios(): void {
    // Suscribirse a cambios en compras y resumen
    this.subscriptions.add(
      combineLatest([
        this.compraDolarService.obtenerCompras(),
        this.compraDolarService.obtenerResumen()
      ]).subscribe(([compras, resumen]) => {
        this.compras = compras;
        this.resumen = resumen;
      })
    );
  }

  onSubmit(): void {
    if (this.compraForm.valid) {
      const formValue = this.compraForm.value;
      
      // Verificar si ya existe una compra para este mes/año
      const compraExistente = this.compraDolarService.obtenerCompraPorMesAnio(formValue.mes, formValue.anio);
      
      if (compraExistente) {
        this.notificationService.confirm(
          'Compra existente',
          `Ya existe una compra para ${this.obtenerNombreMes(formValue.mes)} ${formValue.anio}. ¿Desea actualizarla?`,
          'Actualizar',
          'Cancelar'
        ).subscribe(confirmed => {
          if (confirmed) {
            this.guardarCompraFormulario(formValue, compraExistente);
          }
        });
      } else {
        this.guardarCompraFormulario(formValue, null);
      }
    } else {
      this.marcarCamposComoTocados();
    }
  }

  private guardarCompraFormulario(formValue: any, compraExistente: CompraDolar | null): void {
    this.guardandoCompra = true;
    
    this.subscriptions.add(
      this.compraDolarService.guardarCompra(formValue).subscribe({
        next: (compra) => {
          this.guardandoCompra = false;
          this.compraForm.reset({
            mes: new Date().getMonth() + 1,
            anio: new Date().getFullYear(),
            dolares: null,
            precioCompra: null
          });
          this.mostrarExito(
            compraExistente ? 'Compra actualizada exitosamente' : 'Compra registrada exitosamente'
          );
          // Actualizar precios API después de guardar
          this.actualizarPreciosAPI();
        },
        error: (error) => {
          console.error('Error al guardar compra:', error);
          this.guardandoCompra = false;
          this.mostrarError('Error al guardar la compra');
        }
      })
    );
  }

  eliminarCompra(compra: CompraDolar): void {
    if (!compra.id) return;
    
    const compraId = compra.id; // Guardar el ID para evitar problemas de tipo
    
    this.notificationService.confirm(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar la compra de ${this.obtenerNombreMes(compra.mes)} ${compra.anio}?`,
      'Eliminar',
      'Cancelar'
    ).subscribe(confirmed => {
      if (confirmed && compraId) {
        this.subscriptions.add(
          this.compraDolarService.eliminarCompra(compraId).subscribe({
            next: () => {
              this.mostrarExito('Compra eliminada exitosamente');
            },
            error: (error) => {
              console.error('Error al eliminar compra:', error);
              this.mostrarError('Error al eliminar la compra');
            }
          })
        );
      }
    });
  }

  editarCompra(compra: CompraDolar): void {
    this.compraForm.patchValue({
      mes: compra.mes,
      anio: compra.anio,
      dolares: compra.dolares,
      precioCompra: compra.precioCompra
    });
  }

  actualizarDolar(): void {
    this.cargandoDolar = true;
    this.subscriptions.add(
      this.dolarService.actualizarDolar().subscribe({
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

  private actualizarPreciosAPI(): void {
    if (this.compras.length > 0) {
      this.subscriptions.add(
        this.compraDolarService.actualizarPreciosAPI().subscribe({
          next: () => {
            console.log('Precios API actualizados');
          },
          error: (error) => {
            console.error('Error al actualizar precios API:', error);
          }
        })
      );
    }
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.compraForm.controls).forEach(key => {
      this.compraForm.get(key)?.markAsTouched();
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

  private calcularPrecioTotal(dolares: number): void {
    if (dolares && dolares > 0 && this.dolarActual) {
      // Asignar el precio por dólar, no el precio total
      this.compraForm.patchValue({
        precioCompra: this.dolarActual.venta
      }, { emitEvent: false });
    }
  }

  // Métodos de utilidad para el template
  obtenerNombreMes(mes: number): string {
    return this.compraDolarService.obtenerNombreMes(mes);
  }

  formatearPesos(monto: number): string {
    return this.dolarService.formatearPesos(monto);
  }

  formatearDolares(monto: number): string {
    return this.dolarService.formatearDolares(monto);
  }

  obtenerClaseDiferencia(diferencia: number): string {
    if (diferencia > 0) return 'diferencia-positiva';
    if (diferencia < 0) return 'diferencia-negativa';
    return 'diferencia-neutral';
  }

  // Getters para validaciones en el template
  get mesInvalido(): boolean {
    const control = this.compraForm.get('mes');
    return !!(control && control.invalid && control.touched);
  }

  get anioInvalido(): boolean {
    const control = this.compraForm.get('anio');
    return !!(control && control.invalid && control.touched);
  }

  get dolaresInvalido(): boolean {
    const control = this.compraForm.get('dolares');
    return !!(control && control.invalid && control.touched);
  }

  get precioCompraInvalido(): boolean {
    const control = this.compraForm.get('precioCompra');
    return !!(control && control.invalid && control.touched);
  }
}