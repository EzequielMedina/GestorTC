import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Gasto } from '../models/gasto.model';
import { Tarjeta } from '../models/tarjeta.model';
import { CompraDolar } from '../models/compra-dolar.model';
import { VentaDolar } from '../models/venta-dolar.model';

/**
 * Servicio para manejar la importación y exportación de datos en formato Excel
 */
@Injectable({
  providedIn: 'root'
})
export class ImportarExportarService {
  private readonly HOJA_TARJETAS = 'Tarjetas';
  private readonly HOJA_GASTOS = 'Gastos';
  private readonly HOJA_RESUMEN_MENSUAL = 'ResumenMensual';
  private readonly HOJA_CUOTAS_DETALLE = 'CuotasDetalle';
  private readonly HOJA_COMPRA_DOLARES = 'CompraDolares';
  private readonly HOJA_VENTA_DOLARES = 'VentaDolares';

  constructor() {}

  /**
   * Exporta los datos de tarjetas, gastos y compras de dólares a un archivo Excel
   * @param tarjetas Lista de tarjetas a exportar
   * @param gastos Lista de gastos a exportar
   * @param compraDolares Lista de compras de dólares a exportar
   * @param nombreArchivo Nombre del archivo a generar (sin extensión)
   */
  exportarAExcel(
    tarjetas: Tarjeta[],
    gastos: Gasto[],
    compraDolares: CompraDolar[] = [],
    nombreArchivo: string = 'gestor-tc-exportacion',
    ventaDolares: VentaDolar[] = []
  ): void {
    try {
      // Crear un nuevo libro de trabajo
      const wb = XLSX.utils.book_new();
      
      // Convertir los datos a hojas de cálculo
      const wsTarjetas = XLSX.utils.json_to_sheet(this.prepararDatosParaExportar(tarjetas, 'tarjeta'));
      const wsGastos = XLSX.utils.json_to_sheet(this.prepararDatosParaExportar(gastos, 'gasto'));
      const wsResumenMensual = XLSX.utils.json_to_sheet(this.generarResumenMensual(tarjetas, gastos));
      const wsCuotasDetalle = XLSX.utils.json_to_sheet(this.generarCuotasDetalle(tarjetas, gastos));
      const wsCompraDolares = XLSX.utils.json_to_sheet(this.prepararDatosParaExportar(compraDolares, 'compraDolar'));
      const wsVentaDolares = XLSX.utils.json_to_sheet(this.prepararDatosParaExportar(ventaDolares, 'ventaDolar'));
      
      // Añadir las hojas al libro de trabajo
      XLSX.utils.book_append_sheet(wb, wsTarjetas, this.HOJA_TARJETAS);
      XLSX.utils.book_append_sheet(wb, wsGastos, this.HOJA_GASTOS);
      XLSX.utils.book_append_sheet(wb, wsResumenMensual, this.HOJA_RESUMEN_MENSUAL);
      XLSX.utils.book_append_sheet(wb, wsCuotasDetalle, this.HOJA_CUOTAS_DETALLE);
      XLSX.utils.book_append_sheet(wb, wsCompraDolares, this.HOJA_COMPRA_DOLARES);
      XLSX.utils.book_append_sheet(wb, wsVentaDolares, this.HOJA_VENTA_DOLARES);
      
      // Generar el archivo Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Guardar el archivo
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      return;
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      throw new Error('No se pudo exportar los datos a Excel');
    }
  }

  /**
   * Exporta los datos a XML (tarjetas, gastos, compras y ventas de dólares)
   */
  exportarAXML(
    tarjetas: Tarjeta[],
    gastos: Gasto[],
    compraDolares: CompraDolar[] = [],
    ventaDolares: VentaDolar[] = [],
    nombreArchivo: string = 'gestor-tc-exportacion'
  ): void {
    const escapeXml = (value: any) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const toISO = (d: any) => {
      try {
        if (!d) return '';
        const date = (d instanceof Date) ? d : new Date(d);
        return isNaN(date.getTime()) ? '' : date.toISOString();
      } catch { return ''; }
    };

    const xmlParts: string[] = [];
    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
    xmlParts.push('<GestorTC>');

    // Tarjetas
    xmlParts.push('  <Tarjetas>');
    tarjetas.forEach(t => {
      xmlParts.push('    <Tarjeta>');
      xmlParts.push(`      <ID>${escapeXml(t.id)}</ID>`);
      xmlParts.push(`      <Nombre>${escapeXml(t.nombre)}</Nombre>`);
      xmlParts.push(`      <Banco>${escapeXml(t.banco)}</Banco>`);
      xmlParts.push(`      <Limite>${escapeXml(t.limite)}</Limite>`);
      xmlParts.push(`      <DiaCierre>${escapeXml(t.diaCierre)}</DiaCierre>`);
      xmlParts.push(`      <DiaVencimiento>${escapeXml(t.diaVencimiento)}</DiaVencimiento>`);
      xmlParts.push(`      <UltimosDigitos>${escapeXml(t.ultimosDigitos)}</UltimosDigitos>`);
      xmlParts.push('    </Tarjeta>');
    });
    xmlParts.push('  </Tarjetas>');

    // Gastos
    xmlParts.push('  <Gastos>');
    gastos.forEach(g => {
      xmlParts.push('    <Gasto>');
      xmlParts.push(`      <ID>${escapeXml(g.id)}</ID>`);
      xmlParts.push(`      <TarjetaId>${escapeXml(g.tarjetaId)}</TarjetaId>`);
      xmlParts.push(`      <Descripcion>${escapeXml(g.descripcion)}</Descripcion>`);
      xmlParts.push(`      <Monto>${escapeXml(g.monto)}</Monto>`);
      xmlParts.push(`      <Fecha>${escapeXml(g.fecha)}</Fecha>`);
      xmlParts.push(`      <CompartidoCon>${escapeXml(g.compartidoCon)}</CompartidoCon>`);
      xmlParts.push(`      <PorcentajeCompartido>${escapeXml(g.porcentajeCompartido)}</PorcentajeCompartido>`);
      xmlParts.push(`      <CantidadCuotas>${escapeXml(g.cantidadCuotas)}</CantidadCuotas>`);
      xmlParts.push(`      <PrimerMesCuota>${escapeXml(g.primerMesCuota)}</PrimerMesCuota>`);
      xmlParts.push(`      <MontoPorCuota>${escapeXml(g.montoPorCuota)}</MontoPorCuota>`);
      xmlParts.push('    </Gasto>');
    });
    xmlParts.push('  </Gastos>');

    // Compras de dólares
    xmlParts.push('  <CompraDolares>');
    compraDolares.forEach(c => {
      xmlParts.push('    <CompraDolar>');
      xmlParts.push(`      <ID>${escapeXml(c.id)}</ID>`);
      xmlParts.push(`      <Mes>${escapeXml(c.mes)}</Mes>`);
      xmlParts.push(`      <Anio>${escapeXml(c.anio)}</Anio>`);
      xmlParts.push(`      <Dolares>${escapeXml(c.dolares)}</Dolares>`);
      xmlParts.push(`      <PrecioCompra>${escapeXml(c.precioCompra)}</PrecioCompra>`);
      xmlParts.push(`      <PrecioCompraTotal>${escapeXml(c.precioCompraTotal)}</PrecioCompraTotal>`);
      xmlParts.push(`      <PrecioAPI>${escapeXml(c.precioAPI ?? '')}</PrecioAPI>`);
      xmlParts.push(`      <PrecioAPITotal>${escapeXml(c.precioAPITotal ?? '')}</PrecioAPITotal>`);
      xmlParts.push(`      <Diferencia>${escapeXml(c.diferencia ?? '')}</Diferencia>`);
      xmlParts.push(`      <FechaCreacion>${escapeXml(toISO(c.fechaCreacion))}</FechaCreacion>`);
      xmlParts.push(`      <FechaActualizacion>${escapeXml(toISO(c.fechaActualizacion))}</FechaActualizacion>`);
      xmlParts.push('    </CompraDolar>');
    });
    xmlParts.push('  </CompraDolares>');

    // Ventas de dólares
    xmlParts.push('  <VentaDolares>');
    ventaDolares.forEach(v => {
      xmlParts.push('    <VentaDolar>');
      xmlParts.push(`      <ID>${escapeXml(v.id)}</ID>`);
      xmlParts.push(`      <Mes>${escapeXml(v.mes)}</Mes>`);
      xmlParts.push(`      <Anio>${escapeXml(v.anio)}</Anio>`);
      xmlParts.push(`      <Dolares>${escapeXml(v.dolares)}</Dolares>`);
      xmlParts.push(`      <PrecioVenta>${escapeXml(v.precioVenta)}</PrecioVenta>`);
      xmlParts.push(`      <PrecioVentaTotal>${escapeXml(v.precioVentaTotal)}</PrecioVentaTotal>`);
      xmlParts.push(`      <PrecioCompraPromedio>${escapeXml(v.precioCompraPromedio)}</PrecioCompraPromedio>`);
      xmlParts.push(`      <Ganancia>${escapeXml(v.ganancia)}</Ganancia>`);
      xmlParts.push(`      <PorcentajeGanancia>${escapeXml(v.porcentajeGanancia)}</PorcentajeGanancia>`);
      xmlParts.push(`      <FechaCreacion>${escapeXml(toISO(v.fechaCreacion))}</FechaCreacion>`);
      xmlParts.push(`      <FechaActualizacion>${escapeXml(toISO(v.fechaActualizacion))}</FechaActualizacion>`);
      xmlParts.push('    </VentaDolar>');
    });
    xmlParts.push('  </VentaDolares>');

    xmlParts.push('</GestorTC>');

    const xmlString = xmlParts.join('\n');
    const blob = new Blob([xmlString], { type: 'application/xml' });
    saveAs(blob, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xml`);
  }

  /**
   * Importa datos desde un archivo XML
   */
  async importarDesdeXML(file: File): Promise<{ tarjetas: Tarjeta[]; gastos: Gasto[]; compraDolares: CompraDolar[]; ventaDolares: VentaDolar[] }> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = String(reader.result || '');
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'application/xml');
            const parseError = xml.getElementsByTagName('parsererror')[0];
            if (parseError) throw new Error('XML inválido');

            const getText = (el: Element | null, tag: string): string => {
              const n = el?.getElementsByTagName(tag)[0];
              return n ? (n.textContent || '') : '';
            };

            // Tarjetas
            const tarjetas: Tarjeta[] = Array.from(xml.getElementsByTagName('Tarjeta')).map(t => ({
              id: getText(t, 'ID'),
              nombre: getText(t, 'Nombre'),
              banco: getText(t, 'Banco'),
              limite: Number(getText(t, 'Limite') || 0),
              diaCierre: Number(getText(t, 'DiaCierre') || 1),
              diaVencimiento: Number(getText(t, 'DiaVencimiento') || 1),
              ultimosDigitos: getText(t, 'UltimosDigitos') || undefined
            }));

            // Gastos
            const gastos: Gasto[] = Array.from(xml.getElementsByTagName('Gasto')).map(g => ({
              id: getText(g, 'ID'),
              tarjetaId: getText(g, 'TarjetaId'),
              descripcion: getText(g, 'Descripcion'),
              monto: Number(getText(g, 'Monto') || 0),
              fecha: getText(g, 'Fecha') || new Date().toISOString().split('T')[0],
              compartidoCon: getText(g, 'CompartidoCon') || undefined,
              porcentajeCompartido: getText(g, 'PorcentajeCompartido') ? Number(getText(g, 'PorcentajeCompartido')) : undefined,
              cantidadCuotas: getText(g, 'CantidadCuotas') ? Number(getText(g, 'CantidadCuotas')) : undefined,
              primerMesCuota: getText(g, 'PrimerMesCuota') || undefined,
              montoPorCuota: getText(g, 'MontoPorCuota') ? Number(getText(g, 'MontoPorCuota')) : undefined
            } as Gasto));

            // Compras
            const compraDolares: CompraDolar[] = Array.from(xml.getElementsByTagName('CompraDolar')).map(c => ({
              id: Number(getText(c, 'ID') || 0) || undefined,
              mes: Number(getText(c, 'Mes') || 1),
              anio: Number(getText(c, 'Anio') || new Date().getFullYear()),
              dolares: Number(getText(c, 'Dolares') || 0),
              precioCompra: Number(getText(c, 'PrecioCompra') || 0),
              precioCompraTotal: Number(getText(c, 'PrecioCompraTotal') || 0),
              precioAPI: getText(c, 'PrecioAPI') ? Number(getText(c, 'PrecioAPI')) : undefined,
              precioAPITotal: getText(c, 'PrecioAPITotal') ? Number(getText(c, 'PrecioAPITotal')) : undefined,
              diferencia: getText(c, 'Diferencia') ? Number(getText(c, 'Diferencia')) : undefined,
              fechaCreacion: getText(c, 'FechaCreacion') ? new Date(getText(c, 'FechaCreacion')) : undefined,
              fechaActualizacion: getText(c, 'FechaActualizacion') ? new Date(getText(c, 'FechaActualizacion')) : undefined
            }));

            // Ventas
            const ventaDolares: VentaDolar[] = Array.from(xml.getElementsByTagName('VentaDolar')).map(v => ({
              id: Number(getText(v, 'ID') || 0) || undefined,
              mes: Number(getText(v, 'Mes') || 1),
              anio: Number(getText(v, 'Anio') || new Date().getFullYear()),
              dolares: Number(getText(v, 'Dolares') || 0),
              precioVenta: Number(getText(v, 'PrecioVenta') || 0),
              precioVentaTotal: Number(getText(v, 'PrecioVentaTotal') || 0),
              precioCompraPromedio: Number(getText(v, 'PrecioCompraPromedio') || 0),
              ganancia: Number(getText(v, 'Ganancia') || 0),
              porcentajeGanancia: Number(getText(v, 'PorcentajeGanancia') || 0),
              fechaCreacion: getText(v, 'FechaCreacion') ? new Date(getText(v, 'FechaCreacion')) : new Date(),
              fechaActualizacion: getText(v, 'FechaActualizacion') ? new Date(getText(v, 'FechaActualizacion')) : new Date()
            } as VentaDolar));

            resolve({ tarjetas, gastos, compraDolares, ventaDolares });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Importa datos desde un archivo Excel
   * @param file Archivo Excel a importar
   * @returns Promesa con los datos importados { tarjetas: Tarjeta[], gastos: Gasto[], compraDolares: CompraDolar[] }
   */
  async importarDesdeExcel(file: File): Promise<{ tarjetas: Tarjeta[]; gastos: Gasto[]; compraDolares: CompraDolar[]; ventaDolares: VentaDolar[] }> {
    return new Promise((resolve, reject) => {
      try {
        const fileReader = new FileReader();
        
        fileReader.onload = (e: any) => {
          try {
            const arrayBuffer = e.target.result;
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            console.log('DEBUG - Hojas disponibles en el Excel:', Object.keys(workbook.Sheets));
            
            // Obtener las hojas
            const wsTarjetas = workbook.Sheets[this.HOJA_TARJETAS];
            const wsGastos = workbook.Sheets[this.HOJA_GASTOS];
            const wsCompraDolares = workbook.Sheets[this.HOJA_COMPRA_DOLARES];
            const wsVentaDolares = workbook.Sheets[this.HOJA_VENTA_DOLARES];
            
            if (!wsTarjetas && !wsGastos && !wsCompraDolares && !wsVentaDolares) {
              throw new Error('El archivo no contiene las hojas de datos esperadas');
            }
            
            // Convertir las hojas a objetos
            const tarjetasRaw = wsTarjetas 
              ? XLSX.utils.sheet_to_json(wsTarjetas)
              : [];
            const gastosRaw = wsGastos
              ? XLSX.utils.sheet_to_json(wsGastos)
              : [];
            const compraDolaresRaw = wsCompraDolares
              ? XLSX.utils.sheet_to_json(wsCompraDolares)
              : [];
            const ventaDolaresRaw = wsVentaDolares
              ? XLSX.utils.sheet_to_json(wsVentaDolares)
              : [];
              
            console.log('DEBUG - Datos raw de tarjetas:', tarjetasRaw);
            console.log('DEBUG - Datos raw de gastos:', gastosRaw);
            console.log('DEBUG - Datos raw de compra dólares:', compraDolaresRaw);
            console.log('DEBUG - Datos raw de venta dólares:', ventaDolaresRaw);
            
            const tarjetas: Tarjeta[] = wsTarjetas 
              ? this.prepararDatosDesdeImportar(tarjetasRaw, 'tarjeta') as Tarjeta[]
              : [];
              
            const gastos: Gasto[] = wsGastos
              ? this.prepararDatosDesdeImportar(gastosRaw, 'gasto') as Gasto[]
              : [];
              
            const compraDolares: CompraDolar[] = wsCompraDolares
              ? this.prepararDatosDesdeImportar(compraDolaresRaw, 'compraDolar') as CompraDolar[]
              : [];
            const ventaDolares: VentaDolar[] = wsVentaDolares
              ? this.prepararDatosDesdeImportar(ventaDolaresRaw, 'ventaDolar') as VentaDolar[]
              : [];
            
            console.log('DEBUG - Tarjetas procesadas:', tarjetas);
            console.log('DEBUG - Gastos procesados:', gastos);
            console.log('DEBUG - Compra dólares procesadas:', compraDolares);
            
            resolve({ tarjetas, gastos, compraDolares, ventaDolares });
          } catch (error) {
            console.error('Error al procesar el archivo Excel:', error);
            reject(new Error('Formato de archivo no válido'));
          }
        };
        
        fileReader.onerror = (error) => {
          console.error('Error al leer el archivo:', error);
          reject(new Error('No se pudo leer el archivo'));
        };
        
        fileReader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Error en importarDesdeExcel:', error);
        reject(new Error('Error al procesar el archivo'));
      }
    });
  }

  /**
   * Prepara los datos para exportar, asegurando que solo se incluyan las propiedades necesarias
   */
  private prepararDatosParaExportar(datos: any[], tipo: 'tarjeta' | 'gasto' | 'compraDolar' | 'ventaDolar'): any[] {
    if (tipo === 'tarjeta') {
      return (datos as Tarjeta[]).map(t => ({
        'ID': t.id,
        'Nombre': t.nombre,
        'Banco': t.banco,
        'Límite de Crédito': t.limite,
        'Día de Cierre': t.diaCierre,
        'Día de Vencimiento': t.diaVencimiento,
        'Últimos Dígitos': t.ultimosDigitos || ''
      }));
    } else if (tipo === 'gasto') {
      return (datos as Gasto[]).map(g => ({
        'ID': g.id,
        'ID Tarjeta': g.tarjetaId,
        'Descripción': g.descripcion,
        'Monto': g.monto,
        'Fecha': g.fecha,
        'Compartido con': g.compartidoCon || '',
        'Porcentaje Compartido': g.porcentajeCompartido || 0,
        'Cantidad Cuotas': g.cantidadCuotas || 1,
        'Primer Mes Cuota': (g.primerMesCuota ? g.primerMesCuota.slice(0, 10) : ''),
        'Monto Por Cuota': g.montoPorCuota || ''
      }));
    } else if (tipo === 'compraDolar') {
      return (datos as CompraDolar[]).map(c => ({
        'Mes': this.obtenerNombreMes(c.mes),
        'Año': c.anio,
        'Dólares': c.dolares,
        'PrecioCompra': c.precioCompra,
        'PrecioCompraTotal': c.dolares * c.precioCompra,
        'PrecioAPI': c.precioAPI || '',
        'PrecioAPITotal': c.precioAPI ? (c.dolares * c.precioAPI) : '',
        'Diferencia': c.precioAPI ? ((c.dolares * c.precioAPI) - (c.dolares * c.precioCompra)) : '',
        'FechaCreacion': c.fechaCreacion ? new Date(c.fechaCreacion).toISOString() : '',
        'FechaActualizacion': c.fechaActualizacion ? new Date(c.fechaActualizacion).toISOString() : ''
      }));
    } else if (tipo === 'ventaDolar') {
      return (datos as VentaDolar[]).map(v => ({
        'Mes': this.obtenerNombreMes(v.mes),
        'Año': v.anio,
        'Dólares': v.dolares,
        'PrecioVenta': v.precioVenta,
        'PrecioVentaTotal': v.precioVentaTotal,
        'PrecioCompraPromedio': v.precioCompraPromedio,
        'Ganancia': v.ganancia,
        'PorcentajeGanancia': v.porcentajeGanancia,
        'FechaCreacion': v.fechaCreacion ? new Date(v.fechaCreacion).toISOString() : '',
        'FechaActualizacion': v.fechaActualizacion ? new Date(v.fechaActualizacion).toISOString() : ''
      }));
    }
    return [];
  }

  /**
   * Prepara los datos importados, convirtiéndolos al formato interno de la aplicación
   */
  private prepararDatosDesdeImportar(datos: any[], tipo: 'tarjeta' | 'gasto' | 'compraDolar' | 'ventaDolar'): any[] {
    if (tipo === 'tarjeta') {
      return datos.map((item: any) => ({
        id: item['ID'] || item['id'] || '',
        nombre: item['Nombre'] || item['nombre'] || '',
        banco: item['Banco'] || item['banco'] || '',
        limite: Number(item['Límite de Crédito'] || item['limite'] || 0),
        diaCierre: Number(item['Día de Cierre'] || item['diaCierre'] || 1),
        diaVencimiento: Number(item['Día de Vencimiento'] || item['diaVencimiento'] || 1),
        ultimosDigitos: item['Últimos Dígitos'] || item['ultimosDigitos'] || undefined
      }));
    } else if (tipo === 'gasto') {
      return datos.map((item: any) => {
        const cantidadCuotasRaw = item['Cantidad Cuotas'] ?? item['cantidadCuotas'];
        const primerMesRaw = item['Primer Mes Cuota'] ?? item['primerMesCuota'];
        const montoPorCuotaRaw = item['Monto Por Cuota'] ?? item['montoPorCuota'];

        const cantidadCuotas = cantidadCuotasRaw != null && cantidadCuotasRaw !== ''
          ? Math.max(1, Number(cantidadCuotasRaw))
          : undefined;
        let primerMesCuota: string | undefined = undefined;
        if (primerMesRaw && typeof primerMesRaw === 'string') {
          const s = primerMesRaw.trim();
          // Aceptar 'YYYY-MM' o 'YYYY-MM-DD'
          const key = s.length >= 7 ? s.slice(0, 7) : '';
          if (key) {
            const [y, m] = key.split('-');
            if (y && m) primerMesCuota = `${y}-${m}-01`;
          }
        }
        const montoPorCuota = montoPorCuotaRaw != null && montoPorCuotaRaw !== ''
          ? Number(montoPorCuotaRaw)
          : undefined;

        return {
          id: item['ID'] || item['id'] || '',
          tarjetaId: item['ID Tarjeta'] || item['tarjetaId'] || '',
          descripcion: item['Descripción'] || item['descripcion'] || '',
          monto: Number(item['Monto'] || item['monto'] || 0),
          fecha: item['Fecha'] || item['fecha'] || new Date().toISOString().split('T')[0],
          compartidoCon: item['Compartido con'] || item['compartidoCon'] || undefined,
          porcentajeCompartido: item['Porcentaje Compartido'] !== undefined 
            ? Number(item['Porcentaje Compartido']) 
            : item['porcentajeCompartido'] !== undefined 
              ? Number(item['porcentajeCompartido']) 
              : undefined,
          cantidadCuotas,
          primerMesCuota,
          montoPorCuota
        } as Gasto;
      });
    } else if (tipo === 'compraDolar') {
      return datos.map((item: any) => {
        // Convertir nombre de mes a número
        let mes = item['Mes'] || item['mes'] || 1;
        if (typeof mes === 'string') {
          mes = this.convertirNombreMesANumero(mes);
        }
        
        // Validar y convertir valores numéricos
        const dolaresRaw = item['Dólares'] || item['dolares'] || 0;
        const precioCompraRaw = item['PrecioCompra'] || item['precioCompra'] || 0;
        const precioCompraTotalRaw = item['PrecioCompraTotal'] || item['precioCompraTotal'];
        const anioRaw = item['Año'] || item['anio'] || new Date().getFullYear();
        
        const dolares = isNaN(Number(dolaresRaw)) ? 0 : Number(dolaresRaw);
        const precioCompra = isNaN(Number(precioCompraRaw)) ? 0 : Number(precioCompraRaw);
        const anio = isNaN(Number(anioRaw)) ? new Date().getFullYear() : Number(anioRaw);
        
        // Si existe PrecioCompraTotal en el Excel, usarlo; sino calcularlo
        let precioCompraTotal: number;
        if (precioCompraTotalRaw && !isNaN(Number(precioCompraTotalRaw))) {
          precioCompraTotal = Number(precioCompraTotalRaw);
        } else {
          precioCompraTotal = dolares * precioCompra;
        }
        
        return {
          id: item['ID'] || item['id'] || this.generarId(),
          mes: Number(mes),
          anio: anio,
          dolares: dolares,
          precioCompra: precioCompra,
          precioCompraTotal: precioCompraTotal,
          precioAPI: item['PrecioAPI'] && item['PrecioAPI'] !== '' ? Number(item['PrecioAPI']) : undefined,
          precioAPITotal: item['PrecioAPITotal'] && item['PrecioAPITotal'] !== '' ? Number(item['PrecioAPITotal']) : undefined,
          diferencia: item['Diferencia'] && item['Diferencia'] !== '' ? Number(item['Diferencia']) : undefined,
          fechaCreacion: item['FechaCreacion'] ? new Date(item['FechaCreacion']) : new Date(anio, Number(mes) - 1, 1),
          fechaActualizacion: item['FechaActualizacion'] ? new Date(item['FechaActualizacion']) : new Date()
        } as unknown as CompraDolar;
      });
    } else if (tipo === 'ventaDolar') {
      return datos.map((item: any) => {
        let mes = item['Mes'] || item['mes'] || 1;
        if (typeof mes === 'string') {
          mes = this.convertirNombreMesANumero(mes);
        }
        const anioRaw = item['Año'] || item['anio'] || new Date().getFullYear();
        const dolaresRaw = item['Dólares'] || item['dolares'] || 0;
        const precioVentaRaw = item['PrecioVenta'] || item['precioVenta'] || 0;
        const precioVentaTotalRaw = item['PrecioVentaTotal'] || item['precioVentaTotal'];
        const precioCompraPromedioRaw = item['PrecioCompraPromedio'] || item['precioCompraPromedio'] || 0;
        const gananciaRaw = item['Ganancia'] || item['ganancia'] || 0;
        const porcentajeGananciaRaw = item['PorcentajeGanancia'] || item['porcentajeGanancia'] || 0;

        const anio = isNaN(Number(anioRaw)) ? new Date().getFullYear() : Number(anioRaw);
        const dolares = isNaN(Number(dolaresRaw)) ? 0 : Number(dolaresRaw);
        const precioVenta = isNaN(Number(precioVentaRaw)) ? 0 : Number(precioVentaRaw);
        const precioVentaTotal = precioVentaTotalRaw && !isNaN(Number(precioVentaTotalRaw)) ? Number(precioVentaTotalRaw) : (dolares * precioVenta);
        const precioCompraPromedio = isNaN(Number(precioCompraPromedioRaw)) ? 0 : Number(precioCompraPromedioRaw);
        const ganancia = isNaN(Number(gananciaRaw)) ? (precioVenta - precioCompraPromedio) * dolares : Number(gananciaRaw);
        const porcentajeGanancia = isNaN(Number(porcentajeGananciaRaw)) ? (precioCompraPromedio > 0 ? (ganancia / (precioCompraPromedio * dolares)) * 100 : 0) : Number(porcentajeGananciaRaw);

        return {
          id: item['ID'] || item['id'] || this.generarId(),
          mes: Number(mes),
          anio: anio,
          dolares: dolares,
          precioVenta: precioVenta,
          precioVentaTotal: precioVentaTotal,
          precioCompraPromedio: precioCompraPromedio,
          ganancia: ganancia,
          porcentajeGanancia: porcentajeGanancia,
          fechaCreacion: item['FechaCreacion'] ? new Date(item['FechaCreacion']) : new Date(anio, Number(mes) - 1, 1),
          fechaActualizacion: item['FechaActualizacion'] ? new Date(item['FechaActualizacion']) : new Date()
        } as unknown as VentaDolar;
      });
    }
    return [];
  }

  /**
   * Obtiene el nombre del mes en español
   */
  private obtenerNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || 'Enero';
  }

  /**
   * Convierte el nombre del mes a número
   */
  private convertirNombreMesANumero(nombreMes: string): number {
    const meses: { [key: string]: number } = {
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
      'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    };
    return meses[nombreMes.toLowerCase()] || 1;
  }

  /**
   * Genera un ID único
   */
  private generarId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // ==========================
  // Resumen mensual (export)
  // ==========================
  private monthKeyFromISO(isoDate: string): string {
    return (isoDate || '').slice(0, 7);
  }

  private addMonths(isoYYYYMMDD: string, months: number): string {
    const [y, m, d] = (isoYYYYMMDD || '1970-01-01').split('-').map(Number);
    const date = new Date(y || 1970, (m || 1) - 1, d || 1);
    date.setMonth(date.getMonth() + months);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  }

  private firstMonthISOFromGasto(g: Gasto): string {
    const base = g.primerMesCuota || (this.monthKeyFromISO(g.fecha) + '-01');
    const [y, m] = base.slice(0, 7).split('-');
    return `${y}-${m}-01`;
  }

  private gastoImpactaMes(g: Gasto, monthKey: string): number {
    const cuotas = Math.max(1, g.cantidadCuotas || 1);
    if (cuotas <= 1) {
      return this.monthKeyFromISO(g.fecha) === monthKey ? g.monto : 0;
    }
    const montoCuota = g.montoPorCuota ?? Math.round((g.monto / cuotas) * 100) / 100;
    const firstISO = this.firstMonthISOFromGasto(g);
    for (let i = 0; i < cuotas; i++) {
      const iso = this.addMonths(firstISO, i);
      if (iso.slice(0, 7) === monthKey) return montoCuota;
    }
    return 0;
  }

  private generarResumenMensual(tarjetas: Tarjeta[], gastos: Gasto[]): Array<{ Mes: string; 'ID Tarjeta': string; Tarjeta: string; 'Total Mes': number }> {
    // Determinar rango de meses en base a gastos + cuotas
    const monthsSet = new Set<string>();
    for (const g of gastos) {
      const cuotas = Math.max(1, g.cantidadCuotas || 1);
      if (cuotas <= 1) {
        monthsSet.add(this.monthKeyFromISO(g.fecha));
      } else {
        const firstISO = this.firstMonthISOFromGasto(g);
        for (let i = 0; i < cuotas; i++) {
          monthsSet.add(this.addMonths(firstISO, i).slice(0, 7));
        }
      }
    }

    const months = Array.from(monthsSet).sort();
    const tarjetasMap = new Map(tarjetas.map(t => [t.id, t] as const));
    const rows: Array<{ Mes: string; 'ID Tarjeta': string; Tarjeta: string; 'Total Mes': number }> = [];

    for (const mes of months) {
      for (const t of tarjetas) {
        const totalMes = gastos
          .filter(g => g.tarjetaId === t.id)
          .reduce((acc, g) => acc + this.gastoImpactaMes(g, mes), 0);
        rows.push({ Mes: mes, 'ID Tarjeta': t.id, Tarjeta: t.nombre, 'Total Mes': totalMes });
      }
    }
    return rows;
  }

  private generarCuotasDetalle(
    tarjetas: Tarjeta[],
    gastos: Gasto[]
  ): Array<{ Mes: string; Tarjeta: string; Descripción: string; 'N° Cuota': string; 'Monto Cuota': number }> {
    const tarjetasMap = new Map(tarjetas.map(t => [t.id, t.nombre] as const));
    const rows: Array<{ Mes: string; Tarjeta: string; Descripción: string; 'N° Cuota': string; 'Monto Cuota': number }> = [];

    for (const g of gastos) {
      const nombreTarjeta = tarjetasMap.get(g.tarjetaId) || '';
      const cuotas = Math.max(1, g.cantidadCuotas || 1);
      const montoCuota = g.montoPorCuota ?? Math.round((g.monto / cuotas) * 100) / 100;
      const firstISO = this.firstMonthISOFromGasto(g);
      for (let i = 0; i < cuotas; i++) {
        const iso = this.addMonths(firstISO, i);
        const mes = iso.slice(0, 7);
        rows.push({
          Mes: mes,
          Tarjeta: nombreTarjeta,
          Descripción: g.descripcion,
          'N° Cuota': `${i + 1}/${cuotas}`,
          'Monto Cuota': montoCuota
        });
      }
    }
    // ordenar por Mes y Tarjeta
    rows.sort((a, b) => a.Mes.localeCompare(b.Mes) || a.Tarjeta.localeCompare(b.Tarjeta) || a['Descripción'].localeCompare(b['Descripción']));
    return rows;
  }

  /**
   * Genera una plantilla de Excel vacía con las columnas correctas
   */
  generarPlantillaExcel(): void {
    // Crear datos vacíos con las columnas correctas (igual que el export)
    const tarjetasTemplate = [{
      'ID': '(generar automáticamente)',
      'Nombre': 'Ejemplo: Visa Oro',
      'Banco': 'Ejemplo: Banco Nación',
      'Límite de Crédito': 50000,
      'Día de Cierre': 5,
      'Día de Vencimiento': 15,
      'Últimos Dígitos': '1234'
    }];

    const gastosTemplate = [{
      'ID': '(generar automáticamente)',
      'ID Tarjeta': '(copiar el ID de la tarjeta)',
      'Descripción': 'Ejemplo: Supermercado',
      'Monto': 1500.50,
      'Fecha': '2023-01-15',
      'Compartido con': 'Nombre de la persona (opcional)',
      'Porcentaje Compartido': 50,
      'Cantidad Cuotas': 1,
      'Primer Mes Cuota': '2023-02-01',
      'Monto Por Cuota': 1500.50
    }];

    // Crear hojas adicionales como en el export
    const resumenMensualTemplate = [{
      'Mes': '2023-01',
      'ID Tarjeta': '(ID de la tarjeta)',
      'Tarjeta': 'Nombre de la tarjeta',
      'Total Mes': 1500.50
    }];

    const cuotasDetalleTemplate = [{
      'Mes': '2023-01',
      'Tarjeta': 'Nombre de la tarjeta',
      'Descripción': 'Descripción del gasto',
      'N° Cuota': '1/3',
      'Monto Cuota': 500.17
    }];

    const compraDolaresTemplate = [{
      'Mes': 'Enero',
      'Año': 2024,
      'Dólares': 100,
      'PrecioCompra': 1000,
      'PrecioCompraTotal': 100000,
      'PrecioAPI': 1050,
      'PrecioAPITotal': 105000,
      'Diferencia': 5000,
      'FechaCreacion': '2024-01-01T00:00:00.000Z',
      'FechaActualizacion': '2024-01-01T00:00:00.000Z'
    }];

    const ventaDolaresTemplate = [{
      'Mes': 'Enero',
      'Año': 2024,
      'Dólares': 100,
      'PrecioVenta': 1100,
      'PrecioVentaTotal': 110000,
      'PrecioCompraPromedio': 1000,
      'Ganancia': 10000,
      'PorcentajeGanancia': 10,
      'FechaCreacion': '2024-01-01T00:00:00.000Z',
      'FechaActualizacion': '2024-01-01T00:00:00.000Z'
    }];

    // Crear el libro de trabajo
    const wb = XLSX.utils.book_new();
    const wsTarjetas = XLSX.utils.json_to_sheet(tarjetasTemplate);
    const wsGastos = XLSX.utils.json_to_sheet(gastosTemplate);
    const wsResumenMensual = XLSX.utils.json_to_sheet(resumenMensualTemplate);
    const wsCuotasDetalle = XLSX.utils.json_to_sheet(cuotasDetalleTemplate);
    const wsCompraDolares = XLSX.utils.json_to_sheet(compraDolaresTemplate);
    const wsVentaDolares = XLSX.utils.json_to_sheet(ventaDolaresTemplate);
    
    // Añadir todas las hojas como en el export
    XLSX.utils.book_append_sheet(wb, wsTarjetas, this.HOJA_TARJETAS);
    XLSX.utils.book_append_sheet(wb, wsGastos, this.HOJA_GASTOS);
    XLSX.utils.book_append_sheet(wb, wsResumenMensual, this.HOJA_RESUMEN_MENSUAL);
    XLSX.utils.book_append_sheet(wb, wsCuotasDetalle, this.HOJA_CUOTAS_DETALLE);
    XLSX.utils.book_append_sheet(wb, wsCompraDolares, this.HOJA_COMPRA_DOLARES);
    XLSX.utils.book_append_sheet(wb, wsVentaDolares, this.HOJA_VENTA_DOLARES);
    
    // Generar el archivo
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Guardar el archivo
    saveAs(data, `plantilla_gestor_tc_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
