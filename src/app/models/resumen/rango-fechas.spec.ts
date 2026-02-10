import { RangoFechas } from './rango-fechas';

describe('RangoFechas', () => {
  it('debería crear un rango válido', () => {
    const rango = new RangoFechas('2025-01-01', '2025-01-31');
    expect(rango.fechaInicio).toBe('2025-01-01');
    expect(rango.fechaFin).toBe('2025-01-31');
  });

  it('incluye() debería devolver true para fecha dentro del rango', () => {
    const rango = new RangoFechas('2025-01-10', '2025-01-20');
    expect(rango.incluye('2025-01-15')).toBe(true);
    expect(rango.incluye('2025-01-10')).toBe(true);
    expect(rango.incluye('2025-01-20')).toBe(true);
  });

  it('incluye() debería devolver false para fecha antes del rango', () => {
    const rango = new RangoFechas('2025-01-10', '2025-01-20');
    expect(rango.incluye('2025-01-09')).toBe(false);
    expect(rango.incluye('2024-12-31')).toBe(false);
  });

  it('incluye() debería devolver false para fecha después del rango', () => {
    const rango = new RangoFechas('2025-01-10', '2025-01-20');
    expect(rango.incluye('2025-01-21')).toBe(false);
    expect(rango.incluye('2025-02-01')).toBe(false);
  });

  it('debería lanzar si fechaInicio es posterior a fechaFin', () => {
    expect(() => new RangoFechas('2025-01-31', '2025-01-01')).toThrow();
  });

  it('debería lanzar si faltan fechas', () => {
    expect(() => new RangoFechas('', '2025-01-31')).toThrow();
    expect(() => new RangoFechas('2025-01-01', '')).toThrow();
  });
});
