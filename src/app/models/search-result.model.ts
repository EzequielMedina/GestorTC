/**
 * Tipos de resultados de búsqueda
 */
export type TipoResultadoBusqueda = 'GASTO' | 'TARJETA' | 'DOLAR' | 'PRESTAMO';

/**
 * Modelo que representa un resultado de búsqueda
 * @property id - Identificador único del resultado
 * @property tipo - Tipo de resultado
 * @property titulo - Título del resultado
 * @property descripcion - Descripción o detalles
 * @property ruta - Ruta de navegación
 * @property datos - Datos adicionales del resultado
 */
export interface ResultadoBusqueda {
  id: string;
  tipo: TipoResultadoBusqueda;
  titulo: string;
  descripcion: string;
  ruta: string;
  datos?: {
    [key: string]: any;
  };
}

