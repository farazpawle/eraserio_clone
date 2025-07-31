import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FILE } from '@/app/dashboard/_components/FileList';
import { toast } from 'sonner';

// Export progress callback type
export type ExportProgressCallback = (progress: number, message: string) => void;

// Export options interface
export interface ExportOptions {
  fileName?: string;
  quality?: number;
  format?: 'png' | 'svg' | 'pdf';
  theme?: 'light' | 'dark';
}

// Export result interface
export interface ExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
  blob?: Blob;
}

/**
 * Export EditorJS document content to PDF
 */
export const exportDocumentToPDF = async (
  documentData: string,
  fileName: string,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> => {
  try {
    onProgress?.(10, 'Preparing document...');
    
    // Parse the EditorJS data
    const editorData = JSON.parse(documentData);
    
    onProgress?.(20, 'Creating PDF document...');
    
    // Create a temporary container to render the content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '800px';
    tempContainer.style.padding = '40px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.lineHeight = '1.6';
    tempContainer.style.color = '#333';
    
    document.body.appendChild(tempContainer);
    
    onProgress?.(30, 'Rendering content...');
    
    // Convert EditorJS blocks to HTML
    editorData.blocks.forEach((block: any) => {
      const blockElement = document.createElement('div');
      blockElement.style.marginBottom = '16px';
      
      switch (block.type) {
        case 'header':
          const headerLevel = block.data.level || 2;
          blockElement.innerHTML = `<h${headerLevel} style="font-size: ${24 - (headerLevel * 2)}px; font-weight: bold; margin: 20px 0 10px 0;">${block.data.text}</h${headerLevel}>`;
          break;
        case 'paragraph':
          blockElement.innerHTML = `<p style="margin: 10px 0;">${block.data.text || ''}</p>`;
          break;
        case 'list':
          const listType = block.data.style === 'ordered' ? 'ol' : 'ul';
          const listItems = block.data.items.map((item: string) => `<li style="margin: 5px 0;">${item}</li>`).join('');
          blockElement.innerHTML = `<${listType} style="margin: 10px 0; padding-left: 20px;">${listItems}</${listType}>`;
          break;
        case 'checklist':
          const checklistItems = block.data.items.map((item: any) => 
            `<div style="margin: 5px 0;"><input type="checkbox" ${item.checked ? 'checked' : ''} disabled style="margin-right: 8px;"/>${item.text}</div>`
          ).join('');
          blockElement.innerHTML = `<div style="margin: 10px 0;">${checklistItems}</div>`;
          break;
        default:
          blockElement.innerHTML = `<p style="margin: 10px 0;">${block.data.text || JSON.stringify(block.data)}</p>`;
      }
      
      tempContainer.appendChild(blockElement);
    });
    
    onProgress?.(50, 'Converting to PDF...');
    
    // Convert HTML to canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    onProgress?.(70, 'Generating PDF file...');
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    onProgress?.(90, 'Finalizing export...');
    
    // Clean up
    document.body.removeChild(tempContainer);
    
    // Generate blob
    const pdfBlob = pdf.output('blob');
    
    onProgress?.(100, 'Export complete!');
    
    // Download the file
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return {
      success: true,
      fileName: `${fileName}.pdf`,
      blob: pdfBlob
    };
    
  } catch (error) {
    console.error('PDF export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Export Excalidraw canvas to PNG
 */
export const exportCanvasToPNG = async (
  canvasData: any,
  fileName: string,
  options: ExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<ExportResult> => {
  try {
    onProgress?.(10, 'Preparing canvas data...');
    
    // This function will be called from the Excalidraw component
    // where we have access to the Excalidraw API
    return {
      success: false,
      error: 'PNG export must be called from Excalidraw component'
    };
    
  } catch (error) {
    console.error('PNG export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Export Excalidraw canvas to SVG
 */
export const exportCanvasToSVG = async (
  canvasData: any,
  fileName: string,
  options: ExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<ExportResult> => {
  try {
    onProgress?.(10, 'Preparing canvas data...');
    
    // This function will be called from the Excalidraw component
    // where we have access to the Excalidraw API
    return {
      success: false,
      error: 'SVG export must be called from Excalidraw component'
    };
    
  } catch (error) {
    console.error('SVG export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Determine file type based on content
 */
export const getFileType = (file: FILE): 'document' | 'canvas' => {
  // If whiteboard has content, it's a canvas file
  if (file.whiteboard && file.whiteboard.trim() !== '' && file.whiteboard !== '{}') {
    return 'canvas';
  }
  // Otherwise, it's a document file
  return 'document';
};

/**
 * Get available export formats for a file
 */
export const getAvailableFormats = (file: FILE): string[] => {
  const fileType = getFileType(file);
  
  if (fileType === 'canvas') {
    return ['png', 'svg'];
  } else {
    return ['pdf'];
  }
};

/**
 * Generate a safe filename for export
 */
export const generateExportFileName = (originalName: string, format: string): string => {
  // Remove file extension if present
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  
  // Sanitize filename
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50); // Limit length
  
  return `${safeName}_${new Date().toISOString().split('T')[0]}`;
};

/**
 * Export file with progress tracking
 */
export const exportFile = async (
  file: FILE,
  format: string,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> => {
  const fileName = generateExportFileName(file.fileName, format);
  const fileType = getFileType(file);
  
  try {
    onProgress?.(0, 'Starting export...');
    
    if (fileType === 'document' && format === 'pdf') {
      if (!file.document) {
        return {
          success: false,
          error: 'Document content is not available for export'
        };
      }
      return await exportDocumentToPDF(file.document, fileName, onProgress);
    } else if (fileType === 'canvas' && (format === 'png' || format === 'svg')) {
      // Canvas exports will be handled by the Excalidraw component
      return {
        success: false,
        error: 'Canvas export must be initiated from the workspace'
      };
    } else {
      return {
        success: false,
        error: `Unsupported export format: ${format} for ${fileType}`
      };
    }
    
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Batch export multiple files
 */
export const batchExportFiles = async (
  files: FILE[],
  format: string,
  onProgress?: ExportProgressCallback
): Promise<ExportResult[]> => {
  const results: ExportResult[] = [];
  const total = files.length;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = Math.round((i / total) * 100);
    
    onProgress?.(progress, `Exporting ${file.fileName} (${i + 1}/${total})...`);
    
    const result = await exportFile(file, format, (subProgress, message) => {
      const totalProgress = progress + Math.round((subProgress / 100) * (100 / total));
      onProgress?.(totalProgress, message);
    });
    
    results.push(result);
    
    // Small delay to prevent overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  onProgress?.(100, 'Batch export complete!');
  return results;
};