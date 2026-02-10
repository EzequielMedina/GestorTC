import { MesNaturalPeriodoResolver } from './mes-natural-periodo.resolver';
import { Tarjeta } from '../../models/tarjeta.model';

describe('MesNaturalPeriodoResolver', () => {
  let resolver: MesNaturalPeriodoResolver;

  beforeEach(() => {
    resolver = new MesNaturalPeriodoResolver();
  });

  it('debería devolver primer y último día del mes', () => {
    const rango = resolver.getRangoParaTarjeta(null, '2025-01');
    expect(rango.fechaInicio).toBe('2025-01-01');
    expect(rango.fechaFin).toBe('2025-01-31');
  });

  it('debería manejar febrero', () => {
    const rango = resolver.getRangoParaTarjeta(null, '2025-02');
    expect(rango.fechaInicio).toBe('2025-02-01');
    expect(rango.fechaFin).toBe('2025-02-28');
  });

  it('debería ignorar la tarjeta', () => {
    const tarjeta = { id: '1', nombre: 'T', banco: 'B', limite: 0, diaCierre: 15, diaVencimiento: 20 } as Tarjeta;
    const rango = resolver.getRangoParaTarjeta(tarjeta, '2025-03');
    expect(rango.fechaInicio).toBe('2025-03-01');
    expect(rango.fechaFin).toBe('2025-03-31');
  });
});
