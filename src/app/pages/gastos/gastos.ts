import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarjeta } from '../../models/tarjeta.model';
import { Gasto } from '../../models/gasto.model';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export class GastosComponent implements OnInit {
  gastos: Gasto[] = [];
  tarjetas: Tarjeta[] = [];
  gastosFiltrados: Gasto[] = [];
  
  // Filtros
  filtroTarjeta: string = '';
  filtroMes: string = '';
  filtroCompartido: string = '';
  
  // Estado
  loading = false;
  
  // Meses disponibles para filtro
  mesesDisponibles: string[] = [];

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
  }

  limpiarFiltros(): void {
    this.filtroTarjeta = '';
    this.filtroMes = '';
    this.filtroCompartido = '';
    this.gastosFiltrados = this.gastos;
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
    // Por ahora solo mostrar un mensaje, luego se puede implementar un modal
    alert('Función de agregar gasto - Se implementará con un modal');
  }

  editarGasto(gasto: Gasto): void {
    // Por ahora solo mostrar un mensaje, luego se puede implementar un modal
    alert(`Editar gasto: ${gasto.descripcion}`);
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
}
