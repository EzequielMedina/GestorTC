import { VoiceGastoParser } from './voice-gasto.parser';
import { TarjetaRef } from './voice-gasto.parser';

describe('VoiceGastoParser', () => {
  const parser = new VoiceGastoParser();

  const tarjetas: TarjetaRef[] = [
    { id: 't1', nombre: 'Visa Oro' },
    { id: 't2', nombre: 'Mastercard Naranja' },
    { id: 't3', nombre: 'Amex' }
  ];

  it('extrae monto y descripción de "gasté 5000 en supermercado"', () => {
    const result = parser.parse('gasté 5000 en supermercado', tarjetas);
    expect(result.monto).toBe(5000);
    expect(result.descripcion).toBe('supermercado');
    expect(result.tarjetaId).toBeUndefined();
  });

  it('extrae monto, descripción y tarjeta de "gasté 5000 en supermercado con Visa"', () => {
    const result = parser.parse('gasté 5000 en supermercado con Visa', tarjetas);
    expect(result.monto).toBe(5000);
    expect(result.descripcion).toBe('supermercado');
    expect(result.tarjetaId).toBe('t1');
  });

  it('extrae monto en palabras "gasté mil en café"', () => {
    const result = parser.parse('gasté mil en café', tarjetas);
    expect(result.monto).toBe(1000);
    expect(result.descripcion).toBe('café');
  });

  it('extrae "cinco mil" como 5000', () => {
    const result = parser.parse('gasté cinco mil en restaurante', tarjetas);
    expect(result.monto).toBe(5000);
    expect(result.descripcion).toBe('restaurante');
  });

  it('extrae "mil doscientos" como 1200', () => {
    const result = parser.parse('gasté mil doscientos en panadería', tarjetas);
    expect(result.monto).toBe(1200);
    expect(result.descripcion).toBe('panadería');
  });

  it('resuelve tarjeta por nombre parcial "Naranja"', () => {
    const result = parser.parse('gasté 3000 en combustible con Naranja', tarjetas);
    expect(result.tarjetaId).toBe('t2');
    expect(result.descripcion).toBe('combustible');
  });

  it('sin monto detectado deja descripción como texto completo', () => {
    const result = parser.parse('compré algo en la feria', tarjetas);
    expect(result.monto).toBeUndefined();
    expect(result.descripcion).toBe('compré algo en la feria');
  });

  it('tarjeta ambigua no asigna tarjetaId', () => {
    const tarjetasAmbiguas: TarjetaRef[] = [
      { id: 'a', nombre: 'Visa Uno' },
      { id: 'b', nombre: 'Visa Dos' }
    ];
    const result = parser.parse('gasté 1000 en café con Visa', tarjetasAmbiguas);
    expect(result.monto).toBe(1000);
    expect(result.descripcion).toBe('café');
    expect(result.tarjetaId).toBeUndefined();
  });

  it('texto vacío devuelve descripción vacía', () => {
    const result = parser.parse('', tarjetas);
    expect(result.descripcion).toBe('');
    expect(result.monto).toBeUndefined();
    expect(result.tarjetaId).toBeUndefined();
  });

  it('incluye rawText en el resultado', () => {
    const frase = 'gasté 5000 en supermercado';
    const result = parser.parse(frase, tarjetas);
    expect(result.rawText).toBe(frase);
  });

  it('acepta "gasté" con tilde', () => {
    const result = parser.parse('gasté 2000 en farmacia', tarjetas);
    expect(result.monto).toBe(2000);
    expect(result.descripcion).toBe('farmacia');
  });

  it('parsea monto con "pesos"', () => {
    const result = parser.parse('gasté 1500 pesos en librería', tarjetas);
    expect(result.monto).toBe(1500);
    expect(result.descripcion).toBe('librería');
  });

  it('extrae cantidad de cuotas "en 3 cuotas"', () => {
    const result = parser.parse('gasté 5000 en supermercado en 3 cuotas', tarjetas);
    expect(result.monto).toBe(5000);
    expect(result.descripcion).toBe('supermercado');
    expect(result.cantidadCuotas).toBe(3);
  });

  it('extrae cuotas "a 6 cuotas" y no las deja en la descripción', () => {
    const result = parser.parse('gasté 10000 en electro a 6 cuotas', tarjetas);
    expect(result.cantidadCuotas).toBe(6);
    expect(result.descripcion).toBe('electro');
  });

  it('extrae cuotas en palabras "en tres cuotas"', () => {
    const result = parser.parse('gasté 3000 en ropa en tres cuotas', tarjetas);
    expect(result.cantidadCuotas).toBe(3);
    expect(result.descripcion).toBe('ropa');
  });

  it('extrae fecha "hoy"', () => {
    const result = parser.parse('gasté 1000 en café hoy', tarjetas);
    expect(result.fecha).toBe(new Date().toISOString().slice(0, 10));
    expect(result.descripcion).toBe('café');
  });

  it('extrae fecha "el 15 de enero"', () => {
    const result = parser.parse('gasté 5000 en supermercado el 15 de enero', tarjetas);
    const year = new Date().getFullYear();
    expect(result.fecha).toBe(`${year}-01-15`);
    expect(result.descripcion).toBe('supermercado');
  });

  it('extrae fecha "15/01/2025"', () => {
    const result = parser.parse('gasté 2000 en farmacia 15/01/2025', tarjetas);
    expect(result.fecha).toBe('2025-01-15');
    expect(result.descripcion).toBe('farmacia');
  });
});
