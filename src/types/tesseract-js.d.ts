declare module 'tesseract.js' {
  // Tipado mínimo para createWorker (v5: idioma como primer argumento, worker pre-inicializado).
  export function createWorker(lang?: string): Promise<{
    recognize: (image: string | ArrayBuffer | Uint8Array) => Promise<{
      data: { text: string };
    }>;
    terminate: () => Promise<void>;
  }>;
}
