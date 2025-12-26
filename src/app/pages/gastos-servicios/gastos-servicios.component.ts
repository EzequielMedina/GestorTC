import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { GastoRecurrente, FrecuenciaRecurrencia, InstanciaGastoRecurrente } from '../../models/gasto-recurrente.model';
import { GastosRecurrentesService } from '../../services/gastos-recurrentes.service';
import { TarjetaService } from '../../services/tarjeta';
import { CategoriaService } from '../../services/categoria.service';
import { CategorizacionServiciosService } from '../../services/categorizacion-servicios.service';
import { NotificationService } from '../../services/notification.service';
import { combineLatest, Subscription, firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-gastos-servicios',
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
    MatDatepickerModule,
    MatCheckboxModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatTabsModule,
    MatTooltipModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './gastos-servicios.component.html',
  styleUrls: ['./gastos-servicios.component.css']
})
export class GastosServiciosComponent implements OnInit, OnDestroy {
  // Formulario de nueva serie
  nuevaSerie: Partial<GastoRecurrente> = {
    nombre: '',
    descripcion: '',
    monto: 0,
    diaVencimiento: 1,
    frecuencia: 'MENSUAL',
    fechaInicio: new Date().toISOString().split('T')[0],
    activo: true
  };

  // Listas
  series: GastoRecurrente[] = [];
  instancias: InstanciaGastoRecurrente[] = [];
  tarjetas: any[] = [];
  categorias: any[] = [];

  // Vista
  mostrarFormulario = false;
  serieEditando: GastoRecurrente | null = null;

  // Tabla de instancias
  displayedColumns: string[] = ['fecha', 'nombre', 'monto', 'pagado', 'acciones'];
  instanciasPendientes: InstanciaGastoRecurrente[] = [];
  instanciasAgrupadasPorMes: { mes: string; instancias: InstanciaGastoRecurrente[]; total: number }[] = [];

  // Frecuencias disponibles
  frecuencias: { value: FrecuenciaRecurrencia; label: string }[] = [
    { value: 'MENSUAL', label: 'Mensual' },
    { value: 'BIMESTRAL', label: 'Bimestral' },
    { value: 'TRIMESTRAL', label: 'Trimestral' },
    { value: 'SEMESTRAL', label: 'Semestral' },
    { value: 'ANUAL', label: 'Anual' }
  ];

  // Proveedores comunes
  proveedores: string[] = [
    'EDENOR',
    'EDESUR',
    'Metrogas',
    'Camuzzi',
    'AYSA',
    'Fibertel',
    'Movistar',
    'Personal',
    'Claro',
    'Netflix',
    'Spotify',
    'Disney+',
    'Otro'
  ];

  private subscriptions = new Subscription();

  constructor(
    private gastosRecurrentesService: GastosRecurrentesService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService,
    private categorizacionService: CategorizacionServiciosService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.gastosRecurrentesService.getGastosRecurrentes$(),
        this.gastosRecurrentesService.getInstanciasPendientes$(),
        this.tarjetaService.getTarjetas$(),
        this.categoriaService.getCategorias$()
      ]).subscribe(([series, instancias, tarjetas, categorias]) => {
        this.series = series;
        this.instancias = instancias;
        this.tarjetas = tarjetas;
        this.categorias = categorias;
        this.actualizarInstanciasPendientes();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  actualizarInstanciasPendientes(): void {
    this.instanciasPendientes = this.instancias
      .filter(i => !i.pagado)
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

    // Agrupar por mes
    const agrupadas = new Map<string, InstanciaGastoRecurrente[]>();
    
    this.instanciasPendientes.forEach(instancia => {
      const mes = instancia.fechaVencimiento.substring(0, 7); // YYYY-MM
      if (!agrupadas.has(mes)) {
        agrupadas.set(mes, []);
      }
      agrupadas.get(mes)!.push(instancia);
    });

    this.instanciasAgrupadasPorMes = Array.from(agrupadas.entries())
      .map(([mes, instancias]) => ({
        mes,
        instancias: instancias.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)),
        total: instancias.reduce((sum, i) => sum + i.monto, 0)
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  getNombreMes(mesKey: string): string {
    const [año, mes] = mesKey.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }

  getNombreSerie(serieId: string): string {
    const serie = this.series.find(s => s.id === serieId);
    return serie?.nombre || 'Desconocido';
  }

  getDescripcionSerie(serieId: string): string {
    const serie = this.series.find(s => s.id === serieId);
    return serie?.descripcion || '';
  }

  async crearSerie(): Promise<void> {
    if (!this.nuevaSerie.nombre || !this.nuevaSerie.descripcion || !this.nuevaSerie.monto || !this.nuevaSerie.tarjetaId) {
      this.notificationService.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Categorizar automáticamente si no tiene categoría
    if (!this.nuevaSerie.categoriaId && this.nuevaSerie.descripcion) {
      const categoriaId = await firstValueFrom(
        this.categorizacionService.categorizar(this.nuevaSerie.descripcion)
      );
      if (categoriaId) {
        this.nuevaSerie.categoriaId = categoriaId;
      }
    }

    this.gastosRecurrentesService.crearGastoRecurrente({
      nombre: this.nuevaSerie.nombre!,
      descripcion: this.nuevaSerie.descripcion!,
      monto: this.nuevaSerie.monto!,
      categoriaId: this.nuevaSerie.categoriaId,
      tarjetaId: this.nuevaSerie.tarjetaId!,
      diaVencimiento: this.nuevaSerie.diaVencimiento || 1,
      frecuencia: this.nuevaSerie.frecuencia || 'MENSUAL',
      fechaInicio: this.nuevaSerie.fechaInicio || new Date().toISOString().split('T')[0],
      fechaFin: this.nuevaSerie.fechaFin,
      proveedor: this.nuevaSerie.proveedor,
      notas: this.nuevaSerie.notas
    });

    this.notificationService.success('Serie de gasto recurrente creada exitosamente');
    this.resetearFormulario();
  }

  editarSerie(serie: GastoRecurrente): void {
    this.serieEditando = serie;
    this.nuevaSerie = { ...serie };
    this.mostrarFormulario = true;
  }

  actualizarSerie(): void {
    if (!this.serieEditando) return;

    this.gastosRecurrentesService.actualizarGastoRecurrente(this.serieEditando.id, {
      nombre: this.nuevaSerie.nombre!,
      descripcion: this.nuevaSerie.descripcion!,
      monto: this.nuevaSerie.monto!,
      categoriaId: this.nuevaSerie.categoriaId,
      tarjetaId: this.nuevaSerie.tarjetaId!,
      diaVencimiento: this.nuevaSerie.diaVencimiento || 1,
      frecuencia: this.nuevaSerie.frecuencia || 'MENSUAL',
      fechaInicio: this.nuevaSerie.fechaInicio || new Date().toISOString().split('T')[0],
      fechaFin: this.nuevaSerie.fechaFin,
      proveedor: this.nuevaSerie.proveedor,
      notas: this.nuevaSerie.notas
    });

    this.notificationService.success('Serie actualizada exitosamente');
    this.resetearFormulario();
  }

  eliminarSerie(serie: GastoRecurrente): void {
    if (confirm(`¿Estás seguro de eliminar la serie "${serie.nombre}"?`)) {
      this.gastosRecurrentesService.eliminarGastoRecurrente(serie.id);
      this.notificationService.success('Serie eliminada exitosamente');
    }
  }

  toggleActivo(serie: GastoRecurrente): void {
    this.gastosRecurrentesService.actualizarGastoRecurrente(serie.id, { activo: !serie.activo });
  }

  marcarComoPagado(instancia: InstanciaGastoRecurrente): void {
    this.gastosRecurrentesService.marcarComoPagado(instancia.id);
    this.notificationService.success('Gasto marcado como pagado');
  }

  marcarComoNoPagado(instancia: InstanciaGastoRecurrente): void {
    this.gastosRecurrentesService.marcarComoNoPagado(instancia.id);
    this.notificationService.success('Gasto marcado como no pagado');
  }

  resetearFormulario(): void {
    this.nuevaSerie = {
      nombre: '',
      descripcion: '',
      monto: 0,
      diaVencimiento: 1,
      frecuencia: 'MENSUAL',
      fechaInicio: new Date().toISOString().split('T')[0],
      activo: true
    };
    this.mostrarFormulario = false;
    this.serieEditando = null;
  }

  cancelarEdicion(): void {
    this.resetearFormulario();
  }

  getNombreCategoria(categoriaId?: string): string {
    if (!categoriaId) return 'Sin categoría';
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  }

  getNombreTarjeta(tarjetaId?: string): string {
    if (!tarjetaId) return 'Sin tarjeta';
    const tarjeta = this.tarjetas.find(t => t.id === tarjetaId);
    return tarjeta?.nombre || 'Sin tarjeta';
  }

  getFrecuenciaLabel(frecuencia: FrecuenciaRecurrencia): string {
    return this.frecuencias.find(f => f.value === frecuencia)?.label || frecuencia;
  }
}

