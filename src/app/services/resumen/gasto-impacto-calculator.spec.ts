import { RangoFechas } from '../../models/resumen/rango-fechas';
import { Gasto } from '../../models/gasto.model';
import { gastoImpactaEnRango } from './gasto-impacto-calculator';

describe('gastoImpactaEnRango', () => {
  it('debería devolver monto si gasto de una cuota está dentro del rango', () => {
    const gasto: Gasto = {
      id: '1',
      tarjetaId: 't1',
      descripcion: 'Test',
      monto: 1000,
      fecha: '2025-01-15'
    };
    const rango = new RangoFechas('2025-01-01', '2025-01-31');
    expect(gastoImpactaEnRango(gasto, rango)).toBe(1000);
  });

  it('debería devolver 0 si gasto de una cuota está fuera del rango', () => {
    const gasto: Gasto = {
      id: '1',
      tarjetaId: 't1',
      descripcion: 'Test',
      monto: 1000,
      fecha: '2025-02-15'
    };
    const rango = new RangoFechas('2025-01-01', '2025-01-31');
    expect(gastoImpactaEnRango(gasto, rango)).toBe(0);
  });

  it('debería sumar cuotas cuya fecha cae en el rango', () => {
    const gasto: Gasto = {
      id: '1',
      tarjetaId: 't1',
      descripcion: 'Cuotas',
      monto: 3000,
      fecha: '2025-01-10',
      cantidadCuotas: 3,
      primerMesCuota: '2025-01-01'
    };
    const rango = new RangoFechas('2025-01-01', '2025-02-28');
    expect(gastoImpactaEnRango(gasto, rango)).toBe(2000);
  });
});
