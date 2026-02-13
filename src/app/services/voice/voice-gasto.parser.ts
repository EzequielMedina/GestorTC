import { VoiceGastoParsed } from '../../models/voice-gasto.model';

/** Tarjeta mínima para resolver nombre → id */
export interface TarjetaRef {
  id: string;
  nombre: string;
}

/**
 * Parser puro y testeable que extrae monto, descripción y tarjeta de una frase de voz.
 * Frases tipo: "Gasté 5000 en supermercado", "Gasté mil en café con Visa".
 * No depende de Angular.
 */
export class VoiceGastoParser {
  /** Palabras clave en español para detectar el patrón */
  private readonly GASTE = /gast[eé]\s+/i;
  private readonly EN = /\s+en\s+/i;
  private readonly CON = /\s+con\s+/i;

  /** Diccionario simple: palabra → valor numérico (para "mil", "cinco mil", etc.) */
  private readonly PALABRAS_NUMERO: Record<string, number> = {
    cero: 0,
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    veinte: 20,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
    cien: 100,
    ciento: 100,
    doscientos: 200,
    trescientos: 300,
    cuatrocientos: 400,
    quinientos: 500,
    seiscientos: 600,
    setecientos: 700,
    ochocientos: 800,
    novecientos: 900,
    mil: 1000,
    millón: 1_000_000,
    millones: 1_000_000
  };

  parse(texto: string, tarjetas?: TarjetaRef[]): VoiceGastoParsed {
    const raw = (texto || '').trim();
    if (!raw) {
      return { descripcion: '', rawText: raw };
    }

    const monto = this.extraerMonto(raw);
    const cuotas = this.extraerCuotas(raw);
    const fecha = this.extraerFecha(raw);
    let { descripcion, tarjetaNombre } = this.extraerDescripcionYTarjeta(raw);
    const tarjetaId = tarjetas?.length && tarjetaNombre
      ? this.resolverTarjeta(tarjetaNombre, tarjetas)
      : undefined;
    // Quitar de la descripción la parte "en 3 cuotas" / "a 6 cuotas" para no duplicar
    if (cuotas != null) {
      descripcion = descripcion
        .replace(/\s+en\s+\d+\s*cuotas?\s*$/i, '')
        .replace(/\s+a\s+\d+\s*cuotas?\s*$/i, '')
        .replace(/\s+\d+\s*cuotas?\s*$/i, '')
        .replace(/\s+en\s+(tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+cuotas?\s*$/i, '')
        .trim();
    }
    // Quitar de la descripción la parte de fecha mencionada
    if (fecha) {
      descripcion = descripcion
        .replace(/\s+hoy\s*$/i, '')
        .replace(/\s+ayer\s*$/i, '')
        .replace(/\s+anteayer\s*$/i, '')
        .replace(/\s+el\s+\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{2,4})?\s*$/i, '')
        .replace(/\s+\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{2,4})?\s*$/i, '')
        .replace(/\s+\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\s*$/i, '')
        .trim();
    }

    return {
      monto,
      descripcion: descripcion.trim() || raw,
      tarjetaId,
      cantidadCuotas: cuotas,
      fecha,
      rawText: raw
    };
  }

  /** Meses en español → número 1-12 */
  private readonly MESES: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  };

  /**
   * Extrae fecha en ISO (YYYY-MM-DD): "hoy", "ayer", "el 15 de enero", "15/01/2025".
   */
  private extraerFecha(texto: string): string | undefined {
    const normalized = texto.replace(/\s+/g, ' ').trim().toLowerCase();
    const hoy = new Date();

    // "hoy"
    if (/\bhoy\b/.test(normalized)) {
      return this.fechaAISO(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
    }
    // "ayer"
    if (/\bayer\b/.test(normalized)) {
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);
      return this.fechaAISO(ayer.getFullYear(), ayer.getMonth() + 1, ayer.getDate());
    }
    // "anteayer"
    if (/\banteayer\b/.test(normalized)) {
      const anteayer = new Date(hoy);
      anteayer.setDate(anteayer.getDate() - 2);
      return this.fechaAISO(anteayer.getFullYear(), anteayer.getMonth() + 1, anteayer.getDate());
    }

    // "el 15 de enero" o "15 de enero de 2025"
    const matchDiaMes = normalized.match(/(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{2,4}))?/);
    if (matchDiaMes) {
      const dia = parseInt(matchDiaMes[1], 10);
      const mes = this.MESES[matchDiaMes[2]];
      let anio = matchDiaMes[3] ? parseInt(matchDiaMes[3], 10) : hoy.getFullYear();
      if (matchDiaMes[3] && matchDiaMes[3].length <= 2) {
        anio = anio < 100 ? 2000 + anio : anio;
      }
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
        return this.fechaAISO(anio, mes, dia);
      }
    }

    // 15/01 o 15/01/2025 o 15-01-2025
    const matchNum = normalized.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (matchNum) {
      const d = parseInt(matchNum[1], 10);
      const m = parseInt(matchNum[2], 10);
      let y = matchNum[3] ? parseInt(matchNum[3], 10) : hoy.getFullYear();
      if (matchNum[3] && matchNum[3].length <= 2) {
        y = y < 100 ? 2000 + y : y;
      }
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return this.fechaAISO(y, m, d);
      }
    }

    return undefined;
  }

  private fechaAISO(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  /**
   * Extrae cantidad de cuotas: "en 3 cuotas", "a 6 cuotas", "12 cuotas", "en tres cuotas".
   */
  private extraerCuotas(texto: string): number | undefined {
    const normalized = texto.replace(/\s+/g, ' ').trim();
    // Número + "cuotas" (ej. "3 cuotas", "en 6 cuotas", "a 12 cuotas")
    const matchNum = normalized.match(/(?:en|a|de)\s+(\d{1,2})\s*cuotas?/i) ?? normalized.match(/\b(\d{1,2})\s*cuotas?\b/i);
    if (matchNum?.[1]) {
      const n = parseInt(matchNum[1], 10);
      if (n >= 1 && n <= 99) return n;
    }
    // Palabras: "tres cuotas", "en seis cuotas"
    const palabrasCuotas: Record<string, number> = {
      una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
      siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12
    };
    const matchPalabra = normalized.match(/(?:en|a|de)\s+(una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+cuotas?/i)
      ?? normalized.match(/\b(una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+cuotas?\b/i);
    if (matchPalabra?.[1]) {
      const key = matchPalabra[1].toLowerCase();
      const val = palabrasCuotas[key] ?? (key === 'un' || key === 'una' ? 1 : undefined);
      if (val != null && val >= 1) return val;
    }
    return undefined;
  }

  /**
   * Extrae el monto: después de "gasté" o número explícito (5000, 1.200).
   * Soporta números en palabras: "mil", "cinco mil", "mil doscientos".
   */
  private extraerMonto(texto: string): number | undefined {
    const normalized = texto.replace(/\s+/g, ' ').trim();

    // 1) Patrón "gasté X" donde X es número o palabras
    const afterGaste = normalized.replace(this.GASTE, '').trim();
    if (afterGaste !== normalized) {
      const montoFromStart = this.parsearMontoDesdeInicio(afterGaste);
      if (montoFromStart !== undefined) {
        return montoFromStart;
      }
    }

    // 2) Cualquier número con opcional "pesos" antes/después (ej. "5000 pesos", "pesos 5000")
    const matchPesos = normalized.match(/(\d[\d\s.,]*)\s*pesos?/i) ?? normalized.match(/pesos?\s*(\d[\d\s.,]*)/i);
    if (matchPesos?.[1]) {
      const n = this.parsearNumeroCrudo(matchPesos[1]);
      if (n !== undefined) return n;
    }

    // 3) Número al inicio o tras "gasté"
    const matchNum = normalized.match(/(?:gast[eé]\s+)?(\d[\d\s.,]*?)(?=\s+en\s+|\s+pesos?|$)/i);
    if (matchNum?.[1]) {
      const n = this.parsearNumeroCrudo(matchNum[1]);
      if (n !== undefined) return n;
    }

    // 4) Palabras numéricas tras "gasté"
    const palabras = afterGaste.split(/\s+/);
    const valorPalabras = this.palabrasANumero(palabras);
    if (valorPalabras !== undefined) {
      return valorPalabras;
    }

    return undefined;
  }

  /**
   * Parsea un monto que está al inicio del texto (hasta "en" o "pesos" o fin).
   */
  private parsearMontoDesdeInicio(texto: string): number | undefined {
    const hastaEn = texto.split(/\s+en\s+/i)[0]?.trim() ?? '';
    const sinPesos = hastaEn.replace(/\s*pesos?\s*$/i, '').trim();
    const partes = sinPesos.split(/\s+/);

    // Solo dígitos/puntos/comas
    const numCrudo = this.parsearNumeroCrudo(sinPesos);
    if (numCrudo !== undefined) return numCrudo;

    return this.palabrasANumero(partes);
  }

  private parsearNumeroCrudo(s: string): number | undefined {
    if (!s) return undefined;
    const normalizado = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(normalizado);
    if (Number.isNaN(n) || n < 0) return undefined;
    return Math.round(n * 100) / 100;
  }

  /**
   * Convierte array de palabras a número (ej. ["cinco", "mil"] → 5000).
   */
  private palabrasANumero(palabras: string[]): number | undefined {
    if (!palabras.length) return undefined;
    let total = 0;
    let actual = 0;
    for (const p of palabras) {
      const lower = p.toLowerCase().replace(/[áéíóúü]/g, (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' }[c] ?? c));
      const valor = this.PALABRAS_NUMERO[lower];
      if (valor !== undefined) {
        if (valor >= 1000) {
          actual = (actual || 1) * valor;
          total += actual;
          actual = 0;
        } else if (valor >= 100) {
          actual = (actual || 1) * valor;
        } else {
          actual += valor;
        }
      } else {
        // Si aparece una palabra no numérica, dejamos de sumar (ej. "cinco mil en" → 5000)
        break;
      }
    }
    total += actual;
    return total > 0 ? total : undefined;
  }

  /**
   * Extrae descripción (texto entre "en" y "con" o final) y nombre de tarjeta (después de "con").
   */
  private extraerDescripcionYTarjeta(texto: string): { descripcion: string; tarjetaNombre?: string } {
    const hasEn = this.EN.test(texto);
    const hasCon = this.CON.test(texto);

    if (!hasEn) {
      return { descripcion: texto };
    }

    const partes = texto.split(/\s+en\s+/i);
    const despuesDeEn = partes[1]?.trim() ?? '';

    if (!hasCon) {
      // Quitar posible "X pesos" al inicio de la descripción
      const desc = despuesDeEn.replace(/^\d[\d\s.,]*\s*pesos?\s*/i, '').trim();
      return { descripcion: desc || texto };
    }

    const [descPart, conPart] = despuesDeEn.split(/\s+con\s+/i);
    const descripcion = (descPart ?? '').replace(/^\d[\d\s.,]*\s*pesos?\s*/i, '').trim();
    const tarjetaNombre = (conPart ?? '').trim();

    return {
      descripcion: descripcion || texto,
      tarjetaNombre: tarjetaNombre || undefined
    };
  }

  /**
   * Busca una tarjeta cuyo nombre contenga el texto mencionado (búsqueda parcial).
   * Devuelve id solo si hay un único match.
   */
  private resolverTarjeta(nombreMencionado: string, tarjetas: TarjetaRef[]): string | undefined {
    const busqueda = nombreMencionado.toLowerCase().trim();
    if (!busqueda) return undefined;

    const matches = tarjetas.filter((t) =>
      t.nombre.toLowerCase().includes(busqueda) || busqueda.includes(t.nombre.toLowerCase())
    );

    if (matches.length === 1) {
      return matches[0].id;
    }
    return undefined;
  }
}
