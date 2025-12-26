/**
 * Tipos de alertas disponibles en el sistema
 */
export type TipoAlerta = 
  | 'TARJETA_VENCIMIENTO_PROXIMO'
  | 'TARJETA_LIMITE_ALCANZADO'
  | 'PRESTAMO_PAGO_PENDIENTE'
  | 'DOLAR_CAMBIO_SIGNIFICATIVO'
  | 'CUOTA_VENCIMIENTO_PROXIMO';

/**
 * Prioridad de la alerta
 */
export type PrioridadAlerta = 'alta' | 'media' | 'baja';

/**
 * Modelo que representa una alerta del sistema
 * @property id - Identificador único de la alerta
 * @property tipo - Tipo de alerta
 * @property titulo - Título de la alerta
 * @property mensaje - Mensaje descriptivo
 * @property prioridad - Prioridad de la alerta
 * @property fechaCreacion - Fecha de creación de la alerta
 * @property fechaVencimiento - Fecha de vencimiento (opcional)
 * @property vista - Indica si la alerta ha sido vista
 * @property datosAdicionales - Datos adicionales específicos del tipo de alerta
 */
export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  mensaje: string;
  prioridad: PrioridadAlerta;
  fechaCreacion: string; // ISO string
  fechaVencimiento?: string; // ISO string
  vista: boolean;
  datosAdicionales?: {
    tarjetaId?: string;
    tarjetaNombre?: string;
    prestamoId?: string;
    cuotaId?: string;
    gastoId?: string;
    porcentajeUso?: number;
    diasRestantes?: number;
    monto?: number;
    [key: string]: any;
  };
}

