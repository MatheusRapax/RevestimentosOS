import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelService {
    /**
     * Parse an Excel buffer into a JSON array of arrays.
     * @param buffer File buffer
     * @param headerRowIndex Index of the header row (0-based)
     */
    parseExcel(buffer: Buffer, headerRowIndex: number = 0): any[] {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Convert to array of arrays (handling raw data)
            const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

            if (!rows || rows.length < headerRowIndex + 1) {
                throw new BadRequestException('Could not read Excel content or file is empty');
            }

            return rows;
        } catch (error) {
            throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
        }
    }

    /**
     * Helper to clean string values
     */
    cleanString(value: any): string {
        if (!value) return '';
        return String(value).trim();
    }

    /**
     * Helper to parse numbers (money, dimensions)
     */
    parseNumber(value: any): number {
        if (typeof value === 'number') return value;
        if (!value) return 0;

        // Remove currency symbols, spaces, commas -> dots
        const str = String(value)
            .replace(/[R$\s]/g, '')
            .replace(',', '.');

        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
}
