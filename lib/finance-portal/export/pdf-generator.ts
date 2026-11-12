// College Finance Portal - Dependency-Free PDF 1.4 Binary Generator
// Pure TypeScript implementation conforming to PDF 1.4 Specification.

export interface PDFDrawOptions {
  font?: 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique';
  size?: number;
  color?: [number, number, number]; // 0.0 - 1.0 RGB
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface PDFRectOptions {
  fill?: [number, number, number];
  stroke?: [number, number, number];
  lineWidth?: number;
}

export const PDF_COLORS = {
  navy: [0.031, 0.322, 0.576] as [number, number, number], // #085293
  gold: [0.776, 0.655, 0.424] as [number, number, number], // #c6a76c
  darkSlate: [0.118, 0.161, 0.231] as [number, number, number], // #1e293b
  mutedText: [0.392, 0.455, 0.545] as [number, number, number], // #64748b
  lightBg: [0.973, 0.98, 0.988] as [number, number, number], // #f8fafc
  border: [0.886, 0.91, 0.941] as [number, number, number], // #e2e8f0
  white: [1.0, 1.0, 1.0] as [number, number, number],
  green: [0.082, 0.502, 0.239] as [number, number, number], // #15803d
  crimson: [0.678, 0.129, 0.114] as [number, number, number], // #ad211d
  goldLight: [0.984, 0.965, 0.922] as [number, number, number], // #fbf6eb
};

// Helvetica width map
const HELVETICA_WIDTHS: Record<number, number> = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
  104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556, 111: 556,
  112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556, 118: 500, 119: 722,
  120: 500, 121: 500, 122: 500, 123: 334, 124: 260, 125: 334, 126: 584,
};

function measureText(text: string, fontSize: number, isBold = false): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const charWidth = HELVETICA_WIDTHS[code] || 600;
    width += (charWidth / 1000) * fontSize * (isBold ? 1.05 : 1);
  }
  return width;
}

export class SimplePDF {
  pageWidth = 595.28; // Standard A4 width in pt
  pageHeight = 841.89; // Standard A4 height in pt
  private stream = '';

  constructor() {
    this.stream = 'q\n';
  }

  escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' '); // Clean ASCII for basic PDF 1.4
  }

  drawText(text: string, x: number, y: number, options: PDFDrawOptions = {}): void {
    const { font = 'Helvetica', size = 9, color = [0, 0, 0], align = 'left' } = options;
    const fontTag = font === 'Helvetica-Bold' ? '/F2' : font === 'Helvetica-Oblique' ? '/F3' : '/F1';
    const isBold = font === 'Helvetica-Bold';

    let renderX = x;
    if (align !== 'left') {
      const textWidth = measureText(text, size, isBold);
      if (align === 'center') renderX = x - textWidth / 2;
      else if (align === 'right') renderX = x - textWidth;
    }

    const [r, g, b] = color;
    this.stream += `BT\n${fontTag} ${size} Tf\n${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n${renderX.toFixed(2)} ${y.toFixed(2)} Td\n(${this.escapeString(text)}) Tj\nET\n`;
  }

  drawRect(x: number, y: number, width: number, height: number, options: PDFRectOptions = {}): void {
    const { fill, stroke, lineWidth = 0.5 } = options;
    this.stream += `${lineWidth.toFixed(2)} w\n`;
    if (fill) {
      const [r, g, b] = fill;
      this.stream += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
    }
    if (stroke) {
      const [r, g, b] = stroke;
      this.stream += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n`;
    }

    this.stream += `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re\n`;
    if (fill && stroke) this.stream += 'B\n';
    else if (fill) this.stream += 'f\n';
    else if (stroke) this.stream += 'S\n';
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, options: { stroke?: [number, number, number]; lineWidth?: number } = {}): void {
    const { stroke = [0.8, 0.8, 0.8], lineWidth = 0.5 } = options;
    const [r, g, b] = stroke;
    this.stream += `${lineWidth.toFixed(2)} w\n${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n${x1.toFixed(2)} ${y1.toFixed(2)} m\n${x2.toFixed(2)} ${y2.toFixed(2)} l\nS\n`;
  }

  drawHeader(institutionName: string, title: string, subtitle = '', isDuplicate = false): number {
    let y = this.pageHeight - 45;

    // Top Brand Bar
    this.drawRect(0, this.pageHeight - 8, this.pageWidth, 8, { fill: PDF_COLORS.navy });
    this.drawRect(0, this.pageHeight - 11, this.pageWidth, 3, { fill: PDF_COLORS.gold });

    // Institution Name
    this.drawText(institutionName.toUpperCase(), 40, y, {
      font: 'Helvetica-Bold',
      size: 13,
      color: PDF_COLORS.navy,
    });
    this.drawText('ACCREDITED COLLEGE CAMPUS · SECTOR 7, MANSAROVAR, JAIPUR', 40, y - 12, {
      font: 'Helvetica',
      size: 7.5,
      color: PDF_COLORS.mutedText,
    });

    if (isDuplicate) {
      this.drawRect(this.pageWidth - 145, y - 10, 105, 20, {
        fill: PDF_COLORS.goldLight,
        stroke: PDF_COLORS.gold,
        lineWidth: 1,
      });
      this.drawText('DUPLICATE COPY', this.pageWidth - 92, y - 4, {
        font: 'Helvetica-Bold',
        size: 8,
        color: PDF_COLORS.crimson,
        align: 'center',
      });
    }

    y -= 32;
    this.drawLine(40, y, this.pageWidth - 40, y, { stroke: PDF_COLORS.border, lineWidth: 0.8 });
    y -= 18;

    // Document Title Banner
    this.drawText(title, 40, y, { font: 'Helvetica-Bold', size: 12, color: PDF_COLORS.darkSlate });
    if (subtitle) {
      this.drawText(subtitle, this.pageWidth - 40, y, {
        font: 'Helvetica',
        size: 8,
        color: PDF_COLORS.mutedText,
        align: 'right',
      });
    }

    return y - 20;
  }

  drawFooter(customNote?: string): void {
    const y = 35;
    this.drawLine(40, y + 10, this.pageWidth - 40, y + 10, { stroke: PDF_COLORS.border, lineWidth: 0.5 });
    this.drawText(
      customNote || 'Computer Generated Institutional Document. Valid without physical signature.',
      40,
      y,
      { font: 'Helvetica-Oblique', size: 7, color: PDF_COLORS.mutedText }
    );
    this.drawText('Poddar Institute · College Finance Portal', this.pageWidth - 40, y, {
      font: 'Helvetica',
      size: 7,
      color: PDF_COLORS.mutedText,
      align: 'right',
    });
  }

  output(): Uint8Array {
    const fullStream = this.stream + 'Q\n';
    const streamLength = fullStream.length;

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth.toFixed(2)} ${this.pageHeight.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>\nendobj`,
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${fullStream}endstream\nendobj`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj',
      '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj',
      '7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj',
    ];

    let offset = 9; // '%PDF-1.4\n' length
    let pdf = '%PDF-1.4\n';
    const xrefOffsets = [0];

    for (const obj of objects) {
      xrefOffsets.push(offset);
      pdf += obj + '\n';
      offset = pdf.length;
    }

    const xrefOffset = offset;
    pdf += 'xref\n0 ' + (objects.length + 1) + '\n';
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < xrefOffsets.length; i++) {
      pdf += String(xrefOffsets[i]).padStart(10, '0') + ' 00000 n \n';
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return new TextEncoder().encode(pdf);
  }
}

export function triggerPDFDownload(filename: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
