import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Quote, Customer, User, QuoteItem, Product, Architect } from '@prisma/client';

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
    async generatePdf(quote: QuoteWithRelations): Promise<Buffer> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header
            this.generateHeader(doc, quote);

            // Customer Info
            this.generateCustomerInfo(doc, quote);

            // Items Table
            this.generateTable(doc, quote);

            // Footer
            this.generateFooter(doc, quote);

            doc.end();
        });
    }

    private generateHeader(doc: PDFKit.PDFDocument, quote: QuoteWithRelations) {
        doc
            .fontSize(20)
            .text('ORÇAMENTO', { align: 'center' })
            .fontSize(10)
            .text(`Nº #${String(quote.number).padStart(4, '0')}`, { align: 'center' })
            .moveDown();

        doc.fontSize(12).text('RevestimentosOS', 50, 50);
        doc.fontSize(10).text('Av. Revestimentos, 1000', 50, 65);
        doc.text('São Paulo - SP', 50, 80);
        doc.moveDown();
    }

    private generateCustomerInfo(doc: PDFKit.PDFDocument, quote: QuoteWithRelations) {
        doc.rect(50, 110, 510, 80).stroke();

        const customerY = 120;
        doc.fontSize(10).font('Helvetica-Bold').text('Dados do Cliente:', 60, customerY);
        doc.font('Helvetica').text(quote.customer.name, 60, customerY + 15);
        if (quote.customer.document) doc.text(`CPF/CNPJ: ${quote.customer.document}`, 60, customerY + 30);
        if (quote.customer.phone) doc.text(`Tel: ${quote.customer.phone}`, 60, customerY + 45);

        const metaX = 350;
        doc.font('Helvetica-Bold').text('Detalhes:', metaX, customerY);
        doc.font('Helvetica').text(`Data: ${quote.createdAt.toLocaleDateString('pt-BR')}`, metaX, customerY + 15);
        doc.text(`Vendedor: ${quote.seller.name || 'N/A'}`, metaX, customerY + 30);
        if (quote.validUntil) {
            doc.text(`Válido até: ${quote.validUntil.toLocaleDateString('pt-BR')}`, metaX, customerY + 45);
        }
    }

    private generateTable(doc: PDFKit.PDFDocument, quote: QuoteWithRelations) {
        let i;
        const invoiceTableTop = 220;

        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            invoiceTableTop,
            'Item',
            'Descrição',
            'Qtd',
            'Preço Unit.',
            'Total'
        );
        this.generateHr(doc, invoiceTableTop + 20);
        doc.font('Helvetica');

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

            this.generateHr(doc, position + 20);
        });

        const subtotalPosition = position + 30;
        this.generateTableRow(
            doc,
            subtotalPosition,
            '',
            '',
            'Subtotal',
            '',
            this.formatCurrency(quote.subtotalCents)
        );

        if (quote.discountCents > 0) {
            const discountPosition = subtotalPosition + 20;
            this.generateTableRow(
                doc,
                discountPosition,
                '',
                '',
                'Desconto',
                '',
                `-${this.formatCurrency(quote.discountCents)}`
            );
        }

        if (quote.deliveryFee > 0) {
            const deliveryPosition = subtotalPosition + 40;
            this.generateTableRow(
                doc,
                deliveryPosition,
                '',
                '',
                'Frete',
                '',
                this.formatCurrency(quote.deliveryFee)
            );
        }

        const totalPosition = subtotalPosition + 60;
        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            totalPosition,
            '',
            '',
            'TOTAL',
            '',
            this.formatCurrency(quote.totalCents)
        );
        doc.font('Helvetica');
    }

    private generateFooter(doc: PDFKit.PDFDocument, quote: QuoteWithRelations) {
        doc
            .fontSize(10)
            .text(
                'Este orçamento é válido por 10 dias. O pagamento deve ser realizado conforme combinado.',
                50,
                720,
                { align: 'center', width: 500 }
            );
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

    private generateHr(doc: PDFKit.PDFDocument, y: number) {
        doc
            .strokeColor('#aaaaaa')
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
