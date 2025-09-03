import { DatosVencimientoTarjeta } from '../models/notificacion.model';

/**
 * Template para emails de notificación de vencimiento de tarjetas
 */
export class EmailVencimientoTemplate {

  /**
   * Genera el HTML del email de vencimiento
   */
  static generarHTML(datos: DatosVencimientoTarjeta): string {
    const fechaFormateada = this.formatearFecha(datos.fechaVencimiento);
    const montoFormateado = this.formatearMonto(datos.montoAdeudado);
    const porcentajeFormateado = datos.porcentajeUso.toFixed(1);
    const saldoFormateado = datos.saldoDisponible ? this.formatearMonto(datos.saldoDisponible) : 'No disponible';
    
    const urgencia = this.determinarUrgencia(datos.diasHastaVencimiento);
    const colorUrgencia = this.obtenerColorUrgencia(urgencia);
    const iconoUrgencia = this.obtenerIconoUrgencia(urgencia);
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Vencimiento - ${datos.nombreTarjeta}</title>
    <style>
        ${this.obtenerEstilosCSS()}
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <h1>💳 Gestor TC</h1>
            </div>
            <div class="urgencia ${urgencia}">
                <span class="icono">${iconoUrgencia}</span>
                <span class="texto">${this.obtenerTextoUrgencia(urgencia)}</span>
            </div>
        </div>

        <!-- Contenido Principal -->
        <div class="contenido">
            <div class="titulo">
                <h2>Recordatorio de Vencimiento</h2>
                <p class="subtitulo">Tu tarjeta ${datos.nombreTarjeta} ${this.obtenerMensajeVencimiento(datos.diasHastaVencimiento)}</p>
            </div>

            <!-- Información de la Tarjeta -->
            <div class="tarjeta-info">
                <div class="tarjeta-header">
                    <h3>${datos.nombreTarjeta}</h3>
                    <div class="dias-restantes" style="background-color: ${colorUrgencia}">
                        ${datos.diasHastaVencimiento === 0 ? 'HOY' : `${datos.diasHastaVencimiento} días`}
                    </div>
                </div>
                
                <div class="detalles-grid">
                    <div class="detalle-item">
                        <span class="label">Fecha de Vencimiento:</span>
                        <span class="valor fecha">${fechaFormateada}</span>
                    </div>
                    
                    <div class="detalle-item destacado">
                        <span class="label">Monto a Pagar:</span>
                        <span class="valor monto">${montoFormateado}</span>
                    </div>
                    
                    <div class="detalle-item">
                        <span class="label">Uso de Límite:</span>
                        <span class="valor">${porcentajeFormateado}%</span>
                        <div class="barra-progreso">
                            <div class="progreso" style="width: ${Math.min(100, datos.porcentajeUso)}%"></div>
                        </div>
                    </div>
                    
                    <div class="detalle-item">
                        <span class="label">Saldo Disponible:</span>
                        <span class="valor">${saldoFormateado}</span>
                    </div>
                </div>
            </div>

            <!-- Información Adicional -->
            ${this.generarSeccionAdicional(datos)}

            <!-- Acciones -->
            <div class="acciones">
                <div class="accion-principal">
                    <h4>💡 Recordatorios Importantes:</h4>
                    <ul>
                        <li>Asegúrate de tener fondos suficientes en tu cuenta</li>
                        <li>Puedes pagar antes del vencimiento para evitar intereses</li>
                        <li>Revisa tu estado de cuenta para confirmar el monto exacto</li>
                        ${datos.cuotasPendientes && datos.cuotasPendientes > 0 ? `<li>Tienes ${datos.cuotasPendientes} cuotas pendientes para el próximo mes</li>` : ''}
                    </ul>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Este es un recordatorio automático generado por Gestor TC</p>
            <p>Para modificar tus preferencias de notificación, accede a la configuración en la aplicación</p>
            <div class="fecha-envio">
                Enviado el ${this.formatearFechaCompleta(new Date())}
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Genera el texto plano del email (fallback)
   */
  static generarTextoPlano(datos: DatosVencimientoTarjeta): string {
    const fechaFormateada = this.formatearFecha(datos.fechaVencimiento);
    const montoFormateado = this.formatearMonto(datos.montoAdeudado);
    const urgencia = this.determinarUrgencia(datos.diasHastaVencimiento);
    
    return `
🔔 RECORDATORIO DE VENCIMIENTO - GESTOR TC

${this.obtenerTextoUrgencia(urgencia).toUpperCase()}

Tarjeta: ${datos.nombreTarjeta}
Fecha de Vencimiento: ${fechaFormateada}
Monto a Pagar: ${montoFormateado}
Días Restantes: ${datos.diasHastaVencimiento === 0 ? 'HOY' : `${datos.diasHastaVencimiento} días`}

Uso de Límite: ${datos.porcentajeUso.toFixed(1)}%
Saldo Disponible: ${datos.saldoDisponible ? this.formatearMonto(datos.saldoDisponible) : 'No disponible'}

💡 RECORDATORIOS IMPORTANTES:
• Asegúrate de tener fondos suficientes en tu cuenta
• Puedes pagar antes del vencimiento para evitar intereses
• Revisa tu estado de cuenta para confirmar el monto exacto
${datos.cuotasPendientes && datos.cuotasPendientes > 0 ? `• Tienes ${datos.cuotasPendientes} cuotas pendientes para el próximo mes` : ''}

---
Este es un recordatorio automático generado por Gestor TC
Enviado el ${this.formatearFechaCompleta(new Date())}
    `;
  }

  /**
   * Obtiene los estilos CSS para el email
   */
  private static obtenerEstilosCSS(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .logo h1 {
            font-size: 24px;
            font-weight: 700;
        }
        
        .urgencia {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
        }
        
        .urgencia.alta {
            background-color: rgba(239, 68, 68, 0.2);
            border: 2px solid #ef4444;
        }
        
        .urgencia.media {
            background-color: rgba(245, 158, 11, 0.2);
            border: 2px solid #f59e0b;
        }
        
        .urgencia.baja {
            background-color: rgba(34, 197, 94, 0.2);
            border: 2px solid #22c55e;
        }
        
        .contenido {
            padding: 30px 20px;
        }
        
        .titulo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .titulo h2 {
            font-size: 28px;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .subtitulo {
            font-size: 16px;
            color: #6b7280;
        }
        
        .tarjeta-info {
            background-color: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            border: 1px solid #e5e7eb;
        }
        
        .tarjeta-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .tarjeta-header h3 {
            font-size: 20px;
            color: #1f2937;
        }
        
        .dias-restantes {
            padding: 8px 16px;
            border-radius: 20px;
            color: white;
            font-weight: 700;
            font-size: 14px;
            text-align: center;
            min-width: 80px;
        }
        
        .detalles-grid {
            display: grid;
            gap: 15px;
        }
        
        .detalle-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .detalle-item:last-child {
            border-bottom: none;
        }
        
        .detalle-item.destacado {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #fbbf24;
            margin: 10px 0;
        }
        
        .label {
            font-weight: 600;
            color: #374151;
        }
        
        .valor {
            font-weight: 700;
            color: #1f2937;
        }
        
        .valor.monto {
            font-size: 18px;
            color: #059669;
        }
        
        .valor.fecha {
            color: #7c3aed;
        }
        
        .barra-progreso {
            width: 100px;
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-left: 10px;
        }
        
        .progreso {
            height: 100%;
            background: linear-gradient(90deg, #22c55e 0%, #f59e0b 70%, #ef4444 100%);
            transition: width 0.3s ease;
        }
        
        .acciones {
            background-color: #eff6ff;
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid #3b82f6;
        }
        
        .accion-principal h4 {
            color: #1e40af;
            margin-bottom: 15px;
            font-size: 16px;
        }
        
        .accion-principal ul {
            list-style: none;
            padding-left: 0;
        }
        
        .accion-principal li {
            padding: 5px 0;
            padding-left: 20px;
            position: relative;
        }
        
        .accion-principal li:before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #059669;
            font-weight: bold;
        }
        
        .footer {
            background-color: #f3f4f6;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .fecha-envio {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 10px;
        }
        
        .seccion-adicional {
            background-color: #f0f9ff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #0ea5e9;
        }
        
        .seccion-adicional h4 {
            color: #0c4a6e;
            margin-bottom: 10px;
        }
        
        .info-adicional {
            display: grid;
            gap: 8px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        
        .info-label {
            color: #374151;
        }
        
        .info-valor {
            font-weight: 600;
            color: #1f2937;
        }
        
        /* Responsive Design */
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                box-shadow: none;
            }
            
            .header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .tarjeta-header {
                flex-direction: column;
                text-align: center;
            }
            
            .detalle-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
            
            .barra-progreso {
                margin-left: 0;
                margin-top: 5px;
                width: 100%;
            }
            
            .titulo h2 {
                font-size: 24px;
            }
            
            .contenido {
                padding: 20px 15px;
            }
        }
    `;
  }

  /**
   * Genera la sección adicional con información extra
   */
  private static generarSeccionAdicional(datos: DatosVencimientoTarjeta): string {
    if (datos.gastosRecientes === 0 && datos.cuotasPendientes === 0) {
      return '';
    }

    return `
            <div class="seccion-adicional">
                <h4>📊 Información Adicional</h4>
                <div class="info-adicional">
                    ${datos.gastosRecientes && datos.gastosRecientes > 0 ? `
                    <div class="info-item">
                        <span class="info-label">Gastos recientes (30 días):</span>
                        <span class="info-valor">${datos.gastosRecientes}</span>
                    </div>
                    ` : ''}
                    
                    ${datos.cuotasPendientes && datos.cuotasPendientes > 0 ? `
                    <div class="info-item">
                        <span class="info-label">Cuotas próximo mes:</span>
                        <span class="info-valor">${datos.cuotasPendientes}</span>
                    </div>
                    ` : ''}
                    
                    ${datos.montoProximoMes && datos.montoProximoMes > 0 ? `
                    <div class="info-item">
                        <span class="info-label">Estimado próximo mes:</span>
                        <span class="info-valor">${this.formatearMonto(datos.montoProximoMes!)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
    `;
  }

  // Métodos auxiliares
  private static determinarUrgencia(dias: number): 'alta' | 'media' | 'baja' {
    if (dias === 0) return 'alta';
    if (dias <= 1) return 'alta';
    if (dias <= 3) return 'media';
    return 'baja';
  }

  private static obtenerColorUrgencia(urgencia: 'alta' | 'media' | 'baja'): string {
    switch (urgencia) {
      case 'alta': return '#ef4444';
      case 'media': return '#f59e0b';
      case 'baja': return '#22c55e';
    }
  }

  private static obtenerIconoUrgencia(urgencia: 'alta' | 'media' | 'baja'): string {
    switch (urgencia) {
      case 'alta': return '🚨';
      case 'media': return '⚠️';
      case 'baja': return '📅';
    }
  }

  private static obtenerTextoUrgencia(urgencia: 'alta' | 'media' | 'baja'): string {
    switch (urgencia) {
      case 'alta': return 'Urgente';
      case 'media': return 'Próximo';
      case 'baja': return 'Recordatorio';
    }
  }

  private static obtenerMensajeVencimiento(dias: number): string {
    if (dias === 0) return 'vence HOY';
    if (dias === 1) return 'vence MAÑANA';
    return `vence en ${dias} días`;
  }

  private static formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(monto);
  }

  private static formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(fecha);
  }

  private static formatearFechaCompleta(fecha: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(fecha);
  }
}