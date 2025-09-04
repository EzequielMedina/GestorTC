/**
 * Modelo que representa una notificación del sistema.
 */
export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  fecha: string; // Formato ISO 8601
  leida: boolean;
  datos?: any; // Datos adicionales específicos del tipo de notificación
}

/**
 * Tipos de notificaciones disponibles en el sistema.
 */
export enum TipoNotificacion {
  VENCIMIENTO_TARJETA = 'vencimiento_tarjeta',
  LIMITE_EXCEDIDO = 'limite_excedido',
  RECORDATORIO_PAGO = 'recordatorio_pago',
  SISTEMA = 'sistema'
}

/**
 * Configuración de notificaciones del usuario.
 */
export interface ConfiguracionNotificaciones {
  id: string;
  emailHabilitado: boolean;
  pushHabilitado: boolean;
  emailDestino?: string;
  diasAnticipacion: number; // Días antes del vencimiento para notificar
  horaNotificacion: string; // Hora del día para enviar notificaciones (formato HH:mm)
  tiposHabilitados: TipoNotificacion[];
}

/**
 * Datos específicos para notificación de vencimiento de tarjeta.
 */
export interface DatosVencimientoTarjeta {
  tarjetaId: string;
  nombreTarjeta: string;
  banco: string;
  diaVencimiento: number; // Día de pago (vencimiento)
  diaCierre?: number; // Día hasta el cual se puede comprar
  diasHastaVencimiento: number;
  montoAPagar: number;
  montoAdeudado: number;
  porcentajeUso: number;
  ultimosDigitos?: string;
  fechaVencimiento: Date; // Fecha de pago
  fechaCierre?: Date; // Fecha de cierre del período
  cuotasPendientes?: number;
  montoProximoMes?: number;
  gastosRecientes?: number;
  saldoDisponible?: number;
}

/**
 * Resultado del envío de una notificación.
 */
export interface ResultadoNotificacion {
  exito: boolean;
  mensaje: string;
  tipoEnvio: 'email' | 'push' | 'ambos';
  fechaEnvio: string;
  error?: string;
}

/**
 * Template para notificaciones por email.
 */
export interface TemplateEmail {
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto: string;
}

/**
 * Configuración para notificaciones push.
 */
export interface ConfiguracionPush {
  titulo: string;
  cuerpo: string;
  icono?: string;
  badge?: string;
  imagen?: string;
  acciones?: AccionPush[];
  datos?: any;
}

/**
 * Acción disponible en una notificación push.
 */
export interface AccionPush {
  accion: string;
  titulo: string;
  icono?: string;
}