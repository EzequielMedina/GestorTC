import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Tarjeta } from '../models/tarjeta.model';
import { Gasto } from '../models/gasto.model';
import { Prestamo } from '../models/prestamo.model';
import { BalanceDolar } from '../models/venta-dolar.model';
import { Categoria } from '../models/categoria.model';
import { PresupuestoSeguimiento } from '../models/presupuesto.model';
import { TarjetaService } from './tarjeta';
import { GastoService } from './gasto';
import { PrestamoService } from './prestamo.service';
import { ResumenService, ResumenTarjeta } from './resumen.service';
import { BalanceDolarService } from './balance-dolar.service';
import { CategoriaService } from './categoria.service';
import { PresupuestoService } from './presupuesto.service';

export interface DashboardStats {
  totalGastosMes: number;
  limiteTotal: number;
  disponibleTotal: number;
  porcentajeUsoTotal: number;
  tarjetasConMayorUso: ResumenTarjeta[];
  gastosPorCategoria: { categoria: Categoria; total: number }[];
  balanceDolares: BalanceDolar | null;
  prestamosActivos: Prestamo[];
  presupuestosCerca: PresupuestoSeguimiento[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private prestamoService: PrestamoService,
    private resumenService: ResumenService,
    private balanceDolarService: BalanceDolarService,
    private categoriaService: CategoriaService,
    private presupuestoService: PresupuestoService
  ) {}

  /**
   * Obtiene todas las estadísticas del dashboard para el mes actual
   */
  getDashboardStats$(): Observable<DashboardStats> {
    const mesActual = this.getMesActual();
    
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$(),
      this.prestamoService.getPrestamos$(),
      this.resumenService.getResumenPorTarjeta$(),
      this.balanceDolarService.obtenerBalanceCompleto(),
      this.categoriaService.getCategorias$(),
      this.presupuestoService.getPresupuestosConSeguimiento$(mesActual),
      this.resumenService.getTotalDelMes$(mesActual)
    ]).pipe(
      map(([tarjetas, gastos, prestamos, resumenTarjetas, balanceDolares, categorias, presupuestos, totalGastosMes]) => {
        // totalGastosMes ya viene calculado correctamente del ResumenService incluyendo cuotas

        // Límites y disponible
        const limiteTotal = (tarjetas || []).reduce((sum: number, t: Tarjeta) => sum + t.limite, 0);
        const disponibleTotal = limiteTotal - (resumenTarjetas || []).reduce((sum: number, r: ResumenTarjeta) => sum + r.totalGastos, 0);
        const porcentajeUsoTotal = limiteTotal > 0 ? (totalGastosMes / limiteTotal) * 100 : 0;

        // Tarjetas con mayor uso (top 5)
        const tarjetasConMayorUso = [...(resumenTarjetas || [])]
          .sort((a, b) => b.porcentajeUso - a.porcentajeUso)
          .slice(0, 5);

        // Gastos por categoría - filtrar gastos del mes primero
        const gastosMes = this.filtrarGastosPorMes(gastos || [], mesActual);
        const gastosPorCategoria = this.calcularGastosPorCategoria(gastosMes, categorias || []);

        // Préstamos activos
        const prestamosActivos = (prestamos || []).filter((p: Prestamo) => p.estado === 'ACTIVO');

        // Presupuestos cerca del límite (80% o más)
        const presupuestosCerca = (presupuestos || []).filter((p: PresupuestoSeguimiento) => p.porcentajeUsado >= 80);

        return {
          totalGastosMes,
          limiteTotal,
          disponibleTotal,
          porcentajeUsoTotal,
          tarjetasConMayorUso,
          gastosPorCategoria,
          balanceDolares: balanceDolares || null,
          prestamosActivos,
          presupuestosCerca
        };
      })
    );
  }

  /**
   * Filtra gastos que impactan en un mes específico
   */
  private filtrarGastosPorMes(gastos: Gasto[], mes: string): Gasto[] {
    const [anio, mesNum] = mes.split('-').map(Number);
    const mesObjetivo = anio * 12 + mesNum;

    return gastos.filter(gasto => {
      const fechaGasto = new Date(gasto.fecha);
      const mesGasto = fechaGasto.getFullYear() * 12 + fechaGasto.getMonth() + 1;

      // Si tiene cuotas, verificar si alguna cuota cae en el mes
      if (gasto.cantidadCuotas && gasto.cantidadCuotas > 1 && gasto.primerMesCuota) {
        const primerMes = new Date(gasto.primerMesCuota + '-01');
        const primerMesNum = primerMes.getFullYear() * 12 + primerMes.getMonth() + 1;
        
        for (let i = 0; i < gasto.cantidadCuotas; i++) {
          if (primerMesNum + i === mesObjetivo) {
            return true;
          }
        }
        return false;
      }

      return mesGasto === mesObjetivo;
    });
  }

  /**
   * Calcula gastos agrupados por categoría
   */
  private calcularGastosPorCategoria(gastos: Gasto[], categorias: Categoria[]): { categoria: Categoria; total: number }[] {
    const gastosPorCategoria: { [key: string]: number } = {};

    gastos.forEach(gasto => {
      if (gasto.categoriaId) {
        const monto = gasto.cantidadCuotas && gasto.cantidadCuotas > 1
          ? (gasto.montoPorCuota || gasto.monto / gasto.cantidadCuotas)
          : gasto.monto;
        
        gastosPorCategoria[gasto.categoriaId] = (gastosPorCategoria[gasto.categoriaId] || 0) + monto;
      }
    });

    return Object.entries(gastosPorCategoria)
      .map(([categoriaId, total]) => {
        const categoria = categorias.find(c => c.id === categoriaId);
        return categoria ? { categoria, total } : null;
      })
      .filter((item): item is { categoria: Categoria; total: number } => item !== null)
      .sort((a, b) => b.total - a.total);
  }

  /**
   * Obtiene el mes actual en formato YYYY-MM
   */
  private getMesActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }
}

