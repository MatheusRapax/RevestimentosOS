import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  Quote,
  Customer,
  QuoteItem,
  Architect,
  QuoteTemplate,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

type QuoteWithRelations = Quote & {
  customer: Customer;
  seller: { id: string; name: string | null };
  architect: Architect | null;
  items: (QuoteItem & {
    product: { name: string; sku: string | null; unit: string | null };
    environment?: { name: string } | null;
  })[];
};

@Injectable()
export class QuotePdfService {
  constructor(private prisma: PrismaService) {}

  async generatePdf(
    quote: QuoteWithRelations,
    templateId?: string,
  ): Promise<Buffer> {
    const template = await this.getTemplate(quote.clinicId, templateId);

    return new Promise((resolve) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const primaryColor = template?.primaryColor || '#000000';
      const accentColor = template?.accentColor || '#4CAF50';
      let currentY = 50;

      // --- Header ---
      this.generateHeader(doc, quote, template, currentY);
      currentY = 150; // Aproximadamente validado visualmente

      // --- Customer Info ---
      this.generateCustomerInfo(doc, quote, template, currentY);
      currentY = 240; // Espaço após customer info

      // --- Items Table ---
      currentY = this.generateTable(doc, quote, template, currentY);

      // --- Footer ---
      // Verifica se tem espaço para o footer, senão cria nova página
      if (currentY > 600) {
        doc.addPage();
        currentY = 50;
      }

      this.generateFooter(doc, quote, template, currentY);

      doc.end();
    });
  }

  private async getTemplate(
    clinicId: string,
    templateId?: string,
  ): Promise<QuoteTemplate | null> {
    if (templateId) {
      return this.prisma.quoteTemplate.findFirst({
        where: { id: templateId, clinicId },
      });
    }
    return this.prisma.quoteTemplate.findFirst({
      where: { clinicId, isDefault: true },
    });
  }

  private generateHeader(
    doc: PDFKit.PDFDocument,
    quote: QuoteWithRelations,
    template: QuoteTemplate | null,
    y: number,
  ) {
    const primaryColor = template?.primaryColor || '#000000';

    // Título
    doc
      .fillColor(primaryColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('ORÇAMENTO', 0, y, { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .text(`Nº #${String(quote.number).padStart(4, '0')}`, {
        align: 'center',
      });

    // Dados da empresa
    const companyName = template?.companyName || 'Empresa';
    const companyAddress = template?.companyAddress || '';
    const companyPhone = template?.companyPhone || '';
    const companyCnpj = template?.companyCnpj || '';

    const companyInfoY = y + 10;
    
    // Logo
    if (template?.companyLogo) {
      try {
        const logoData = template.companyLogo;
        const isBase64 = logoData.startsWith('data:image/');
        
        if (isBase64) {
             const base64Data = logoData.split(',')[1];
             const buffer = Buffer.from(base64Data, 'base64');
             doc.image(buffer, 50, companyInfoY, { width: 80, height: 60, fit: [80, 60] });
        } else if (logoData.startsWith('http')) {
             // For remote URLs, you would typically need to fetch them first.
             // PDFKit sync .image() depends on local files or buffers.
             // We'll skip complex http fetching here for simplicity as the 
             // frontend upload provides base64 directly to the template.
             // If local file path is stored, pdfkit handles it natively.
             doc.image(logoData, 50, companyInfoY, { width: 80, height: 60, fit: [80, 60] });
        } else {
             doc.image(logoData, 50, companyInfoY, { width: 80, height: 60, fit: [80, 60] });
        }
      } catch (err) {
        console.error('Failed to load logo on PDF', err);
      }
    }


    const textStartX = template?.companyLogo ? 140 : 50;
    
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(companyName, textStartX, companyInfoY);
    doc.fontSize(9).font('Helvetica').fillColor('#333333');

    let infoY = companyInfoY + 18;
    if (companyAddress) {
      doc.text(companyAddress, textStartX, infoY);
      infoY += 12;
    }
    if (companyPhone) {
      doc.text(`Tel: ${companyPhone}`, textStartX, infoY);
      infoY += 12;
    }
    if (companyCnpj) {
      doc.text(`CNPJ: ${companyCnpj}`, textStartX, infoY);
    }
  }

  private generateCustomerInfo(
    doc: PDFKit.PDFDocument,
    quote: QuoteWithRelations,
    template: QuoteTemplate | null,
    y: number,
  ) {
    const primaryColor = template?.primaryColor || '#000000';

    doc.rect(50, y, 500, 80).stroke(primaryColor);

    const contentY = y + 10;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('Dados do Cliente:', 60, contentY);
    doc
      .font('Helvetica')
      .fillColor('#000000')
      .text(quote.customer.name, 60, contentY + 15);
    if (quote.customer.document)
      doc.text(`CPF/CNPJ: ${quote.customer.document}`, 60, contentY + 30);
    if (quote.customer.phone)
      doc.text(`Tel: ${quote.customer.phone}`, 60, contentY + 45);

    const metaX = 350;
    doc
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('Detalhes:', metaX, contentY);
    doc
      .font('Helvetica')
      .fillColor('#000000')
      .text(
        `Data: ${quote.createdAt.toLocaleDateString('pt-BR')}`,
        metaX,
        contentY + 15,
      );
    doc.text(`Vendedor: ${quote.seller?.name || 'N/A'}`, metaX, contentY + 30);

    if (quote.validUntil) {
      doc.text(
        `Válido até: ${quote.validUntil.toLocaleDateString('pt-BR')}`,
        metaX,
        contentY + 45,
      );
    } else if (template?.validityDays) {
      const validUntil = new Date(quote.createdAt);
      validUntil.setDate(validUntil.getDate() + template.validityDays);
      doc.text(
        `Válido até: ${validUntil.toLocaleDateString('pt-BR')}`,
        metaX,
        contentY + 45,
      );
    }
  }

  private generateTable(
    doc: PDFKit.PDFDocument,
    quote: QuoteWithRelations,
    template: QuoteTemplate | null,
    startY: number,
  ): number {
    const primaryColor = template?.primaryColor || '#000000';
    const accentColor = template?.accentColor || '#4CAF50';
    let currentY = startY;
    const pageBottom = 750; // Margem inferior segura

    const itemsByEnvironment: Record<string, typeof quote.items> = {};
    quote.items.forEach((item) => {
      const envName = item.environment?.name || 'Geral / Sem Ambiente';
      if (!itemsByEnvironment[envName]) {
        itemsByEnvironment[envName] = [];
      }
      itemsByEnvironment[envName].push(item);
    });

    for (const [envName, items] of Object.entries(itemsByEnvironment)) {
      // Header do ambiente
      if (currentY + 60 > pageBottom) {
        doc.addPage();
        currentY = 50;
      }

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(`Ambiente: ${envName}`, 50, currentY);
      currentY += 20;

      // Cabeçalho da Tabela
      this.generateTableHeader(doc, currentY, accentColor, template);
      currentY += 25;

      doc.font('Helvetica').fillColor('#000000');

      items.forEach((item) => {
        // Verifica quebra de página
        if (currentY > pageBottom) {
          doc.addPage();
          currentY = 50;
          this.generateTableHeader(doc, currentY, accentColor, template);
          currentY += 25;
          doc.font('Helvetica').fillColor('#000000');
        }

        const showQuantity = template?.showQuantity ?? true;
        const showUnitArea = template?.showUnitArea ?? true;
        const showUnitPrice = template?.showUnitPrice ?? true;

        const qtyText = showQuantity ? `${item.quantityBoxes} cx` : '';
        const areaText = showUnitArea ? `${item.inputArea} m²` : '';
        const unitCostText = showUnitPrice ? this.formatCurrency(item.unitPriceCents) : '';

        this.generateTableRow(
          doc,
          currentY,
          item.product.sku || '-',
          item.product.name,
          qtyText,
          areaText,
          unitCostText,
          this.formatCurrency(item.totalCents),
          template
        );

        currentY += 20; // Altura da linha
        this.generateHr(doc, currentY, '#eeeeee');
        currentY += 10; // Espaçamento
      });

      currentY += 10; // Espaçamento entre ambientes
    }

    // Totais
    currentY += 20;
    if (currentY > pageBottom) {
      doc.addPage();
      currentY = 50;
    }

    const subtotalPosition = currentY;
    this.generateTableRow(
      doc,
      subtotalPosition,
      '',
      '',
      '',
      '',
      'Subtotal',
      this.formatCurrency(quote.subtotalCents),
      template
    );

    if (quote.discountCents > 0) {
      const discountPosition = subtotalPosition + 20;
      this.generateTableRow(
        doc,
        discountPosition,
        '',
        '',
        '',
        '',
        'Desconto',
        `-${this.formatCurrency(quote.discountCents)}`,
        template
      );
      currentY += 20;
    }

    if (quote.deliveryFee > 0) {
      const deliveryPosition = subtotalPosition + 40;
      this.generateTableRow(
        doc,
        deliveryPosition,
        '',
        '',
        '',
        '',
        'Frete',
        this.formatCurrency(quote.deliveryFee),
        template
      );
      currentY += 20;
    }

    currentY += 30;
    doc.font('Helvetica-Bold').fillColor(primaryColor);
    this.generateTableRow(
      doc,
      currentY,
      '',
      '',
      '',
      '',
      'TOTAL',
      this.formatCurrency(quote.totalCents),
      template
    );

    return currentY + 40; // Retorna posição final Y
  }

  private generateTableHeader(
    doc: PDFKit.PDFDocument,
    y: number,
    accentColor: string,
    template: QuoteTemplate | null,
  ) {
    doc.rect(50, y - 5, 495, 20).fill(accentColor);
    doc.font('Helvetica-Bold').fillColor('#FFFFFF');
    
    const showQuantity = template?.showQuantity ?? true;
    const showUnitArea = template?.showUnitArea ?? true;
    const showUnitPrice = template?.showUnitPrice ?? true;

    this.generateTableRow(
      doc,
      y,
      'Item',
      'Descrição',
      showQuantity ? 'Qtd' : '',
      showUnitArea ? 'M²' : '',
      showUnitPrice ? 'Preço Unit.' : '',
      'Total',
      template
    );
  }

  private generateFooter(
    doc: PDFKit.PDFDocument,
    quote: QuoteWithRelations,
    template: QuoteTemplate | null,
    startY: number,
  ) {
    let currentY = startY;
    const primaryColor = template?.primaryColor || '#000000';

    // Dados Bancários e Termos (Lado a Lado se ambos existirem)
    const hasBank = template?.showBankDetails && template.bankName;
    const hasTerms = template?.showTerms && template.termsAndConditions;
    
    if (hasBank || hasTerms) {
      if (currentY > 650) {
        doc.addPage();
        currentY = 50;
      }
      
      const startBoxY = currentY;
      let maxBankY = currentY;
      let maxTermsY = currentY;
      
      if (hasBank) {
        // Draw Bank Details Box
        doc.rect(50, currentY, 240, 100).fillAndStroke('#f9fafb', '#e5e7eb');
        
        let bankY = currentY + 10;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Dados Bancários', 60, bankY);
        doc.font('Helvetica').fillColor('#000000');
        
        bankY += 15;
        doc.fontSize(8);
        doc.font('Helvetica-Bold').text('Banco:', 60, bankY, { continued: true }).font('Helvetica').text(` ${template.bankName}`);
        
        bankY += 12;
        if (template.bankAgency) {
          doc.font('Helvetica-Bold').text('Agência:', 60, bankY, { continued: true }).font('Helvetica').text(` ${template.bankAgency}`);
          bankY += 12;
        }
        
        if (template.bankAccount) {
          doc.font('Helvetica-Bold').text('Conta:', 60, bankY, { continued: true }).font('Helvetica').text(` ${template.bankAccount}`);
          bankY += 12;
        }
        
        if (template.bankAccountHolder) {
          doc.font('Helvetica-Bold').text('Titular:', 60, bankY, { continued: true }).font('Helvetica').text(` ${template.bankAccountHolder}`);
          bankY += 12;
        }
        
        if (template.pixKey) {
          bankY += 5;
          doc.moveTo(60, bankY - 3).lineTo(280, bankY - 3).strokeColor('#e5e7eb').stroke();
          doc.font('Helvetica-Bold').text('PIX:', 60, bankY, { continued: true }).font('Helvetica').text(` ${template.pixKey}`);
          bankY += 12;
        }
        maxBankY = bankY + 10;
      }
      
      if (hasTerms) {
        // Draw Terms Box
        const termsX = hasBank ? 300 : 50;
        const termsWidth = hasBank ? 245 : 495;
        
        doc.rect(termsX, currentY, termsWidth, 100).fillAndStroke('#f9fafb', '#e5e7eb');
        
        let termsY = currentY + 10;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Termos e Condições', termsX + 10, termsY);
          
        termsY += 15;
        doc.fontSize(8).font('Helvetica').fillColor('#4b5563');
        
        const termsText = template.termsAndConditions || '';
        const textHeight = doc.heightOfString(termsText, { width: termsWidth - 20 });
        doc.text(termsText, termsX + 10, termsY, { width: termsWidth - 20 });
        
        maxTermsY = termsY + textHeight + 10;
      }
      
      currentY = Math.max(maxBankY, maxTermsY, startBoxY + 100) + 20;
    }

    // Assinaturas
    if (template?.showSignatureLines) {
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }
      currentY += 40; // Espaço para assinar

      doc.lineWidth(1).strokeColor('#000000');
      doc.moveTo(80, currentY).lineTo(250, currentY).stroke();
      doc.moveTo(310, currentY).lineTo(480, currentY).stroke();

      currentY += 5;
      doc
        .fontSize(8)
        .text('Vendedor', 80, currentY, { width: 170, align: 'center' });
      doc.text('Cliente', 310, currentY, { width: 170, align: 'center' });

      currentY += 30;
    }

    // Validade e Footer Text
    if (currentY > 780) {
      doc.addPage();
      currentY = 50;
    }

    const validityText =
      template?.validityText ||
      `Este orçamento é válido por ${template?.validityDays || 10} dias.`;
    doc
      .fontSize(9)
      .text(validityText, 50, currentY, { align: 'center', width: 500 });

    if (template?.footerText) {
      currentY += 15;
      doc
        .fontSize(7)
        .fillColor('#666666')
        .text(template.footerText, 50, currentY, {
          align: 'center',
          width: 500,
        });
    }
  }

  private generateTableRow(
    doc: PDFKit.PDFDocument,
    y: number,
    item: string,
    description: string,
    quantity: string,
    areaText: string,
    unitCost: string,
    total: string,
    template: QuoteTemplate | null,
  ) {
    const showQuantity = template?.showQuantity ?? true;
    const showUnitArea = template?.showUnitArea ?? true;
    const showUnitPrice = template?.showUnitPrice ?? true;

    doc
      .fontSize(10)
      .text(item, 50, y, { width: 60 }) // SKU
      .text(description, 110, y, { width: 150, ellipsis: true }); // Descrição

    let currentX = 260; // Starting X for the columns

    if (showQuantity) {
        doc.text(quantity, currentX, y, { width: 60, align: 'right' });
        currentX += 70;
    }

    if (showUnitArea) {
        doc.text(areaText, currentX, y, { width: 60, align: 'right' });
        currentX += 70;
    }

    if (showUnitPrice) {
        doc.text(unitCost, currentX, y, { width: 80, align: 'right' });
        currentX += 90;
    }

    // The startX for "Total" value might need pushing based on active columns depending on how we render the layout,
    // For now we keep it fixed to original X to maintain right alignment
    doc.text(total, 480, y, { width: 70, align: 'right' });
  }

  private generateHr(doc: PDFKit.PDFDocument, y: number, color = '#aaaaaa') {
    doc.strokeColor(color).lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
  }

  private formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
