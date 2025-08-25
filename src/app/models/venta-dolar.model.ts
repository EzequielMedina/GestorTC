export interface VentaDolar {
  id?: number;
  mes: number; // 1-12
  anio: number;
  dolares: number; // cantidad de dólares vendidos
  precioVenta: number; // precio en pesos por dólar al momento de la venta
  precioVentaTotal: number; // dolares * precioVenta
  precioCompraPromedio: number; // precio promedio de compra de los dólares vendidos
  ganancia: number; // (precioVenta - precioCompraPromedio) * dolares
  porcentajeGanancia: number; // (ganancia / (precioCompraPromedio * dolares)) * 100
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

export interface BalanceDolar {
  dolaresDisponibles: number;
  dolaresComprados: number;
  dolaresVendidos: number;
  inversionTotal: number; // total invertido en compras
  recuperado: number; // total recuperado en ventas
  gananciaTotal: number; // recuperado - inversionTotal
  porcentajeGananciaTotal: number;
  precioCompraPromedio: number; // precio promedio ponderado de compra
  valorActualDisponibles: number; // dolaresDisponibles * precioAPI actual
}

export interface TransaccionDolar {
  id?: number;
  tipo: 'compra' | 'venta';
  mes: number;
  anio: number;
  dolares: number;
  precio: number;
  total: number;
  ganancia?: number; // solo para ventas
  porcentajeGanancia?: number; // solo para ventas
  fechaCreacion?: Date;
}

export interface ResumenDolarCompleto {
  balance: BalanceDolar;
  transacciones: TransaccionDolar[];
  mejorOperacion?: TransaccionDolar;
  peorOperacion?: TransaccionDolar;
  rendimientoMensual: { mes: number; anio: number; rendimiento: number }[];
}