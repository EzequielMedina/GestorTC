import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumenService, ResumenPersona, ResumenTarjeta } from '../../services/resumen.service';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { TarjetaService } from '../../services/tarjeta';
import { GastoService } from '../../services/gasto';
import { ModoResumen } from '../../models/resumen/modo-resumen';
import { ComparacionMeses } from '../../models/resumen/modo-resumen';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resumen.component.html',
  styleUrls: ['./resumen.component.css']
})
export class ResumenComponent implements OnInit, OnDestroy {
  resumenTarjetasMes$!: Observable<(ResumenTarjeta & { totalMes: number })[]>;
  resumenTarjetasGeneral$!: Observable<ResumenTarjeta[]>;
  resumenPersonas$!: Observable<ResumenPersona[]>;
  resumenPersonasMes$!: Observable<(ResumenPersona & { totalMes: number })[]>;
  detalleGastosMes$!: Observable<Array<{
    nombreTarjeta: string;
    descripcion: string;
    montoOriginal: number;
    cuotaActual: number;
    cantidadCuotas: number;
    montoCuota: number;
    compartidoCon?: string;
    porcentajeCompartido?: number;
  }>>;
  detalleGastosAgrupadosMes$!: Observable<Array<{
    nombreTarjeta: string;
    totalTarjeta: number;
    cantidadGastos: number;
    gastosUltimaCuota: number;
    gastos: Array<{
      descripcion: string;
      montoOriginal: number;
      cuotaActual: number;
      cantidadCuotas: number;
      montoCuota: number;
      compartidoCon?: string;
      porcentajeCompartido?: number;
    }>;
  }>>;
  tarjetasExpandidas: Set<string> = new Set();
  mostrarSeccionCompleta: { [key: string]: boolean } = {
    'resumenTarjetas': true,
    'detalleGastos': false,
    'gastosCompartidos': false,
    'resumenGeneral': false,
    'compararMeses': false
  };
  comparacionMonthKeyA: string = '';
  comparacionMonthKeyB: string = '';
  comparacionMeses$!: Observable<ComparacionMeses>;
  detalleGastosCompartidosMes$!: Observable<Array<{
    descripcion: string;
    montoCuota: number;
    compartidoCon: string;
    porcentajeCompartido: number;
    montoCompartido: number;
  }>>;
  limiteTotal$!: Observable<number>;
  totalDelMes$!: Observable<number>;
  porcentajeUsoTotalMes$!: Observable<number>;
  totalPorPersona$!: Observable<Array<{ persona: string; total: number }>>;

  currentMonthKey: string = this.monthKeyFromDate(new Date()); // YYYY-MM
  monthLabel: string = this.formatMonthLabel(this.currentMonthKey);
  modoResumen: ModoResumen = 'mesNatural';
  private subscriptions = new Subscription();

  constructor(
    private resumenService: ResumenService,
    private tarjetaService: TarjetaService,
    private gastoService: GastoService,
    private cdr: ChangeDetectorRef
  ) {
    // Los observables se inicializarán en ngOnInit
  }

  ngOnInit(): void {
    this.comparacionMonthKeyA = this.addMonths(this.currentMonthKey, -1);
    this.comparacionMonthKeyB = this.currentMonthKey;
    this.refreshComparacion();
    // Refrescar todos los streams cuando el componente se inicializa
    // Esto asegura que los datos se actualicen cuando vuelves a la página
    this.refreshAllStreams();
    
    // Suscribirse directamente a los cambios en tarjetas y gastos para forzar actualización
    // Esto asegura que cuando se importan datos, el resumen se actualice inmediatamente
    this.subscriptions.add(
      combineLatest([
        this.tarjetaService.getTarjetas$(),
        this.gastoService.getGastos$()
      ]).subscribe(() => {
        // Cuando cambian los datos base, refrescar todos los streams
        this.refreshAllStreams();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleTarjetaExpansion(nombreTarjeta: string): void {
    if (this.tarjetasExpandidas.has(nombreTarjeta)) {
      this.tarjetasExpandidas.delete(nombreTarjeta);
    } else {
      this.tarjetasExpandidas.add(nombreTarjeta);
    }
  }

  isTarjetaExpandida(nombreTarjeta: string): boolean {
    return this.tarjetasExpandidas.has(nombreTarjeta);
  }

  toggleSeccionCompleta(seccion: string): void {
    this.mostrarSeccionCompleta[seccion] = !this.mostrarSeccionCompleta[seccion];
  }

  isSeccionExpandida(seccion: string): boolean {
    return this.mostrarSeccionCompleta[seccion];
  }

  expandirTodasTarjetas(): void {
    // Obtener todas las tarjetas del mes actual
    this.detalleGastosAgrupadosMes$.subscribe(detalleAgrupado => {
      detalleAgrupado.forEach(grupo => {
        this.tarjetasExpandidas.add(grupo.nombreTarjeta);
      });
    }).unsubscribe();
  }

  colapsarTodasTarjetas(): void {
    this.tarjetasExpandidas.clear();
  }

  private monthKeyFromDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private addMonths(key: string, delta: number): string {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, (m - 1) + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  formatMonthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    this.currentMonthKey = this.addMonths(this.currentMonthKey, -1);
    this.monthLabel = this.formatMonthLabel(this.currentMonthKey);
    this.refreshAllStreams();
  }

  nextMonth(): void {
    this.currentMonthKey = this.addMonths(this.currentMonthKey, 1);
    this.monthLabel = this.formatMonthLabel(this.currentMonthKey);
    this.refreshAllStreams();
  }

  prevComparacionA(): void {
    this.comparacionMonthKeyA = this.addMonths(this.comparacionMonthKeyA, -1);
    this.refreshComparacion();
  }
  nextComparacionA(): void {
    this.comparacionMonthKeyA = this.addMonths(this.comparacionMonthKeyA, 1);
    this.refreshComparacion();
  }
  prevComparacionB(): void {
    this.comparacionMonthKeyB = this.addMonths(this.comparacionMonthKeyB, -1);
    this.refreshComparacion();
  }
  nextComparacionB(): void {
    this.comparacionMonthKeyB = this.addMonths(this.comparacionMonthKeyB, 1);
    this.refreshComparacion();
  }
  private refreshComparacion(): void {
    this.comparacionMeses$ = this.resumenService.getComparacionMeses$(this.comparacionMonthKeyA, this.comparacionMonthKeyB);
    this.cdr.markForCheck();
  }

  onModoChange(): void {
    this.refreshAllStreams();
  }

  private refreshAllStreams(): void {
    // Forzar la creación de nuevos observables para evitar problemas de caché
    // Esto asegura que los observables se actualicen correctamente cuando vuelves a la página
    const currentKey = this.currentMonthKey;
    
    // Recrear todos los observables para forzar la actualización
    // Esto es crítico: cada vez que se llama este método, se crean nuevos observables
    // que se suscribirán a los BehaviorSubjects actualizados
    this.resumenTarjetasMes$ = this.resumenService.getResumenPorTarjetaConModo$(currentKey, this.modoResumen);
    this.resumenTarjetasGeneral$ = this.resumenService.getResumenPorTarjeta$();
    this.resumenPersonas$ = this.resumenService.getResumenPorPersona$();
    this.resumenPersonasMes$ = this.resumenService.getResumenPorPersonaDelMes$(currentKey);
    this.detalleGastosMes$ = this.resumenService.getDetalleGastosDelMes$(currentKey);
    this.detalleGastosAgrupadosMes$ = this.resumenService.getDetalleGastosAgrupadosPorTarjetaConModo$(currentKey, this.modoResumen);
    this.detalleGastosCompartidosMes$ = this.resumenService.getDetalleGastosCompartidosDelMes$(currentKey);
    this.limiteTotal$ = this.resumenService.getLimiteTotal$();
    this.totalDelMes$ = this.resumenService.getTotalEnPeriodoConModo$(currentKey, this.modoResumen);
    this.porcentajeUsoTotalMes$ = this.resumenService.getPorcentajeUsoTotalConModo$(currentKey, this.modoResumen);
    this.totalPorPersona$ = this.resumenService.getTotalPorPersona$(currentKey);
    
    // Forzar detección de cambios después de actualizar los observables
    // Usar setTimeout para asegurar que Angular procese los cambios
    setTimeout(() => {
      this.cdr.markForCheck();
    }, 0);
  }
}
