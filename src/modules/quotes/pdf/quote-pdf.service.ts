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
  discountPercent?: number | null;
  customer: Customer;
  seller: { id: string; name: string | null };
  architect: Architect | null;
  items: (QuoteItem & {
    discountPercent?: number | null;
    product: {
      name: string;
      sku: string | null;
      unit: string | null;
      format: string | null;
      boxCoverage: number | null;
    };
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

      // --- Observações ---
      if (quote.notes) {
        doc.fontSize(9).font('Helvetica');
        const notesHeight = doc.heightOfString(quote.notes, { width: 500 }) + 25;
        
        if (currentY + notesHeight > 750) {
          doc.addPage();
          currentY = 50;
        }

        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('Observações:', 50, currentY);
        currentY += 15;
        doc.fontSize(9).font('Helvetica').fillColor('#333333').text(quote.notes, 50, currentY, { width: 500 });
        currentY += doc.heightOfString(quote.notes, { width: 500 }) + 15;
      }

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

    // Título no canto direito
    doc
      .fillColor(primaryColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('ORÇAMENTO', 50, y, { align: 'right', width: 500 });

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor(primaryColor)
      .text(`Nº #${String(quote.number).padStart(4, '0')}`, 50, doc.y, {
        align: 'right',
        width: 500,
      });

    // Dados da empresa
    const companyName = template?.companyName || 'Empresa';
    const companyAddress = template?.companyAddress || '';
    const companyPhone = template?.companyPhone || '';
    const companyCnpj = template?.companyCnpj || '';

    const companyInfoY = y;

    // Logo
    if (template?.companyLogo) {
      try {
        const logoData = template.companyLogo;
        const isBase64 = logoData.startsWith('data:image/');

        if (isBase64) {
          const base64Data = logoData.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          doc.image(buffer, 50, companyInfoY, {
            width: 80,
            height: 60,
            fit: [80, 60],
          });
        } else if (logoData.startsWith('http')) {
          // For remote URLs, you would typically need to fetch them first.
          // PDFKit sync .image() depends on local files or buffers.
          // We'll skip complex http fetching here for simplicity as the
          // frontend upload provides base64 directly to the template.
          // If local file path is stored, pdfkit handles it natively.
          doc.image(logoData, 50, companyInfoY, {
            width: 80,
            height: 60,
            fit: [80, 60],
          });
        } else {
          doc.image(logoData, 50, companyInfoY, {
            width: 80,
            height: 60,
            fit: [80, 60],
          });
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

        const qtyText = showQuantity ? `${item.quantityBoxes}` : '';
        const finalArea =
          item.resultingArea ?? item.areaWithMargin ?? item.inputArea;
        const areaText =
          showUnitArea && finalArea ? `${finalArea.toFixed(2)}` : '';
        const unit = item.product.unit || '-';

        let unitCostText = '';
        if (showUnitPrice) {
          if (unit === 'M2' && item.product.boxCoverage && item.product.boxCoverage > 0) {
            const pricePerM2Cents = Math.round(item.unitPriceCents / item.product.boxCoverage);
            unitCostText = this.formatCurrency(pricePerM2Cents) + ' /m²';
          } else {
            unitCostText = this.formatCurrency(item.unitPriceCents);
          }
        }
        const format = item.product.format || '-';
        const sku = item.product.sku || '-';

        const discountText = item.discountCents > 0
          ? `-${this.formatCurrency(item.discountCents)}${item.discountPercent ? ` (${item.discountPercent}%)` : ''}`
          : '-';

        const rowHeight = this.generateTableRow(
          doc,
          currentY,
          unit,
          item.product.name,
          sku,
          format,
          qtyText,
          areaText,
          unitCostText,
          discountText,
          this.formatCurrency(item.totalCents),
          template,
        );

        currentY += rowHeight + 5; // Altura da linha ajustada com o conteúdo
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

    const itemDiscounts = quote.items.reduce((sum, i) => sum + (i.discountCents || 0), 0);
    const grossSubtotal = quote.subtotalCents + itemDiscounts;

    this.generateTableRow(
      doc,
      currentY,
      '', '', '', '', '', '', '',
      'Subtotal',
      this.formatCurrency(grossSubtotal),
      template,
    );
    currentY += 20;

    if (itemDiscounts > 0) {
      this.generateTableRow(
        doc, currentY,
        '', '', '', '', '', '', '',
        'Desc. por item',
        `-${this.formatCurrency(itemDiscounts)}`,
        template,
      );
      currentY += 20;
    }

    if (quote.discountCents > 0) {
      const pct = quote.discountPercent;
      const globalDiscLabel = pct ? `Desconto (${pct}%)` : 'Desconto';
      this.generateTableRow(
        doc, currentY,
        '', '', '', '', '', '', '',
        globalDiscLabel,
        `-${this.formatCurrency(quote.discountCents)}`,
        template,
      );
      currentY += 20;
    }

    if (quote.deliveryFee > 0) {
      this.generateTableRow(
        doc, currentY,
        '', '', '', '', '', '', '',
        'Frete',
        this.formatCurrency(quote.deliveryFee),
        template,
      );
      currentY += 20;
    }

    currentY += 15;
    doc.font('Helvetica-Bold').fillColor(primaryColor);
    this.generateTableRow(
      doc,
      currentY,
      '', '', '', '', '', '', '',
      'TOTAL',
      this.formatCurrency(quote.totalCents),
      template,
    );

    return currentY + 40; // Retorna posição final Y
  }

  private generateTableHeader(
    doc: PDFKit.PDFDocument,
    y: number,
    accentColor: string,
    template: QuoteTemplate | null,
  ) {
    doc.rect(50, y - 5, 500, 20).fill(accentColor);
    doc.font('Helvetica-Bold').fillColor('#FFFFFF');

    const showQuantity = template?.showQuantity ?? true;
    const showUnitArea = template?.showUnitArea ?? true;
    const showUnitPrice = template?.showUnitPrice ?? true;

    this.generateTableRow(
      doc,
      y,
      'Unid.',
      'Descrição',
      'Cód.',
      'Formato',
      showQuantity ? 'Qtd Cx' : '',
      showUnitArea ? 'Qtd M²' : '',
      showUnitPrice ? 'V. Unit.' : '',
      'Desconto',
      'Total',
      template,
      true,
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

    // Dados Bancários, Formas de Pagamento e Termos
    const hasBank = template?.showBankDetails && template.bankName;
    const hasPaymentMethods = template?.showPaymentMethods && template.paymentMethodsInfo;
    const hasTerms = template?.showTerms && template.termsAndConditions;

    // --- PRE-CALCULAR ALTURA NECESSÁRIA DO RODAPÉ ---
    let requiredHeight = 0;
    let boxesHeight = 0;
    
    if (hasBank || hasPaymentMethods || hasTerms) {
      const leftColWidth = (hasBank || hasPaymentMethods) && hasTerms ? 240 : 500;
      const rightColWidth = 500 - leftColWidth - 10;
      
      let estimatedLeft = 0;
      if (hasBank) {
        estimatedLeft += 50; 
        if (template.bankAgency) estimatedLeft += 12;
        if (template.bankAccount) estimatedLeft += 12;
        if (template.bankAccountHolder) estimatedLeft += 12;
        if (template.pixKey) estimatedLeft += 17;
        estimatedLeft += 25; 
      }
      if (hasPaymentMethods) {
        const textHeight = doc.fontSize(8).heightOfString(template.paymentMethodsInfo || '', { width: leftColWidth - 20 });
        estimatedLeft += 25 + textHeight + 10;
      }
      
      let estimatedRight = 0;
      if (hasTerms) {
        const termsWidth = (hasBank || hasPaymentMethods) ? rightColWidth : 500;
        const textHeight = doc.fontSize(8).heightOfString(template.termsAndConditions || '', { width: termsWidth - 20 });
        estimatedRight = 25 + textHeight + 10;
      }
      
      boxesHeight = Math.max(estimatedLeft, estimatedRight);
      requiredHeight += boxesHeight;
    }
    
    if (template?.showSignatureLines) {
      requiredHeight += 75;
    }
    
    requiredHeight += 40; // Validade
    if (template?.footerText) {
      requiredHeight += 20;
    }

    // Se não couber na página atual (considerando margem inferior segura ~780), quebra de página de uma vez.
    if (currentY + requiredHeight > 780 && requiredHeight < 700) {
      doc.addPage();
      currentY = 50;
    }

    if (hasBank || hasPaymentMethods || hasTerms) {
      const startBoxY = currentY;
      
      const leftColX = 50;
      const leftColWidth = (hasBank || hasPaymentMethods) && hasTerms ? 240 : 500;
      const rightColX = leftColX + leftColWidth + 10;
      const rightColWidth = 500 - leftColWidth - 10;

      let leftY = currentY;
      let rightY = currentY;

      // Draw Bank Details on left
      if (hasBank) {
        let bankTextY = leftY + 10;
        
        let estimatedHeight = 35; // Header + Banco
        if (template.bankAgency) estimatedHeight += 12;
        if (template.bankAccount) estimatedHeight += 12;
        if (template.bankAccountHolder) estimatedHeight += 12;
        if (template.pixKey) estimatedHeight += 17;

        doc.rect(leftColX, leftY, leftColWidth, estimatedHeight + 15).fillAndStroke('#f9fafb', '#e5e7eb');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Dados Bancários', leftColX + 10, bankTextY);
        doc.font('Helvetica').fillColor('#000000');

        bankTextY += 15;
        doc.fontSize(8);
        doc
          .font('Helvetica-Bold')
          .text('Banco:', leftColX + 10, bankTextY, { continued: true })
          .font('Helvetica')
          .text(` ${template.bankName}`);

        bankTextY += 12;
        if (template.bankAgency) {
          doc
            .font('Helvetica-Bold')
            .text('Agência:', leftColX + 10, bankTextY, { continued: true })
            .font('Helvetica')
            .text(` ${template.bankAgency}`);
          bankTextY += 12;
        }

        if (template.bankAccount) {
          doc
            .font('Helvetica-Bold')
            .text('Conta:', leftColX + 10, bankTextY, { continued: true })
            .font('Helvetica')
            .text(` ${template.bankAccount}`);
          bankTextY += 12;
        }

        if (template.bankAccountHolder) {
          doc
            .font('Helvetica-Bold')
            .text('Titular:', leftColX + 10, bankTextY, { continued: true })
            .font('Helvetica')
            .text(` ${template.bankAccountHolder}`);
          bankTextY += 12;
        }

        if (template.pixKey) {
          bankTextY += 5;
          doc
            .moveTo(leftColX + 10, bankTextY - 3)
            .lineTo(leftColX + leftColWidth - 10, bankTextY - 3)
            .strokeColor('#e5e7eb')
            .stroke();
          doc
            .font('Helvetica-Bold')
            .text('PIX:', leftColX + 10, bankTextY, { continued: true })
            .font('Helvetica')
            .text(` ${template.pixKey}`);
          bankTextY += 12;
        }
        leftY = leftY + estimatedHeight + 15 + 10;
      }

      // Draw Payment Methods on left
      if (hasPaymentMethods) {
        const titleHeight = 25;
        const textHeight = doc.fontSize(8).heightOfString(template.paymentMethodsInfo || '', { width: leftColWidth - 20 });
        const boxHeight = titleHeight + textHeight + 10;
        
        doc.rect(leftColX, leftY, leftColWidth, boxHeight).fillAndStroke('#f9fafb', '#e5e7eb');

        let payTextY = leftY + 10;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Formas de Pagamento', leftColX + 10, payTextY);
          
        payTextY += 15;
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#4b5563')
          .text(template.paymentMethodsInfo || '', leftColX + 10, payTextY, { width: leftColWidth - 20 });

        leftY = leftY + boxHeight + 10;
      }

      // Draw Terms on right (or full width if no left col)
      if (hasTerms) {
        const termsX = (hasBank || hasPaymentMethods) ? rightColX : leftColX;
        const termsWidth = (hasBank || hasPaymentMethods) ? rightColWidth : 500;
        
        const titleHeight = 25;
        const termsText = template.termsAndConditions || '';
        const textHeight = doc.fontSize(8).heightOfString(termsText, { width: termsWidth - 20 });
        
        let boxHeight = titleHeight + textHeight + 10;
        if ((hasBank || hasPaymentMethods) && (leftY - startBoxY - 10) > boxHeight) {
             boxHeight = leftY - startBoxY - 10; // match left side
        }
        
        doc
          .rect(termsX, rightY, termsWidth, boxHeight)
          .fillAndStroke('#f9fafb', '#e5e7eb');

        let termsY = rightY + 10;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('Termos e Condições', termsX + 10, termsY);

        termsY += 15;
        doc.fontSize(8).font('Helvetica').fillColor('#4b5563');

        doc.text(termsText, termsX + 10, termsY, { width: termsWidth - 20 });

        rightY = rightY + boxHeight + 10;
      }

      currentY = Math.max(leftY, rightY) + 10;
    }

    // Assinaturas
    if (template?.showSignatureLines) {
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
    unidade: string,
    descricao: string,
    codigo: string,
    formato: string,
    qtd: string,
    m2: string,
    vUnit: string,
    desconto: string,
    total: string,
    template: QuoteTemplate | null,
    isHeader = false,
  ): number {
    const showQuantity = template?.showQuantity ?? true;
    const showUnitArea = template?.showUnitArea ?? true;
    const showUnitPrice = template?.showUnitPrice ?? true;

    doc.fontSize(9);
    if (!isHeader) {
      doc.font('Helvetica');
    }

    const descWidth = 125;
    const descHeight = doc.heightOfString(descricao || ' ', { width: descWidth });
    const rowHeight = Math.max(15, descHeight);

    doc.text(unidade, 50, y, { width: 25, ellipsis: true });
    doc.text(codigo, 80, y, { width: 38, ellipsis: true });
    doc.text(descricao, 120, y, { width: descWidth });
    doc.text(formato, 250, y, { width: 40, ellipsis: true });

    let currentX = 295;

    if (showQuantity) {
      doc.text(qtd, currentX, y, { width: 35, align: 'right' });
      currentX += 38;
    }

    if (showUnitArea) {
      doc.text(m2, currentX, y, { width: 38, align: 'right' });
      currentX += 42;
    }

    if (showUnitPrice) {
      doc.text(vUnit, currentX, y, { width: 55, align: 'right' });
      currentX += 58;
    }

    // Desconto
    doc.text(desconto, currentX, y, { width: 55, align: 'right' });
    currentX += 58;

    // Total
    doc.text(total, currentX, y, { width: 550 - currentX, align: 'right' });

    return rowHeight;
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
