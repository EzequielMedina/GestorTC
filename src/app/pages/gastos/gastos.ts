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
      <div class="header">
        <h2>Gastos</h2>
        <p class="subtitle">Gestiona tus gastos de tarjetas de crédito</p>
      </div>

      <!-- Filtros -->
      <section class="content-card">
        <h3 class="card-title">Filtros</h3>
        <form [formGroup]="filtrosForm" class="filters-form" (ngSubmit)="$event.preventDefault()">
          <div class="filter-group">
            <label class="filter-label">
              <span class="label-text">Tarjeta</span>
              <select formControlName="tarjetaId" class="filter-input">
                <option value="">Todas las tarjetas</option>
                <option *ngFor="let t of (tarjetas$ | async)" [value]="t.id">{{ t.nombre }}</option>
              </select>
            </label>
          </div>

          <div class="filter-group">
            <label class="filter-label">
              <span class="label-text">Desde</span>
              <input type="date" formControlName="desde" class="filter-input" />
            </label>
          </div>

          <div class="filter-group">
            <label class="filter-label">
              <span class="label-text">Hasta</span>
              <input type="date" formControlName="hasta" class="filter-input" />
            </label>
          </div>
        </form>
      </section>

      <!-- Listado -->
      <section class="content-card">
        <h3 class="card-title">Listado de Gastos</h3>
        <div class="mobile-table" *ngIf="(gastosFiltrados$ | async) as gastos; else cargando">
          <div class="mobile-row" *ngFor="let g of gastos">
            <div class="row-header">
              <div class="gasto-fecha">{{ g.fecha | date:'dd/MM/yyyy' }}</div>
              <div class="gasto-monto">{{ g.monto | number:'1.2-2' }}</div>
            </div>
            
            <div class="row-content">
              <div class="gasto-info">
                <div class="gasto-descripcion">{{ g.descripcion }}</div>
                <div class="gasto-tarjeta">{{ (tarjetasMap() [g.tarjetaId])?.nombre || 'Tarjeta no encontrada' }}</div>
              </div>
              
              <div class="gasto-details">
                <div class="detail-item" *ngIf="(g.cantidadCuotas || 1) > 1">
                  <span class="detail-label">Cuotas:</span>
                  <span class="detail-value cuota-badge">{{ g.cantidadCuotas || 1 }}</span>
                </div>
                
                <div class="detail-item" *ngIf="g.compartidoCon">
                  <span class="detail-label">Compartido:</span>
                  <span class="detail-value compartido-chip">
                    {{ g.compartidoCon }}
                    <small *ngIf="g.porcentajeCompartido">({{ g.porcentajeCompartido }}%)</small>
                  </span>
                </div>
              </div>
              
              <div class="row-actions">
                <button type="button" class="btn-action btn-edit" (click)="editar(g)">
                  <span class="btn-icon">✏️</span>
                  <span class="btn-text">Editar</span>
                </button>
                <button type="button" class="btn-action btn-delete" (click)="eliminar(g.id)">
                  <span class="btn-icon">🗑️</span>
                  <span class="btn-text">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="gastos.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-text">No hay gastos para los filtros seleccionados</div>
          </div>
        </div>
        
        <ng-template #cargando>
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <div class="loading-text">Cargando gastos...</div>
          </div>
        </ng-template>
      </section>

      <!-- Formulario -->
      <section class="content-card">
        <h3 class="card-title">{{ editandoId() ? 'Editar Gasto' : 'Nuevo Gasto' }}</h3>
        <form [formGroup]="form" (ngSubmit)="guardar()" class="gasto-form" novalidate>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Tarjeta *</span>
                <select formControlName="tarjetaId" class="form-input" [class.invalid]="campoInvalido('tarjetaId')">
                  <option value="" disabled>Seleccione una tarjeta</option>
                  <option *ngFor="let t of (tarjetas$ | async)" [value]="t.id">{{ t.nombre }}</option>
                </select>
                <span class="error-message" *ngIf="campoInvalido('tarjetaId')">Seleccione una tarjeta</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Descripción *</span>
                <input type="text" formControlName="descripcion" class="form-input" 
                       [class.invalid]="campoInvalido('descripcion')" 
                       placeholder="Ej: Supermercado, Netflix, etc." />
                <span class="error-message" *ngIf="campoInvalido('descripcion')">La descripción es requerida</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Monto *</span>
                <input type="number" step="0.01" formControlName="monto" class="form-input" 
                       [class.invalid]="campoInvalido('monto')" 
                       placeholder="0.00" />
                <span class="error-message" *ngIf="campoInvalido('monto')">Monto debe ser mayor a 0</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Fecha *</span>
                <input type="date" formControlName="fecha" class="form-input" 
                       [class.invalid]="campoInvalido('fecha')" />
                <span class="error-message" *ngIf="campoInvalido('fecha')">Fecha requerida</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Compartido con (opcional)</span>
                <input type="text" formControlName="compartidoCon" class="form-input" 
                       placeholder="Nombre de la persona" />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">% Compartido (0-100)</span>
                <input type="number" formControlName="porcentajeCompartido" class="form-input" 
                       min="0" max="100" placeholder="50" />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Cantidad de cuotas</span>
                <input type="number" formControlName="cantidadCuotas" class="form-input" 
                       min="1" placeholder="1" />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Primer mes de cuota</span>
                <input type="month" formControlName="primerMesCuota" class="form-input" />
              </label>
            </div>
          </div>

          <!-- Preview de cuotas -->
          <div class="cuotas-preview" *ngIf="(form.value.cantidadCuotas || 1) > 1">
            <div class="preview-icon">📅</div>
            <div class="preview-content">
              <ng-container *ngIf="calcularPreviewCuotas() as p">
                Se generarán <strong>{{ p.cantidad }} cuotas</strong> de <strong>{{ p.monto | number:'1.2-2' }}</strong> 
                comenzando en <strong>{{ p.mes }}</strong>
              </ng-container>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
              <span class="btn-icon">{{ editandoId() ? '💾' : '➕' }}</span>
              <span class="btn-text">{{ editandoId() ? 'Actualizar' : 'Agregar' }}</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="cancelarEdicion()" *ngIf="editandoId()">
              <span class="btn-icon">❌</span>
              <span class="btn-text">Cancelar</span>
            </button>
            <button type="button" class="btn btn-outline" (click)="limpiarFormulario()">
              <span class="btn-icon">🧹</span>
              <span class="btn-text">Limpiar</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: `
    :host {
      --bg: var(--color1);
      --surface: var(--color2);
      --primary: var(--color3);
      --danger: #dc2626;
      --secondary: #6b7280;
      --border: var(--color5);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.08);
      --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
      --radius: 12px;
      --radius-sm: 8px;
    }

    .page {
      min-height: 100vh;
      background: var(--bg);
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 24px;
      text-align: center;
    }

    .header h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #333;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .content-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
    }

    .card-title {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 8px;
    }

    /* Filtros */
    .filters-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .filter-label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label-text {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .filter-input {
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 14px;
      background: white;
      outline: none;
      transition: all 0.2s ease;
    }

    .filter-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }

    /* Tabla móvil */
    .mobile-table {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .mobile-row {
      background: var(--bg);
      border-radius: var(--radius-sm);
      padding: 16px;
      border: 1px solid var(--border);
      transition: transform 0.2s ease;
    }

    .mobile-row:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .gasto-fecha {
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }

    .gasto-monto {
      font-weight: 700;
      color: var(--primary);
      font-size: 18px;
    }

    .row-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gasto-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .gasto-descripcion {
      font-weight: 500;
      color: #333;
      font-size: 15px;
    }

    .gasto-tarjeta {
      font-size: 14px;
      color: #666;
    }

    .gasto-details {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .detail-label {
      font-size: 13px;
      color: #666;
    }

    .detail-value {
      font-size: 13px;
      font-weight: 500;
    }

    .cuota-badge {
      background: var(--primary);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .compartido-chip {
      background: rgba(37,99,235,0.1);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .row-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      justify-content: center;
    }

    .btn-edit {
      background: var(--primary);
      color: white;
    }

    .btn-edit:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    .btn-delete {
      background: var(--danger);
      color: white;
    }

    .btn-delete:hover {
      background: #b91c1c;
      transform: translateY(-1px);
    }

    .btn-icon {
      font-size: 16px;
    }

    .btn-text {
      font-size: 14px;
    }

    /* Formulario */
    .gasto-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-input {
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 14px;
      background: white;
      outline: none;
      transition: all 0.2s ease;
    }

    .form-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }

    .form-input.invalid {
      border-color: var(--danger);
    }

    .error-message {
      color: var(--danger);
      font-size: 12px;
      margin-top: 4px;
    }

    .cuotas-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(37,99,235,0.05);
      border-radius: var(--radius-sm);
      border-left: 4px solid var(--primary);
    }

    .preview-icon {
      font-size: 24px;
    }

    .preview-content {
      font-size: 14px;
      color: #333;
      line-height: 1.4;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: var(--secondary);
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .btn-outline {
      background: transparent;
      color: #666;
      border: 1px solid var(--border);
    }

    .btn-outline:hover {
      background: var(--bg);
    }

    /* Estados */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 16px;
      font-weight: 500;
    }

    .loading-state {
      text-align: center;
      padding: 40px 20px;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border);
      border-top: 4px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    .loading-text {
      color: #666;
      font-size: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .page {
        padding: 12px;
      }

      .header h2 {
        font-size: 24px;
      }

      .content-card {
        padding: 16px;
        margin-bottom: 16px;
      }

      .card-title {
        font-size: 18px;
        margin-bottom: 16px;
      }

      .filters-form {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .form-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .mobile-row {
        padding: 12px;
      }

      .row-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .gasto-monto {
        font-size: 16px;
      }

      .gasto-details {
        flex-direction: column;
        gap: 8px;
      }

      .row-actions {
        flex-direction: column;
      }

      .btn-action {
        justify-content: center;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        justify-content: center;
      }

      .cuotas-preview {
        flex-direction: column;
        text-align: center;
        gap: 8px;
      }
    }

    @media (max-width: 480px) {
      .page {
        padding: 8px;
      }

      .header h2 {
        font-size: 20px;
      }

      .subtitle {
        font-size: 14px;
      }

      .content-card {
        padding: 12px;
      }

      .card-title {
        font-size: 16px;
      }

      .mobile-row {
        padding: 10px;
      }

      .gasto-descripcion {
        font-size: 14px;
      }

      .gasto-tarjeta {
        font-size: 13px;
      }

      .btn-action {
        padding: 6px 10px;
      }

      .btn-text {
        font-size: 13px;
      }

      .form-input {
        padding: 10px;
        font-size: 13px;
      }

      .btn {
        padding: 10px 16px;
        font-size: 13px;
      }
    }
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
