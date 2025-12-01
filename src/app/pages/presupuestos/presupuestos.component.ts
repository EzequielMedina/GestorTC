import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Presupuesto, TipoPresupuesto } from '../../models/presupuesto.model';
import { PresupuestoSeguimiento } from '../../models/presupuesto.model';
import { PresupuestoService } from '../../services/presupuesto.service';
import { CategoriaService } from '../../services/categoria.service';
import { TarjetaService } from '../../services/tarjeta';
import { PresupuestoCardComponent } from '../../components/presupuesto-card/presupuesto-card.component';
import { NotificationService } from '../../services/notification.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-presupuestos',
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
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    PresupuestoCardComponent
  ],
  templateUrl: './presupuestos.component.html',
  styleUrls: ['./presupuestos.component.css']
})
export class PresupuestosComponent implements OnInit {
  presupuestos: PresupuestoSeguimiento[] = [];
  mostrarFormulario = false;
  esEdicion = false;
  presupuestoSeleccionado?: Presupuesto;
  
  presupuestoForm!: FormGroup;
  categorias: any[] = [];
  tarjetas: any[] = [];
  
  mesSeleccionado: string = this.getMesActual();
  mesesDisponibles: string[] = [];

  constructor(
    private fb: FormBuilder,
    private presupuestoService: PresupuestoService,
    private categoriaService: CategoriaService,
    private tarjetaService: TarjetaService,
    private notificationService: NotificationService
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.generarMesesDisponibles();
  }

  inicializarFormulario(): void {
    this.presupuestoForm = this.fb.group({
      tipo: ['CATEGORIA', Validators.required],
      categoriaId: [null],
      tarjetaId: [null],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      mes: [this.getMesActual(), Validators.required],
      activo: [true]
    });

    // Validación condicional
    this.presupuestoForm.get('tipo')?.valueChanges.subscribe(tipo => {
      if (tipo === 'CATEGORIA') {
        this.presupuestoForm.get('tarjetaId')?.setValue(null);
        this.presupuestoForm.get('categoriaId')?.setValidators([Validators.required]);
        this.presupuestoForm.get('tarjetaId')?.clearValidators();
      } else {
        this.presupuestoForm.get('categoriaId')?.setValue(null);
        this.presupuestoForm.get('tarjetaId')?.setValidators([Validators.required]);
        this.presupuestoForm.get('categoriaId')?.clearValidators();
      }
      this.presupuestoForm.get('categoriaId')?.updateValueAndValidity();
      this.presupuestoForm.get('tarjetaId')?.updateValueAndValidity();
    });
  }

  cargarDatos(): void {
    combineLatest([
      this.categoriaService.getCategorias$(),
      this.tarjetaService.getTarjetas$(),
      this.presupuestoService.getPresupuestosConSeguimiento$(this.mesSeleccionado)
    ]).subscribe(([categorias, tarjetas, presupuestos]) => {
      this.categorias = categorias;
      this.tarjetas = tarjetas;
      this.presupuestos = presupuestos;
    });
  }

  generarMesesDisponibles(): void {
    const meses: string[] = [];
    const hoy = new Date();
    for (let i = -6; i <= 6; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.push(mes);
    }
    this.mesesDisponibles = meses;
  }

  getMesActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }

  onMesChange(): void {
    this.cargarDatos();
  }

  agregarPresupuesto(): void {
    this.esEdicion = false;
    this.presupuestoSeleccionado = undefined;
    this.presupuestoForm.reset({
      tipo: 'CATEGORIA',
      monto: 0,
      mes: this.mesSeleccionado,
      activo: true
    });
    this.mostrarFormulario = true;
  }

  editarPresupuesto(id: string): void {
    const presupuesto = this.presupuestos.find(p => p.id === id);
    if (presupuesto) {
      this.esEdicion = true;
      this.presupuestoSeleccionado = presupuesto;
      this.presupuestoForm.patchValue({
        tipo: presupuesto.tipo,
        categoriaId: presupuesto.categoriaId,
        tarjetaId: presupuesto.tarjetaId,
        monto: presupuesto.monto,
        mes: presupuesto.mes,
        activo: presupuesto.activo
      });
      this.mostrarFormulario = true;
    }
  }

  guardarPresupuesto(): void {
    if (this.presupuestoForm.valid) {
      const datos = this.presupuestoForm.value;
      
      if (this.esEdicion && this.presupuestoSeleccionado) {
        this.presupuestoService.actualizarPresupuesto(this.presupuestoSeleccionado.id, datos).subscribe({
          next: () => {
            this.notificationService.success('Presupuesto actualizado correctamente');
            this.cancelarFormulario();
            this.cargarDatos();
          },
          error: () => {
            this.notificationService.error('Error al actualizar el presupuesto');
          }
        });
      } else {
        this.presupuestoService.agregarPresupuesto(datos).subscribe({
          next: () => {
            this.notificationService.success('Presupuesto creado correctamente');
            this.cancelarFormulario();
            this.cargarDatos();
          },
          error: () => {
            this.notificationService.error('Error al crear el presupuesto');
          }
        });
      }
    }
  }

  eliminarPresupuesto(id: string): void {
    this.notificationService.confirmDelete('este presupuesto').subscribe(confirmado => {
      if (confirmado) {
        this.presupuestoService.eliminarPresupuesto(id).subscribe({
          next: () => {
            this.notificationService.success('Presupuesto eliminado correctamente');
            this.cargarDatos();
          },
          error: () => {
            this.notificationService.error('Error al eliminar el presupuesto');
          }
        });
      }
    });
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.esEdicion = false;
    this.presupuestoSeleccionado = undefined;
    this.presupuestoForm.reset();
  }

  getNombreCategoria(categoriaId?: string): string {
    if (!categoriaId) return '';
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || '';
  }

  getNombreTarjeta(tarjetaId?: string): string {
    if (!tarjetaId) return '';
    const tarjeta = this.tarjetas.find(t => t.id === tarjetaId);
    return tarjeta?.nombre || '';
  }
}

