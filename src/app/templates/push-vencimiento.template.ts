import { DatosVencimientoTarjeta } from '../models/notificacion.model';

// Definición de tipos para notificaciones
interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface ExtendedNotificationOptions extends NotificationOptions {
  title?: string;
  image?: string;
  actions?: NotificationAction[];
  vibrate?: number[];
  renotify?: boolean;
  timestamp?: number;
}

/**
 * Template para notificaciones push de vencimiento de tarjetas
 */
export class PushVencimientoTemplate {

  /**
   * Genera la configuración de la notificación push
   */
  static generarNotificacion(datos: DatosVencimientoTarjeta): ExtendedNotificationOptions {
    const urgencia = this.determinarUrgencia(datos.diasHastaVencimiento);
    const titulo = this.generarTitulo(datos);
    const mensaje = this.generarMensaje(datos);
    const icono = this.obtenerIcono(urgencia);
    const badge = this.obtenerBadge();
    
    return {
      title: titulo,
      body: mensaje,
      icon: icono,
      badge: badge,
      image: this.generarImagenTarjeta(datos),
      tag: `vencimiento-${datos.tarjetaId}`,
      renotify: true,
      requireInteraction: urgencia === 'alta',
      silent: false,
      timestamp: Date.now(),
      data: {
        tarjetaId: datos.tarjetaId,
        tipo: 'vencimiento',
        urgencia: urgencia,
        fechaVencimiento: datos.fechaVencimiento.toISOString(),
        monto: datos.montoAdeudado,
        url: '/tarjetas'
      },
      actions: this.generarAcciones(datos),
      vibrate: this.obtenerPatronVibracion(urgencia)
    };
  }

  /**
   * Genera una notificación push simple (para navegadores con soporte limitado)
   */
  static generarNotificacionSimple(datos: DatosVencimientoTarjeta): ExtendedNotificationOptions {
    const titulo = this.generarTitulo(datos);
    const mensaje = this.generarMensajeSimple(datos);
    
    return {
      title: titulo,
      body: mensaje,
      icon: '/assets/icons/default-notification.svg',
      tag: `vencimiento-${datos.tarjetaId}`,
      data: {
        tarjetaId: datos.tarjetaId,
        tipo: 'vencimiento',
        url: '/tarjetas'
      }
    };
  }

  /**
   * Genera el título de la notificación
   */
  private static generarTitulo(datos: DatosVencimientoTarjeta): string {
    const urgencia = this.determinarUrgencia(datos.diasHastaVencimiento);
    
    switch (urgencia) {
      case 'alta':
        return datos.diasHastaVencimiento === 0 
          ? `🚨 ${datos.nombreTarjeta} vence HOY`
          : `🚨 ${datos.nombreTarjeta} vence MAÑANA`;
      
      case 'media':
        return `⚠️ ${datos.nombreTarjeta} vence pronto`;
      
      case 'baja':
        return `📅 Recordatorio: ${datos.nombreTarjeta}`;
      
      default:
        return `💳 Recordatorio de ${datos.nombreTarjeta}`;
    }
  }

  /**
   * Genera el mensaje principal de la notificación
   */
  private static generarMensaje(datos: DatosVencimientoTarjeta): string {
    const montoFormateado = this.formatearMonto(datos.montoAdeudado);
    const fechaFormateada = this.formatearFechaCorta(datos.fechaVencimiento);
    
    if (datos.diasHastaVencimiento === 0) {
      return `Vence hoy. Monto a pagar: ${montoFormateado}. ¡No olvides realizar el pago!`;
    }
    
    if (datos.diasHastaVencimiento === 1) {
      return `Vence mañana (${fechaFormateada}). Monto: ${montoFormateado}. Prepara tu pago.`;
    }
    
    if (datos.diasHastaVencimiento <= 3) {
      return `Vence en ${datos.diasHastaVencimiento} días (${fechaFormateada}). Monto: ${montoFormateado}.`;
    }
    
    return `Vence el ${fechaFormateada}. Monto estimado: ${montoFormateado}.`;
  }

  /**
   * Genera un mensaje simple para notificaciones básicas
   */
  private static generarMensajeSimple(datos: DatosVencimientoTarjeta): string {
    const montoFormateado = this.formatearMonto(datos.montoAdeudado);
    
    if (datos.diasHastaVencimiento === 0) {
      return `Vence hoy - ${montoFormateado}`;
    }
    
    if (datos.diasHastaVencimiento === 1) {
      return `Vence mañana - ${montoFormateado}`;
    }
    
    return `Vence en ${datos.diasHastaVencimiento} días - ${montoFormateado}`;
  }

  /**
   * Genera las acciones disponibles en la notificación
   */
  private static generarAcciones(datos: DatosVencimientoTarjeta): NotificationAction[] {
    const acciones: NotificationAction[] = [
      {
        action: 'ver-tarjeta',
        title: '👁️ Ver Tarjeta',
        icon: '/assets/icons/view-icon.png'
      }
    ];

    // Agregar acción de pago rápido si es urgente
    if (datos.diasHastaVencimiento <= 1) {
      acciones.unshift({
        action: 'recordar-pago',
        title: '💰 Recordar Pago',
        icon: '/assets/icons/payment-icon.png'
      });
    }

    // Agregar acción de posponer si no es urgente
    if (datos.diasHastaVencimiento > 1) {
      acciones.push({
        action: 'posponer',
        title: '⏰ Recordar Mañana',
        icon: '/assets/icons/snooze-icon.png'
      });
    }

    return acciones;
  }

  /**
   * Genera una imagen personalizada para la tarjeta (SVG como Data URL)
   */
  private static generarImagenTarjeta(datos: DatosVencimientoTarjeta): string {
    const urgencia = this.determinarUrgencia(datos.diasHastaVencimiento);
    const colorFondo = this.obtenerColorFondo(urgencia);
    const colorTexto = this.obtenerColorTexto(urgencia);
    const montoFormateado = this.formatearMontoCorto(datos.montoAdeudado);
    const porcentaje = Math.min(100, datos.porcentajeUso);
    
    const svg = `
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colorFondo};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.oscurecerColor(colorFondo)};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  
  <!-- Fondo de la tarjeta -->
  <rect x="10" y="10" width="380" height="180" rx="15" ry="15" 
        fill="url(#cardGradient)" filter="url(#shadow)"/>
  
  <!-- Chip de la tarjeta -->
  <rect x="30" y="40" width="40" height="30" rx="5" ry="5" 
        fill="${colorTexto}" opacity="0.8"/>
  
  <!-- Nombre de la tarjeta -->
  <text x="30" y="90" font-family="Arial, sans-serif" font-size="18" 
        font-weight="bold" fill="${colorTexto}">${this.truncarTexto(datos.nombreTarjeta, 20)}</text>
  
  <!-- Monto -->
  <text x="30" y="115" font-family="Arial, sans-serif" font-size="14" 
        fill="${colorTexto}" opacity="0.9">Monto a pagar:</text>
  <text x="30" y="135" font-family="Arial, sans-serif" font-size="20" 
        font-weight="bold" fill="${colorTexto}">${montoFormateado}</text>
  
  <!-- Días restantes -->
  <circle cx="340" cy="50" r="25" fill="${colorTexto}" opacity="0.2"/>
  <text x="340" y="45" font-family="Arial, sans-serif" font-size="12" 
        text-anchor="middle" fill="${colorTexto}" font-weight="bold">
    ${datos.diasHastaVencimiento === 0 ? 'HOY' : `${datos.diasHastaVencimiento}d`}
  </text>
  <text x="340" y="58" font-family="Arial, sans-serif" font-size="10" 
        text-anchor="middle" fill="${colorTexto}" opacity="0.8">restantes</text>
  
  <!-- Barra de uso -->
  <rect x="250" y="120" width="120" height="8" rx="4" ry="4" 
        fill="${colorTexto}" opacity="0.3"/>
  <rect x="250" y="120" width="${(120 * porcentaje) / 100}" height="8" rx="4" ry="4" 
        fill="${colorTexto}" opacity="0.8"/>
  <text x="250" y="145" font-family="Arial, sans-serif" font-size="10" 
        fill="${colorTexto}" opacity="0.8">Uso: ${porcentaje.toFixed(0)}%</text>
  
  <!-- Icono de urgencia -->
  <text x="350" y="170" font-family="Arial, sans-serif" font-size="16" 
        font-weight="bold" fill="${colorTexto}">
    ${this.obtenerTextoUrgencia(urgencia)}
  </text>
</svg>
    `;
    
    // Usar encodeURIComponent para manejar caracteres Unicode correctamente
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Obtiene el icono según la urgencia
   */
  private static obtenerIcono(urgencia: 'alta' | 'media' | 'baja'): string {
    // Iconos SVG para notificaciones
    switch (urgencia) {
      case 'alta': return '/assets/icons/urgent-notification.svg';
      case 'media': return '/assets/icons/warning-notification.svg';
      case 'baja': return '/assets/icons/reminder-notification.svg';
      default: return '/assets/icons/default-notification.svg';
    }
  }

  /**
   * Obtiene el badge de la aplicación
   */
  private static obtenerBadge(): string {
    // Badge SVG para mostrar en la notificación
    return '/assets/icons/badge-72x72.svg';
  }

  /**
   * Obtiene el patrón de vibración según la urgencia
   */
  private static obtenerPatronVibracion(urgencia: 'alta' | 'media' | 'baja'): number[] {
    switch (urgencia) {
      case 'alta': return [200, 100, 200, 100, 200]; // Vibración intensa
      case 'media': return [100, 50, 100]; // Vibración moderada
      case 'baja': return [50]; // Vibración suave
      default: return [100];
    }
  }

  /**
   * Determina el nivel de urgencia
   */
  private static determinarUrgencia(dias: number): 'alta' | 'media' | 'baja' {
    if (dias <= 1) return 'alta';
    if (dias <= 3) return 'media';
    return 'baja';
  }

  /**
   * Obtiene el color de fondo según la urgencia
   */
  private static obtenerColorFondo(urgencia: 'alta' | 'media' | 'baja'): string {
    switch (urgencia) {
      case 'alta': return '#ef4444'; // Rojo
      case 'media': return '#f59e0b'; // Amarillo/Naranja
      case 'baja': return '#3b82f6'; // Azul
      default: return '#6b7280'; // Gris
    }
  }

  /**
   * Obtiene el color de texto según la urgencia
   */
  private static obtenerColorTexto(urgencia: 'alta' | 'media' | 'baja'): string {
    return '#ffffff'; // Siempre blanco para buen contraste
  }

  /**
   * Obtiene el emoji según la urgencia
   */
  private static obtenerEmojiUrgencia(urgencia: 'alta' | 'media' | 'baja'): string {
    switch (urgencia) {
      case 'alta': return '🚨';
      case 'media': return '⚠️';
      case 'baja': return '📅';
      default: return '💳';
    }
  }

  /**
   * Obtiene texto de urgencia sin emojis para SVG
   */
  private static obtenerTextoUrgencia(urgencia: 'alta' | 'media' | 'baja'): string {
    switch (urgencia) {
      case 'alta': return '!!!';
      case 'media': return '!!';
      case 'baja': return '!';
      default: return 'TC';
    }
  }

  /**
   * Oscurece un color hexadecimal
   */
  private static oscurecerColor(hex: string): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = -30;
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Trunca el texto si es muy largo
   */
  private static truncarTexto(texto: string, maxLength: number): string {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength - 3) + '...';
  }

  /**
   * Formatea el monto para mostrar
   */
  private static formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  }

  /**
   * Formatea el monto de forma corta (para la imagen)
   */
  private static formatearMontoCorto(monto: number): string {
    if (monto >= 1000000) {
      return `$${(monto / 1000000).toFixed(1)}M`;
    }
    if (monto >= 1000) {
      return `$${(monto / 1000).toFixed(0)}K`;
    }
    return `$${monto.toFixed(0)}`;
  }

  /**
   * Formatea la fecha de forma corta
   */
  private static formatearFechaCorta(fecha: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short'
    }).format(fecha);
  }
}

/**
 * Configuración para el Service Worker de notificaciones push
 */
export class PushServiceWorkerConfig {
  
  /**
   * Genera el código del Service Worker para manejar notificaciones
   */
  static generarServiceWorkerCode(): string {
    return `
// Service Worker para notificaciones push - Gestor TC

self.addEventListener('push', function(event) {
  console.log('Push message received:', event);
  
  if (!event.data) {
    console.log('Push message has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.body || 'Nueva notificación de Gestor TC',
      icon: data.icon || '/assets/icons/icon-192x192.png',
      badge: data.badge || '/assets/icons/badge-72x72.png',
      image: data.image,
      tag: data.tag || 'gestor-tc-notification',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      renotify: data.renotify || false,
      vibrate: data.vibrate || [100],
      timestamp: data.timestamp || Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Gestor TC', options)
    );
    
  } catch (error) {
    console.error('Error processing push message:', error);
    
    // Mostrar notificación de fallback
    event.waitUntil(
      self.registration.showNotification('Gestor TC', {
        body: 'Nueva notificación disponible',
        icon: '/assets/icons/icon-192x192.png',
        tag: 'gestor-tc-fallback'
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  let url = '/';
  
  if (action === 'ver-tarjeta') {
    url = data.url || '/tarjetas';
  } else if (action === 'recordar-pago') {
    url = '/tarjetas?recordar-pago=' + (data.tarjetaId || '');
  } else if (action === 'posponer') {
    // Programar recordatorio para mañana
    console.log('Posponiendo notificación para mañana');
    return; // No abrir ventana
  } else {
    // Click en la notificación principal
    url = data.url || '/tarjetas';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Buscar si ya hay una ventana abierta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        
        // Si no hay ventana abierta, abrir una nueva
        return clients.openWindow(url);
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
  
  // Opcional: registrar que la notificación fue cerrada
  const data = event.notification.data || {};
  if (data.tarjetaId) {
    console.log('Notificación cerrada para tarjeta:', data.tarjetaId);
  }
});

// Manejar errores de push
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed:', event);
  
  // Aquí podrías reenviar la nueva suscripción al servidor
  event.waitUntil(
    fetch('/api/push/subscription-change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        oldSubscription: event.oldSubscription,
        newSubscription: event.newSubscription
      })
    })
  );
});
    `;
  }
}