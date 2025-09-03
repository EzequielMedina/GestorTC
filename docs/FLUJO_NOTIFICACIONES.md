# 📧 Sistema de Notificaciones - Configuración y Flujo

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE NOTIFICACIONES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  Configuración  │    │   Verificación  │    │  Templates  │ │
│  │   de Usuario    │    │  de Vencimientos│    │   de Email  │ │
│  │                 │    │                 │    │   y Push    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                       │                       │     │
│           ▼                       ▼                       ▼     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Servicio de   │◄──►│   Servicio de   │◄──►│  Servicio   │ │
│  │ Notificaciones  │    │   Vencimientos  │    │  de Email   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                                             │       │
│           ▼                                             ▼       │
│  ┌─────────────────┐                          ┌─────────────┐   │
│  │   Push Service  │                          │   EmailJS   │   │
│  │   (Service      │                          │  (Servicio  │   │
│  │    Worker)      │                          │  Externo)   │   │
│  └─────────────────┘                          └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuración Actual

### 📧 EmailJS
```typescript
// emailjs.config.ts
export const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'MSBb87-PQcXWr1gWK',     // ✅ Configurado
  SERVICE_ID: 'service_ceg7xlp',       // ✅ Configurado
  TEMPLATE_ID: 'template_e43va39'      // ✅ Configurado
};
```

### 🔔 Configuración de Usuario
```typescript
interface ConfiguracionNotificaciones {
  emailHabilitado: boolean;           // Activar/desactivar emails
  pushHabilitado: boolean;            // Activar/desactivar push
  emailDestino?: string;              // Email donde recibir notificaciones
  diasAnticipacion: number;           // Días antes del vencimiento (0-7)
  horaNotificacion: string;           // Hora del día (formato HH:mm)
  tiposHabilitados: TipoNotificacion[]; // Tipos de notificaciones activas
}
```

## 🔄 Flujo de Funcionamiento

### 1. Verificación Automática
```
┌─────────────────┐
│  Cada 1 hora    │
│  (automático)   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ ¿Es necesario   │
│ verificar hoy?  │
└─────────┬───────┘
          │ Sí
          ▼
┌─────────────────┐
│ Obtener todas   │
│ las tarjetas    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Filtrar tarjetas│
│ que vencen según│
│ configuración   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Enviar          │
│ notificaciones  │
└─────────────────┘
```

### 2. Proceso de Envío
```
┌─────────────────┐
│ Tarjeta que     │
│ vence pronto    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Generar datos   │
│ de vencimiento  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ ¿Email          │
│ habilitado?     │
└─────┬───────────┘
      │ Sí
      ▼
┌─────────────────┐    ┌─────────────────┐
│ Generar HTML    │    │ ¿Push           │
│ con template    │    │ habilitado?     │
└─────────┬───────┘    └─────┬───────────┘
          │                  │ Sí
          ▼                  ▼
┌─────────────────┐    ┌─────────────────┐
│ Enviar vía      │    │ Generar         │
│ EmailJS         │    │ notificación    │
└─────────────────┘    │ push            │
                       └─────────┬───────┘
                                 │
                                 ▼
                       ┌─────────────────┐
                       │ Mostrar en      │
                       │ navegador       │
                       └─────────────────┘
```

## 📱 Tipos de Notificaciones

### 🚨 Por Urgencia
- **Alta** (0-1 días): Rojo, vibración intensa, requiere interacción
- **Media** (2-3 días): Naranja, vibración normal
- **Baja** (4+ días): Verde, vibración suave

### 📧 Email
- **HTML responsivo** con diseño profesional
- **Información detallada** de la tarjeta
- **Cálculos automáticos** de montos y porcentajes
- **Consejos y recordatorios** personalizados

### 🔔 Push Notifications
- **Título dinámico** según urgencia
- **Acciones rápidas** (Ver tarjetas, Configurar)
- **Iconos SVG** escalables
- **Datos estructurados** para interacción

## 🎯 Componentes de Interfaz

### 1. Configuración de Notificaciones
**Ubicación**: `/tarjetas` → Pestaña "Notificaciones"

**Funcionalidades**:
- ✅ Activar/desactivar email y push
- ✅ Configurar email de destino
- ✅ Seleccionar días de anticipación (0-7)
- ✅ Elegir hora de notificación
- ✅ Gestionar permisos de push notifications
- ✅ Probar notificaciones

### 2. Test de Notificaciones
**Ubicación**: Componente independiente

**Funcionalidades**:
- ✅ Preview en tiempo real de emails y push
- ✅ Tests predefinidos por urgencia
- ✅ Configuración personalizada de pruebas
- ✅ Envío inmediato de notificaciones de prueba
- ✅ Validación de configuración

## 🔧 Configuración Paso a Paso

### 1. Configurar EmailJS
```bash
# Ya configurado con:
# - Public Key: MSBb87-PQcXWr1gWK
# - Service ID: service_ceg7xlp
# - Template ID: template_e43va39
```

### 2. Configurar Notificaciones de Usuario
1. Ir a `/tarjetas`
2. Seleccionar pestaña "Notificaciones"
3. Activar email y/o push notifications
4. Configurar email de destino
5. Seleccionar días de anticipación
6. Elegir hora de notificación
7. Guardar configuración

### 3. Probar el Sistema
1. Usar el componente "Test de Notificaciones"
2. Seleccionar tipo de prueba
3. Configurar parámetros
4. Generar preview
5. Enviar notificación de prueba

## 📊 Monitoreo y Estado

### Información Disponible
- ✅ Estado de verificación activa
- ✅ Última verificación realizada
- ✅ Próxima verificación programada
- ✅ Estado de push notifications
- ✅ Configuración actual
- ✅ Historial de notificaciones

### Logs y Debugging
- ✅ Console logs detallados
- ✅ Manejo de errores
- ✅ Fallbacks para notificaciones
- ✅ Validación de configuración

## 🚀 Funcionalidades Avanzadas

### Templates Dinámicos
- **Email**: HTML responsivo con CSS inline
- **Push**: Configuración adaptativa según navegador
- **Datos calculados**: Montos, porcentajes, fechas
- **Personalización**: Según urgencia y tipo de tarjeta

### Service Worker
- **Registro automático**: `/sw.js`
- **Push notifications**: Soporte completo
- **Fallbacks**: Para navegadores limitados
- **Gestión de suscripciones**: VAPID keys

### Integración con Tarjetas
- **Cálculo automático**: Montos y vencimientos
- **Filtrado inteligente**: Solo tarjetas relevantes
- **Datos enriquecidos**: Información completa para templates

## 🔒 Seguridad y Privacidad

- ✅ **Datos locales**: Configuración en localStorage
- ✅ **No almacenamiento**: De datos sensibles en servidor
- ✅ **Validación**: De emails y configuraciones
- ✅ **Permisos**: Gestión adecuada de push notifications
- ✅ **Fallbacks**: Para casos de error

## 📈 Próximas Mejoras

- [ ] Integración con backend real
- [ ] Notificaciones por SMS
- [ ] Templates personalizables
- [ ] Estadísticas de envío
- [ ] Programación avanzada de horarios
- [ ] Integración con calendarios

---

**Estado Actual**: ✅ Sistema completamente funcional con EmailJS configurado
**Última Actualización**: Enero 2025