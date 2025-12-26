import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { Subject, Observable, Subscription } from 'rxjs';
import { ResultadoBusqueda } from '../../models/search-result.model';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    MatButtonModule
  ],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.css']
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  terminoBusqueda = '';
  resultados: ResultadoBusqueda[] = [];
  resultadosFiltrados: ResultadoBusqueda[] = [];
  mostrarResultados = false;
  
  private terminoSubject = new Subject<string>();
  private subscription = new Subscription();

  constructor(
    private searchService: SearchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.searchService.buscarConDebounce(this.terminoSubject.asObservable(), 300)
        .subscribe(resultados => {
          this.resultados = resultados;
          this.resultadosFiltrados = resultados.slice(0, 10); // Limitar a 10 resultados
          this.mostrarResultados = resultados.length > 0 && this.terminoBusqueda.length > 0;
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onBuscarChange(): void {
    this.terminoSubject.next(this.terminoBusqueda);
  }

  seleccionarResultado(resultado: ResultadoBusqueda): void {
    this.router.navigate([resultado.ruta], {
      queryParams: resultado.datos
    });
    this.terminoBusqueda = '';
    this.mostrarResultados = false;
    this.resultados = [];
  }

  cerrarBusqueda(): void {
    this.terminoBusqueda = '';
    this.mostrarResultados = false;
    this.resultados = [];
  }

  onBlur(): void {
    setTimeout(() => {
      this.mostrarResultados = false;
    }, 200);
  }

  getIconoPorTipo(tipo: string): string {
    switch (tipo) {
      case 'GASTO':
        return 'receipt';
      case 'TARJETA':
        return 'credit_card';
      case 'PRESTAMO':
        return 'account_balance';
      case 'DOLAR':
        return 'attach_money';
      default:
        return 'search';
    }
  }

  getColorPorTipo(tipo: string): string {
    switch (tipo) {
      case 'GASTO':
        return '#3b82f6';
      case 'TARJETA':
        return '#10b981';
      case 'PRESTAMO':
        return '#f59e0b';
      case 'DOLAR':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  }

  agruparResultados(): { [key: string]: ResultadoBusqueda[] } {
    const grupos: { [key: string]: ResultadoBusqueda[] } = {};
    this.resultadosFiltrados.forEach(resultado => {
      if (!grupos[resultado.tipo]) {
        grupos[resultado.tipo] = [];
      }
      grupos[resultado.tipo].push(resultado);
    });
    return grupos;
  }
}

