import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FiltroAvanzado, FILTRO_POR_DEFECTO, FiltroGuardado } from '../../models/filtro-avanzado.model';
import { Tarjeta } from '../../models/tarjeta.model';
import { Categoria } from '../../models/categoria.model';
import { FiltroAvanzadoService } from '../../services/filtro-avanzado.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-filtros-avanzados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatChipsModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './filtros-avanzados.component.html',
  styleUrls: ['./filtros-avanzados.component.css']
})
export class FiltrosAvanzadosComponent implements OnInit, OnDestroy {
  @Input() tarjetas: Tarjeta[] = [];
  @Input() categorias: Categoria[] = [];
  @Input() filtroActual: FiltroAvanzado = { ...FILTRO_POR_DEFECTO };
  @Output() filtroCambiado = new EventEmitter<FiltroAvanzado>();
  @Output() filtroAplicado = new EventEmitter<FiltroAvanzado>();

  mostrarFiltros = false;
  filtro: FiltroAvanzado = { ...FILTRO_POR_DEFECTO };
  filtrosGuardados: FiltroGuardado[] = [];
  nombreFiltroGuardar = '';
  guardandoFiltro = false;

  private subscriptions = new Subscription();

  constructor(
    private filtroService: FiltroAvanzadoService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.filtro = { ...this.filtroActual };
    this.subscriptions.add(
      this.filtroService.getFiltrosGuardados$().subscribe(filtros => {
        this.filtrosGuardados = filtros;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
    if (this.mostrarFiltros) {
      this.filtro = { ...this.filtroActual };
      // Inicializar rango de fechas si no existe
      if (!this.filtro.rangoFechas) {
        this.filtro.rangoFechas = { desde: '', hasta: '' };
      }
    }
  }

  get rangoFechasDesde(): string {
    return this.filtro.rangoFechas?.desde || '';
  }

  set rangoFechasDesde(value: string) {
    if (!this.filtro.rangoFechas) {
      this.filtro.rangoFechas = { desde: '', hasta: '' };
    }
    this.filtro.rangoFechas.desde = value;
  }

  get rangoFechasHasta(): string {
    return this.filtro.rangoFechas?.hasta || '';
  }

  set rangoFechasHasta(value: string) {
    if (!this.filtro.rangoFechas) {
      this.filtro.rangoFechas = { desde: '', hasta: '' };
    }
    this.filtro.rangoFechas.hasta = value;
  }

  aplicarFiltro(): void {
    this.filtroCambiado.emit(this.filtro);
    this.filtroAplicado.emit(this.filtro);
    this.mostrarFiltros = false;
  }

  limpiarFiltro(): void {
    this.filtro = { ...FILTRO_POR_DEFECTO };
    this.filtroCambiado.emit(this.filtro);
    this.filtroAplicado.emit(this.filtro);
    this.mostrarFiltros = false;
  }

  seleccionarTarjeta(tarjetaId: string, checked: boolean): void {
    if (checked) {
      if (!this.filtro.tarjetasIds.includes(tarjetaId)) {
        this.filtro.tarjetasIds.push(tarjetaId);
      }
    } else {
      this.filtro.tarjetasIds = this.filtro.tarjetasIds.filter((id: string) => id !== tarjetaId);
    }
    this.filtro.todasLasTarjetas = this.filtro.tarjetasIds.length === 0;
  }

  seleccionarCategoria(categoriaId: string, checked: boolean): void {
    if (checked) {
      if (!this.filtro.categoriasIds.includes(categoriaId)) {
        this.filtro.categoriasIds.push(categoriaId);
      }
    } else {
      this.filtro.categoriasIds = this.filtro.categoriasIds.filter((id: string) => id !== categoriaId);
    }
    this.filtro.todasLasCategorias = this.filtro.categoriasIds.length === 0;
  }

  guardarFiltro(): void {
    if (!this.nombreFiltroGuardar.trim()) {
      this.notificationService.warning('Por favor ingresa un nombre para el filtro');
      return;
    }

    this.guardandoFiltro = true;
    try {
      this.filtroService.guardarFiltro(this.nombreFiltroGuardar.trim(), this.filtro);
      this.notificationService.success('Filtro guardado correctamente');
      this.nombreFiltroGuardar = '';
    } catch (error) {
      this.notificationService.error('Error al guardar el filtro');
    } finally {
      this.guardandoFiltro = false;
    }
  }

  cargarFiltroGuardado(filtroGuardado: FiltroGuardado): void {
    this.filtro = { ...filtroGuardado.filtro };
    this.filtroService.marcarFiltroComoUsado(filtroGuardado.id);
    this.aplicarFiltro();
  }

  eliminarFiltroGuardado(filtroGuardado: FiltroGuardado, event: Event): void {
    event.stopPropagation();
    this.notificationService.confirmDelete('este filtro guardado').subscribe(confirm => {
      if (confirm) {
        this.filtroService.eliminarFiltro(filtroGuardado.id);
        this.notificationService.success('Filtro eliminado');
      }
    });
  }

  get hayFiltrosActivos(): boolean {
    return !this.filtro.todasLasTarjetas || 
           !this.filtro.todasLasCategorias ||
           (!!this.filtro.rangoFechas && (!!this.filtro.rangoFechas.desde || !!this.filtro.rangoFechas.hasta)) ||
           (this.filtro.meses && this.filtro.meses.length > 0) ||
           this.filtro.montoMinimo !== undefined ||
           this.filtro.montoMaximo !== undefined ||
           this.filtro.soloCompartidos === true ||
           this.filtro.soloPersonales === true ||
           !this.filtro.incluirCompartidos ||
           !this.filtro.incluirPersonales ||
           !!this.filtro.textoBusqueda;
  }

  getNombreTarjeta(id: string): string {
    const tarjeta = this.tarjetas.find(t => t.id === id);
    return tarjeta?.nombre || 'Desconocida';
  }

  getNombreCategoria(id: string): string {
    const categoria = this.categorias.find(c => c.id === id);
    return categoria?.nombre || 'Desconocida';
  }
}

