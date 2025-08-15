/**
 * Modelo que representa una tarjeta de crédito en el sistema.
 * @property id - Identificador único de la tarjeta (generado con UUID).
 * @property nombre - Nombre descriptivo de la tarjeta (ej: "Visa Oro", "Amex Platinum").
 * @property banco - Nombre del banco emisor de la tarjeta.
 * @property limite - Límite de crédito de la tarjeta.
 * @property diaCierre - Día del mes en que cierra el período de facturación.
 * @property diaVencimiento - Día del mes en que vence el pago de la tarjeta.
 * @property ultimosDigitos - (Opcional) Últimos 4 dígitos de la tarjeta para identificación.
 */
export interface Tarjeta {
  id: string;
  nombre: string;
  banco: string;
  limite: number;
  diaCierre: number;
  diaVencimiento: number;
  ultimosDigitos?: string;
}
