/**
 * Modelo que representa un gasto de servicio importado desde archivo
 */
export interface GastoServicioImportado {
  // Datos del archivo
  fecha: string;              // YYYY-MM-DD o DD/MM/YYYY
  descripcion: string;
  monto: number;
  categoria?: string;         // Nombre de categoría
  tarjeta?: string;           // Nombre de tarjeta
  notas?: string;
  
  // Metadatos de importación
  filaOriginal: number;       // Número de fila en archivo
  errores?: string[];         // Errores de validación
  advertencias?: string[];    // Advertencias
  categoriaId?: string;       // ID de categoría mapeada
  tarjetaId?: string;         // ID de tarjeta mapeada
  excluir?: boolean;          // Si se excluye de importación
  
  // Metadatos específicos de PDF
  esPDF?: boolean;            // Si proviene de PDF
  archivoPDF?: File;          // Archivo PDF original
  paginaPDF?: number;         // Página del PDF (si aplica)
  confianzaExtraccion?: number; // Porcentaje de confianza (0-100)
  textoExtraido?: string;     // Texto completo extraído del PDF
  proveedorDetectado?: string; // Proveedor detectado (EDENOR, etc.)
  camposExtraidos?: {         // Campos específicos extraídos
    fechaVencimiento?: string;
    numeroFactura?: string;
    periodoFacturado?: string;
    consumo?: string;
  };
}

/**
 * Resultado de validación de datos
 */
export interface ValidationResult {
  valido: boolean;
  errores: ValidationError[];
  advertencias: ValidationWarning[];
}

export interface ValidationError {
  fila: number;
  campo: string;
  mensaje: string;
  datos: Partial<GastoServicioImportado>;
}

export interface ValidationWarning {
  fila: number;
  campo: string;
  mensaje: string;
  datos: Partial<GastoServicioImportado>;
}

/**
 * Duplicado detectado
 */
export interface Duplicado {
  fila: number;
  gastoExistente: string;     // ID del gasto existente
  similitud: number;          // Porcentaje de similitud (0-100)
  datos: GastoServicioImportado;
}

