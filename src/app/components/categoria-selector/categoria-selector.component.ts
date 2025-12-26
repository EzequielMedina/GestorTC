import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Categoria } from '../../models/categoria.model';
import { CategoriaService } from '../../services/categoria.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-categoria-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatDialogModule
  ],
  templateUrl: './categoria-selector.component.html',
  styleUrls: ['./categoria-selector.component.css']
})
export class CategoriaSelectorComponent implements OnInit {
  @Input() categoriaId?: string;
  @Input() descripcion?: string; // Para sugerencia automática
  @Output() categoriaChange = new EventEmitter<string | undefined>();

  categorias$!: Observable<Categoria[]>;
  categorias: Categoria[] = [];
  categoriaSeleccionada?: Categoria;

  constructor(
    private categoriaService: CategoriaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.categorias$ = this.categoriaService.getCategorias$();
    this.categorias$.subscribe(cats => {
      this.categorias = cats;
      if (this.categoriaId) {
        this.categoriaSeleccionada = cats.find(c => c.id === this.categoriaId);
      } else if (this.descripcion) {
        // Intentar sugerir categoría automáticamente
        this.categoriaService.sugerirCategoria(this.descripcion).subscribe(cat => {
          if (cat) {
            this.categoriaSeleccionada = cat;
            this.categoriaId = cat.id;
            this.categoriaChange.emit(cat.id);
          }
        });
      }
    });
  }

  onCategoriaChange(categoriaId: string | null): void {
    if (categoriaId) {
      this.categoriaSeleccionada = this.categorias.find(c => c.id === categoriaId);
      this.categoriaChange.emit(categoriaId);
    } else {
      this.categoriaSeleccionada = undefined;
      this.categoriaChange.emit(undefined);
    }
  }

  getCategoriaById(id: string): Categoria | undefined {
    return this.categorias.find(c => c.id === id);
  }
}

