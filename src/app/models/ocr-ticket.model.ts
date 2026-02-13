export interface OcrTicketRaw {
  /**
   * Texto completo reconocido por la librería de OCR.
   */
  text: string;
}

export interface OcrTicketParsed {
  /**
   * Monto total detectado en el ticket (opcional).
   */
  monto?: number;

  /**
   * Fecha del ticket normalizada a formato ISO (YYYY-MM-DD) (opcional).
   */
  fecha?: string;

  /**
   * Descripción o nombre del comercio detectado (opcional).
   */
  descripcion?: string;

  /**
   * Cantidad de cuotas detectada en el ticket (opcional).
   */
  cuotas?: number;
}

export interface OcrTicketResult extends OcrTicketParsed {
  /**
   * Texto crudo completo reconocido por el OCR.
   */
  rawText: string;
}

