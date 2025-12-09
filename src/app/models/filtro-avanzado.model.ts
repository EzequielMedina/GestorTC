/**
 * Modelo que representa un filtro avanzado guardado
 */
export interface FiltroGuardado {
  id: string;
  nombre: string;
  filtro: FiltroAvanzado;
  fechaCreacion: string; // ISO string
  fechaUltimoUso?: string; // ISO string
  vecesUsado: number;
}

/**
 * Modelo que representa un filtro avanzado de gastos
 */
export interface FiltroAvanzado {
  // Filtros de tarjeta
  tarjetasIds: string[]; // Múltiples tarjetas
  todasLasTarjetas: boolean; // Si es true, ignora tarjetasIds
  
  // Filtros de fecha
  rangoFechas?: {
    desde: string; // YYYY-MM-DD
    hasta: string; // YYYY-MM-DD
  };
  meses?: string[]; // Array de YYYY-MM
  
  // Filtros de categoría
  categoriasIds: string[]; // Múltiples categorías
  todasLasCategorias: boolean; // Si es true, ignora categoriasIds
  
  // Filtros de monto
  montoMinimo?: number;
  montoMaximo?: number;
  
  // Filtros de tipo
  soloCompartidos?: boolean;
  soloPersonales?: boolean;
  incluirCompartidos: boolean;
  incluirPersonales: boolean;
  
  // Filtros de cuotas
  soloConCuotas?: boolean;
  soloSinCuotas?: boolean;
  cuotasPendientes?: boolean;
  
  // Búsqueda de texto
  textoBusqueda?: string; // Buscar en descripción
}

/**
 * Filtro avanzado por defecto (sin filtros)
 */
export const FILTRO_POR_DEFECTO: FiltroAvanzado = {
  tarjetasIds: [],
  todasLasTarjetas: true,
  categoriasIds: [],
  todasLasCategorias: true,
  incluirCompartidos: true,
  incluirPersonales: true
};

