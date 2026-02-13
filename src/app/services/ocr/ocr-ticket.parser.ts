import { OcrTicketParsed } from '../../models/ocr-ticket.model';

/**
 * Parser puro y testeable que extrae información relevante de un texto de ticket.
 * No depende de Angular ni de la librería de OCR.
 */
export class OcrTicketParser {
  parse(texto: string): OcrTicketParsed {
    const lineas = texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => !!l);

    const monto = this.extraerMonto(lineas);
    const fecha = this.extraerFecha(lineas);
    const cuotas = this.extraerCuotas(lineas);
    const descripcion = this.extraerDescripcion(lineas, fecha);

    return { monto, fecha, descripcion, cuotas };
  }

  private extraerMonto(lineas: string[]): number | undefined {
    // 1) Ignorar líneas que típicamente contienen datos no monetarios (teléfono, RFC, etc.)
    const candidatas = lineas.filter(
      (l) => !/(tel[\.ééfono]*|rfc)/i.test(l)
    );

    // Helper para parsear un string numérico a número
    const parseMonto = (valorCrudo: string | undefined): number | undefined => {
      if (!valorCrudo) return undefined;
      const normalizado = valorCrudo.replace(/\./g, '').replace(',', '.');
      const valor = Number(normalizado);
      if (Number.isNaN(valor) || valor <= 0) return undefined;
      return +valor.toFixed(2);
    };

    // 2) Priorizar líneas con la palabra TOTAL (desde abajo hacia arriba)
    for (let i = candidatas.length - 1; i >= 0; i--) {
      const linea = candidatas[i];
      if (/total/i.test(linea)) {
        const match = linea.match(/total[^\d\-]*\$?\s*([\d\.,]+)/i);
        const monto = parseMonto(match?.[1]);
        if (monto !== undefined) {
          return monto;
        }
      }
    }

    // 3) Luego, líneas cercanas al final que parezcan montos (con $ o decimales)
    for (let i = candidatas.length - 1; i >= 0; i--) {
      const linea = candidatas[i];
      if (!/[\d]/.test(linea)) continue;

      // Requerimos que tenga símbolo $ o separador decimal para evitar teléfonos largos
      if (!/[\$,\.]/.test(linea)) continue;

      const match = linea.match(/\$?\s*([\d\.,]+)\s*$/);
      const monto = parseMonto(match?.[1]);
      if (monto !== undefined) {
        return monto;
      }
    }

    // 4) Último recurso: buscar cualquier número razonable desde abajo (descartando números muy largos tipo teléfono)
    for (let i = candidatas.length - 1; i >= 0; i--) {
      const linea = candidatas[i];
      const match = linea.match(/([\d\.,]+)/);
      const crudo = match?.[1];
      if (!crudo) continue;

      // Si es un entero sin puntos/commas y con muchos dígitos, probablemente no es un monto
      const soloDigitos = /^[0-9]+$/.test(crudo);
      if (soloDigitos && crudo.length >= 7) {
        continue;
      }

      const monto = parseMonto(crudo);
      if (monto !== undefined) {
        return monto;
      }
    }

    return undefined;
  }

  private extraerFecha(lineas: string[]): string | undefined {
    const parseFecha = (d: string, m: string, y: string): string | undefined => {
      const diaNum = +d;
      const mesNum = +m;
      let anioNum = +y;

      if (anioNum < 100) {
        anioNum = 2000 + anioNum;
      }

      if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12) {
        return undefined;
      }

      const dia = String(diaNum).padStart(2, '0');
      const mes = String(mesNum).padStart(2, '0');
      return `${anioNum}-${mes}-${dia}`;
    };

    // Patrón flexible: dd/mm/yyyy o dd-mm-yyyy o dd.mm.yy, con espacios opcionales (OCR a veces agrega espacios)
    const patronFecha = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/;

    const probarTexto = (texto: string): string | undefined => {
      const match = texto.match(patronFecha);
      if (match) {
        const [, d, m, y] = match;
        return parseFecha(d, m, y);
      }
      return undefined;
    };

    // 1) Priorizar líneas que contengan hora (voucher: "07/02/2026 11:40 a. m." en una o dos líneas)
    for (const linea of lineas) {
      if (!/\d{1,2}\s*[:.]\s*\d{2}/.test(linea)) continue;
      const fecha = probarTexto(linea);
      if (fecha) return fecha;
    }

    // 2) Buscar en cada línea por separado
    for (const linea of lineas) {
      const fecha = probarTexto(linea);
      if (fecha) return fecha;
    }

    // 3) Fallback: texto completo (por si la fecha está partida o pegada a otra cosa)
    const textoCompleto = lineas.join(' ');
    return probarTexto(textoCompleto);
  }

  private extraerCuotas(lineas: string[]): number | undefined {
    for (const linea of lineas) {
      const match = linea.match(/cuotas?\s*[:=]?\s*(\d+)/i);
      if (match) {
        const n = Number(match[1]);
        if (!Number.isNaN(n) && n > 0 && n < 100) {
          return Math.floor(n);
        }
      }
    }
    return undefined;
  }

  private extraerDescripcion(lineas: string[], fechaISO?: string): string | undefined {
    if (!lineas.length) return undefined;

    // 1) Intentar encontrar una línea que parezca nombre de comercio:
    // - muchas letras, pocas cifras
    // - evitar palabras genéricas como TICKET, VENTA, VISA, DEBITO, CUOTAS, etc.
    const patronesGenericos = /(ticket|venta|cuotas?|visa|d[eé]bito|cr[eé]dito|pago|efectivo|comprobante)/i;
    const candidataComercio = lineas.find((l) => {
      const letras = (l.match(/[A-ZÁÉÍÓÚÑ]/gi) || []).length;
      const digitos = (l.match(/\d/g) || []).length;
      return letras >= 4 && letras > digitos && !patronesGenericos.test(l);
    });

    if (candidataComercio) {
      return candidataComercio.slice(0, 80);
    }

    // 2) Si no encontramos comercio pero tenemos fecha, construir un texto tipo "Ticket 07/02/2026"
    if (fechaISO) {
      const [anio, mes, dia] = fechaISO.split('-');
      if (anio && mes && dia) {
        return `Ticket ${dia}/${mes}/${anio}`;
      }
    }

    // 3) Fallback: primera línea con mayúsculas, como antes
    const candidata =
      lineas.find((l) => /[A-Z]/.test(l) && !/^\d+/.test(l)) ?? lineas[0];

    return candidata.slice(0, 80);
  }
}

