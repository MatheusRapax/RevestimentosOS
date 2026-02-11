import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Quote, Customer, QuoteItem, Architect, QuoteTemplate } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

type QuoteWithRelations = Quote & {
    customer: Customer;
    seller: { id: string; name: string | null };
    architect: Architect | null;
    items: (QuoteItem & {
        product: { name: string; sku: string | null; unit: string | null };
    })[];
};

@Injectable()
export class QuotePdfService {
    constructor(private prisma: PrismaService) { }

    async generatePdf(quote: QuoteWithRelations, templateId?: string): Promise<Buffer> {
        const template = await this.getTemplate(quote.clinicId, templateId);

        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
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

    private async getTemplate(clinicId: string, templateId?: string): Promise<QuoteTemplate | null> {
        if (templateId) {
            return this.prisma.quoteTemplate.findFirst({
                where: { id: templateId, clinicId },
            });
        }
        return this.prisma.quoteTemplate.findFirst({
            where: { clinicId, isDefault: true },
        });
    }

    private generateHeader(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null, y: number) {
        const primaryColor = template?.primaryColor || '#000000';

        // Título
        doc
            .fillColor(primaryColor)
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('ORÇAMENTO', 0, y, { align: 'center' })
            .fontSize(12)
            .font('Helvetica')
            .text(`Nº #${String(quote.number).padStart(4, '0')}`, { align: 'center' });

        // Dados da empresa
        const companyName = template?.companyName || 'Empresa';
        const companyAddress = template?.companyAddress || '';
        const companyPhone = template?.companyPhone || '';
        const companyCnpj = template?.companyCnpj || '';

        const companyInfoY = y + 10;
        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text(companyName, 50, companyInfoY);
        doc.fontSize(9).font('Helvetica').fillColor('#333333');

        let infoY = companyInfoY + 18;
        if (companyAddress) { doc.text(companyAddress, 50, infoY); infoY += 12; }
        if (companyPhone) { doc.text(`Tel: ${companyPhone}`, 50, infoY); infoY += 12; }
        if (companyCnpj) { doc.text(`CNPJ: ${companyCnpj}`, 50, infoY); }
    }

    private generateCustomerInfo(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null, y: number) {
        const primaryColor = template?.primaryColor || '#000000';

        doc.rect(50, y, 500, 80).stroke(primaryColor);

        const contentY = y + 10;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('Dados do Cliente:', 60, contentY);
        doc.font('Helvetica').fillColor('#000000').text(quote.customer.name, 60, contentY + 15);
        if (quote.customer.document) doc.text(`CPF/CNPJ: ${quote.customer.document}`, 60, contentY + 30);
        if (quote.customer.phone) doc.text(`Tel: ${quote.customer.phone}`, 60, contentY + 45);

        const metaX = 350;
        doc.font('Helvetica-Bold').fillColor(primaryColor).text('Detalhes:', metaX, contentY);
        doc.font('Helvetica').fillColor('#000000').text(`Data: ${quote.createdAt.toLocaleDateString('pt-BR')}`, metaX, contentY + 15);
        doc.text(`Vendedor: ${quote.seller?.name || 'N/A'}`, metaX, contentY + 30);

        if (quote.validUntil) {
            doc.text(`Válido até: ${quote.validUntil.toLocaleDateString('pt-BR')}`, metaX, contentY + 45);
        } else if (template?.validityDays) {
            const validUntil = new Date(quote.createdAt);
            validUntil.setDate(validUntil.getDate() + template.validityDays);
            doc.text(`Válido até: ${validUntil.toLocaleDateString('pt-BR')}`, metaX, contentY + 45);
        }
    }

    private generateTable(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null, startY: number): number {
        const primaryColor = template?.primaryColor || '#000000';
        let currentY = startY;
        const pageBottom = 750; // Margem inferior segura

        // Cabeçalho da Tabela
        this.generateTableHeader(doc, currentY, primaryColor);
        currentY += 20;
        this.generateHr(doc, currentY, primaryColor);
        currentY += 10;

        doc.font('Helvetica').fillColor('#000000');

        quote.items.forEach((item) => {
            // Verifica quebra de página
            if (currentY > pageBottom) {
                doc.addPage();
                currentY = 50;
                this.generateTableHeader(doc, currentY, primaryColor);
                currentY += 20;
                this.generateHr(doc, currentY, primaryColor);
                currentY += 10;
                doc.font('Helvetica').fillColor('#000000');
            }

            this.generateTableRow(
                doc,
                currentY,
                item.product.sku || '-',
                item.product.name,
                `${item.quantityBoxes} cx`,
                this.formatCurrency(item.unitPriceCents),
                this.formatCurrency(item.totalCents)
            );

            currentY += 20; // Altura da linha
            this.generateHr(doc, currentY, '#eeeeee');
            currentY += 10; // Espaçamento
        });

        // Totais
        currentY += 20;
        if (currentY > pageBottom) {
            doc.addPage();
            currentY = 50;
        }

        const subtotalPosition = currentY;
        this.generateTableRow(doc, subtotalPosition, '', '', 'Subtotal', '', this.formatCurrency(quote.subtotalCents));

        if (quote.discountCents > 0) {
            const discountPosition = subtotalPosition + 20;
            this.generateTableRow(doc, discountPosition, '', '', 'Desconto', '', `-${this.formatCurrency(quote.discountCents)}`);
            currentY += 20;
        }

        if (quote.deliveryFee > 0) {
            const deliveryPosition = subtotalPosition + 40;
            this.generateTableRow(doc, deliveryPosition, '', '', 'Frete', '', this.formatCurrency(quote.deliveryFee));
            currentY += 20;
        }

        currentY += 30;
        doc.font('Helvetica-Bold').fillColor(primaryColor);
        this.generateTableRow(doc, currentY, '', '', 'TOTAL', '', this.formatCurrency(quote.totalCents));

        return currentY + 40; // Retorna posição final Y
    }

    private generateTableHeader(doc: PDFKit.PDFDocument, y: number, color: string) {
        doc.font('Helvetica-Bold').fillColor(color);
        this.generateTableRow(doc, y, 'Item', 'Descrição', 'Qtd', 'Preço Unit.', 'Total');
    }

    private generateFooter(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null, startY: number) {
        let currentY = startY;
        const primaryColor = template?.primaryColor || '#000000';

        // Dados Bancários
        if (template?.showBankDetails && template.bankName) {
            // Verifica espaço
            if (currentY > 700) { doc.addPage(); currentY = 50; }

            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('Dados Bancários:', 50, currentY);
            doc.font('Helvetica').fillColor('#000000');

            currentY += 15;
            doc.text(`Banco: ${template.bankName}`, 50, currentY);
            if (template.bankAgency) doc.text(`Agência: ${template.bankAgency}`, 200, currentY);
            if (template.bankAccount) doc.text(`Conta: ${template.bankAccount}`, 350, currentY);

            currentY += 15;
            if (template.bankAccountHolder) doc.text(`Titular: ${template.bankAccountHolder}`, 50, currentY);
            if (template.pixKey) doc.text(`PIX: ${template.pixKey}`, 280, currentY);

            currentY += 30; // Margem após info bancária
        }

        // Termos
        if (template?.showTerms && template.termsAndConditions) {
            if (currentY > 650) { doc.addPage(); currentY = 50; }

            doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor).text('Termos e Condições:', 50, currentY);
            currentY += 15;
            doc.font('Helvetica').fillColor('#333333').text(template.termsAndConditions, 50, currentY, { width: 500 });

            // Estimativa de altura do texto dos termos (simplificado)
            const textLines = Math.ceil(template.termsAndConditions.length / 90);
            currentY += (textLines * 10) + 20;
        }

        // Assinaturas
        if (template?.showSignatureLines) {
            if (currentY > 750) { doc.addPage(); currentY = 50; }
            currentY += 40; // Espaço para assinar

            doc.lineWidth(1).strokeColor('#000000');
            doc.moveTo(80, currentY).lineTo(250, currentY).stroke();
            doc.moveTo(310, currentY).lineTo(480, currentY).stroke();

            currentY += 5;
            doc.fontSize(8).text('Vendedor', 80, currentY, { width: 170, align: 'center' });
            doc.text('Cliente', 310, currentY, { width: 170, align: 'center' });

            currentY += 30;
        }

        // Validade e Footer Text
        if (currentY > 780) { doc.addPage(); currentY = 50; }

        const validityText = template?.validityText || `Este orçamento é válido por ${template?.validityDays || 10} dias.`;
        doc.fontSize(9).text(validityText, 50, currentY, { align: 'center', width: 500 });

        if (template?.footerText) {
            currentY += 15;
            doc.fontSize(7).fillColor('#666666').text(template.footerText, 50, currentY, { align: 'center', width: 500 });
        }
    }

    private generateTableRow(
        doc: PDFKit.PDFDocument,
        y: number,
        item: string,
        description: string,
        quantity: string,
        unitCost: string,
        total: string
    ) {
        doc
            .fontSize(10)
            .text(item, 50, y, { width: 60 }) // SKU
            .text(description, 110, y, { width: 200, ellipsis: true }) // Descrição truncada se muito longa
            .text(quantity, 310, y, { width: 60, align: 'right' })
            .text(unitCost, 380, y, { width: 90, align: 'right' })
            .text(total, 480, y, { width: 70, align: 'right' });
    }

    private generateHr(doc: PDFKit.PDFDocument, y: number, color = '#aaaaaa') {
        doc
            .strokeColor(color)
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }

    private formatCurrency(cents: number) {
        return (cents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    }
}
