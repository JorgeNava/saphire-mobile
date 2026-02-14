import { Share } from 'react-native';

/**
 * Servicio para copiar contenido al portapapeles
 * NOTA: Solución temporal sin módulos nativos
 */
export class ClipboardService {
  /**
   * Muestra el contenido para que el usuario lo copie
   * @param text Texto a copiar
   * @param message Mensaje de confirmación (opcional)
   */
  static async copy(text: string, message?: string): Promise<void> {
    try {
      // Usar Share API como alternativa temporal
      await Share.share({
        message: text,
      });
    } catch (error: any) {
      // Si el usuario cancela, no hacer nada
      if (error.code !== 'ECANCELLED') {
        console.error('Error sharing:', error);
      }
    }
  }

  /**
   * Copia el título de un recurso
   */
  static async copyTitle(title: string): Promise<void> {
    await this.copy(title, '✅ Título copiado');
  }

  /**
   * Copia el contenido de un recurso
   */
  static async copyContent(content: string): Promise<void> {
    await this.copy(content, '✅ Contenido copiado');
  }

  /**
   * Copia título y contenido juntos
   */
  static async copyTitleAndContent(title: string, content: string): Promise<void> {
    const combined = `${title}\n\n${content}`;
    await this.copy(combined, '✅ Título y contenido copiados');
  }

  /**
   * Comparte una lista formateada (abre menú de compartir)
   */
  static async shareList(name: string, items: Array<string | {content: string; completed?: boolean}>): Promise<void> {
    // Extraer el contenido de cada item (puede ser string u objeto)
    const itemTexts = items.map(item => 
      typeof item === 'string' ? item : item.content
    );
    const formatted = `${name}\n\n${itemTexts.map((text, i) => `${i + 1}. ${text}`).join('\n')}`;
    await this.copy(formatted, '✅ Lista compartida');
  }

  /**
   * Copia una lista formateada directamente al portapapeles
   * (Sin menú de compartir - usaría Clipboard nativo si estuviera disponible)
   */
  static async copyList(name: string, items: Array<string | {content: string; completed?: boolean}>): Promise<void> {
    // Extraer el contenido de cada item
    const itemTexts = items.map(item => 
      typeof item === 'string' ? item : item.content
    );
    const formatted = `${name}\n\n${itemTexts.map((text, i) => `${i + 1}. ${text}`).join('\n')}`;
    
    // Por ahora usa Share hasta que se implemente clipboard real
    await this.copy(formatted, '✅ Lista copiada');
  }

  /**
   * Obtiene el contenido actual del portapapeles
   * NOTA: No disponible sin módulo nativo
   */
  static async get(): Promise<string> {
    console.warn('Clipboard.get() no disponible sin módulo nativo');
    return '';
  }

  /**
   * Verifica si hay contenido en el portapapeles
   * NOTA: No disponible sin módulo nativo
   */
  static async hasContent(): Promise<boolean> {
    return false;
  }
}
