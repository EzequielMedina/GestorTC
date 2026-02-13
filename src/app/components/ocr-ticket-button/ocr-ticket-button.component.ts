import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OcrTicketResult } from '../../models/ocr-ticket.model';
import { OcrTicketService } from '../../services/ocr-ticket.service';

@Component({
  selector: 'app-ocr-ticket-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button
      mat-stroked-button
      color="primary"
      type="button"
      (click)="fileInput.click()"
      [disabled]="procesando"
    >
      <mat-icon>photo_camera</mat-icon>
      {{ procesando ? 'Leyendo ticket…' : 'Escanear ticket' }}
    </button>

    <input
      #fileInput
      type="file"
      accept="image/*"
      capture="environment"
      hidden
      (change)="onFileSelected($event)"
    />
  `
})
export class OcrTicketButtonComponent {
  @Output() ocrCompletado = new EventEmitter<OcrTicketResult>();
  @Output() ocrError = new EventEmitter<void>();

  procesando = false;

  constructor(private ocrService: OcrTicketService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.procesando = true;

    this.ocrService.procesarImagen(file).subscribe({
      next: (resultado) => {
        this.procesando = false;
        this.ocrCompletado.emit(resultado);
      },
      error: () => {
        this.procesando = false;
        this.ocrError.emit();
      }
    });
  }
}

