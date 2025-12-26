import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GastoRapidoDialogComponent } from '../gasto-rapido-dialog/gasto-rapido-dialog.component';

@Component({
  selector: 'app-gasto-rapido-fab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './gasto-rapido-fab.component.html',
  styleUrls: ['./gasto-rapido-fab.component.css']
})
export class GastoRapidoFabComponent implements OnInit {
  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {}

  abrirFormularioRapido(): void {
    const dialogRef = this.dialog.open(GastoRapidoDialogComponent, {
      width: '90%',
      maxWidth: '500px',
      disableClose: false,
      panelClass: 'gasto-rapido-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'abrir-completo') {
        // Si el usuario quiere el formulario completo, navegar a la página de gastos
        // El formulario completo se abrirá desde la página de gastos
        window.location.href = '/gastos';
      } else if (result) {
        console.log('Gasto guardado desde formulario rápido');
      }
    });
  }
}

