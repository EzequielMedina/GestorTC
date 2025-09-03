# Configuración de EmailJS para Gestor TC

Esta guía te ayudará a configurar EmailJS para el envío de emails de notificaciones de vencimiento de tarjetas de crédito.

## 📧 ¿Qué es EmailJS?

EmailJS es un servicio que permite enviar emails directamente desde el frontend sin necesidad de un servidor backend. Es perfecto para aplicaciones como Gestor TC.

**Ventajas:**
- ✅ Gratuito hasta 200 emails/mes
- ✅ No requiere servidor backend
- ✅ Fácil configuración
- ✅ Soporte para múltiples proveedores de email

## 🚀 Configuración Paso a Paso

### 1. Crear Cuenta en EmailJS

1. Ve a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Haz clic en "Sign Up" y crea tu cuenta
3. Verifica tu email

### 2. Configurar Servicio de Email

1. En el dashboard, ve a **"Email Services"**
2. Haz clic en **"Add New Service"**
3. Selecciona tu proveedor de email:
   - **Gmail** (recomendado para uso personal)
   - **Outlook/Hotmail**
   - **Yahoo**
   - Otros servicios disponibles

#### Para Gmail:
1. Selecciona "Gmail"
2. Ingresa tu email de Gmail
3. Autoriza la aplicación
4. Copia el **Service ID** (ej: `service_abc123`)

#### Para Outlook:
1. Selecciona "Outlook"
2. Ingresa tu email de Outlook
3. Autoriza la aplicación
4. Copia el **Service ID**

### 3. Crear Template de Email

1. Ve a **"Email Templates"**
2. Haz clic en **"Create New Template"**
3. Configura el template:

**Subject:**
```
{{subject}}
```

**Content (HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">{{from_name}}</h1>
  </div>
  
  <div style="padding: 20px; background: #f9f9f9;">
    <h2 style="color: #333;">{{subject}}</h2>
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      {{{html_content}}}
    </div>
  </div>
  
  <div style="padding: 20px; text-align: center; background: #333; color: white;">
    <p style="margin: 0; font-size: 12px;">
      Este email fue enviado desde {{from_name}}<br>
      Para consultas, responde a: {{reply_to}}
    </p>
  </div>
</div>
```

**Content (Plain Text):**
```
{{subject}}

{{text_content}}

---
Este email fue enviado desde {{from_name}}
Para consultas, responde a: {{reply_to}}
```

4. Guarda el template y copia el **Template ID** (ej: `template_xyz789`)

### 4. Obtener Clave Pública

1. Ve a **"Account"** > **"API Keys"**
2. Copia tu **Public Key** (ej: `user_abc123xyz`)

### 5. Configurar en la Aplicación

1. Abre el archivo `src/app/config/emailjs.config.ts`
2. Reemplaza los valores:

```typescript
export const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'tu_public_key_aqui',     // De Account > API Keys
  SERVICE_ID: 'tu_service_id_aqui',     // De Email Services
  TEMPLATE_ID: 'tu_template_id_aqui'    // De Email Templates
};
```

**Ejemplo:**
```typescript
export const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'user_abc123xyz',
  SERVICE_ID: 'service_gmail_abc123',
  TEMPLATE_ID: 'template_vencimiento_xyz789'
};
```

## 🧪 Probar la Configuración

1. Guarda los cambios
2. Ejecuta `ng serve`
3. Ve a la página de **"Test Notificaciones"**
4. Activa **"Usar servicio real"**
5. Ingresa tu email en **"Email de destino"**
6. Haz clic en **"Enviar Email Ahora"**
7. Verifica que recibas el email

## 🔧 Solución de Problemas

### Error: "Invalid public key"
- Verifica que copiaste correctamente la Public Key
- Asegúrate de que no hay espacios extra

### Error: "Service not found"
- Verifica el Service ID
- Asegúrate de que el servicio esté activo en EmailJS

### Error: "Template not found"
- Verifica el Template ID
- Asegúrate de que el template esté guardado

### No recibo emails
- Revisa la carpeta de spam
- Verifica que el email de destino sea correcto
- Revisa los logs en la consola del navegador

### Límite de emails alcanzado
- El plan gratuito permite 200 emails/mes
- Considera upgrade a plan pago si necesitas más

## 📊 Monitoreo

En el dashboard de EmailJS puedes ver:
- Emails enviados
- Tasa de éxito
- Errores
- Uso mensual

## 🔒 Seguridad

- ✅ La Public Key es segura para usar en frontend
- ✅ EmailJS no expone credenciales de email
- ✅ Límites de rate limiting automáticos
- ✅ Whitelist de dominios disponible

## 💡 Consejos

1. **Usa un email dedicado**: Crea un email específico para la aplicación
2. **Personaliza el template**: Ajusta colores y estilos según tu marca
3. **Monitorea el uso**: Revisa regularmente el dashboard
4. **Backup**: Considera tener un servicio de email alternativo

## 📞 Soporte

Si tienes problemas:
1. Revisa la [documentación oficial](https://www.emailjs.com/docs/)
2. Consulta los [ejemplos](https://www.emailjs.com/examples/)
3. Contacta el soporte de EmailJS

---

¡Listo! Ahora tu aplicación Gestor TC puede enviar emails reales de notificaciones de vencimiento. 🎉