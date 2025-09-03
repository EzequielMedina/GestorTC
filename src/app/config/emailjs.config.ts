/**
 * Configuración de EmailJS para el envío de emails
 * 
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 
 * 1. Crear cuenta en https://www.emailjs.com/
 * 2. Crear un servicio de email (Gmail, Outlook, etc.)
 * 3. Crear un template de email
 * 4. Obtener las claves necesarias
 * 5. Reemplazar los valores en este archivo
 */

export const EMAILJS_CONFIG = {
  // Clave pública de EmailJS (se obtiene en Account > API Keys)
  PUBLIC_KEY: 'MSBb87-PQcXWr1gWK',
  
  // ID del servicio de email (se obtiene en Email Services)
  SERVICE_ID: 'service_ceg7xlp',
  
  // ID del template de email (se obtiene en Email Templates)
  TEMPLATE_ID: 'template_e43va39'
};

/**
 * TEMPLATE VARIABLES REQUERIDAS:
 * 
 * En tu template de EmailJS, debes usar estas variables:
 * 
 * - {{to_email}}      : Email del destinatario
 * - {{subject}}       : Asunto del email
 * - {{html_content}}  : Contenido HTML del email
 * - {{text_content}}  : Contenido en texto plano
 * - {{from_name}}     : Nombre del remitente (Gestor TC)
 * - {{reply_to}}      : Email de respuesta
 * 
 * EJEMPLO DE TEMPLATE HTML:
 * 
 * <div>
 *   <h2>{{subject}}</h2>
 *   <div>{{{html_content}}}</div>
 *   <hr>
 *   <p><small>Este email fue enviado desde {{from_name}}</small></p>
 * </div>
 * 
 * EJEMPLO DE TEMPLATE TEXTO:
 * 
 * {{subject}}
 * 
 * {{text_content}}
 * 
 * ---
 * Este email fue enviado desde {{from_name}}
 */

/**
 * CONFIGURACIÓN DEL SERVICIO DE EMAIL:
 * 
 * 1. Gmail:
 *    - Habilitar "Aplicaciones menos seguras" o usar App Password
 *    - Usar tu email de Gmail como remitente
 * 
 * 2. Outlook/Hotmail:
 *    - Usar tu email de Outlook como remitente
 * 
 * 3. Otros servicios:
 *    - Seguir las instrucciones específicas de EmailJS
 */

/**
 * LÍMITES DEL PLAN GRATUITO:
 * 
 * - 200 emails por mes
 * - Sin límite de templates
 * - Soporte básico
 * 
 * Para más emails, considerar upgrade a plan pago.
 */