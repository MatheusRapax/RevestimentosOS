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
        // Buscar template (padrão ou específico)
        const template = await this.getTemplate(quote.clinicId, templateId);

        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header com dados do template
            this.generateHeader(doc, quote, template);

            // Customer Info
            this.generateCustomerInfo(doc, quote, template);

            // Items Table
            this.generateTable(doc, quote, template);

            // Footer
            this.generateFooter(doc, quote, template);

            doc.end();
        });
    }

    private async getTemplate(clinicId: string, templateId?: string): Promise<QuoteTemplate | null> {
        if (templateId) {
            return this.prisma.quoteTemplate.findFirst({
                where: { id: templateId, clinicId },
            });
        }
        // Buscar template padrão
        return this.prisma.quoteTemplate.findFirst({
            where: { clinicId, isDefault: true },
        });
    }

    private generateHeader(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null) {
        const primaryColor = template?.primaryColor || '#000000';
        const accentColor = template?.accentColor || '#4CAF50';

        // Logo (se houver)
        // TODO: Implementar carregamento de logo base64/URL

        // Título
        doc
            .fillColor(primaryColor)
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('ORÇAMENTO', { align: 'center' })
            .fontSize(12)
            .font('Helvetica')
            .text(`Nº #${String(quote.number).padStart(4, '0')}`, { align: 'center' })
            .moveDown();

        // Dados da empresa
        const companyName = template?.companyName || 'Empresa';
        const companyAddress = template?.companyAddress || '';
        const companyPhone = template?.companyPhone || '';
        const companyCnpj = template?.companyCnpj || '';

        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text(companyName, 50, 50);
        doc.fontSize(9).font('Helvetica').fillColor('#333333');
        let yPos = 68;
        if (companyAddress) { doc.text(companyAddress, 50, yPos); yPos += 12; }
        if (companyPhone) { doc.text(`Tel: ${companyPhone}`, 50, yPos); yPos += 12; }
        if (companyCnpj) { doc.text(`CNPJ: ${companyCnpj}`, 50, yPos); }
        doc.moveDown();
    }

    private generateCustomerInfo(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null) {
        const primaryColor = template?.primaryColor || '#000000';

        doc.rect(50, 110, 510, 80).stroke(primaryColor);

        const customerY = 120;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('Dados do Cliente:', 60, customerY);
        doc.font('Helvetica').fillColor('#000000').text(quote.customer.name, 60, customerY + 15);
        if (quote.customer.document) doc.text(`CPF/CNPJ: ${quote.customer.document}`, 60, customerY + 30);
        if (quote.customer.phone) doc.text(`Tel: ${quote.customer.phone}`, 60, customerY + 45);

        const metaX = 350;
        doc.font('Helvetica-Bold').fillColor(primaryColor).text('Detalhes:', metaX, customerY);
        doc.font('Helvetica').fillColor('#000000').text(`Data: ${quote.createdAt.toLocaleDateString('pt-BR')}`, metaX, customerY + 15);
        doc.text(`Vendedor: ${quote.seller.name || 'N/A'}`, metaX, customerY + 30);
        if (quote.validUntil) {
            doc.text(`Válido até: ${quote.validUntil.toLocaleDateString('pt-BR')}`, metaX, customerY + 45);
        } else if (template?.validityDays) {
            const validUntil = new Date(quote.createdAt);
            validUntil.setDate(validUntil.getDate() + template.validityDays);
            doc.text(`Válido até: ${validUntil.toLocaleDateString('pt-BR')}`, metaX, customerY + 45);
        }
    }

    private generateTable(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null) {
        const primaryColor = template?.primaryColor || '#000000';
        const invoiceTableTop = 220;

        doc.font('Helvetica-Bold').fillColor(primaryColor);
        this.generateTableRow(
            doc,
            invoiceTableTop,
            'Item',
            'Descrição',
            'Qtd',
            'Preço Unit.',
            'Total'
        );
        this.generateHr(doc, invoiceTableTop + 20, primaryColor);
        doc.font('Helvetica').fillColor('#000000');

        let position = 0;
        quote.items.forEach((item, index) => {
            position = invoiceTableTop + (index + 1) * 30;
            this.generateTableRow(
                doc,
                position,
                item.product.sku || '-',
                item.product.name,
                `${item.quantityBoxes} cx`,
                this.formatCurrency(item.unitPriceCents),
                this.formatCurrency(item.totalCents)
            );

            this.generateHr(doc, position + 20, '#aaaaaa');
        });

        const subtotalPosition = position + 30;
        this.generateTableRow(doc, subtotalPosition, '', '', 'Subtotal', '', this.formatCurrency(quote.subtotalCents));

        if (quote.discountCents > 0) {
            const discountPosition = subtotalPosition + 20;
            this.generateTableRow(doc, discountPosition, '', '', 'Desconto', '', `-${this.formatCurrency(quote.discountCents)}`);
        }

        if (quote.deliveryFee > 0) {
            const deliveryPosition = subtotalPosition + 40;
            this.generateTableRow(doc, deliveryPosition, '', '', 'Frete', '', this.formatCurrency(quote.deliveryFee));
        }

        const totalPosition = subtotalPosition + 60;
        doc.font('Helvetica-Bold').fillColor(primaryColor);
        this.generateTableRow(doc, totalPosition, '', '', 'TOTAL', '', this.formatCurrency(quote.totalCents));
        doc.font('Helvetica').fillColor('#000000');
    }

    private generateFooter(doc: PDFKit.PDFDocument, quote: QuoteWithRelations, template: QuoteTemplate | null) {
        const yStart = 550;
        const primaryColor = template?.primaryColor || '#000000';

        // Dados Bancários
        if (template?.showBankDetails && template.bankName) {
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('Dados Bancários:', 50, yStart);
            doc.font('Helvetica').fillColor('#000000');
            let bankY = yStart + 15;
            doc.text(`Banco: ${template.bankName}`, 50, bankY);
            if (template.bankAgency) doc.text(`Agência: ${template.bankAgency}`, 200, bankY);
            if (template.bankAccount) doc.text(`Conta: ${template.bankAccount}`, 350, bankY);
            bankY += 15;
            if (template.bankAccountHolder) doc.text(`Titular: ${template.bankAccountHolder}`, 50, bankY);
            if (template.pixKey) doc.text(`PIX: ${template.pixKey}`, 280, bankY);
        }

        // Termos e Condições
        if (template?.showTerms && template.termsAndConditions) {
            doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor).text('Termos e Condições:', 50, 610);
            doc.font('Helvetica').fillColor('#333333').text(template.termsAndConditions, 50, 625, { width: 500, lineGap: 2 });
        }

        // Validade
        const validityText = template?.validityText || `Este orçamento é válido por ${template?.validityDays || 10} dias.`;
        doc.fontSize(9).text(validityText, 50, 720, { align: 'center', width: 500 });

        // Linhas de Assinatura
        if (template?.showSignatureLines) {
            doc.moveTo(80, 760).lineTo(250, 760).stroke('#000000');
            doc.moveTo(310, 760).lineTo(480, 760).stroke('#000000');
            doc.fontSize(8).text('Vendedor', 80, 765, { width: 170, align: 'center' });
            doc.text('Cliente', 310, 765, { width: 170, align: 'center' });
        }

        // Footer Text
        if (template?.footerText) {
            doc.fontSize(7).fillColor('#666666').text(template.footerText, 50, 780, { align: 'center', width: 500 });
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
            .text(item, 50, y)
            .text(description, 100, y, { width: 200 })
            .text(quantity, 320, y, { width: 50, align: 'right' })
            .text(unitCost, 380, y, { width: 90, align: 'right' })
            .text(total, 480, y, { align: 'right' });
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
