export interface VentaDolar {
  id?: number;
  mes: number; // 1-12
  anio: number;
  dolares: number; // cantidad de dólares vendidos
  precioVenta: number; // precio en pesos por dólar al momento de la venta
  precioVentaTotal: number; // dolares * precioVenta
  precioCompraPromedio: number; // precio promedio de compra de los dólares vendidos
  ganancia: number; // ganancia en pesos
  porcentajeGanancia: number; // porcentaje de ganancia
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

export interface ResumenVentaDolar {
  totalDolaresVendidos: number;
  totalPesosVenta: number;
  totalGanancia: number;
  porcentajeGananciaPromedio: number;
}

export interface BalanceDolar {
  dolaresDisponibles: number;
  dolaresVendidos: number;
  valorTotalCompra: number;
  valorTotalVenta: number;
  gananciaTotal: number;
  porcentajeGananciaTotal: number;
  precioCompraPromedio: number;
  valorActualDisponibles: number;
}

export interface TransaccionDolar {
  id?: number;
  tipo: 'compra' | 'venta';
  dolares: number;
  precio: number;
  total: number;
  fecha: Date;
  mes: number;
  anio: number;
  ganancia?: number;
  porcentajeGanancia?: number;
  fechaCreacion?: Date;
}

export interface ResumenDolarCompleto {
  balance: BalanceDolar;
  mejorTransaccion?: TransaccionDolar;
  peorTransaccion?: TransaccionDolar;
  tendencia: 'alcista' | 'bajista' | 'estable';
  recomendacion: string;
}