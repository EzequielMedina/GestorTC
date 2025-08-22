import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { GastoDialogComponent } from '../../components/gasto-dialog/gasto-dialog';

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
  imports: [CommonModule, FormsModule, GastoDialogComponent],
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export class GastosComponent implements OnInit {
  gastos: Gasto[] = [];
  tarjetas: Tarjeta[] = [];
  gastosFiltrados: Gasto[] = [];
  gastosAgrupados: GastosPorTarjeta[] = [];
  
  // Filtros
  filtroTarjeta: string = '';
  filtroMes: string = '';
  filtroCompartido: string = '';
  
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

  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    
    this.tarjetaService.getTarjetas$().subscribe(tarjetas => {
      this.tarjetas = tarjetas;
    });

    this.gastoService.getGastos$().subscribe(gastos => {
      this.gastos = gastos;
      this.gastosFiltrados = gastos;
      this.agruparGastos();
      this.generarMesesDisponibles();
      this.loading = false;
    });
  }

  generarMesesDisponibles(): void {
    const meses = new Set<string>();
    
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
    
    this.mesesDisponibles = Array.from(meses).sort().reverse();
  }

  aplicarFiltros(): void {
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
    
    this.agruparGastos();
  }

  limpiarFiltros(): void {
    this.filtroTarjeta = '';
    this.filtroMes = '';
    this.filtroCompartido = '';
    this.gastosFiltrados = this.gastos;
    this.agruparGastos();
  }

  get hayFiltrosActivos(): boolean {
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
    if (confirm(`¿Estás seguro de que deseas eliminar el gasto "${gasto.descripcion}"?`)) {
      this.gastoService.eliminarGasto(gasto.id).subscribe({
        next: () => {
          this.cargarDatos();
          alert('Gasto eliminado correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar gasto:', error);
          alert('Error al eliminar el gasto');
        }
      });
    }
  }

  onGuardarGasto(gasto: Gasto): void {
    if (this.esEdicion) {
      const { id, ...cambios } = gasto;
      this.gastoService.actualizarGasto(id, cambios).subscribe({
        next: (gastoActualizado) => {
          if (gastoActualizado) {
            this.cargarDatos();
            this.cerrarModal();
            alert('Gasto actualizado correctamente');
          } else {
            alert('No se pudo actualizar el gasto');
          }
        },
        error: (error) => {
          console.error('Error al actualizar gasto:', error);
          alert('Error al actualizar el gasto');
        }
      });
    } else {
      const { id, ...nuevoGasto } = gasto;
      this.gastoService.agregarGasto(nuevoGasto).subscribe({
        next: () => {
          this.cargarDatos();
          this.cerrarModal();
          alert('Gasto agregado correctamente');
        },
        error: (error) => {
          console.error('Error al agregar gasto:', error);
          alert('Error al agregar el gasto');
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
