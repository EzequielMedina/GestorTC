/**
 * Modelo que representa una etiqueta
 */
export interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  fechaCreacion: string; // ISO string
}

/**
 * Modelo que representa una nota asociada a un gasto
 */
export interface Nota {
  id: string;
  gastoId: string;
  contenido: string;
  fechaCreacion: string; // ISO string
  fechaActualizacion: string; // ISO string
}

