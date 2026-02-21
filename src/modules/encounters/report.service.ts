import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '@prisma/client';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async generateReport(
        encounterId: string,
        clinicId: string,
        userId: string,
    ): Promise<Buffer> {
        // Get encounter with all related data
        const encounter = await this.prisma.encounter.findFirst({
            where: { id: encounterId, clinicId },
            include: {
                patient: true,
                professional: true,
                clinic: true,
                note: true,
                procedures: {
                    orderBy: { performedAt: 'asc' },
                },
                consumables: {
                    orderBy: { createdAt: 'asc' },
                },
                attachments: {
                    include: { uploadedBy: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        if (encounter.status !== 'CLOSED') {
            throw new ForbiddenException(
                'Relatório só pode ser gerado para atendimentos finalizados',
            );
        }

        // Generate PDF
        const pdfBuffer = await this.createPDF(encounter);

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.VIEW,
            entity: 'Encounter',
            entityId: encounterId,
            message: 'encounter.report.generated',
        });

        return pdfBuffer;
    }

    private async createPDF(encounter: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Relatório Clínico - ${encounter.patient.name}`,
                    Author: 'MOA NEXUS',
                },
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // === HEADER ===
            doc.fontSize(20).font('Helvetica-Bold').text('RELATÓRIO CLÍNICO', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica').text(encounter.clinic.name, { align: 'center' });
            doc.moveDown(1);

            // Divider
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            // === PATIENT INFO ===
            doc.fontSize(14).font('Helvetica-Bold').text('Paciente');
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Nome: ${encounter.patient.name}`);
            if (encounter.patient.document) {
                doc.text(`Documento: ${encounter.patient.document}`);
            }
            if (encounter.patient.birthDate) {
                const birthDate = new Date(encounter.patient.birthDate);
                doc.text(`Data de Nascimento: ${birthDate.toLocaleDateString('pt-BR')}`);
            }
            doc.moveDown(0.5);

            // === ENCOUNTER INFO ===
            doc.fontSize(14).font('Helvetica-Bold').text('Atendimento');
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Data: ${encounter.date}`);
            doc.text(`Horário: ${encounter.time}`);
            doc.text(`Profissional: ${encounter.professional.name}`);
            doc.text(`Status: Finalizado`);
            doc.moveDown(1);

            // === SOAP ===
            if (encounter.note) {
                doc.fontSize(14).font('Helvetica-Bold').text('Nota Clínica (SOAP)');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica');

                if (encounter.note.subjective) {
                    doc.font('Helvetica-Bold').text('Subjetivo (S):');
                    doc.font('Helvetica').text(encounter.note.subjective);
                    doc.moveDown(0.3);
                }
                if (encounter.note.objective) {
                    doc.font('Helvetica-Bold').text('Objetivo (O):');
                    doc.font('Helvetica').text(encounter.note.objective);
                    doc.moveDown(0.3);
                }
                if (encounter.note.assessment) {
                    doc.font('Helvetica-Bold').text('Avaliação (A):');
                    doc.font('Helvetica').text(encounter.note.assessment);
                    doc.moveDown(0.3);
                }
                if (encounter.note.plan) {
                    doc.font('Helvetica-Bold').text('Plano (P):');
                    doc.font('Helvetica').text(encounter.note.plan);
                }
                doc.moveDown(1);
            }

            // === PROCEDURES ===
            if (encounter.procedures.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Procedimentos Realizados');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica');

                encounter.procedures.forEach((proc: any, index: number) => {
                    const date = new Date(proc.performedAt);
                    doc.text(`${index + 1}. ${proc.name} - ${date.toLocaleDateString('pt-BR')}`);
                    if (proc.notes) {
                        doc.fontSize(9).text(`   Obs: ${proc.notes}`);
                        doc.fontSize(10);
                    }
                });
                doc.moveDown(1);
            }

            // === CONSUMABLES ===
            if (encounter.consumables.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Consumíveis Utilizados');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica');

                encounter.consumables.forEach((cons: any, index: number) => {
                    doc.text(`${index + 1}. ${cons.product.name} - Qtd: ${cons.quantity} ${cons.product.unit || 'un'}`);
                });
                doc.moveDown(1);
            }

            // === ATTACHMENTS ===
            if (encounter.attachments.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Anexos');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica');

                encounter.attachments.forEach((att: any, index: number) => {
                    const size = att.size < 1024 * 1024
                        ? `${(att.size / 1024).toFixed(1)} KB`
                        : `${(att.size / (1024 * 1024)).toFixed(1)} MB`;
                    doc.text(`${index + 1}. ${att.originalName} (${att.mimeType}) - ${size}`);
                });
                doc.moveDown(1);
            }

            // === FOOTER ===
            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);
            doc.fontSize(8).font('Helvetica');
            const now = new Date();
            doc.text(`Gerado em: ${now.toLocaleString('pt-BR')}`, { align: 'center' });
            doc.text('MOA NEXUS - Sistema Multi-tenant', { align: 'center' });

            doc.end();
        });
    }
}
