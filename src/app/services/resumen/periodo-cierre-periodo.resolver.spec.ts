import { PeriodoCierrePeriodoResolver } from './periodo-cierre-periodo.resolver';
import { Tarjeta } from '../../models/tarjeta.model';

describe('PeriodoCierrePeriodoResolver', () => {
  let resolver: PeriodoCierrePeriodoResolver;

  beforeEach(() => {
    resolver = new PeriodoCierrePeriodoResolver();
  });

  it('debería devolver período 16-ene al 15-feb para cierre 15 y mes 2025-02', () => {
    const tarjeta = { id: '1', nombre: 'T', banco: 'B', limite: 0, diaCierre: 15, diaVencimiento: 20 } as Tarjeta;
    const rango = resolver.getRangoParaTarjeta(tarjeta, '2025-02');
    expect(rango.fechaInicio).toBe('2025-01-16');
    expect(rango.fechaFin).toBe('2025-02-15');
  });

  it('debería ajustar día fin en febrero (día 31 → 28)', () => {
    const tarjeta = { id: '1', nombre: 'T', banco: 'B', limite: 0, diaCierre: 31, diaVencimiento: 5 } as Tarjeta;
    const rango = resolver.getRangoParaTarjeta(tarjeta, '2025-02');
    // El día siguiente al cierre (32) no existe en enero → período empieza el 1 feb
    expect(rango.fechaInicio).toBe('2025-02-01');
    expect(rango.fechaFin).toBe('2025-02-28');
  });

  it('debería lanzar si tarjeta es null', () => {
    expect(() => resolver.getRangoParaTarjeta(null, '2025-02')).toThrow();
  });

  it('getRangoParaDiaCierre devuelve mismo rango que con tarjeta con ese diaCierre', () => {
    const rangoDiaCierre = resolver.getRangoParaDiaCierre('2026-03', 15);
    const tarjeta = { id: '1', nombre: 'T', banco: 'B', limite: 0, diaCierre: 15, diaVencimiento: 20 } as Tarjeta;
    const rangoTarjeta = resolver.getRangoParaTarjeta(tarjeta, '2026-03');
    expect(rangoDiaCierre.fechaInicio).toBe(rangoTarjeta.fechaInicio);
    expect(rangoDiaCierre.fechaFin).toBe(rangoTarjeta.fechaFin);
    expect(rangoDiaCierre.fechaInicio).toBe('2026-02-16');
    expect(rangoDiaCierre.fechaFin).toBe('2026-03-15');
  });

  it('para cierre 28 y marzo 2026, período empieza 1 mar (no 29 feb)', () => {
    const tarjeta = { id: '1', nombre: 'T', banco: 'B', limite: 0, diaCierre: 28, diaVencimiento: 5 } as Tarjeta;
    const rango = resolver.getRangoParaTarjeta(tarjeta, '2026-03');
    expect(rango.fechaInicio).toBe('2026-03-01');
    expect(rango.fechaFin).toBe('2026-03-28');
  });
});
