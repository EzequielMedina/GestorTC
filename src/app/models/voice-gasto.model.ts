/**
 * Resultado del parsing de una frase de voz para registrar un gasto.
 * Ej: "Gasté 5000 en supermercado con Visa" → monto, descripcion, tarjetaId.
 */
export interface VoiceGastoParsed {
  /**
   * Monto extraído de la frase (opcional si el parsing no lo detectó).
   */
  monto?: number;

  /**
   * Descripción del gasto. Siempre presente; si el parsing falla puede ser el texto completo.
   */
  descripcion: string;

  /**
   * ID de la tarjeta si se mencionó y hubo match unívoco con las tarjetas del usuario.
   */
  tarjetaId?: string;

  /**
   * Cantidad de cuotas si se mencionó (ej. "en 3 cuotas", "a 6 cuotas").
   */
  cantidadCuotas?: number;

  /**
   * Fecha del gasto en ISO (YYYY-MM-DD) si se mencionó (ej. "hoy", "ayer", "el 15 de enero").
   */
  fecha?: string;

  /**
   * Texto crudo reconocido por el reconocimiento de voz (opcional).
   */
  rawText?: string;
}
