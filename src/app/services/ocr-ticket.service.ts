import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OcrTicketResult } from '../models/ocr-ticket.model';
import { OcrTicketParser } from './ocr/ocr-ticket.parser';

/**
 * Fachada sobre la librería de OCR (Tesseract.js) que expone una API simple
 * para la UI y delega el parsing a una clase pura.
 */
@Injectable({
  providedIn: 'root'
})
export class OcrTicketService {
  private parser = new OcrTicketParser();

  /**
   * Procesa una imagen de ticket y devuelve un resultado con texto crudo y
   * campos sugeridos (monto, fecha, descripción).
   */
  procesarImagen(file: File | Blob): Observable<OcrTicketResult> {
    return from(this.runTesseract(file)).pipe(
      map((texto) => {
        const parsed = this.parser.parse(texto);
        return { ...parsed, rawText: texto };
      }),
      catchError((error) => {
        console.error('Error al procesar OCR de ticket', error);
        throw new Error('OCR_FAILED');
      })
    );
  }

  /**
   * Ejecuta Tesseract.js en un import dinámico para evitar cargarlo
   * en el bundle inicial.
   */
  private async runTesseract(file: File | Blob): Promise<string> {
    const { createWorker } = await import('tesseract.js');

    // v5: el idioma se pasa a createWorker; loadLanguage e initialize están deprecados (ya vienen pre-cargados).
    const worker = await createWorker('spa');

    try {
      const image = await this.toDataUrl(file);
      const {
        data: { text }
      } = await worker.recognize(image);

      return text ?? '';
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Convierte el archivo de imagen a data URL para ser consumido por Tesseract.
   */
  private toDataUrl(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}

