import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// es-ES suele estar en más instalaciones de Chrome/Edge que es-AR
const LANG_DEFAULT = 'es-ES';

/**
 * Encapsula la Web Speech API (SpeechRecognition) del navegador.
 * Modo "pulsar para empezar, pulsar para terminar": start() al suscribirse, stop() con stopListening().
 */
@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private currentRecognition: SpeechRecognition | null = null;

  private get recognitionConstructor(): typeof SpeechRecognition | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
  }

  /**
   * Indica si el navegador soporta reconocimiento de voz.
   * Requiere contexto seguro (HTTPS o localhost).
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    if (!window.isSecureContext) return false;
    return !!this.recognitionConstructor;
  }

  /**
   * Idioma por defecto para el reconocimiento (es-AR). Permite cambiar a es-ES en el futuro.
   */
  getDefaultLang(): string {
    return LANG_DEFAULT;
  }

  /**
   * Detiene el reconocimiento en curso. Llamar cuando el usuario pulsa de nuevo "para terminar".
   * Tras stop(), el navegador emitirá el resultado y completará el Observable.
   */
  stopListening(): void {
    if (this.currentRecognition) {
      try {
        this.currentRecognition.stop();
      } catch {
        // ignore
      }
      this.currentRecognition = null;
    }
  }

  /**
   * Inicia el reconocimiento de voz. Permanece escuchando hasta que se llame stopListening()
   * o se cancele la suscripción. Emite el texto transcrito al finalizar.
   */
  listen(lang: string = LANG_DEFAULT): Observable<string> {
    return new Observable((subscriber) => {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        console.warn('[Voz] Contexto no seguro: solo HTTPS o localhost');
        const err = new Error('El reconocimiento de voz solo funciona en HTTPS o localhost.') as Error & { code?: string };
        err.code = 'secure-context-required';
        subscriber.error(err);
        return;
      }
      const Ctor = this.recognitionConstructor;
      if (!Ctor) {
        console.warn('[Voz] Navegador no soporta SpeechRecognition');
        const err = new Error('SPEECH_NOT_SUPPORTED') as Error & { code?: string };
        err.code = 'not-supported';
        subscriber.error(err);
        return;
      }

      console.log('[Voz] Iniciando reconocimiento, idioma:', lang || LANG_DEFAULT);
      const recognition = new Ctor();
      recognition.continuous = true; // Escucha hasta que se llame stop()
      recognition.interimResults = false;
      // Usar idioma solicitado; si no está disponible el navegador puede fallar o usar otro
      recognition.lang = lang || LANG_DEFAULT;
      recognition.maxAlternatives = 3; // Varias alternativas por si la primera viene vacía

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const alt = result?.[0]?.transcript?.trim()
            ? result[0]
            : result?.[1] ?? result?.[0];
          if (alt?.transcript) {
            transcript += alt.transcript;
          }
        }
        transcript = transcript.trim();
        console.log('[Voz] Resultado:', transcript || '(vacío)', 'segmentos:', event.results.length);
        if (transcript) {
          subscriber.next(transcript);
        }
      };

      recognition.onend = () => {
        console.log('[Voz] onend (reconocimiento terminado)');
        this.currentRecognition = null;
        subscriber.complete();
      };

      recognition.onerror = (event: Event) => {
        const errEvent = event as SpeechRecognitionErrorEvent;
        const code = (errEvent?.error ?? 'unknown') as string;
        const message = errEvent?.message ?? code;
        console.warn('[Voz] Error:', code, message);
        const err = new Error(message) as Error & { code?: string };
        err.code = code;
        subscriber.error(err);
      };

      recognition.start();
      this.currentRecognition = recognition;

      return () => {
        this.currentRecognition = null;
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      };
    });
  }
}
