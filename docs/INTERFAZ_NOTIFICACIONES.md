# 🎨 Interfaz de Usuario - Sistema de Notificaciones

## 📱 Pantallas Principales

### 1. Configuración de Notificaciones
**Ruta**: `/tarjetas` → Pestaña "Notificaciones"

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN DE NOTIFICACIONES             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📧 NOTIFICACIONES POR EMAIL                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [✓] Habilitar notificaciones por email                 │   │
│  │                                                         │   │
│  │ Email de destino: [usuario@ejemplo.com____________]    │   │
│  │                                                         │   │
│  │ [Probar Email]                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔔 NOTIFICACIONES PUSH                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [✓] Habilitar notificaciones push                      │   │
│  │                                                         │   │
│  │ Estado: ✅ Permisos concedidos                          │
│  │ Suscripción: ✅ Activa                                  │
│  │                                                         │   │
│  │ [Probar Push] [Gestionar Permisos]                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚙️ CONFIGURACIÓN GENERAL                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Días de anticipación: [3 días antes ▼]                 │   │
│  │ Hora de notificación: [09:00 AM ▼]                     │   │
│  │                                                         │   │
│  │ Tipos habilitados:                                      │   │
│  │ [✓] Vencimiento de Tarjetas                            │   │
│  │ [ ] Límite Excedido                                     │   │
│  │ [ ] Recordatorio de Pago                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 ESTADO DEL SERVICIO                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Verificación activa: ❌ Inactiva                        │   │
│  │ Última verificación: 15/01/2025 14:30                  │   │
│  │ Próxima verificación: 15/01/2025 15:30                 │   │
│  │                                                         │   │
│  │ [Verificar Ahora] [Reiniciar Servicio]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Guardar Configuración] [Restaurar] [Probar Sistema]          │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Test de Notificaciones
**Componente**: `TestNotificacionesComponent`

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEST DE NOTIFICACIONES                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🧪 CONFIGURACIÓN DE PRUEBA                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Tarjeta: [Visa Banco Nación ▼]                         │   │
│  │ Días de anticipación: [3 ▼]                            │   │
│  │ Monto ejemplo: [$15,000.00_______]                     │   │
│  │ Urgencia: [🟡 Media ▼]                                 │   │
│  │ Tipo: [📧📱 Email y Push ▼]                            │   │
│  │                                                         │   │
│  │ [Generar Preview] [Enviar Prueba]                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📋 TESTS PREDEFINIDOS                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [📧 Vencimiento Próximo] [🔔 Vencimiento Urgente]      │   │
│  │ [📧 Recordatorio Pago]   [🔔 Aviso Temprano]           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  👁️ PREVIEW                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [📧 Vista Email] [🔔 Vista Push] [📱 Vista HTML]       │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │                                                     │ │   │
│  │ │           PREVIEW DEL EMAIL/PUSH                   │ │   │
│  │ │                                                     │ │   │
│  │ │  [Contenido dinámico según configuración]          │ │   │
│  │ │                                                     │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Flujo de Interacción del Usuario

### Configuración Inicial
```
1. Usuario accede a /tarjetas
   ↓
2. Selecciona pestaña "Notificaciones"
   ↓
3. Activa email y/o push notifications
   ↓
4. Configura email de destino
   ↓
5. Selecciona días de anticipación
   ↓
6. Elige hora de notificación
   ↓
7. Guarda configuración
   ↓
8. Sistema inicia verificación automática
```

### Gestión de Push Notifications
```
1. Usuario hace clic en "Gestionar Permisos"
   ↓
2. Navegador solicita permisos
   ↓
3. Usuario acepta/rechaza
   ↓
4. Sistema registra Service Worker
   ↓
5. Se crea suscripción VAPID
   ↓
6. Estado se actualiza en interfaz
```

### Prueba de Notificaciones
```
1. Usuario accede a Test de Notificaciones
   ↓
2. Selecciona tarjeta y parámetros
   ↓
3. Genera preview en tiempo real
   ↓
4. Revisa contenido del email/push
   ↓
5. Envía notificación de prueba
   ↓
6. Recibe confirmación de envío
```

## 📧 Ejemplo de Email Generado

```html
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  💳 Gestor TC                              🟡 URGENCIA MEDIA    │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  📅 Recordatorio de Vencimiento                                │
│  Tu tarjeta Visa Banco Nación vence en 3 días                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Visa Banco Nación                              3 días  │   │
│  │                                                         │   │
│  │  📅 Fecha de Vencimiento: 18 de Enero, 2025            │   │
│  │  💰 Monto a Pagar: $15,000.00                          │   │
│  │  📊 Uso de Límite: 75.0%                               │   │
│  │  ████████████████████████████████████████████████████  │   │
│  │  💳 Saldo Disponible: $5,000.00                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Recordatorios Importantes:                                 │
│  • Asegúrate de tener fondos suficientes en tu cuenta          │
│  • Puedes pagar antes del vencimiento para evitar intereses    │
│  • Revisa tu estado de cuenta para confirmar el monto exacto   │
│  • Tienes 2 cuotas pendientes para el próximo mes              │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Este email fue enviado desde Gestor TC                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔔 Ejemplo de Push Notification

```
┌─────────────────────────────────────────────────────────────────┐
│  🖥️ NAVEGADOR                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔔                                                     │   │
│  │  ⚠️ Visa Banco Nación vence pronto                     │   │
│  │  Vence en 3 días. Monto: $15,000                       │   │
│  │                                                         │   │
│  │  [👀 Ver tarjetas] [⚙️ Configurar]                     │   │
│  │                                                         │   │
│  │  💳 Gestor TC • hace 1 minuto                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Estados Visuales

### Indicadores de Urgencia
- 🔴 **Alta**: Rojo (#f44336) - Vence hoy o mañana
- 🟡 **Media**: Naranja (#ff9800) - Vence en 2-3 días  
- 🟢 **Baja**: Verde (#4caf50) - Vence en 4+ días

### Iconos del Sistema
- 📧 Email notifications
- 🔔 Push notifications
- ⚙️ Configuración
- 🧪 Testing
- 📊 Estado/Estadísticas
- 💳 Tarjetas
- 📅 Fechas/Vencimientos
- 💰 Montos/Dinero

### Estados de Componentes
```typescript
// Estados de carga
loading: boolean = false;
guardando: boolean = false;
probandoNotificacion: boolean = false;

// Estados de configuración
configuración: ConfiguracionNotificaciones | null = null;
hayCambiosPendientes(): boolean;

// Estados de push notifications
estadoPush: PushNotificationStatus = {
  isSupported: boolean;
  isServiceWorkerRegistered: boolean;
  isSubscribed: boolean;
  permission: 'default' | 'granted' | 'denied';
};
```

## 🔄 Actualizaciones en Tiempo Real

### Observables Reactivos
```typescript
// Configuración
getConfiguracion$(): Observable<ConfiguracionNotificaciones | null>

// Estado del servicio
getVerificacionActiva$(): Observable<boolean>
getUltimaVerificacion$(): Observable<Date | null>

// Push notifications
getEstadoPushNotifications(): Observable<PushNotificationStatus>

// Notificaciones
getNotificaciones$(): Observable<Notificacion[]>
getNotificacionesNoLeidas$(): Observable<Notificacion[]>
```

### Actualizaciones Automáticas
- ✅ Estado de verificación cada segundo
- ✅ Configuración al cambiar
- ✅ Push notifications al cambiar permisos
- ✅ Preview al modificar parámetros
- ✅ Validación en tiempo real

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Adaptaciones
- **Cards**: Stack vertical en mobile
- **Formularios**: Campos de ancho completo
- **Botones**: Tamaño táctil apropiado
- **Preview**: Scroll horizontal en mobile
- **Tablas**: Scroll horizontal

## 🎯 Accesibilidad

### ARIA Labels
```html
<button aria-label="Probar notificación push">
<input aria-describedby="email-help">
<div role="alert" aria-live="polite">
```

### Navegación por Teclado
- ✅ Tab order lógico
- ✅ Focus visible
- ✅ Escape para cerrar modales
- ✅ Enter para activar botones

### Contraste y Legibilidad
- ✅ Ratio de contraste WCAG AA
- ✅ Tamaños de fuente apropiados
- ✅ Espaciado adecuado
- ✅ Iconos con texto alternativo

---

**Tecnologías**: Angular 18, Angular Material, RxJS, Service Workers
**Compatibilidad**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+