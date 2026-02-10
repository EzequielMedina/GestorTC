# Specs de features — GestorTC

Esta carpeta contiene **especificaciones en archivos .md** para que el desarrollador implemente las mejoras marcadas con **SI** en [MEJORAS_SUGERIDAS.md](../MEJORAS_SUGERIDAS.md).

Cada spec incluye:
- **Objetivo** y referencia al documento de mejoras
- **Requisitos funcionales** y criterios de aceptación
- **Notas técnicas** y archivos a tocar
- **Dependencias**

---

## Índice de specs

| Archivo | Mejora (MEJORAS_SUGERIDAS) |
|---------|----------------------------|
| [spec-resumen-periodos.md](./spec-resumen-periodos.md) | 1.2 Resumen y períodos — período de cierre y comparar meses/años |
| [spec-gastos-registro.md](./spec-gastos-registro.md) | 1.4 Gastos y registro — recordatorios PWA y carga CSV/Excel servicios |
| [spec-reportes-exportacion.md](./spec-reportes-exportacion.md) | 1.5 Reportes — exportar a Excel y gráficos en PDF |
| [spec-cuotas-calendario.md](./spec-cuotas-calendario.md) | 1.7 Cuotas y calendario — recordatorio día vencimiento y eventos personalizados |
| [spec-atajos-teclado-registro-rapido.md](./spec-atajos-teclado-registro-rapido.md) | 2.1 Registro rápido — atajos de teclado y FAB en móvil |
| [spec-busqueda-movil-filtros.md](./spec-busqueda-movil-filtros.md) | 2.2 Navegación y búsqueda — búsqueda en móvil y filtros en resultados |
| [spec-dashboard-empty-states.md](./spec-dashboard-empty-states.md) | 2.3 Dashboard y resumen — selector de mes y empty states |
| [spec-accesibilidad.md](./spec-accesibilidad.md) | 2.4 Accesibilidad — ARIA, teclado, contraste, alto contraste |
| [spec-onboarding-tour-tooltips.md](./spec-onboarding-tour-tooltips.md) | 2.5 Onboarding — tour contextual y tooltips |
| [spec-testing.md](./spec-testing.md) | 3.1 Testing — tests unitarios y E2E |
| [spec-rendimiento.md](./spec-rendimiento.md) | 3.2 Rendimiento — paginación/virtual scroll y caché |
| [spec-validacion-robustez.md](./spec-validacion-robustez.md) | 3.3 Validación y robustez — formularios y ErrorHandler |
| [spec-codigo-mantenimiento.md](./spec-codigo-mantenimiento.md) | 3.4 Código y mantenimiento — console.log y JSDoc |
| [spec-registro-voz.md](./spec-registro-voz.md) | 4.1 Registro por voz |
| [spec-ocr-ticket.md](./spec-ocr-ticket.md) | 4.2 Escanear ticket (OCR) |

---

## Orden sugerido de implementación

1. spec-atajos-teclado-registro-rapido  
2. spec-validacion-robustez  
3. spec-codigo-mantenimiento  
4. spec-dashboard-empty-states  
5. spec-cuotas-calendario (eventos personalizados + recordatorio día vencimiento)  
6. spec-resumen-periodos  
7. spec-reportes-exportacion  
8. spec-gastos-registro (recordatorios + CSV/Excel)  
9. spec-busqueda-movil-filtros  
10. spec-accesibilidad  
11. spec-onboarding-tour-tooltips  
12. spec-testing  
13. spec-rendimiento  
14. spec-registro-voz  
15. spec-ocr-ticket  

---

*Generado a partir de MEJORAS_SUGERIDAS.md (ítems marcados con SI).*
