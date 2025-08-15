import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { combineLatest, map, startWith, Subject, takeUntil, Observable } from 'rxjs';
import { GastoService } from '../../services/gasto';
import { TarjetaService } from '../../services/tarjeta';
import { Gasto } from '../../models/gasto.model';
import { Tarjeta } from '../../models/tarjeta.model';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <h2>Gastos</h2>

      <!-- Filtros -->
      <section class="card">
        <form [formGroup]="filtrosForm" class="filters" (ngSubmit)="$event.preventDefault()">
          <label>
            Tarjeta
            <select formControlName="tarjetaId">
              <option value="">(Todas)</option>
              <option *ngFor="let t of (tarjetas$ | async)" [value]="t.id">{{ t.nombre }}</option>
            </select>
          </label>

          <label>
            Desde
            <input type="date" formControlName="desde" />
          </label>

          <label>
            Hasta
            <input type="date" formControlName="hasta" />
          </label>
        </form>
      </section>

      <!-- Listado -->
      <section class="card">
        <h3>Listado</h3>
        <div class="table-wrapper" *ngIf="(gastosFiltrados$ | async) as gastos; else cargando">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Tarjeta</th>
              <th class="right">Monto</th>
              <th>Cuotas</th>
              <th>Compartido</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let g of gastos">
              <td>{{ g.fecha }}</td>
              <td>{{ g.descripcion }}</td>
              <td>{{ (tarjetasMap() [g.tarjetaId])?.nombre || '—' }}</td>
              <td class="right">{{ g.monto | number:'1.2-2' }}</td>
              <td>
                <span class="badge" [class.badge-info]="(g.cantidadCuotas || 1) > 1">
                  {{ g.cantidadCuotas || 1 }}
                </span>
              </td>
              <td>
                <ng-container *ngIf="g.compartidoCon; else noComp">
                  <span class="chip">
                    {{ g.compartidoCon }}
                    <small *ngIf="g.porcentajeCompartido">{{ g.porcentajeCompartido }}%</small>
                  </span>
                </ng-container>
                <ng-template #noComp>—</ng-template>
              </td>
              <td>
                <button type="button" class="btn btn-primary" (click)="editar(g)">Editar</button>
                <button type="button" class="btn btn-danger" (click)="eliminar(g.id)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="gastos.length === 0">
              <td colspan="7" class="muted">No hay gastos para los filtros seleccionados.</td>
            </tr>
          </tbody>
        </table>
        </div>
        <ng-template #cargando>
          <p class="muted">Cargando...</p>
        </ng-template>
      </section>

      <!-- Formulario -->
      <section class="card">
        <h3>{{ editandoId() ? 'Editar gasto' : 'Nuevo gasto' }}</h3>
        <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          <div class="grid">
            <label>
              Tarjeta
              <select formControlName="tarjetaId" [class.invalid]="campoInvalido('tarjetaId')">
                <option value="" disabled>Seleccione tarjeta</option>
                <option *ngFor="let t of (tarjetas$ | async)" [value]="t.id">{{ t.nombre }}</option>
              </select>
              <span class="error" *ngIf="campoInvalido('tarjetaId')">Seleccione una tarjeta</span>
            </label>

            <label>
              Descripción
              <input type="text" formControlName="descripcion" [class.invalid]="campoInvalido('descripcion')" />
              <span class="error" *ngIf="campoInvalido('descripcion')">La descripción es requerida</span>
            </label>

            <label>
              Monto
              <input type="number" step="0.01" formControlName="monto" [class.invalid]="campoInvalido('monto')" />
              <span class="error" *ngIf="campoInvalido('monto')">Monto > 0</span>
            </label>

            <label>
              Fecha
              <input type="date" formControlName="fecha" [class.invalid]="campoInvalido('fecha')" />
              <span class="error" *ngIf="campoInvalido('fecha')">Fecha requerida</span>
            </label>

            <label>
              Compartido con (opcional)
              <input type="text" formControlName="compartidoCon" />
            </label>

            <label>
              % Compartido (0-100)
              <input type="number" formControlName="porcentajeCompartido" min="0" max="100" />
            </label>

            <!-- Cuotas -->
            <label>
              Cantidad de cuotas
              <input type="number" formControlName="cantidadCuotas" min="1" />
            </label>

            <label>
              Primer mes de cuota
              <input type="month" formControlName="primerMesCuota" />
            </label>
          </div>

          <!-- Preview de cuotas (simple) -->
          <div class="muted" *ngIf="(form.value.cantidadCuotas || 1) > 1">
            <ng-container *ngIf="calcularPreviewCuotas() as p">
              Se generarán {{ p.cantidad }} cuotas de {{ p.monto | number:'1.2-2' }} comenzando en {{ p.mes }}
            </ng-container>
          </div>

          <div class="actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid">{{ editandoId() ? 'Actualizar' : 'Agregar' }}</button>
            <button type="button" class="btn" (click)="cancelarEdicion()" *ngIf="editandoId()">Cancelar</button>
            <button type="button" class="btn btn-secondary" (click)="limpiarFormulario()">Limpiar</button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: `
    :host {
      --bg: #f6f8fb;
      --surface: #ffffff;
      --primary: #2563eb;
      --danger: #dc2626;
      --secondary: #6b7280;
      --border: #e5e7eb;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.08);
      --radius: 10px;
    }
    .page { display: grid; gap: 16px; background: var(--bg); padding: 8px; }
    h2 { margin: 4px 4px 0; font-weight: 700; }
    h3 { margin: 0 0 8px; font-weight: 600; }
    .card { background: var(--surface); padding: 16px; border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: end; }
    label { display: grid; gap: 6px; font-size: 14px; }
    input, select { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font: inherit; background: white; outline: none; }
    input:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
    .table-wrapper { width: 100%; overflow-x: auto; }
    .table { width: 100%; border-collapse: collapse; min-width: 760px; }
    .table thead th { position: sticky; top: 0; background: var(--surface); border-bottom: 1px solid var(--border); text-align: left; font-weight: 600; }
    .table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
    .table tbody tr:hover { background: var(--bg); }
    .right { text-align: right; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: var(--color2); color: var(--primary); font-size: 12px; font-weight: 600; }
    .badge-info { background: var(--color1); color: var(--primary); }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; background: var(--color2); color: #0f172a; border-radius: 999px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(6, minmax(160px, 1fr)); gap: 12px; }
    .actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .btn { padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); cursor: pointer; }
    .btn:hover { filter: brightness(0.98); }
    .btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; }
    .btn-danger { background: var(--danger); border-color: var(--danger); color: #fff; }
    .btn-secondary { background: var(--color2); color: #111827; }
    .error { color: #b00020; font-size: 12px; }
    .invalid { border-color: #b00020; }
    .muted { color: #666; }
    @media (max-width: 1100px) { .grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } .filters { flex-direction: column; align-items: stretch; } }
  `
})
export class GastosComponent implements OnInit, OnDestroy {

  // Declarar primero; inicializar en ngOnInit para evitar usar servicios antes de su inicialización
  tarjetas$!: Observable<Tarjeta[]>;
  gastos$!: Observable<Gasto[]>;

  filtrosForm!: FormGroup;

  form!: FormGroup;

  private destroy$ = new Subject<void>();
  protected editandoId = signal<string | null>(null);
  protected tarjetasMap = signal<Record<string, Tarjeta>>({});

  gastosFiltrados$!: Observable<Gasto[]>;

  constructor(
    private fb: FormBuilder,
    private gastoService: GastoService,
    private tarjetaService: TarjetaService
  ) {
    // Inicializar formularios aquí para evitar TS2729 (uso de this.fb antes de inicialización)
    this.filtrosForm = this.fb.group({
      tarjetaId: [''],
      desde: [''],
      hasta: ['']
    });

    this.form = this.fb.group({
      tarjetaId: ['', Validators.required],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      fecha: [this.hoyISO(), Validators.required],
      compartidoCon: [''],
      porcentajeCompartido: [0, [Validators.min(0), Validators.max(100)]],
      cantidadCuotas: [1, [Validators.min(1)]],
      // input type="month" espera YYYY-MM
      primerMesCuota: [this.mesActualYYYYMM()]
    });
  }

  ngOnInit(): void {
    // Inicializaciones que dependen de servicios inyectados
    this.tarjetas$ = this.tarjetaService.getTarjetas$();
    this.gastos$ = this.gastoService.getGastos$();

    this.gastosFiltrados$ = combineLatest([
      this.gastos$,
      this.filtrosForm.valueChanges.pipe(startWith(this.filtrosForm.value)),
      this.tarjetas$
    ]).pipe(
      map(([gastos, filtros, tarjetas]) => {
        // actualizar cache de tarjetas
        this.tarjetasMap.set(Object.fromEntries(tarjetas.map(t => [t.id, t])));

        const desde = filtros.desde ? new Date(filtros.desde) : undefined;
        const hasta = filtros.hasta ? new Date(filtros.hasta) : undefined;

        return gastos.filter(g => {
          const okTarjeta = !filtros.tarjetaId || g.tarjetaId === filtros.tarjetaId;
          const f = new Date(g.fecha);
          const okDesde = !desde || f >= desde;
          const okHasta = !hasta || f <= hasta;
          return okTarjeta && okDesde && okHasta;
        });
      })
    );

    // cuando se complete compartidoCon, asegurar porcentaje por defecto
    this.form.get('compartidoCon')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        const pcCtrl = this.form.get('porcentajeCompartido')!;
        if (v && (pcCtrl.value === null || pcCtrl.value === undefined)) {
          pcCtrl.setValue(50, { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  campoInvalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  editar(g: Gasto): void {
    this.editandoId.set(g.id);
    this.form.patchValue({
      tarjetaId: g.tarjetaId,
      descripcion: g.descripcion,
      monto: g.monto,
      fecha: g.fecha,
      compartidoCon: g.compartidoCon || '',
      porcentajeCompartido: g.porcentajeCompartido ?? 0,
      cantidadCuotas: g.cantidadCuotas ?? 1,
      primerMesCuota: this.aYYYMM(g.primerMesCuota) || this.mesActualYYYYMM()
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.limpiarFormulario();
  }

  limpiarFormulario(): void {
    this.form.reset({
      tarjetaId: '',
      descripcion: '',
      monto: 0,
      fecha: this.hoyISO(),
      compartidoCon: '',
      porcentajeCompartido: 0,
      cantidadCuotas: 1,
      primerMesCuota: this.mesActualYYYYMM()
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    const v = this.form.value as any;

    // Validación adicional: si hay compartidoCon, porcentaje 0-100
    if (v.compartidoCon && (v.porcentajeCompartido == null || v.porcentajeCompartido < 0 || v.porcentajeCompartido > 100)) {
      this.form.get('porcentajeCompartido')?.setErrors({ rango: true });
      return;
    }

    const payload: Omit<Gasto, 'id'> = {
      tarjetaId: v.tarjetaId,
      descripcion: v.descripcion,
      monto: Number(v.monto),
      fecha: v.fecha,
      compartidoCon: v.compartidoCon || undefined,
      porcentajeCompartido: v.porcentajeCompartido === '' ? undefined : Number(v.porcentajeCompartido ?? 0),
      ...this.payloadCuotasDesdeForm(v)
    };

    const editId = this.editandoId();
    if (editId) {
      this.gastoService.actualizarGasto(editId, payload).subscribe(() => {
        this.cancelarEdicion();
      });
    } else {
      this.gastoService.agregarGasto(payload).subscribe(() => {
        this.limpiarFormulario();
      });
    }
  }

  eliminar(id: string): void {
    if (confirm('¿Eliminar gasto?')) {
      this.gastoService.eliminarGasto(id).subscribe();
    }
  }

  private hoyISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  private mesActualYYYYMM(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  }

  private aYYYMM(fechaISO?: string): string | null {
    if (!fechaISO) return null;
    // espera 'YYYY-MM-01' o 'YYYY-MM-DD'
    const [y, m] = fechaISO.split('-');
    if (!y || !m) return null;
    return `${y}-${m}`;
  }

  private normalizarPrimerDiaMes(yyyyMm: string): string {
    // Devuelve YYYY-MM-01
    if (!yyyyMm) return this.hoyISO().slice(0, 7) + '-01';
    const [y, m] = yyyyMm.split('-');
    return `${y}-${m}-01`;
  }

  private payloadCuotasDesdeForm(v: any): Partial<Gasto> {
    const cant = Math.max(1, Number(v.cantidadCuotas || 1));
    if (cant <= 1) {
      return {
        cantidadCuotas: undefined,
        primerMesCuota: undefined,
        montoPorCuota: undefined
      };
    }

    const total = Number(v.monto) || 0;
    // monto por cuota redondeado a 2 decimales (ajuste fino se podría aplicar en última cuota en futuras iteraciones)
    const montoCuota = Math.round((total / cant) * 100) / 100;
    const mesInicioISO = this.normalizarPrimerDiaMes(v.primerMesCuota || this.mesActualYYYYMM());
    return {
      cantidadCuotas: cant,
      primerMesCuota: mesInicioISO,
      montoPorCuota: montoCuota
    };
  }

  calcularPreviewCuotas(): { cantidad: number; monto: number; mes: string } | null {
    const v = this.form?.value as any;
    if (!v) return null;
    const cant = Math.max(1, Number(v.cantidadCuotas || 1));
    if (cant <= 1) return null;
    const total = Number(v.monto) || 0;
    const montoCuota = Math.round((total / cant) * 100) / 100;
    const mes = v.primerMesCuota || this.mesActualYYYYMM();
    return { cantidad: cant, monto: montoCuota, mes };
  }
}
