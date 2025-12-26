import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Gasto } from '../../models/gasto.model';
import { Tarjeta } from '../../models/tarjeta.model';
import { GastoService } from '../../services/gasto';
import { TarjetaService } from '../../services/tarjeta';
import { CategoriaService } from '../../services/categoria.service';
import { PreferenciasUsuarioService, DescripcionFrecuente } from '../../services/preferencias-usuario.service';
import { NotificationService } from '../../services/notification.service';
import { combineLatest, Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-gasto-rapido-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatTooltipModule
  ],
  templateUrl: './gasto-rapido-dialog.component.html',
  styleUrls: ['./gasto-rapido-dialog.component.css']
})
export class GastoRapidoDialogComponent implements OnInit, OnDestroy {
  gasto: Partial<Gasto> = {
    descripcion: '',
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10),
    tarjetaId: '',
    cantidadCuotas: undefined
  };

  tarjetas: Tarjeta[] = [];
  descripcionesFrecuentes: DescripcionFrecuente[] = [];
  descripcionesFiltradas: DescripcionFrecuente[] = [];
  mostrarMasOpciones = false;

  get esConCuotas(): boolean {
    return !!this.gasto.cantidadCuotas && this.gasto.cantidadCuotas > 1;
  }

  private subscriptions = new Subscription();

  constructor(
    private dialogRef: MatDialogRef<GastoRapidoDialogComponent>,
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService,
    private preferenciasService: PreferenciasUsuarioService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Cargar datos
    this.subscriptions.add(
      combineLatest([
        this.tarjetaService.getTarjetas$(),
        this.preferenciasService.getPreferencias$(),
        this.preferenciasService.getDescripcionesFrecuentes$(10)
      ]).subscribe(([tarjetas, preferencias, descripciones]) => {
        this.tarjetas = tarjetas;
        this.descripcionesFrecuentes = descripciones;
        this.descripcionesFiltradas = descripciones;

        // Usar última tarjeta usada o primera disponible
        if (preferencias.ultimaTarjetaId && tarjetas.find(t => t.id === preferencias.ultimaTarjetaId)) {
          this.gasto.tarjetaId = preferencias.ultimaTarjetaId;
        } else if (tarjetas.length > 0) {
          this.gasto.tarjetaId = tarjetas[0].id;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onDescripcionChange(): void {
    const descripcion = this.gasto.descripcion || '';
    if (descripcion.length > 0) {
      this.descripcionesFiltradas = this.descripcionesFrecuentes.filter(d =>
        d.texto.toLowerCase().includes(descripcion.toLowerCase())
      );
    } else {
      this.descripcionesFiltradas = this.descripcionesFrecuentes;
    }
  }

  seleccionarDescripcion(descripcion: DescripcionFrecuente): void {
    this.gasto.descripcion = descripcion.texto;
    if (descripcion.montoPromedio) {
      this.gasto.monto = Math.round(descripcion.montoPromedio);
    }
    if (descripcion.categoriaId) {
      this.gasto.categoriaId = descripcion.categoriaId;
    }
    this.descripcionesFiltradas = [];
  }

  private calcularMesDesdeFechaISO(fechaISO: string): string {
    const d = new Date(fechaISO);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  onCantidadCuotasChange(valor: number | null): void {
    // Normalizar a entero >=1 o undefined
    const n = valor ? Math.max(1, Math.floor(+valor)) : undefined;
    this.gasto.cantidadCuotas = n;
    if (this.esConCuotas) {
      // Si hay cuotas y no hay primer mes seleccionado, proponer por defecto el mes de la fecha
      if (!this.gasto.primerMesCuota && this.gasto.fecha) {
        this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
      }
      // Calcular monto por cuota
      if (this.gasto.cantidadCuotas && this.gasto.monto) {
        this.gasto.montoPorCuota = parseFloat((this.gasto.monto / this.gasto.cantidadCuotas).toFixed(2));
      }
    } else {
      // sin cuotas limpiamos campos relacionados
      this.gasto.primerMesCuota = undefined;
      this.gasto.montoPorCuota = undefined;
    }
  }

  guardar(): void {
    if (!this.gasto.descripcion || !this.gasto.descripcion.trim()) {
      this.notificationService.warning('La descripción es requerida');
      return;
    }

    if (!this.gasto.monto || this.gasto.monto <= 0) {
      this.notificationService.warning('El monto debe ser mayor a 0');
      return;
    }

    if (!this.gasto.tarjetaId) {
      this.notificationService.warning('Debes seleccionar una tarjeta');
      return;
    }

    // Normalizar cuotas
    if (!this.esConCuotas) {
      this.gasto.cantidadCuotas = undefined;
      this.gasto.primerMesCuota = undefined;
      this.gasto.montoPorCuota = undefined;
    } else {
      // si hay cuotas pero no se especifica montoPorCuota, calcularlo
      if (this.gasto.cantidadCuotas && !this.gasto.montoPorCuota) {
        this.gasto.montoPorCuota = parseFloat((this.gasto.monto! / this.gasto.cantidadCuotas).toFixed(2));
      }
      // Asegurar primerMesCuota requerido
      if (!this.gasto.primerMesCuota && this.gasto.fecha) {
        this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
      }
    }

    // Crear gasto completo
    const nuevoGasto: Gasto = {
      id: uuidv4(),
      tarjetaId: this.gasto.tarjetaId,
      descripcion: this.gasto.descripcion.trim(),
      monto: this.gasto.monto,
      fecha: this.gasto.fecha || new Date().toISOString().slice(0, 10),
      categoriaId: this.gasto.categoriaId,
      etiquetasIds: this.gasto.etiquetasIds || [],
      cantidadCuotas: this.gasto.cantidadCuotas,
      primerMesCuota: this.gasto.primerMesCuota,
      montoPorCuota: this.gasto.montoPorCuota
    };

    // Guardar gasto
    this.gastoService.agregarGasto(nuevoGasto).subscribe(() => {
      // Actualizar preferencias
      this.preferenciasService.actualizarUltimaTarjeta(nuevoGasto.tarjetaId);
      if (nuevoGasto.categoriaId) {
        this.preferenciasService.actualizarUltimaCategoria(nuevoGasto.categoriaId);
      }
      
      // Registrar descripción frecuente
      this.preferenciasService.registrarDescripcion(
        nuevoGasto.descripcion,
        nuevoGasto.monto,
        nuevoGasto.categoriaId
      );

      this.notificationService.success('Gasto registrado exitosamente');
      this.dialogRef.close(true);
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  abrirFormularioCompleto(): void {
    // Cerrar este diálogo y abrir el formulario completo
    this.dialogRef.close('abrir-completo');
  }
}

