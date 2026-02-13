import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Gasto } from '../../models/gasto.model';
import { Tarjeta } from '../../models/tarjeta.model';
import { CategoriaSelectorComponent } from '../categoria-selector/categoria-selector.component';
import { EtiquetasSelectorComponent } from '../etiquetas-selector/etiquetas-selector.component';
import { NotaService } from '../../services/nota.service';
import { NotificationService } from '../../services/notification.service';
import { OcrTicketResult } from '../../models/ocr-ticket.model';
import { VoiceGastoParsed } from '../../models/voice-gasto.model';
import { OcrTicketButtonComponent } from '../ocr-ticket-button/ocr-ticket-button.component';
import { VoiceInputButtonComponent } from '../voice-input-button/voice-input-button.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gasto-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategoriaSelectorComponent,
    EtiquetasSelectorComponent,
    OcrTicketButtonComponent,
    VoiceInputButtonComponent
  ],
  templateUrl: './gasto-dialog.component.html',
  styleUrls: ['./gasto-dialog.component.css']
})
export class GastoDialogComponent implements OnInit, OnDestroy {
  @Input() gasto: Gasto = {
    id: '',
    tarjetaId: '',
    descripcion: '',
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10)
  };

  @Input() tarjetas: Tarjeta[] = [];
  @Input() esEdicion = false;

  @Output() guardarGasto = new EventEmitter<Gasto>();
  @Output() cancelarDialog = new EventEmitter<void>();

  notaContenido: string = '';
  private subscriptions = new Subscription();

  constructor(
    private notaService: NotaService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Cargar nota existente si estamos editando
    if (this.esEdicion && this.gasto.id) {
      this.subscriptions.add(
        this.notaService.getNotaPorGasto$(this.gasto.id).subscribe(nota => {
          if (nota) {
            this.notaContenido = nota.contenido;
            this.gasto.notaId = nota.id;
          }
        })
      );
    }

    // Inicializar etiquetas si no existen
    if (!this.gasto.etiquetasIds) {
      this.gasto.etiquetasIds = [];
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // helpers UI
  get esConCuotas(): boolean {
    return !!this.gasto.cantidadCuotas && this.gasto.cantidadCuotas > 1;
  }

  private calcularMesDesdeFechaISO(fechaISO: string): string {
    const d = new Date(fechaISO);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  onCantidadCuotasChange(valor: number | null): void {
    // Normalizar a entero >=1 o undefined
    const n = valor ? Math.max(1, Math.floor(+valor)) : undefined;
    this.gasto.cantidadCuotas = n;
    if (this.esConCuotas) {
      // Si hay cuotas y no hay primer mes seleccionado, proponer por defecto el mes de la fecha
      if (!this.gasto.primerMesCuota && this.gasto.fecha) {
        this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
      }
    } else {
      // sin cuotas limpiamos campos relacionados
      this.gasto.primerMesCuota = undefined;
      this.gasto.montoPorCuota = undefined;
    }
  }

  onFechaChange(nuevaFechaISO: string): void {
    this.gasto.fecha = nuevaFechaISO;
    if (this.esConCuotas && !this.gasto.primerMesCuota) {
      this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
    }
  }

  onCategoriaChange(categoriaId: string | undefined): void {
    this.gasto.categoriaId = categoriaId;
  }

  onEtiquetasChange(etiquetasIds: string[]): void {
    this.gasto.etiquetasIds = etiquetasIds;
  }

  onOcrCompletado(resultado: OcrTicketResult): void {
    if (resultado.descripcion && !this.gasto.descripcion) {
      this.gasto.descripcion = resultado.descripcion;
    }
    if (resultado.monto && (!this.gasto.monto || this.gasto.monto <= 0)) {
      this.gasto.monto = resultado.monto;
    }
    if (resultado.fecha && !this.gasto.fecha) {
      this.gasto.fecha = resultado.fecha;
    }

    if (resultado.cuotas && (!this.gasto.cantidadCuotas || this.gasto.cantidadCuotas <= 1)) {
      this.gasto.cantidadCuotas = resultado.cuotas;
      this.onCantidadCuotasChange(this.gasto.cantidadCuotas);
    }
  }

  onOcrError(): void {
    this.notificationService.warning(
      'No pudimos leer el ticket. Podés ingresar los datos manualmente.'
    );
  }

  onVozCompletado(resultado: VoiceGastoParsed): void {
    // Asignar cada campo al que corresponde en el formulario (descripción, monto, tarjeta, fecha, cuotas)
    if (resultado.monto != null && resultado.monto > 0) {
      this.gasto.monto = resultado.monto;
    }
    if (resultado.descripcion != null && resultado.descripcion.trim() !== '') {
      this.gasto.descripcion = resultado.descripcion.trim();
    }
    if (resultado.tarjetaId) {
      this.gasto.tarjetaId = resultado.tarjetaId;
    }
    if (resultado.fecha) {
      this.gasto.fecha = resultado.fecha;
      this.onFechaChange(resultado.fecha);
    }
    if (resultado.cantidadCuotas != null && resultado.cantidadCuotas >= 1) {
      this.gasto.cantidadCuotas = resultado.cantidadCuotas;
      this.onCantidadCuotasChange(resultado.cantidadCuotas);
    }
    this.cdr.detectChanges();
  }

  onVozError(payload?: { code?: string } | void): void {
    const code = (payload && 'code' in payload ? payload.code : undefined) ?? '';
    let mensaje: string;
    switch (code) {
      case 'no-speech':
        mensaje = 'No se detectó voz. Pulsá el botón y hablá enseguida (ej: "Gasté 5000 en supermercado"). Revisá que el micrófono esté permitido.';
        break;
      case 'not-allowed':
      case 'service-not-allowed':
        mensaje = 'Permiso de micrófono denegado. Habilitá el micrófono en el navegador para usar la voz.';
        break;
      case 'network':
        mensaje = 'Error de red: Chrome usa los servidores de Google para la voz y no pudo conectarse. Revisá tu internet, desactivá VPN/proxy si usás, e intentá de nuevo.';
        break;
      case 'audio-capture':
        mensaje = 'No se pudo acceder al micrófono. Comprobá que esté conectado y permitido.';
        break;
      case 'secure-context-required':
        mensaje = 'El reconocimiento de voz solo funciona en HTTPS o en localhost. Abrí la app desde https:// o desde localhost.';
        break;
      case 'not-supported':
        mensaje = 'Tu navegador no soporta reconocimiento de voz. Probá con Chrome o Edge.';
        break;
      case 'aborted':
        return;
      default:
        mensaje = code
          ? `No se pudo reconocer la voz. (Error: ${code}) Hablá después de pulsar el botón, revisá el micrófono e internet.`
          : 'No se pudo reconocer la voz. Hablá después de pulsar el botón, revisá el micrófono e internet.';
    }
    this.notificationService.warning(mensaje);
  }

  guardar(): void {
    if (this.gasto.descripcion && this.gasto.monto > 0 && this.gasto.tarjetaId && this.gasto.fecha) {
      // Normalizar cuotas
      if (!this.esConCuotas) {
        this.gasto.cantidadCuotas = undefined;
        this.gasto.primerMesCuota = undefined;
        this.gasto.montoPorCuota = undefined;
      } else {
        // si hay cuotas pero no se especifica montoPorCuota, calcularlo
        // Asegurar primerMesCuota requerido
        if (!this.gasto.primerMesCuota) {
          // autocompletar por defecto con el mes de la fecha para mejorar UX
          this.gasto.primerMesCuota = this.calcularMesDesdeFechaISO(this.gasto.fecha);
        }
        if (!this.gasto.primerMesCuota) {
          // si por alguna razón sigue vacío, no continuar
          return;
        }

        if (this.gasto.cantidadCuotas) {
          this.gasto.montoPorCuota = parseFloat((this.gasto.monto / this.gasto.cantidadCuotas).toFixed(2));
        }
      }

      // Normalizar compartido
      if (!this.gasto.compartidoCon) {
        this.gasto.compartidoCon = undefined;
        this.gasto.porcentajeCompartido = undefined;
      } else if (this.gasto.compartidoCon && (this.gasto.porcentajeCompartido === undefined || this.gasto.porcentajeCompartido === null)) {
        this.gasto.porcentajeCompartido = 50;
      }

      // Guardar nota si hay contenido
      if (this.notaContenido && this.notaContenido.trim()) {
        const nota = this.notaService.guardarNota(this.gasto.id || '', this.notaContenido);
        this.gasto.notaId = nota.id;
      } else if (this.gasto.notaId) {
        // Eliminar nota si se borró el contenido
        this.notaService.eliminarNota(this.gasto.notaId);
        this.gasto.notaId = undefined;
      }

      this.guardarGasto.emit(this.gasto);
    }
  }

  cancelar(): void {
    this.cancelarDialog.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cancelar();
    }
  }
}
