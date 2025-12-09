import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY_THEME = 'gestor_tc_theme_mode';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeModeSubject = new BehaviorSubject<ThemeMode>(this.loadThemeFromStorage());
  public themeMode$ = this.themeModeSubject.asObservable();
  
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor() {
    this.initializeTheme();
  }

  /**
   * Inicializa el tema según la configuración guardada
   */
  private initializeTheme(): void {
    const mode = this.themeModeSubject.value;
    this.applyTheme(mode);
    
    // Escuchar cambios en las preferencias del sistema si está en modo auto
    if (mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.isDarkModeSubject.next(mediaQuery.matches);
      this.updateDocumentClass(mediaQuery.matches);
      
      mediaQuery.addEventListener('change', (e) => {
        this.isDarkModeSubject.next(e.matches);
        this.updateDocumentClass(e.matches);
      });
    }
  }

  /**
   * Obtiene el modo de tema actual
   */
  getThemeMode$(): Observable<ThemeMode> {
    return this.themeMode$;
  }

  /**
   * Obtiene si está en modo oscuro
   */
  getIsDarkMode$(): Observable<boolean> {
    return this.isDarkMode$;
  }

  /**
   * Establece el modo de tema
   */
  setThemeMode(mode: ThemeMode): void {
    this.themeModeSubject.next(mode);
    this.saveThemeToStorage(mode);
    this.applyTheme(mode);
  }

  /**
   * Aplica el tema
   */
  private applyTheme(mode: ThemeMode): void {
    if (mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkModeSubject.next(prefersDark);
      this.updateDocumentClass(prefersDark);
    } else {
      const isDark = mode === 'dark';
      this.isDarkModeSubject.next(isDark);
      this.updateDocumentClass(isDark);
    }
  }

  /**
   * Actualiza la clase del documento
   */
  private updateDocumentClass(isDark: boolean): void {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }

  /**
   * Toggle entre modo claro y oscuro (ignora auto)
   */
  toggleTheme(): void {
    const currentMode = this.themeModeSubject.value;
    if (currentMode === 'light') {
      this.setThemeMode('dark');
    } else if (currentMode === 'dark') {
      this.setThemeMode('light');
    } else {
      // Si está en auto, cambiar a dark
      this.setThemeMode('dark');
    }
  }

  /**
   * Carga el tema desde localStorage
   */
  private loadThemeFromStorage(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THEME);
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.error('Error al cargar tema:', error);
    }
    return 'light'; // Por defecto modo claro
  }

  /**
   * Guarda el tema en localStorage
   */
  private saveThemeToStorage(mode: ThemeMode): void {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, mode);
    } catch (error) {
      console.error('Error al guardar tema:', error);
    }
  }
}

