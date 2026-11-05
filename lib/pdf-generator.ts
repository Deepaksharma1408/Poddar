// Poddar ERP - Professional Direct PDF Generator
// Conforms to PDF 1.4 Specification. Zero external dependencies.
// Works seamlessly in both browser and Node environments.

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

// Brand color palette
export const PDF_COLORS = {
  navy: [0.031, 0.322, 0.576] as [number, number, number], // #085293
  gold: [0.776, 0.655, 0.424] as [number, number, number], // #c6a76c
  darkSlate: [0.118, 0.161, 0.231] as [number, number, number], // #1e293b
  mutedText: [0.392, 0.455, 0.545] as [number, number, number], // #64748b
  lightBg: [0.973, 0.980, 0.988] as [number, number, number], // #f8fafc
  border: [0.886, 0.910, 0.941] as [number, number, number], // #e2e8f0
  white: [1.0, 1.0, 1.0] as [number, number, number],
  green: [0.082, 0.502, 0.239] as [number, number, number], // #15803d
  crimson: [0.678, 0.129, 0.114] as [number, number, number], // #ad211d
  goldLight: [0.984, 0.965, 0.922] as [number, number, number], // #fbf6eb
};

// Character widths for Helvetica at 1000pt
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
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const charWidth = HELVETICA_WIDTHS[code] ?? 550;
    totalWidth += (charWidth / 1000) * fontSize * (isBold ? 1.05 : 1.0);
  }
  return totalWidth;
}

function escapePDFText(str: string): string {
  // Convert standard rupee symbol or other unicode to clean ASCII representations
  const sanitized = str
    .replace(/₹/g, 'INR ')
    .replace(/·/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/’|‘/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ');

  return sanitized
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export class SimplePDF {
  private pages: string[] = [];
  private currentPageContent: string[] = [];
  public pageWidth = 595.28; // A4 points
  public pageHeight = 841.89; // A4 points

  constructor() {
    this.addPage();
  }

  addPage(): void {
    if (this.pages.length > 0 || this.currentPageContent.length > 0) {
      this.pages.push(this.currentPageContent.join('\n'));
      this.currentPageContent = [];
    }
  }

  drawRect(x: number, y: number, w: number, h: number, opts: PDFRectOptions = {}): void {
    const ops: string[] = [];
    if (opts.fill) {
      const [r, g, b] = opts.fill;
      ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    }
    if (opts.stroke) {
      const [r, g, b] = opts.stroke;
      ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    }
    if (opts.lineWidth) {
      ops.push(`${opts.lineWidth.toFixed(2)} w`);
    }
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (opts.fill && opts.stroke) {
      ops.push('B');
    } else if (opts.fill) {
      ops.push('f');
    } else if (opts.stroke) {
      ops.push('S');
    }
    this.currentPageContent.push(ops.join(' '));
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, opts: PDFRectOptions = {}): void {
    const ops: string[] = [];
    const [r, g, b] = opts.stroke ?? PDF_COLORS.border;
    ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    ops.push(`${(opts.lineWidth ?? 1).toFixed(2)} w`);
    ops.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    this.currentPageContent.push(ops.join(' '));
  }

  drawText(text: string, x: number, y: number, opts: PDFDrawOptions = {}): void {
    if (!text) return;
    const font = opts.font ?? 'Helvetica';
    const fontAlias = font === 'Helvetica-Bold' ? '/F2' : font === 'Helvetica-Oblique' ? '/F3' : '/F1';
    const size = opts.size ?? 10;
    const color = opts.color ?? PDF_COLORS.darkSlate;
    const align = opts.align ?? 'left';

    let drawX = x;
    const textWidth = measureText(text, size, font === 'Helvetica-Bold');
    if (align === 'center') {
      drawX = x - textWidth / 2;
    } else if (align === 'right') {
      drawX = x - textWidth;
    }

    const [r, g, b] = color;
    const escaped = escapePDFText(text);

    this.currentPageContent.push(
      `BT ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${fontAlias} ${size} Tf ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${escaped}) Tj ET`
    );
  }

  drawHeader(
    campusName: string,
    documentTitle: string,
    documentKicker = 'PODDAR GROUP OF INSTITUTIONS',
    isDuplicate = false
  ): number {
    const margin = 40;
    let y = this.pageHeight - 45;

    // Top primary decorative accent stripe
    this.drawRect(margin, y + 20, this.pageWidth - margin * 2, 4, { fill: PDF_COLORS.navy });
    this.drawRect(margin + 120, y + 20, 80, 4, { fill: PDF_COLORS.gold });

    // Header Kicker
    this.drawText(documentKicker.toUpperCase(), margin, y, {
      font: 'Helvetica-Bold',
      size: 8,
      color: PDF_COLORS.gold,
    });
    y -= 18;

    // Campus Name
    this.drawText(campusName.toUpperCase(), margin, y, {
      font: 'Helvetica-Bold',
      size: 16,
      color: PDF_COLORS.navy,
    });
    y -= 13;

    // Subtitle / Address
    this.drawText('Sector-7, Near Shipra Path, Mansarovar, Jaipur (RJ) - 302020 | CBSE / AICTE Affiliated', margin, y, {
      font: 'Helvetica',
      size: 8,
      color: PDF_COLORS.mutedText,
    });
    y -= 18;

    // Document Title Banner Box
    this.drawRect(margin, y - 8, this.pageWidth - margin * 2, 28, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.75,
    });
    this.drawText(documentTitle.toUpperCase(), margin + 12, y + 2, {
      font: 'Helvetica-Bold',
      size: 11,
      color: PDF_COLORS.navy,
    });

    if (isDuplicate) {
      // Prominent DUPLICATE COPY badge
      this.drawRect(this.pageWidth - margin - 110, y - 4, 100, 20, {
        fill: PDF_COLORS.crimson,
      });
      this.drawText('DUPLICATE COPY', this.pageWidth - margin - 60, y + 2, {
        font: 'Helvetica-Bold',
        size: 8,
        color: PDF_COLORS.white,
        align: 'center',
      });
    }

    y -= 25;
    return y;
  }

  drawKeyValueGrid(
    startY: number,
    items: { label: string; value: string; boldValue?: boolean; highlight?: boolean }[],
    columns = 2
  ): number {
    const margin = 40;
    const contentWidth = this.pageWidth - margin * 2;
    const colWidth = contentWidth / columns;
    let y = startY;

    const rowHeight = 22;
    for (let i = 0; i < items.length; i += columns) {
      const slice = items.slice(i, i + columns);
      for (let c = 0; c < slice.length; c++) {
        const item = slice[c];
        const colX = margin + c * colWidth;

        if (item.highlight) {
          this.drawRect(colX, y - 4, colWidth - 8, 20, {
            fill: PDF_COLORS.goldLight,
            stroke: PDF_COLORS.gold,
            lineWidth: 0.5,
          });
        }

        this.drawText(item.label.toUpperCase(), colX + 4, y + 2, {
          font: 'Helvetica-Bold',
          size: 7.5,
          color: PDF_COLORS.mutedText,
        });

        this.drawText(item.value, colX + colWidth - 12, y + 2, {
          font: item.boldValue ? 'Helvetica-Bold' : 'Helvetica',
          size: 8.5,
          color: item.boldValue ? PDF_COLORS.navy : PDF_COLORS.darkSlate,
          align: 'right',
        });
      }
      y -= rowHeight;
    }

    return y;
  }

  drawTable(
    startY: number,
    headers: string[],
    rows: (string | number)[][],
    columnWidths?: number[],
    alignments?: ('left' | 'center' | 'right')[]
  ): number {
    const margin = 40;
    const contentWidth = this.pageWidth - margin * 2;
    let y = startY;

    // Determine column widths
    const widths = columnWidths ?? headers.map(() => contentWidth / headers.length);
    const aligns = alignments ?? headers.map(() => 'left');

    // Header row
    const headerHeight = 22;
    this.drawRect(margin, y - 5, contentWidth, headerHeight, {
      fill: PDF_COLORS.navy,
    });

    let currentX = margin;
    for (let c = 0; c < headers.length; c++) {
      const w = widths[c];
      const align = aligns[c];
      const tx = align === 'right' ? currentX + w - 8 : align === 'center' ? currentX + w / 2 : currentX + 8;
      this.drawText(headers[c].toUpperCase(), tx, y + 3, {
        font: 'Helvetica-Bold',
        size: 7.5,
        color: PDF_COLORS.white,
        align,
      });
      currentX += w;
    }

    y -= headerHeight;

    // Body rows
    const rowHeight = 18;
    for (let r = 0; r < rows.length; r++) {
      if (y < 70) {
        // Need new page
        this.addPage();
        y = this.pageHeight - 60;
        // Re-draw header on new page
        this.drawRect(margin, y - 5, contentWidth, headerHeight, { fill: PDF_COLORS.navy });
        let rx = margin;
        for (let c = 0; c < headers.length; c++) {
          const w = widths[c];
          const align = aligns[c];
          const tx = align === 'right' ? rx + w - 8 : align === 'center' ? rx + w / 2 : rx + 8;
          this.drawText(headers[c].toUpperCase(), tx, y + 3, {
            font: 'Helvetica-Bold',
            size: 7.5,
            color: PDF_COLORS.white,
            align,
          });
          rx += w;
        }
        y -= headerHeight;
      }

      const row = rows[r];
      const isAlt = r % 2 === 1;
      this.drawRect(margin, y - 4, contentWidth, rowHeight, {
        fill: isAlt ? PDF_COLORS.lightBg : PDF_COLORS.white,
        stroke: PDF_COLORS.border,
        lineWidth: 0.4,
      });

      let rx = margin;
      for (let c = 0; c < headers.length; c++) {
        const val = String(row[c] ?? '');
        const w = widths[c];
        const align = aligns[c];
        const tx = align === 'right' ? rx + w - 8 : align === 'center' ? rx + w / 2 : rx + 8;
        this.drawText(val, tx, y + 2, {
          font: 'Helvetica',
          size: 7.5,
          color: PDF_COLORS.darkSlate,
          align,
        });
        rx += w;
      }
      y -= rowHeight;
    }

    return y;
  }

  drawFooter(note = 'This is a computer generated official document under Poddar ERP.'): void {
    const margin = 40;
    const y = 35;

    this.drawLine(margin, y + 14, this.pageWidth - margin, y + 14, {
      stroke: PDF_COLORS.border,
      lineWidth: 0.5,
    });

    this.drawText(note, margin, y + 2, {
      font: 'Helvetica',
      size: 7,
      color: PDF_COLORS.mutedText,
    });

    this.drawText('VERIFIED & SIGNED', this.pageWidth - margin, y + 2, {
      font: 'Helvetica-Bold',
      size: 7,
      color: PDF_COLORS.navy,
      align: 'right',
    });
  }

  output(): Uint8Array {
    // Flush active page
    if (this.currentPageContent.length > 0) {
      this.pages.push(this.currentPageContent.join('\n'));
      this.currentPageContent = [];
    }

    const totalPages = this.pages.length;
    const objects: string[] = [];
    const offsets: number[] = [];

    // Header
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

    // Object 1: Catalog
    // Object 2: Outlines
    // Object 3: Pages
    // Object 4..4+P-1: Page objects
    // Object 4+P..4+2P-1: Content stream objects
    // Fonts: F1 (Helvetica), F2 (Helvetica-Bold), F3 (Helvetica-Oblique)

    const fontF1ObjId = 4 + totalPages * 2;
    const fontF2ObjId = fontF1ObjId + 1;
    const fontF3ObjId = fontF1ObjId + 2;

    const pageObjIds: number[] = [];
    const contentObjIds: number[] = [];
    for (let p = 0; p < totalPages; p++) {
      pageObjIds.push(4 + p);
      contentObjIds.push(4 + totalPages + p);
    }

    // Obj 1: Catalog
    objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj`;

    // Obj 2: Info
    objects[2] = `2 0 obj\n<< /Creator (Poddar ERP Connect) /Producer (Poddar PDF Engine 1.0) /CreationDate (D:${new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14)}) >>\nendobj`;

    // Obj 3: Pages
    objects[3] = `3 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>\nendobj`;

    // Page objects
    for (let p = 0; p < totalPages; p++) {
      const pageId = pageObjIds[p];
      const contentId = contentObjIds[p];
      objects[pageId] = `${pageId} 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${this.pageWidth.toFixed(2)} ${this.pageHeight.toFixed(2)}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontF1ObjId} 0 R /F2 ${fontF2ObjId} 0 R /F3 ${fontF3ObjId} 0 R >> /ProcSet [/PDF /Text] >> >>\nendobj`;
    }

    // Content streams
    for (let p = 0; p < totalPages; p++) {
      const contentId = contentObjIds[p];
      const streamContent = this.pages[p];
      const streamBytes = new TextEncoder().encode(streamContent);
      objects[contentId] = `${contentId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj`;
    }

    // Font objects
    objects[fontF1ObjId] = `${fontF1ObjId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`;
    objects[fontF2ObjId] = `${fontF2ObjId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj`;
    objects[fontF3ObjId] = `${fontF3ObjId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj`;

    const totalObjects = fontF3ObjId;

    // Assemble PDF body and calculate offsets
    offsets[0] = 0;
    for (let i = 1; i <= totalObjects; i++) {
      offsets[i] = new TextEncoder().encode(pdf).length;
      pdf += objects[i] + '\n';
    }

    // XRef table
    const startXref = new TextEncoder().encode(pdf).length;
    pdf += `xref\n0 ${totalObjects + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= totalObjects; i++) {
      const offsetStr = String(offsets[i]).padStart(10, '0');
      pdf += `${offsetStr} 00000 n \n`;
    }

    // Trailer
    pdf += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R /Info 2 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return new TextEncoder().encode(pdf);
  }
}

// Download helper for browser
export function triggerPDFDownload(filename: string, pdfBytes: Uint8Array): void {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
