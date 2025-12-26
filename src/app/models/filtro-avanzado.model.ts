/**
 * Modelo de filtro avanzado para gastos
 */
export interface FiltroAvanzado {
  // Filtros de tarjetas
  todasLasTarjetas: boolean;
  tarjetasIds: string[];

  // Filtros de categorías
  todasLasCategorias: boolean;
  categoriasIds: string[];

  // Filtro por rango de fechas
  rangoFechas?: {
    desde: string; // YYYY-MM-DD
    hasta: string; // YYYY-MM-DD
  };

  // Filtro por meses (formato: YYYY-MM)
  meses?: string[];

  // Filtros de monto
  montoMinimo?: number;
  montoMaximo?: number;

  // Filtros de tipo (compartido/personal)
  incluirCompartidos: boolean;
  incluirPersonales: boolean;
  soloCompartidos: boolean;
  soloPersonales: boolean;

  // Filtros de cuotas
  soloConCuotas: boolean;
  soloSinCuotas: boolean;

  // Búsqueda de texto
  textoBusqueda?: string;
}

/**
 * Filtro guardado con metadatos
 */
export interface FiltroGuardado {
  id: string;
  nombre: string;
  filtro: FiltroAvanzado;
  fechaCreacion: string;
  fechaUltimoUso?: string;
  vecesUsado: number;
}

/**
 * Filtro por defecto (sin filtros aplicados)
 */
export const FILTRO_POR_DEFECTO: FiltroAvanzado = {
  todasLasTarjetas: true,
  tarjetasIds: [],
  todasLasCategorias: true,
  categoriasIds: [],
  rangoFechas: undefined,
  meses: undefined,
  montoMinimo: undefined,
  montoMaximo: undefined,
  incluirCompartidos: true,
  incluirPersonales: true,
  soloCompartidos: false,
  soloPersonales: false,
  soloConCuotas: false,
  soloSinCuotas: false,
  textoBusqueda: undefined
};

