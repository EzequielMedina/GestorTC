import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService, ThemeMode } from '../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <button 
      mat-icon-button 
      [matMenuTriggerFor]="themeMenu"
      [matTooltip]="'Cambiar tema'"
      class="theme-toggle-btn"
    >
      <mat-icon>{{ currentIcon }}</mat-icon>
    </button>
    
    <mat-menu #themeMenu="matMenu">
      <button mat-menu-item (click)="setTheme('light')" [class.active]="currentMode === 'light'">
        <mat-icon>light_mode</mat-icon>
        <span>Claro</span>
        <mat-icon *ngIf="currentMode === 'light'" class="check-icon">check</mat-icon>
      </button>
      <button mat-menu-item (click)="setTheme('dark')" [class.active]="currentMode === 'dark'">
        <mat-icon>dark_mode</mat-icon>
        <span>Oscuro</span>
        <mat-icon *ngIf="currentMode === 'dark'" class="check-icon">check</mat-icon>
      </button>
      <button mat-menu-item (click)="setTheme('auto')" [class.active]="currentMode === 'auto'">
        <mat-icon>brightness_auto</mat-icon>
        <span>Automático</span>
        <mat-icon *ngIf="currentMode === 'auto'" class="check-icon">check</mat-icon>
      </button>
    </mat-menu>
  `,
  styles: [`
    .theme-toggle-btn {
      color: var(--text-primary);
    }

    .check-icon {
      margin-left: auto;
      color: var(--primary);
    }

    .active {
      background-color: var(--bg) !important;
    }
  `]
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  currentMode: ThemeMode = 'light';
  currentIcon = 'light_mode';
  
  private subscriptions = new Subscription();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.themeService.getThemeMode$().subscribe(mode => {
        this.currentMode = mode;
        this.updateIcon();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setThemeMode(mode);
  }

  private updateIcon(): void {
    switch (this.currentMode) {
      case 'light':
        this.currentIcon = 'light_mode';
        break;
      case 'dark':
        this.currentIcon = 'dark_mode';
        break;
      case 'auto':
        this.currentIcon = 'brightness_auto';
        break;
    }
  }
}

