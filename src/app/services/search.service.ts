import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ResultadoBusqueda } from '../models/search-result.model';
import { Gasto } from '../models/gasto.model';
import { Tarjeta } from '../models/tarjeta.model';
import { Prestamo } from '../models/prestamo.model';
import { CompraDolar } from '../models/compra-dolar.model';
import { VentaDolar } from '../models/venta-dolar.model';
import { TarjetaService } from './tarjeta';
import { GastoService } from './gasto';
import { PrestamoService } from './prestamo.service';
import { CompraDolarService } from './compra-dolar.service';
import { VentaDolarService } from './venta-dolar.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private prestamoService: PrestamoService,
    private compraDolarService: CompraDolarService,
    private ventaDolarService: VentaDolarService
  ) {}

  /**
   * Busca en todos los datos del sistema
   * @param termino Término de búsqueda
   */
  buscar(termino: string): Observable<ResultadoBusqueda[]> {
    if (!termino || termino.trim().length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    const terminoLower = termino.toLowerCase().trim();

    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.gastoService.getGastos$(),
      this.prestamoService.getPrestamos$(),
      this.compraDolarService.obtenerCompras(),
      this.ventaDolarService.obtenerVentas()
    ]).pipe(
      map(([tarjetas, gastos, prestamos, comprasDolar, ventasDolar]) => {
        const resultados: ResultadoBusqueda[] = [];

        // Buscar en tarjetas
        tarjetas.forEach(tarjeta => {
          if (
            tarjeta.nombre.toLowerCase().includes(terminoLower) ||
            tarjeta.banco.toLowerCase().includes(terminoLower) ||
            (tarjeta.ultimosDigitos && tarjeta.ultimosDigitos.includes(termino))
          ) {
            resultados.push({
              id: `tarjeta_${tarjeta.id}`,
              tipo: 'TARJETA',
              titulo: tarjeta.nombre,
              descripcion: `${tarjeta.banco} - Límite: $${tarjeta.limite.toLocaleString()}`,
              ruta: '/tarjetas',
              datos: { tarjetaId: tarjeta.id }
            });
          }
        });

        // Buscar en gastos
        gastos.forEach(gasto => {
          if (gasto.descripcion.toLowerCase().includes(terminoLower)) {
            const tarjeta = tarjetas.find(t => t.id === gasto.tarjetaId);
            resultados.push({
              id: `gasto_${gasto.id}`,
              tipo: 'GASTO',
              titulo: gasto.descripcion,
              descripcion: `$${gasto.monto.toLocaleString()} - ${gasto.fecha}${tarjeta ? ` - ${tarjeta.nombre}` : ''}`,
              ruta: '/gastos',
              datos: { gastoId: gasto.id, tarjetaId: gasto.tarjetaId }
            });
          }
        });

        // Buscar en préstamos
        prestamos.forEach(prestamo => {
          if (
            prestamo.prestamista.toLowerCase().includes(terminoLower) ||
            (prestamo.notas && prestamo.notas.toLowerCase().includes(terminoLower))
          ) {
            resultados.push({
              id: `prestamo_${prestamo.id}`,
              tipo: 'PRESTAMO',
              titulo: `Préstamo: ${prestamo.prestamista}`,
              descripcion: `$${prestamo.montoPrestado.toLocaleString()} ${prestamo.moneda} - ${prestamo.estado}`,
              ruta: `/prestamos/${prestamo.id}`,
              datos: { prestamoId: prestamo.id }
            });
          }
        });

        // Buscar en compras de dólares
        comprasDolar.forEach(compra => {
          if (terminoLower.includes('dolar') || terminoLower.includes('dólar') || terminoLower.includes('usd')) {
            resultados.push({
              id: `compra_dolar_${compra.id}`,
              tipo: 'DOLAR',
              titulo: `Compra de dólares - ${compra.mes}/${compra.anio}`,
              descripcion: `$${compra.dolares} USD a $${compra.precioCompra.toLocaleString()}`,
              ruta: '/gestion-dolares',
              datos: { compraId: compra.id }
            });
          }
        });

        // Buscar en ventas de dólares
        ventasDolar.forEach(venta => {
          if (terminoLower.includes('dolar') || terminoLower.includes('dólar') || terminoLower.includes('usd')) {
            resultados.push({
              id: `venta_dolar_${venta.id}`,
              tipo: 'DOLAR',
              titulo: `Venta de dólares - ${venta.mes}/${venta.anio}`,
              descripcion: `$${venta.dolares} USD a $${venta.precioVenta.toLocaleString()}`,
              ruta: '/gestion-dolares',
              datos: { ventaId: venta.id }
            });
          }
        });

        return resultados;
      })
    );
  }

  /**
   * Busca con debounce para autocompletado
   */
  buscarConDebounce(termino$: Observable<string>, debounceMs: number = 300): Observable<ResultadoBusqueda[]> {
    return termino$.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged(),
      map(termino => termino.trim()),
      switchMap(termino => {
        if (!termino) {
          return of([]);
        }
        return this.buscar(termino);
      })
    );
  }
}

