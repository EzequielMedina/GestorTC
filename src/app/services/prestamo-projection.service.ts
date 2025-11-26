import { Injectable } from '@angular/core';
import { Prestamo, Entrega } from '../models/prestamo.model';

export interface PaymentProjection {
    month: number;
    date: string;
    payment: number;
    remainingBalance: number;
    totalPaid: number;
}

export interface ProjectionScenario {
    name: string;
    monthlyPayment: number;
    projections: PaymentProjection[];
    completionDate: string;
    totalMonths: number;
    totalInterest?: number;
}

@Injectable({
    providedIn: 'root'
})
export class PrestamoProjectionService {

    constructor() { }

    /**
     * Calcula el total pagado hasta el momento
     */
    calculateTotalPaid(entregas: Entrega[]): number {
        return entregas.reduce((total, entrega) => total + entrega.monto, 0);
    }

    /**
     * Calcula el saldo restante
     */
    calculateRemainingBalance(montoPrestado: number, entregas: Entrega[]): number {
        const totalPaid = this.calculateTotalPaid(entregas);
        return montoPrestado - totalPaid;
    }

    /**
     * Genera proyecciones de pago basadas en un monto mensual
     */
    generateProjection(
        prestamo: Prestamo,
        monthlyPayment: number,
        startDate?: Date
    ): PaymentProjection[] {
        const projections: PaymentProjection[] = [];
        const totalPaid = this.calculateTotalPaid(prestamo.entregas);
        let remainingBalance = prestamo.montoPrestado - totalPaid;

        const currentDate = startDate || new Date();
        let month = 0;

        while (remainingBalance > 0 && month < 360) { // Límite de 30 años
            month++;
            const projectionDate = new Date(currentDate);
            projectionDate.setMonth(projectionDate.getMonth() + month);

            const payment = Math.min(monthlyPayment, remainingBalance);
            remainingBalance -= payment;

            projections.push({
                month,
                date: projectionDate.toISOString().split('T')[0],
                payment,
                remainingBalance: Math.max(0, remainingBalance),
                totalPaid: totalPaid + (monthlyPayment * month) - remainingBalance
            });
        }

        return projections;
    }

    /**
     * Genera múltiples escenarios de pago
     */
    generateScenarios(prestamo: Prestamo): ProjectionScenario[] {
        const remainingBalance = this.calculateRemainingBalance(
            prestamo.montoPrestado,
            prestamo.entregas
        );

        const scenarios: ProjectionScenario[] = [];

        // Escenario 1: Pago mínimo (12 meses)
        const minimumMonthly = remainingBalance / 12;
        scenarios.push({
            name: 'Pago en 12 meses',
            monthlyPayment: Math.ceil(minimumMonthly),
            projections: this.generateProjection(prestamo, Math.ceil(minimumMonthly)),
            completionDate: this.getCompletionDate(12),
            totalMonths: 12
        });

        // Escenario 2: Pago moderado (6 meses)
        const moderateMonthly = remainingBalance / 6;
        scenarios.push({
            name: 'Pago en 6 meses',
            monthlyPayment: Math.ceil(moderateMonthly),
            projections: this.generateProjection(prestamo, Math.ceil(moderateMonthly)),
            completionDate: this.getCompletionDate(6),
            totalMonths: 6
        });

        // Escenario 3: Pago acelerado (3 meses)
        const acceleratedMonthly = remainingBalance / 3;
        scenarios.push({
            name: 'Pago en 3 meses',
            monthlyPayment: Math.ceil(acceleratedMonthly),
            projections: this.generateProjection(prestamo, Math.ceil(acceleratedMonthly)),
            completionDate: this.getCompletionDate(3),
            totalMonths: 3
        });

        return scenarios;
    }

    /**
     * Calcula la fecha de finalización basada en meses
     */
    private getCompletionDate(months: number): string {
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        return date.toISOString().split('T')[0];
    }

    /**
     * Calcula el progreso de pago como porcentaje
     */
    calculatePaymentProgress(prestamo: Prestamo): number {
        const totalPaid = this.calculateTotalPaid(prestamo.entregas);
        return (totalPaid / prestamo.montoPrestado) * 100;
    }

    /**
     * Obtiene estadísticas del préstamo
     */
    getStatistics(prestamo: Prestamo) {
        const totalPaid = this.calculateTotalPaid(prestamo.entregas);
        const remainingBalance = prestamo.montoPrestado - totalPaid;
        const progress = this.calculatePaymentProgress(prestamo);

        // Calcular promedio de pagos
        const averagePayment = prestamo.entregas.length > 0
            ? totalPaid / prestamo.entregas.length
            : 0;

        // Estimar meses restantes con el promedio actual
        const estimatedMonthsRemaining = averagePayment > 0
            ? Math.ceil(remainingBalance / averagePayment)
            : 0;

        return {
            totalPaid,
            remainingBalance,
            progress,
            averagePayment,
            estimatedMonthsRemaining,
            totalPayments: prestamo.entregas.length,
            lastPaymentDate: prestamo.entregas.length > 0
                ? prestamo.entregas[prestamo.entregas.length - 1].fecha
                : null
        };
    }

    /**
     * Genera datos para gráfico de progreso
     */
    generateProgressChartData(prestamo: Prestamo) {
        const totalPaid = this.calculateTotalPaid(prestamo.entregas);
        const remainingBalance = prestamo.montoPrestado - totalPaid;

        return {
            labels: ['Pagado', 'Restante'],
            datasets: [{
                data: [totalPaid, remainingBalance],
                backgroundColor: ['#4caf50', '#f44336'],
                borderWidth: 0
            }]
        };
    }

    /**
     * Genera datos para gráfico de línea de tiempo de pagos
     */
    generatePaymentTimelineData(prestamo: Prestamo) {
        const sortedEntregas = [...prestamo.entregas].sort((a, b) =>
            new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

        let accumulated = 0;
        const labels: string[] = [];
        const data: number[] = [];

        sortedEntregas.forEach(entrega => {
            accumulated += entrega.monto;
            labels.push(new Date(entrega.fecha).toLocaleDateString('es-ES', {
                month: 'short',
                year: 'numeric'
            }));
            data.push(accumulated);
        });

        return {
            labels,
            datasets: [{
                label: 'Total Pagado',
                data,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
    }

    /**
     * Genera datos para gráfico de proyección
     */
    generateProjectionChartData(projections: PaymentProjection[]) {
        const labels = projections.map(p => `Mes ${p.month}`);
        const remainingData = projections.map(p => p.remainingBalance);
        const paidData = projections.map(p => p.totalPaid);

        return {
            labels,
            datasets: [
                {
                    label: 'Saldo Restante',
                    data: remainingData,
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Total Pagado',
                    data: paidData,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    }
}
