import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '../config/emailjs.config';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  // Configuración de EmailJS desde archivo de configuración
  private readonly SERVICE_ID = EMAILJS_CONFIG.SERVICE_ID;
  private readonly TEMPLATE_ID = EMAILJS_CONFIG.TEMPLATE_ID;
  private readonly PUBLIC_KEY = EMAILJS_CONFIG.PUBLIC_KEY;

  constructor(private http: HttpClient) {
    // Inicializar EmailJS con la clave pública
    emailjs.init(this.PUBLIC_KEY);
  }

  /**
   * Envía un email usando EmailJS (servicio gratuito)
   */
  async enviarEmail(emailData: EmailData): Promise<EmailResponse> {
    try {
      // Parámetros del template para EmailJS
      const templateParams = {
        to_email: emailData.to,
        subject: emailData.subject,
        html_content: emailData.html,
        text_content: emailData.text,
        from_name: 'Gestor TC',
        reply_to: emailData.from || 'noreply@gestortc.com'
      };

      // Enviar email usando el SDK de EmailJS
      const response = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        templateParams
      );
      
      console.log('✅ Email enviado exitosamente:', response);
      
      return {
        success: true,
        messageId: response.text || 'emailjs_' + Date.now()
      };
    } catch (error) {
      console.error('❌ Error enviando email con EmailJS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al enviar email'
      };
    }
  }

  /**
   * Envía email usando un backend propio (alternativa)
   */
  async enviarEmailBackend(emailData: EmailData): Promise<EmailResponse> {
    try {
      // URL de tu backend para envío de emails
      const backendUrl = '/api/email/send';
      
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await this.http.post<EmailResponse>(backendUrl, emailData, { headers }).toPromise();
      
      return response || { success: false, error: 'No response from server' };
    } catch (error) {
      console.error('Error enviando email via backend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión con el servidor'
      };
    }
  }

  /**
   * Valida formato de email
   */
  validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Método de fallback que simula el envío (para desarrollo)
   */
  async simularEnvio(emailData: EmailData): Promise<EmailResponse> {
    console.log('📧 Simulando envío de email:');
    console.log('Para:', emailData.to);
    console.log('Asunto:', emailData.subject);
    console.log('Contenido HTML:', emailData.html.substring(0, 200) + '...');
    console.log('Contenido Texto:', emailData.text.substring(0, 200) + '...');
    
    // Simular delay de envío
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      messageId: 'simulated_' + Date.now()
    };
  }

  /**
   * Método principal que decide qué servicio usar
   */
  async enviar(emailData: EmailData, useRealService: boolean = true): Promise<EmailResponse> {
    if (!this.validarEmail(emailData.to)) {
      return {
        success: false,
        error: 'Dirección de email inválida'
      };
    }

    if (!useRealService) {
      return this.simularEnvio(emailData);
    }

    // Intentar con EmailJS primero, luego backend como fallback
    try {
      const result = await this.enviarEmail(emailData);
      if (result.success) {
        return result;
      }
      
      // Si EmailJS falla, intentar con backend
      console.warn('EmailJS falló, intentando con backend...');
      return await this.enviarEmailBackend(emailData);
    } catch (error) {
      console.error('Todos los métodos de envío fallaron:', error);
      return {
        success: false,
        error: 'No se pudo enviar el email. Todos los servicios fallaron.'
      };
    }
  }
}