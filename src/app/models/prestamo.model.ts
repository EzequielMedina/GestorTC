export interface Entrega {
    id: string;
    fecha: string; // ISO string YYYY-MM-DD
    monto: number;
    tipo: 'PARCIAL' | 'MENSUAL';
    nota?: string;
}

export interface Prestamo {
    id: string;
    prestamista: string;
    montoPrestado: number;
    moneda: 'ARS' | 'USD'; // Moneda del préstamo
    fechaPrestamo: string; // ISO string YYYY-MM-DD
    entregas: Entrega[];
    estado: 'ACTIVO' | 'CANCELADO' | 'FINALIZADO';
    notas?: string;

    // Campos calculados (opcionales en el modelo base, pero útiles para la UI)
    totalPagado?: number;
    restante?: number;
}
