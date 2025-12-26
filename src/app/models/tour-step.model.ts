/**
 * Modelo que representa un paso del tour guiado
 */
export interface TourStep {
  id: string;
  titulo: string;
  descripcion: string;
  selector?: string; // Selector CSS del elemento a destacar
  posicion?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  ruta?: string; // Ruta a navegar antes de mostrar este paso
  accion?: () => void; // Acción a ejecutar antes de mostrar el paso
  orden: number;
}

/**
 * Configuración del tour
 */
export interface TourConfig {
  id: string;
  nombre: string;
  descripcion: string;
  pasos: TourStep[];
  activo: boolean;
}

