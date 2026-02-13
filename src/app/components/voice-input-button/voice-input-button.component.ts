import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { Tarjeta } from '../../models/tarjeta.model';
import { VoiceGastoParsed } from '../../models/voice-gasto.model';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { VoiceGastoParser } from '../../services/voice/voice-gasto.parser';

@Component({
  selector: 'app-voice-input-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    @if (!supported) {
      <span class="voice-not-supported" aria-live="polite">
        Tu navegador no soporta reconocimiento de voz.
      </span>
    } @else {
      <button
        mat-stroked-button
        color="primary"
        type="button"
        (click)="onClick()"
        [matTooltip]="escuchando ? 'Pulsá de nuevo cuando termines de hablar' : 'Pulsá para empezar a hablar'"
      >
        <mat-icon [class.voice-listening]="escuchando">mic</mat-icon>
        {{ escuchando ? 'Escuchando… Pulsá para terminar' : 'Registrar por voz' }}
      </button>
    }
  `,
  styles: [
    `
      .voice-not-supported {
        font-size: 0.875rem;
        color: var(--text-secondary, #666);
      }
      .voice-listening {
        animation: pulse 1s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `
  ]
})
export class VoiceInputButtonComponent implements OnDestroy {
  @Input() tarjetas: Tarjeta[] = [];

  @Output() vozCompletado = new EventEmitter<VoiceGastoParsed>();
  /** Emitido cuando falla el reconocimiento; payload opcional con código (no-speech, not-allowed, network, etc.) */
  @Output() vozError = new EventEmitter<{ code?: string } | void>();

  escuchando = false;
  supported = false;

  private parser = new VoiceGastoParser();
  private sub: Subscription | null = null;

  constructor(private speechService: SpeechRecognitionService) {
    this.supported = this.speechService.isSupported();
  }

  onClick(): void {
    if (!this.supported) return;

    // Segundo clic: terminar de escuchar
    if (this.escuchando) {
      console.log('[Voz] Usuario pulsó para terminar');
      this.speechService.stopListening();
      return;
    }

    // Primer clic: empezar a escuchar
    console.log('[Voz] Botón pulsado, iniciando escucha...');
    this.escuchando = true;
    const tarjetasRef = this.tarjetas.map((t) => ({ id: t.id, nombre: t.nombre }));

    let recibidoResultado = false;
    this.sub = this.speechService
      .listen(this.speechService.getDefaultLang())
      .subscribe({
        next: (texto) => {
          recibidoResultado = true;
          console.log('[Voz] Texto reconocido:', texto);
          const parsed = this.parser.parse(texto, tarjetasRef);
          this.escuchando = false;
          this.vozCompletado.emit(parsed);
        },
        error: (err: Error & { code?: string }) => {
          this.escuchando = false;
          console.warn('[Voz] Error en componente:', err?.code, err?.message);
          this.vozError.emit(err?.code ? { code: err.code } : undefined);
        },
        complete: () => {
          if (this.escuchando) {
            this.escuchando = false;
            if (!recibidoResultado) {
              console.warn('[Voz] Complete sin resultado → emitiendo no-speech');
              this.vozError.emit({ code: 'no-speech' });
            }
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
