import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { Categoria } from '../../models/categoria.model';
import { Etiqueta } from '../../models/etiqueta.model';
import { Nota } from '../../models/etiqueta.model';
import { FiltroAvanzado, FILTRO_POR_DEFECTO } from '../../models/filtro-avanzado.model';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { CategoriaService } from '../../services/categoria.service';
import { FiltroAvanzadoService } from '../../services/filtro-avanzado.service';
import { EtiquetaService } from '../../services/etiqueta.service';
import { NotaService } from '../../services/nota.service';
import { GastoDialogComponent } from '../../components/gasto-dialog/gasto-dialog';
import { FiltrosAvanzadosComponent } from '../../components/filtros-avanzados/filtros-avanzados.component';
import { NotificationService } from '../../services/notification.service';
import { PreferenciasUsuarioService, DescripcionFrecuente } from '../../services/preferencias-usuario.service';
import { combineLatest, Subscription } from 'rxjs';

interface GastosPorTarjeta {
  nombreTarjeta: string;
  tarjetaId: string;
  totalTarjeta: number;
  cantidadGastos: number;
  gastos: Gasto[];
}

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatTooltipModule,
    GastoDialogComponent,
    FiltrosAvanzadosComponent
  ],
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export class GastosComponent implements OnInit, OnDestroy {
  gastos: Gasto[] = [];
  tarjetas: Tarjeta[] = [];
  categorias: Categoria[] = [];
  etiquetas: Etiqueta[] = [];
  notas: Nota[] = [];
  gastosFiltrados: Gasto[] = [];
  gastosAgrupados: GastosPorTarjeta[] = [];
  
  // Filtros básicos (mantener para compatibilidad)
  filtroTarjeta: string = '';
  filtroMes: string = '';
  filtroCompartido: string = '';
  
  // Filtros avanzados
  filtroAvanzado: FiltroAvanzado = { ...FILTRO_POR_DEFECTO };
  usarFiltrosAvanzados = false;
  
  // Estado
  loading = false;
  // Estado del modal
  mostrarModal = false;
  esEdicion = false;
  gastoSeleccionado: Gasto = {
    id: '',
    tarjetaId: '',
    descripcion: '',
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10)
  };
  
  // Meses disponibles para filtro
  mesesDisponibles: string[] = [];
  
  // Control de expansión de tarjetas
  tarjetasExpandidas: Set<string> = new Set();
  
  // Modo de visualización
  vistaAgrupada: boolean = true;

  private subscriptions = new Subscription();

  // Plantillas de gastos frecuentes
  plantillasFrecuentes: Array<{
    nombre: string;
    icono: string;
    montoPromedio?: number;
    vecesUsada: number;
    categoriaId?: string;
    descripcion: string;
  }> = [];

  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService,
    private filtroAvanzadoService: FiltroAvanzadoService,
    private etiquetaService: EtiquetaService,
    private notaService: NotaService,
    private notificationService: NotificationService,
    private preferenciasService: PreferenciasUsuarioService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    
    combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$(),
      this.categoriaService.getCategorias$(),
      this.etiquetaService.getEtiquetas$(),
      this.notaService.getNotas$(),
      this.preferenciasService.getDescripcionesFrecuentes$(8)
    ]).subscribe(([tarjetas, gastos, categorias, etiquetas, notas, descripcionesFrecuentes]) => {
      this.tarjetas = tarjetas;
      this.categorias = categorias;
      this.etiquetas = etiquetas;
      this.notas = notas;
      this.gastos = gastos;
      this.gastosFiltrados = gastos;
      this.agruparGastos();
      this.generarMesesDisponibles();
      this.cargarPlantillasFrecuentes(descripcionesFrecuentes);
      this.loading = false;
    });
  }

  cargarPlantillasFrecuentes(descripciones: DescripcionFrecuente[]): void {
    const iconosPorCategoria: { [key: string]: string } = {
      'Alimentación': '🍔',
      'Transporte': '🚗',
      'Entretenimiento': '🎬',
      'Salud': '💊',
      'Educación': '📚',
      'Ropa': '👕',
      'Servicios': '💡',
      'Compras': '🛒',
      'Otros': '📦'
    };

    this.plantillasFrecuentes = descripciones.map(desc => {
      const categoria = desc.categoriaId 
        ? this.categorias.find(c => c.id === desc.categoriaId)
        : null;
      
      return {
        nombre: desc.texto,
        icono: categoria ? iconosPorCategoria[categoria.nombre] || '💰' : '💰',
        montoPromedio: desc.montoPromedio,
        vecesUsada: desc.vecesUsada,
        categoriaId: desc.categoriaId,
        descripcion: desc.texto
      };
    });
  }

  usarPlantilla(plantilla: {
    nombre: string;
    montoPromedio?: number;
    categoriaId?: string;
    descripcion: string;
  }): void {
    const preferencias = this.preferenciasService.getPreferencias();
    
    this.esEdicion = false;
    this.gastoSeleccionado = {
      id: '',
      tarjetaId: preferencias.ultimaTarjetaId || this.filtroTarjeta || (this.tarjetas.length > 0 ? this.tarjetas[0].id : ''),
      descripcion: plantilla.descripcion,
      monto: plantilla.montoPromedio ? Math.round(plantilla.montoPromedio) : 0,
      fecha: new Date().toISOString().slice(0, 10),
      categoriaId: plantilla.categoriaId
    };
    this.mostrarModal = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getCategoriaById(categoriaId?: string): Categoria | undefined {
    if (!categoriaId) return undefined;
    return this.categorias.find(c => c.id === categoriaId);
  }

  getEtiquetaById(etiquetaId: string): Etiqueta | undefined {
    return this.etiquetas.find(e => e.id === etiquetaId);
  }

  getEtiquetasPorGasto(gasto: Gasto): Etiqueta[] {
    if (!gasto.etiquetasIds || gasto.etiquetasIds.length === 0) {
      return [];
    }
    return gasto.etiquetasIds
      .map(id => this.getEtiquetaById(id))
      .filter((e): e is Etiqueta => e !== undefined);
  }

  getNotaPorGasto(gasto: Gasto): Nota | undefined {
    if (!gasto.notaId) return undefined;
    return this.notas.find(n => n.id === gasto.notaId);
  }

  getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  generarMesesDisponibles(): void {
    const meses = new Set<string>();
    
    // Agregar meses de gastos existentes
    this.gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.add(mesKey);
      
      // Agregar meses de cuotas si aplica
      if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1 && gasto.primerMesCuota) {
        const primerMes = new Date(gasto.primerMesCuota + '-01');
        for (let i = 0; i < gasto.cantidadCuotas; i++) {
          const mesCuota = new Date(primerMes);
          mesCuota.setMonth(mesCuota.getMonth() + i);
          const mesKeyCuota = `${mesCuota.getFullYear()}-${String(mesCuota.getMonth() + 1).padStart(2, '0')}`;
          meses.add(mesKeyCuota);
        }
      }
    });
    
    // Agregar meses futuros (próximos 12 meses)
    const fechaActual = new Date();
    for (let i = 0; i < 12; i++) {
      const fechaFutura = new Date(fechaActual);
      fechaFutura.setMonth(fechaFutura.getMonth() + i);
      const mesKey = `${fechaFutura.getFullYear()}-${String(fechaFutura.getMonth() + 1).padStart(2, '0')}`;
      meses.add(mesKey);
    }
    
    this.mesesDisponibles = Array.from(meses).sort().reverse();
  }

  aplicarFiltros(): void {
    if (this.usarFiltrosAvanzados) {
      // Usar filtros avanzados
      this.gastosFiltrados = this.filtroAvanzadoService.aplicarFiltro(this.gastos, this.filtroAvanzado);
    } else {
      // Usar filtros básicos (compatibilidad)
      this.gastosFiltrados = this.gastos.filter(gasto => {
        // Filtro por tarjeta
        if (this.filtroTarjeta && gasto.tarjetaId !== this.filtroTarjeta) {
          return false;
        }
        
        // Filtro por mes
        if (this.filtroMes) {
          const fechaGasto = new Date(gasto.fecha);
          const mesGasto = `${fechaGasto.getFullYear()}-${String(fechaGasto.getMonth() + 1).padStart(2, '0')}`;
          
          // Verificar si el gasto está en el mes seleccionado o en sus cuotas
          let coincideMes = mesGasto === this.filtroMes;
          
          if (!coincideMes && gasto.cantidadCuotas && gasto.cantidadCuotas > 1 && gasto.primerMesCuota) {
            const primerMes = new Date(gasto.primerMesCuota + '-01');
            for (let i = 0; i < gasto.cantidadCuotas; i++) {
              const mesCuota = new Date(primerMes);
              mesCuota.setMonth(mesCuota.getMonth() + i);
              const mesKeyCuota = `${mesCuota.getFullYear()}-${String(mesCuota.getMonth() + 1).padStart(2, '0')}`;
              if (mesKeyCuota === this.filtroMes) {
                coincideMes = true;
                break;
              }
            }
          }
          
          if (!coincideMes) {
            return false;
          }
        }
        
        // Filtro por tipo (compartido/personal)
        if (this.filtroCompartido) {
          const esCompartido = gasto.compartidoCon && gasto.compartidoCon.trim() !== '';
          if (this.filtroCompartido === 'compartido' && !esCompartido) {
            return false;
          }
          if (this.filtroCompartido === 'personal' && esCompartido) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    this.agruparGastos();
  }

  onFiltroAvanzadoCambiado(filtro: FiltroAvanzado): void {
    this.filtroAvanzado = filtro;
    this.usarFiltrosAvanzados = true;
    this.aplicarFiltros();
  }

  onFiltroAvanzadoAplicado(filtro: FiltroAvanzado): void {
    this.filtroAvanzado = filtro;
    this.usarFiltrosAvanzados = true;
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroTarjeta = '';
    this.filtroMes = '';
    this.filtroCompartido = '';
    this.filtroAvanzado = { ...FILTRO_POR_DEFECTO };
    this.usarFiltrosAvanzados = false;
    this.gastosFiltrados = this.gastos;
    this.agruparGastos();
  }

  get hayFiltrosActivos(): boolean {
    if (this.usarFiltrosAvanzados) {
      return !this.filtroAvanzado.todasLasTarjetas || 
             !this.filtroAvanzado.todasLasCategorias ||
             !!this.filtroAvanzado.rangoFechas ||
             (this.filtroAvanzado.meses && this.filtroAvanzado.meses.length > 0) ||
             this.filtroAvanzado.montoMinimo !== undefined ||
             this.filtroAvanzado.montoMaximo !== undefined ||
             !!this.filtroAvanzado.textoBusqueda;
    }
    return this.filtroTarjeta !== '' || this.filtroMes !== '' || this.filtroCompartido !== '';
  }

  get totalFiltrado(): number {
    return this.gastosFiltrados.reduce((total, gasto) => total + gasto.monto, 0);
  }

  obtenerNombreTarjeta(idTarjeta: string): string {
    const tarjeta = this.tarjetas.find(t => t.id === idTarjeta);
    return tarjeta ? tarjeta.nombre : 'Tarjeta no encontrada';
  }

  agregarGasto(): void {
    this.esEdicion = false;
    this.gastoSeleccionado = {
      id: '',
      tarjetaId: this.filtroTarjeta || '',
      descripcion: '',
      monto: 0,
      fecha: new Date().toISOString().slice(0, 10)
    };
    this.mostrarModal = true;
  }

  editarGasto(gasto: Gasto): void {
    this.esEdicion = true;
    this.gastoSeleccionado = { ...gasto };
    this.mostrarModal = true;
  }

  eliminarGasto(gasto: Gasto): void {
    this.notificationService.confirm(
      'Confirmar eliminación',
      `¿Estás seguro de que deseas eliminar el gasto "${gasto.descripcion}"?`,
      'Eliminar',
      'Cancelar'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.gastoService.eliminarGasto(gasto.id).subscribe({
          next: () => {
            this.cargarDatos();
            this.notificationService.success('Gasto eliminado correctamente');
          },
          error: (error) => {
            console.error('Error al eliminar gasto:', error);
            this.notificationService.error('Error al eliminar el gasto');
          }
        });
      }
    });
  }

  onGuardarGasto(gasto: Gasto): void {
    if (this.esEdicion) {
      const { id, ...cambios } = gasto;
      this.gastoService.actualizarGasto(id, cambios).subscribe({
        next: (gastoActualizado) => {
          if (gastoActualizado) {
            // Registrar descripción frecuente
            this.preferenciasService.registrarDescripcion(
              gastoActualizado.descripcion,
              gastoActualizado.monto,
              gastoActualizado.categoriaId
            );
            
            this.cargarDatos();
            this.cerrarModal();
            this.notificationService.success('Gasto actualizado correctamente');
          } else {
            this.notificationService.error('No se pudo actualizar el gasto');
          }
        },
        error: (error) => {
          console.error('Error al actualizar gasto:', error);
          this.notificationService.error('Error al actualizar el gasto');
        }
      });
    } else {
      const { id, ...nuevoGasto } = gasto;
      this.gastoService.agregarGasto(nuevoGasto).subscribe({
        next: () => {
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
          
          this.cargarDatos();
          this.cerrarModal();
          this.notificationService.success('Gasto agregado correctamente');
        },
        error: (error) => {
          console.error('Error al agregar gasto:', error);
          this.notificationService.error('Error al agregar el gasto');
        }
      });
    }
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.esEdicion = false;
    this.gastoSeleccionado = {
      id: '',
      tarjetaId: '',
      descripcion: '',
      monto: 0,
      fecha: new Date().toISOString().slice(0, 10)
    };
  }

  agruparGastos(): void {
    const gastosPorTarjeta = new Map<string, GastosPorTarjeta>();
    
    this.gastosFiltrados.forEach(gasto => {
      const nombreTarjeta = this.obtenerNombreTarjeta(gasto.tarjetaId);
      
      if (!gastosPorTarjeta.has(gasto.tarjetaId)) {
        gastosPorTarjeta.set(gasto.tarjetaId, {
          nombreTarjeta,
          tarjetaId: gasto.tarjetaId,
          totalTarjeta: 0,
          cantidadGastos: 0,
          gastos: []
        });
      }
      
      const grupo = gastosPorTarjeta.get(gasto.tarjetaId)!;
      grupo.gastos.push(gasto);
      grupo.totalTarjeta += gasto.monto;
      grupo.cantidadGastos++;
    });
    
    this.gastosAgrupados = Array.from(gastosPorTarjeta.values())
      .sort((a, b) => a.nombreTarjeta.localeCompare(b.nombreTarjeta));
  }

  toggleTarjetaExpansion(tarjetaId: string): void {
    if (this.tarjetasExpandidas.has(tarjetaId)) {
      this.tarjetasExpandidas.delete(tarjetaId);
    } else {
      this.tarjetasExpandidas.add(tarjetaId);
    }
  }

  isTarjetaExpandida(tarjetaId: string): boolean {
    return this.tarjetasExpandidas.has(tarjetaId);
  }

  toggleVistaAgrupada(): void {
    this.vistaAgrupada = !this.vistaAgrupada;
  }
}
