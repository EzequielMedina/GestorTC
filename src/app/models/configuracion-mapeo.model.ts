/**
 * Modelo de configuración de mapeo de columnas
 */
export interface ConfiguracionMapeo {
  id: string;
  nombre: string;
  fechaCreacion: string;
  fechaActualizacion?: string;
  
  // Mapeo de columnas
  mapeoColumnas: {
    fecha: string;            // Nombre de columna en archivo
    descripcion: string;
    monto: string;
    categoria?: string;
    tarjeta?: string;
    notas?: string;
  };
  
  // Opciones
  tarjetaPorDefecto?: string; // ID de tarjeta
  detectarCategorias: boolean;
  crearCategoriasNuevas: boolean;
  
  // Reglas de categorización
  reglasCategorizacion: ReglaCategorizacion[];
}

/**
 * Regla de categorización
 */
export interface ReglaCategorizacion {
  patron: string;             // Regex o texto a buscar
  categoriaId: string;        // ID de categoría a asignar
  prioridad: number;          // Prioridad (mayor = primero)
}

/**
 * Plantilla de extracción para proveedor de servicios
 */
export interface PlantillaExtraccion {
  proveedor: string;
  patrones: {
    fecha?: RegExp | string;
    monto?: RegExp | string;
    numeroFactura?: RegExp | string;
    periodo?: RegExp | string;
    descripcion?: RegExp | string;
  };
  posicionCampos?: {
    fecha?: string;
    monto?: string;
    numeroFactura?: string;
  };
}

