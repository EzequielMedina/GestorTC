export interface CompraDolar {
  id?: number;
  mes: number; // 1-12
  anio: number;
  dolares: number; // cantidad de dólares comprados
  precioCompra: number; // precio en pesos por dólar al momento de la compra
  precioCompraTotal: number; // dolares * precioCompra
  precioAPI?: number; // precio actual según API
  precioAPITotal?: number; // dolares * precioAPI
  diferencia?: number; // precioAPITotal - precioCompraTotal
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

export interface ResumenCompraDolar {
  totalDolares: number;
  totalPesosCompra: number;
  totalPesosAPI: number;
  variacionTotal: number;
}

export interface DolarAPI {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}