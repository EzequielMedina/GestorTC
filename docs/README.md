# Gestor de Gastos – Plan y Diagrama

Este paquete incluye:
- `docs/plan.md`: plan detallado de desarrollo (Angular 19/20, sin backend).
- `docs/diagram.mmd`: diagrama Mermaid del flujo/arquitectura.

## Cómo ver el diagrama
- En VS Code / Windsurf / Cursor: instale una extensión Mermaid o abra el Markdown preview.
- En GitHub: pegue el contenido en un archivo Markdown con bloque ```mermaid``` o use un visor online de Mermaid.

## Siguiente paso sugerido
Pase `docs/plan.md` y `docs/diagram.mmd` a su agente (Windsurf/Cursor) y pídale scaffolding del proyecto con:
```
ng new gestor-gastos-tarjetas --standalone --routing --style=scss
npm install xlsx file-saver uuid @angular/material @angular/cdk chart.js
```
