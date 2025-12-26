import { Injectable } from '@angular/core';
import { Observable, of, from, throwError, BehaviorSubject, combineLatest, firstValueFrom } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { GastoServicioImportado, ValidationResult, ValidationError, ValidationWarning, Duplicado } from '../models/gasto-servicio-importado.model';
import { ConfiguracionMapeo, PlantillaExtraccion } from '../models/configuracion-mapeo.model';
import { ResultadoImportacion, ErrorImportacion } from '../models/resultado-importacion.model';
import { Gasto } from '../models/gasto.model';
import { GastoService } from './gasto';
import { TarjetaService } from './tarjeta';
import { CategoriaService } from './categoria.service';
import { CategorizacionServiciosService } from './categorizacion-servicios.service';
import { NotificationService } from './notification.service';

const STORAGE_KEY_CONFIGURACIONES = 'gestor_tc_configuraciones_mapeo';
const STORAGE_KEY_PLANTILLAS = 'gestor_tc_plantillas_proveedores';
const STORAGE_KEY_HISTORIAL = 'gestor_tc_historial_importaciones';

@Injectable({
  providedIn: 'root'
})
export class CargaServiciosService {
  private configuracionesSubject = new BehaviorSubject<ConfiguracionMapeo[]>([]);
  public configuraciones$ = this.configuracionesSubject.asObservable();

  constructor(
    private gastoService: GastoService,
    private tarjetaService: TarjetaService,
    private categoriaService: CategoriaService,
    private categorizacionService: CategorizacionServiciosService,
    private notificationService: NotificationService
  ) {
    // Cargar configuraciones al inicializar
    this.configuracionesSubject.next(this.loadConfiguracionesFromStorage());
  }

  /**
   * Detecta el formato del archivo
   */
  detectarFormato(file: File): 'CSV' | 'Excel' | 'JSON' | 'PDF' | 'UNKNOWN' {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    if (extension === 'csv' || mimeType === 'text/csv') {
      return 'CSV';
    } else if (extension === 'xlsx' || extension === 'xls' || 
               mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               mimeType === 'application/vnd.ms-excel') {
      return 'Excel';
    } else if (extension === 'json' || mimeType === 'application/json') {
      return 'JSON';
    } else if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'PDF';
    }

    return 'UNKNOWN';
  }

  /**
   * Parsea un archivo según su formato
   */
  parsearArchivo(file: File, config?: ConfiguracionMapeo): Observable<GastoServicioImportado[]> {
    const formato = this.detectarFormato(file);

    switch (formato) {
      case 'CSV':
        return this.parsearCSV(file, config);
      case 'Excel':
        return this.parsearExcel(file, config);
      case 'JSON':
        return this.parsearJSON(file, config);
      case 'PDF':
        return this.parsearPDF(file);
      default:
        return throwError(() => new Error(`Formato de archivo no soportado: ${file.name}`));
    }
  }

  /**
   * Parsea un archivo CSV
   */
  private parsearCSV(file: File, config?: ConfiguracionMapeo): Observable<GastoServicioImportado[]> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const text = e.target.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            observer.error(new Error('El archivo CSV debe tener al menos una fila de encabezado y una fila de datos'));
            return;
          }

          // Detectar separador (coma o punto y coma)
          const separador = text.includes(';') ? ';' : ',';
          
          // Parsear encabezados
          const headers = lines[0].split(separador).map(h => h.trim().replace(/"/g, ''));
          
          // Aplicar mapeo si existe configuración
          const mapeo = config?.mapeoColumnas || this.detectarMapeoAutomatico(headers);
          
          // Parsear datos
          const datos: GastoServicioImportado[] = [];
          for (let i = 1; i < lines.length; i++) {
            const valores = this.parsearLineaCSV(lines[i], separador);
            if (valores.length === 0) continue;

            const dato: GastoServicioImportado = {
              fecha: this.obtenerValor(valores, headers, mapeo.fecha) || '',
              descripcion: this.obtenerValor(valores, headers, mapeo.descripcion) || '',
              monto: this.parsearMonto(this.obtenerValor(valores, headers, mapeo.monto) || '0'),
              categoria: mapeo.categoria ? this.obtenerValor(valores, headers, mapeo.categoria) : undefined,
              tarjeta: mapeo.tarjeta ? this.obtenerValor(valores, headers, mapeo.tarjeta) : undefined,
              notas: mapeo.notas ? this.obtenerValor(valores, headers, mapeo.notas) : undefined,
              filaOriginal: i + 1
            };

            datos.push(dato);
          }

          observer.next(datos);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Error al leer el archivo CSV'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Parsea un archivo Excel
   */
  private parsearExcel(file: File, config?: ConfiguracionMapeo): Observable<GastoServicioImportado[]> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Obtener primera hoja
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convertir a JSON
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            observer.error(new Error('El archivo Excel está vacío'));
            return;
          }

          // Obtener headers
          const headers = Object.keys(jsonData[0]);
          
          // Aplicar mapeo
          const mapeo = config?.mapeoColumnas || this.detectarMapeoAutomatico(headers);
          
          // Convertir a GastoServicioImportado
          const datos: GastoServicioImportado[] = jsonData.map((row, index) => ({
            fecha: this.obtenerValorExcel(row, mapeo.fecha) || '',
            descripcion: this.obtenerValorExcel(row, mapeo.descripcion) || '',
            monto: this.parsearMonto(this.obtenerValorExcel(row, mapeo.monto) || '0'),
            categoria: mapeo.categoria ? this.obtenerValorExcel(row, mapeo.categoria) : undefined,
            tarjeta: mapeo.tarjeta ? this.obtenerValorExcel(row, mapeo.tarjeta) : undefined,
            notas: mapeo.notas ? this.obtenerValorExcel(row, mapeo.notas) : undefined,
            filaOriginal: index + 2 // +2 porque Excel tiene header en fila 1
          }));

          observer.next(datos);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Error al leer el archivo Excel'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parsea un archivo JSON
   */
  private parsearJSON(file: File, config?: ConfiguracionMapeo): Observable<GastoServicioImportado[]> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          
          if (!Array.isArray(jsonData)) {
            observer.error(new Error('El archivo JSON debe contener un array de objetos'));
            return;
          }

          if (jsonData.length === 0) {
            observer.error(new Error('El archivo JSON está vacío'));
            return;
          }

          // Obtener keys del primer objeto
          const keys = Object.keys(jsonData[0]);
          const mapeo = config?.mapeoColumnas || this.detectarMapeoAutomatico(keys);
          
          const datos: GastoServicioImportado[] = jsonData.map((row, index) => ({
            fecha: row[mapeo.fecha] || '',
            descripcion: row[mapeo.descripcion] || '',
            monto: this.parsearMonto(String(row[mapeo.monto] || '0')),
            categoria: mapeo.categoria ? row[mapeo.categoria] : undefined,
            tarjeta: mapeo.tarjeta ? row[mapeo.tarjeta] : undefined,
            notas: mapeo.notas ? row[mapeo.notas] : undefined,
            filaOriginal: index + 1
          }));

          observer.next(datos);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Error al leer el archivo JSON'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Parsea un archivo PDF (básico - solo texto nativo por ahora)
   */
  private parsearPDF(file: File): Observable<GastoServicioImportado[]> {
    return new Observable(observer => {
      // Importar pdfjs-dist dinámicamente
      import('pdfjs-dist').then((pdfjsLib) => {
        // Configurar worker - usar worker local desde assets (más confiable)
        if (typeof window !== 'undefined') {
          // Usar worker local copiado a public/
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const reader = new FileReader();
        
        reader.onload = async (e: any) => {
          try {
            const arrayBuffer = e.target.result;
            
            // Cargar el documento PDF
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            let textoCompleto = '';
            
            // Extraer texto de todas las páginas
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
              textoCompleto += pageText + '\n';
            }

            // Identificar campos en el texto
            const campos = this.identificarCamposPDF(textoCompleto);
            const proveedor = this.detectarProveedorPDF(textoCompleto);

            // Crear objeto GastoServicioImportado
            const dato: GastoServicioImportado = {
              fecha: campos.fecha || new Date().toISOString().split('T')[0],
              descripcion: campos.descripcion || `Factura ${proveedor || 'Servicio'}`,
              monto: campos.monto || 0,
              filaOriginal: 1,
              esPDF: true,
              archivoPDF: file,
              confianzaExtraccion: campos.confianza || 70,
              textoExtraido: textoCompleto,
              proveedorDetectado: proveedor,
              camposExtraidos: {
                fechaVencimiento: campos.fechaVencimiento,
                numeroFactura: campos.numeroFactura,
                periodoFacturado: campos.periodo
              }
            };

            observer.next([dato]);
            observer.complete();
          } catch (error: any) {
            console.error('Error al procesar PDF:', error);
            observer.error(new Error(`Error al procesar PDF: ${error.message || 'No se pudo extraer texto del PDF'}`));
          }
        };

        reader.onerror = () => {
          observer.error(new Error('Error al leer el archivo PDF'));
        };

        reader.readAsArrayBuffer(file);
      }).catch((error) => {
        console.error('Error al cargar pdfjs-dist:', error);
        observer.error(new Error('Error al cargar la librería de PDF. Por favor, recarga la página.'));
      });
    });
  }

  /**
   * Identifica campos clave en el texto extraído del PDF
   */
  private identificarCamposPDF(texto: string): {
    fecha?: string;
    fechaVencimiento?: string;
    monto?: number;
    descripcion?: string;
    numeroFactura?: string;
    periodo?: string;
    confianza?: number;
  } {
    const campos: any = {};
    let confianza = 0;
    let camposEncontrados = 0;

    // Buscar fecha de vencimiento (formato DD/MM/YYYY o YYYY-MM-DD)
    // Priorizar fechas cerca de palabras clave como "vencimiento", "fecha", etc.
    const fechaPatterns = [
      // Patrones específicos con contexto (mayor prioridad)
      /(?:vencimiento|vto|vence|fecha\s+de\s+vencimiento|fecha\s+vto)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:vencimiento|vto|vence|fecha\s+de\s+vencimiento)[\s:]*(\d{4}-\d{2}-\d{2})/i,
      /fecha[\s:]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // Patrones de fecha con formato DD/MM/YYYY (solo si tienen contexto válido)
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/
    ];

    // Buscar todas las fechas y elegir la más probable
    let mejorFecha: { fecha: string; confianza: number } | null = null;

    for (let i = 0; i < fechaPatterns.length; i++) {
      const pattern = fechaPatterns[i];
      const matches = [...texto.matchAll(new RegExp(pattern.source, 'gi'))];
      
      for (const match of matches) {
        const fechaStr = match[1];
        // Validar que sea una fecha válida
        if (this.esFechaValida(fechaStr)) {
          const confianzaFecha = i < 3 ? 30 : 15; // Mayor confianza para patrones con contexto
          
          // Preferir fechas que no sean del año 1900-2000 (probablemente incorrectas)
          const año = parseInt(fechaStr.split(/[-\/]/)[2] || fechaStr.split(/[-\/]/)[0]);
          if (año >= 2000 && año <= new Date().getFullYear() + 1) {
            if (!mejorFecha || confianzaFecha > mejorFecha.confianza) {
              mejorFecha = {
                fecha: fechaStr,
                confianza: confianzaFecha
              };
            }
          }
        }
      }
    }

    if (mejorFecha) {
      campos.fechaVencimiento = mejorFecha.fecha;
      campos.fecha = this.normalizarFecha(mejorFecha.fecha);
      camposEncontrados++;
      confianza += mejorFecha.confianza;
    }

    // Buscar monto/total - mejorado para formato argentino
    // Formato argentino: 1.234,56 (punto para miles, coma para decimales)
    const montoPatterns = [
      // Patrones con contexto (mayor prioridad)
      /(?:total|importe\s+total|monto\s+total|total\s+a\s+pagar|importe\s+a\s+pagar)[\s:]*\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i,
      /(?:total|importe|monto|a\s+pagar)[\s:]*\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i,
      // Patrones con símbolo de peso
      /\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/,
      // Patrones con palabra "pesos"
      /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*pesos/i,
      // Patrones genéricos (menor prioridad)
      /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/
    ];

    let mejorMonto: { monto: number; confianza: number } | null = null;

    for (let i = 0; i < montoPatterns.length; i++) {
      const pattern = montoPatterns[i];
      const matches = [...texto.matchAll(new RegExp(pattern.source, 'gi'))];
      
      for (const match of matches) {
        let montoStr = match[1];
        
        // Detectar formato: si tiene punto y coma, es formato argentino (1.234,56)
        // Si solo tiene coma o punto, determinar según cantidad
        const tienePunto = montoStr.includes('.');
        const tieneComa = montoStr.includes(',');
        
        let numeroParseado: number;
        
        if (tienePunto && tieneComa) {
          // Formato argentino: 1.234,56 -> punto es miles, coma es decimal
          numeroParseado = parseFloat(montoStr.replace(/\./g, '').replace(',', '.'));
        } else if (tieneComa && !tienePunto) {
          // Puede ser: 1234,56 (argentino) o 1,234.56 (estadounidense mal parseado)
          // Si tiene más de 3 dígitos antes de la coma, probablemente es decimal
          const partes = montoStr.split(',');
          if (partes[0].length <= 3) {
            // Probablemente decimal: 1234,56
            numeroParseado = parseFloat(montoStr.replace(',', '.'));
          } else {
            // Probablemente miles: 1234,56 -> 1234.56
            numeroParseado = parseFloat(montoStr.replace(',', '.'));
          }
        } else if (tienePunto && !tieneComa) {
          // Puede ser: 1234.56 (decimal) o 1.234 (miles sin decimales)
          const partes = montoStr.split('.');
          if (partes.length === 2 && partes[1].length <= 2) {
            // Probablemente decimal: 1234.56
            numeroParseado = parseFloat(montoStr);
          } else {
            // Probablemente miles: 1.234 -> 1234
            numeroParseado = parseFloat(montoStr.replace(/\./g, ''));
          }
        } else {
          // Solo números: 1234
          numeroParseado = parseFloat(montoStr);
        }

        // Validar que sea un monto razonable (entre 1 y 10 millones)
        if (!isNaN(numeroParseado) && numeroParseado > 0 && numeroParseado <= 10000000) {
          const confianzaMonto = i < 2 ? 30 : i < 4 ? 20 : 10;
          
          // Preferir montos más grandes (facturas suelen ser montos significativos)
          if (!mejorMonto || confianzaMonto > mejorMonto.confianza || 
              (confianzaMonto === mejorMonto.confianza && numeroParseado > mejorMonto.monto)) {
            mejorMonto = {
              monto: numeroParseado,
              confianza: confianzaMonto
            };
          }
        }
      }
    }

    if (mejorMonto) {
      campos.monto = mejorMonto.monto;
      camposEncontrados++;
      confianza += mejorMonto.confianza;
    }

    // Buscar número de factura
    const facturaPatterns = [
      /(?:factura|n[°º]|numero)[\s:]*(\d+)/i,
      /fact\s*[°º]?\s*(\d+)/i
    ];

    for (const pattern of facturaPatterns) {
      const match = texto.match(pattern);
      if (match) {
        campos.numeroFactura = match[1];
        camposEncontrados++;
        confianza += 10;
        break;
      }
    }

    // Buscar período facturado
    const periodoPatterns = [
      /(?:per[ií]odo|periodo\s+facturado)[\s:]*(\w+\s+\d{4})/i,
      /(\w+\s+\d{4})/i
    ];

    for (const pattern of periodoPatterns) {
      const match = texto.match(pattern);
      if (match && !match[1].match(/^\d{4}$/)) {
        campos.periodo = match[1];
        camposEncontrados++;
        confianza += 10;
        break;
      }
    }

    // Generar descripción básica
    if (campos.numeroFactura || campos.periodo) {
      const partes = [];
      if (campos.numeroFactura) partes.push(`Factura ${campos.numeroFactura}`);
      if (campos.periodo) partes.push(`Período ${campos.periodo}`);
      campos.descripcion = partes.join(' - ') || 'Factura de servicio';
    }

    campos.confianza = Math.min(confianza + (camposEncontrados * 5), 100);

    return campos;
  }

  /**
   * Detecta el proveedor de servicio en el texto
   */
  private detectarProveedorPDF(texto: string): string | undefined {
    const proveedores = [
      { nombre: 'EDENOR', patrones: [/edenor/i] },
      { nombre: 'EDESUR', patrones: [/edesur/i] },
      { nombre: 'Metrogas', patrones: [/metrogas/i] },
      { nombre: 'Camuzzi', patrones: [/camuzzi/i] },
      { nombre: 'AYSA', patrones: [/aysa/i, /agua\s+y\s+saneamiento/i] },
      { nombre: 'Fibertel', patrones: [/fibertel/i] },
      { nombre: 'Movistar', patrones: [/movistar/i] },
      { nombre: 'Personal', patrones: [/personal/i] },
      { nombre: 'Claro', patrones: [/claro/i] },
      { nombre: 'Netflix', patrones: [/netflix/i] },
      { nombre: 'Spotify', patrones: [/spotify/i] },
      { nombre: 'Disney+', patrones: [/disney/i] }
    ];

    for (const proveedor of proveedores) {
      for (const patron of proveedor.patrones) {
        if (patron.test(texto)) {
          return proveedor.nombre;
        }
      }
    }

    return undefined;
  }

  /**
   * Detecta mapeo automático de columnas
   */
  private detectarMapeoAutomatico(headers: string[]): ConfiguracionMapeo['mapeoColumnas'] {
    const headersLower = headers.map(h => h.toLowerCase().trim());
    
    const mapeo: ConfiguracionMapeo['mapeoColumnas'] = {
      fecha: '',
      descripcion: '',
      monto: ''
    };

    // Buscar fecha
    const fechaPatterns = ['fecha', 'date', 'fecha de', 'vencimiento'];
    mapeo.fecha = headers.find(h => 
      fechaPatterns.some(p => h.toLowerCase().includes(p))
    ) || headers[0] || '';

    // Buscar descripción
    const descPatterns = ['descripcion', 'descripción', 'description', 'concepto', 'detalle', 'servicio'];
    mapeo.descripcion = headers.find(h => 
      descPatterns.some(p => h.toLowerCase().includes(p))
    ) || headers[1] || '';

    // Buscar monto
    const montoPatterns = ['monto', 'importe', 'total', 'amount', 'precio', 'costo'];
    mapeo.monto = headers.find(h => 
      montoPatterns.some(p => h.toLowerCase().includes(p))
    ) || headers[2] || '';

    // Buscar categoría (opcional)
    const catPatterns = ['categoria', 'categoría', 'category', 'tipo'];
    const catHeader = headers.find(h => catPatterns.some(p => h.toLowerCase().includes(p)));
    if (catHeader) mapeo.categoria = catHeader;

    // Buscar tarjeta (opcional)
    const tarjetaPatterns = ['tarjeta', 'card', 'tarjeta de crédito'];
    const tarjetaHeader = headers.find(h => tarjetaPatterns.some(p => h.toLowerCase().includes(p)));
    if (tarjetaHeader) mapeo.tarjeta = tarjetaHeader;

    return mapeo;
  }

  /**
   * Aplica mapeo de columnas a datos
   */
  aplicarMapeo(datos: any[], config: ConfiguracionMapeo): GastoServicioImportado[] {
    return datos.map((row, index) => ({
      fecha: row[config.mapeoColumnas.fecha] || '',
      descripcion: row[config.mapeoColumnas.descripcion] || '',
      monto: this.parsearMonto(String(row[config.mapeoColumnas.monto] || '0')),
      categoria: config.mapeoColumnas.categoria ? row[config.mapeoColumnas.categoria] : undefined,
      tarjeta: config.mapeoColumnas.tarjeta ? row[config.mapeoColumnas.tarjeta] : undefined,
      notas: config.mapeoColumnas.notas ? row[config.mapeoColumnas.notas] : undefined,
      filaOriginal: index + 1
    }));
  }

  /**
   * Valida los datos importados
   */
  validarDatos(datos: GastoServicioImportado[]): Observable<ValidationResult> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.categoriaService.getCategorias$()
    ]).pipe(
      map(([tarjetas, categorias]) => {
        const errores: ValidationError[] = [];
        const advertencias: ValidationWarning[] = [];

        datos.forEach((dato, index) => {
          // Validar fecha
          if (!dato.fecha || !this.esFechaValida(dato.fecha)) {
            errores.push({
              fila: dato.filaOriginal,
              campo: 'fecha',
              mensaje: 'Fecha inválida o vacía',
              datos: dato
            });
          }

          // Validar descripción
          if (!dato.descripcion || dato.descripcion.trim() === '') {
            errores.push({
              fila: dato.filaOriginal,
              campo: 'descripcion',
              mensaje: 'La descripción no puede estar vacía',
              datos: dato
            });
          }

          // Validar monto
          if (!dato.monto || dato.monto <= 0 || isNaN(dato.monto)) {
            errores.push({
              fila: dato.filaOriginal,
              campo: 'monto',
              mensaje: 'El monto debe ser un número positivo',
              datos: dato
            });
          }

          // Validar tarjeta si se especificó
          if (dato.tarjeta) {
            const tarjetaEncontrada = tarjetas.find(t => 
              t.nombre.toLowerCase() === dato.tarjeta!.toLowerCase()
            );
            if (!tarjetaEncontrada) {
              advertencias.push({
                fila: dato.filaOriginal,
                campo: 'tarjeta',
                mensaje: `Tarjeta "${dato.tarjeta}" no encontrada. Se usará tarjeta por defecto.`,
                datos: dato
              });
            } else {
              dato.tarjetaId = tarjetaEncontrada.id;
            }
          }

          // Validar categoría si se especificó
          if (dato.categoria) {
            const categoriaEncontrada = categorias.find(c => 
              c.nombre.toLowerCase() === dato.categoria!.toLowerCase()
            );
            if (!categoriaEncontrada) {
              advertencias.push({
                fila: dato.filaOriginal,
                campo: 'categoria',
                mensaje: `Categoría "${dato.categoria}" no encontrada. Se intentará categorizar automáticamente.`,
                datos: dato
              });
            } else {
              dato.categoriaId = categoriaEncontrada.id;
            }
          }
        });

        return {
          valido: errores.length === 0,
          errores,
          advertencias
        };
      })
    );
  }

  /**
   * Detecta duplicados en los datos
   */
  detectarDuplicados(datos: GastoServicioImportado[]): Observable<Duplicado[]> {
    return this.gastoService.getGastos$().pipe(
      map(gastos => {
        const duplicados: Duplicado[] = [];

        datos.forEach(dato => {
          if (dato.excluir) return;

          const duplicado = gastos.find(g => 
            Math.abs(g.monto - dato.monto) < 0.01 &&
            g.fecha === this.normalizarFecha(dato.fecha) &&
            g.descripcion.toLowerCase() === dato.descripcion.toLowerCase()
          );

          if (duplicado) {
            duplicados.push({
              fila: dato.filaOriginal,
              gastoExistente: duplicado.id,
              similitud: 100,
              datos: dato
            });
          }
        });

        return duplicados;
      })
    );
  }

  /**
   * Importa los gastos validados
   */
  importarGastos(datos: GastoServicioImportado[], archivo: string, formato: string): Observable<ResultadoImportacion> {
    return combineLatest([
      this.tarjetaService.getTarjetas$(),
      this.categoriaService.getCategorias$()
    ]).pipe(
      switchMap(([tarjetas, categorias]) => {
        const datosAImportar = datos.filter(d => !d.excluir && !d.errores?.length);
        const resultado: ResultadoImportacion = {
          id: uuidv4(),
          fechaImportacion: new Date().toISOString(),
          archivo,
          formato: formato as any,
          totalFilas: datos.length,
          exitosos: 0,
          errores: datos.filter(d => d.errores?.length).length,
          advertencias: datos.filter(d => d.advertencias?.length).length,
          montoTotal: 0,
          gastosCreados: [],
          erroresDetalle: []
        };

        const gastosACrear: Gasto[] = [];

        if (tarjetas.length === 0) {
          resultado.erroresDetalle.push({
            fila: 0,
            descripcion: 'Sistema',
            error: 'No hay tarjetas disponibles en el sistema. Debe crear al menos una tarjeta antes de importar gastos.',
            datos: {}
          });
          return of(resultado);
        }

        const tarjetaPorDefecto = tarjetas[0].id;

        // Categorizar datos que no tienen categoría (síncrono usando firstValueFrom)
        const datosSinCategoria = datosAImportar.filter(d => !d.categoriaId && d.descripcion);
        
        if (datosSinCategoria.length > 0) {
          // Categorizar cada dato
          const promesasCategorizacion = datosSinCategoria.map(dato => 
            firstValueFrom(this.categorizacionService.categorizar(dato.descripcion)).then(catId => {
              if (catId) dato.categoriaId = catId;
            })
          );

          return from(Promise.all(promesasCategorizacion)).pipe(
            switchMap(() => this.crearGastos(datosAImportar, tarjetaPorDefecto, resultado))
          );
        }

        // Si no hay nada que categorizar, proceder directamente
        return this.crearGastos(datosAImportar, tarjetaPorDefecto, resultado);
      })
    );
  }

  /**
   * Crea los gastos y retorna el resultado
   */
  private crearGastos(
    datosAImportar: GastoServicioImportado[],
    tarjetaPorDefecto: string,
    resultado: ResultadoImportacion
  ): Observable<ResultadoImportacion> {
    const gastosACrear: Gasto[] = [];

    datosAImportar.forEach(dato => {
      const tarjetaId = dato.tarjetaId || tarjetaPorDefecto;
      const fechaNormalizada = this.normalizarFecha(dato.fecha);

      if (!fechaNormalizada) {
        resultado.erroresDetalle.push({
          fila: dato.filaOriginal,
          descripcion: dato.descripcion,
          error: 'Fecha inválida',
          datos: dato
        });
        resultado.errores++;
        return;
      }

      const gasto: Gasto = {
        id: uuidv4(),
        tarjetaId,
        descripcion: dato.descripcion,
        monto: dato.monto,
        fecha: fechaNormalizada,
        categoriaId: dato.categoriaId
        // notas se manejará por separado si es necesario
      };

      gastosACrear.push(gasto);
    });

    if (gastosACrear.length === 0) {
      this.guardarEnHistorial(resultado);
      return of(resultado);
    }

    // Crear gastos
    const promesas = gastosACrear.map(gasto => {
      return new Promise<Gasto | null>((resolve) => {
        this.gastoService.agregarGasto(gasto).subscribe({
          next: (gastoCreado) => {
            if (gastoCreado) {
              resultado.gastosCreados.push(gastoCreado.id);
              resultado.exitosos++;
              resultado.montoTotal += gastoCreado.monto;
              resolve(gastoCreado);
            } else {
              resolve(null);
            }
          },
          error: (error) => {
            resultado.errores++;
            resultado.erroresDetalle.push({
              fila: 0,
              descripcion: gasto.descripcion,
              error: error.message || 'Error al crear gasto',
              datos: {}
            });
            resolve(null);
          }
        });
      });
    });

    return from(Promise.all(promesas)).pipe(
      map(() => {
        this.guardarEnHistorial(resultado);
        return resultado;
      })
    );
  }

  /**
   * Guarda una configuración de mapeo
   */
  guardarConfiguracion(config: Omit<ConfiguracionMapeo, 'id' | 'fechaCreacion'>): ConfiguracionMapeo {
    const nuevaConfig: ConfiguracionMapeo = {
      ...config,
      id: uuidv4(),
      fechaCreacion: new Date().toISOString()
    };

    const configuraciones = [...this.configuracionesSubject.value, nuevaConfig];
    this.saveConfiguracionesToStorage(configuraciones);
    this.configuracionesSubject.next(configuraciones);

    return nuevaConfig;
  }

  /**
   * Carga una configuración por ID
   */
  cargarConfiguracion(id: string): ConfiguracionMapeo | undefined {
    return this.configuracionesSubject.value.find(c => c.id === id);
  }

  /**
   * Elimina una configuración
   */
  eliminarConfiguracion(id: string): void {
    const configuraciones = this.configuracionesSubject.value.filter(c => c.id !== id);
    this.saveConfiguracionesToStorage(configuraciones);
    this.configuracionesSubject.next(configuraciones);
  }

  // Métodos auxiliares privados

  private parsearLineaCSV(linea: string, separador: string): string[] {
    const valores: string[] = [];
    let valorActual = '';
    let dentroDeComillas = false;

    for (let i = 0; i < linea.length; i++) {
      const char = linea[i];

      if (char === '"') {
        dentroDeComillas = !dentroDeComillas;
      } else if (char === separador && !dentroDeComillas) {
        valores.push(valorActual.trim());
        valorActual = '';
      } else {
        valorActual += char;
      }
    }

    valores.push(valorActual.trim());
    return valores;
  }

  private obtenerValor(valores: string[], headers: string[], columna: string): string | undefined {
    const index = headers.findIndex(h => h.toLowerCase() === columna.toLowerCase());
    return index >= 0 && index < valores.length ? valores[index] : undefined;
  }

  private obtenerValorExcel(row: any, columna: string): string | undefined {
    return row[columna] !== undefined ? String(row[columna]) : undefined;
  }

  private parsearMonto(valor: string): number {
    if (!valor || valor.trim() === '') return 0;
    
    // Remover símbolos de moneda y espacios
    let limpio = valor.replace(/[$€£¥\s]/g, '').trim();
    
    // Detectar formato argentino vs internacional
    const tienePunto = limpio.includes('.');
    const tieneComa = limpio.includes(',');
    
    let numero: number;
    
    if (tienePunto && tieneComa) {
      // Formato argentino: 1.234,56 (punto = miles, coma = decimal)
      // O formato internacional: 1,234.56 (coma = miles, punto = decimal)
      // Determinar por posición: si la coma está después del punto, es argentino
      const posPunto = limpio.indexOf('.');
      const posComa = limpio.indexOf(',');
      
      if (posComa > posPunto) {
        // Formato argentino: 1.234,56
        numero = parseFloat(limpio.replace(/\./g, '').replace(',', '.'));
      } else {
        // Formato internacional: 1,234.56
        numero = parseFloat(limpio.replace(/,/g, ''));
      }
    } else if (tieneComa && !tienePunto) {
      // Solo coma: puede ser decimal (1234,56) o miles (1,234)
      const partes = limpio.split(',');
      if (partes.length === 2 && partes[1].length <= 2) {
        // Probablemente decimal: 1234,56
        numero = parseFloat(limpio.replace(',', '.'));
      } else {
        // Probablemente miles sin decimales: 1,234 -> 1234
        numero = parseFloat(limpio.replace(/,/g, ''));
      }
    } else if (tienePunto && !tieneComa) {
      // Solo punto: puede ser decimal (1234.56) o miles (1.234)
      const partes = limpio.split('.');
      if (partes.length === 2 && partes[1].length <= 2) {
        // Probablemente decimal: 1234.56
        numero = parseFloat(limpio);
      } else {
        // Probablemente miles: 1.234 -> 1234
        numero = parseFloat(limpio.replace(/\./g, ''));
      }
    } else {
      // Solo números
      numero = parseFloat(limpio);
    }
    
    return isNaN(numero) ? 0 : numero;
  }

  private esFechaValida(fecha: string): boolean {
    if (!fecha || fecha.trim() === '') return false;
    
    // Aceptar formatos: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, D/M/YYYY
    const formatos = [
      /^\d{4}-\d{1,2}-\d{1,2}$/,
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{1,2}-\d{1,2}-\d{4}$/
    ];

    if (!formatos.some(f => f.test(fecha))) {
      return false;
    }

    // Parsear fecha según formato
    let partes: string[];
    let año: number, mes: number, dia: number;
    
    if (fecha.includes('-') && /^\d{4}-/.test(fecha)) {
      // Formato YYYY-MM-DD
      partes = fecha.split('-');
      año = parseInt(partes[0]);
      mes = parseInt(partes[1]);
      dia = parseInt(partes[2]);
    } else {
      // Formato DD/MM/YYYY o DD-MM-YYYY
      partes = fecha.split(/[-\/]/);
      dia = parseInt(partes[0]);
      mes = parseInt(partes[1]);
      año = parseInt(partes[2]);
    }

    // Validar rangos
    if (año < 2000 || año > new Date().getFullYear() + 1) return false;
    if (mes < 1 || mes > 12) return false;
    if (dia < 1 || dia > 31) return false;

    // Crear fecha y validar
    const date = new Date(año, mes - 1, dia);
    return date.getFullYear() === año && 
           date.getMonth() === mes - 1 && 
           date.getDate() === dia &&
           !isNaN(date.getTime());
  }

  private normalizarFecha(fecha: string): string {
    if (!fecha || fecha.trim() === '') return '';
    
    // Convertir a formato YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(fecha)) {
      // Ya está en formato YYYY-MM-DD, solo normalizar ceros
      const partes = fecha.split('-');
      return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
    }

    const partes = fecha.split(/[-\/]/);
    if (partes.length === 3) {
      let año: string, mes: string, dia: string;
      
      // Si el primer elemento tiene 4 dígitos, es YYYY-MM-DD
      if (partes[0].length === 4) {
        año = partes[0];
        mes = partes[1];
        dia = partes[2];
      } else {
        // Formato DD/MM/YYYY o DD-MM-YYYY
        dia = partes[0];
        mes = partes[1];
        año = partes[2];
      }
      
      // Validar y normalizar
      const añoNum = parseInt(año);
      const mesNum = parseInt(mes);
      const diaNum = parseInt(dia);
      
      // Validar rangos
      if (añoNum < 2000 || añoNum > new Date().getFullYear() + 1) return '';
      if (mesNum < 1 || mesNum > 12) return '';
      if (diaNum < 1 || diaNum > 31) return '';
      
      return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    return '';
  }

  private guardarEnHistorial(resultado: ResultadoImportacion): void {
    try {
      const historial = this.loadHistorialFromStorage();
      historial.unshift(resultado);
      // Mantener solo las últimas 10 importaciones
      const historialLimitado = historial.slice(0, 10);
      localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(historialLimitado));
    } catch (error) {
      console.error('Error al guardar historial:', error);
    }
  }

  private loadConfiguracionesFromStorage(): ConfiguracionMapeo[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIGURACIONES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
      return [];
    }
  }

  private saveConfiguracionesToStorage(configuraciones: ConfiguracionMapeo[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIGURACIONES, JSON.stringify(configuraciones));
    } catch (error) {
      console.error('Error al guardar configuraciones:', error);
    }
  }

  private loadHistorialFromStorage(): ResultadoImportacion[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORIAL);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error al cargar historial:', error);
      return [];
    }
  }
}

