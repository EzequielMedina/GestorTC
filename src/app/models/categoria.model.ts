/**
 * Modelo que representa una categoría de gastos.
 * @property id - Identificador único de la categoría.
 * @property nombre - Nombre de la categoría.
 * @property icono - Nombre del icono de Material Icons.
 * @property color - Color hexadecimal asociado a la categoría.
 * @property esPredefinida - Indica si es una categoría predefinida del sistema.
 */
export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  esPredefinida: boolean;
}

/**
 * Categorías predefinidas del sistema
 */
export const CATEGORIAS_PREDEFINIDAS: Omit<Categoria, 'id'>[] = [
  { nombre: 'Alimentación', icono: 'restaurant', color: '#FF6B6B', esPredefinida: true },
  { nombre: 'Transporte', icono: 'directions_car', color: '#4ECDC4', esPredefinida: true },
  { nombre: 'Entretenimiento', icono: 'movie', color: '#95E1D3', esPredefinida: true },
  { nombre: 'Salud', icono: 'local_hospital', color: '#F38181', esPredefinida: true },
  { nombre: 'Educación', icono: 'school', color: '#AA96DA', esPredefinida: true },
  { nombre: 'Ropa', icono: 'checkroom', color: '#FCBAD3', esPredefinida: true },
  { nombre: 'Servicios', icono: 'home', color: '#FFD93D', esPredefinida: true },
  { nombre: 'Compras', icono: 'shopping_cart', color: '#6BCB77', esPredefinida: true },
  { nombre: 'Otros', icono: 'category', color: '#95A5A6', esPredefinida: true }
];

