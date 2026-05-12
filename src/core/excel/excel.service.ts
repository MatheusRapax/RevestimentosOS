import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelService {
  /**
   * Parse an Excel buffer into a JSON array of arrays.
   * @param buffer File buffer
   * @param headerRowIndex Index of the header row (0-based)
   * @param options Additional options for sheet_to_json
   */
  parseExcel(buffer: Buffer, headerRowIndex: number = 0, options: { raw?: boolean } = {}): any[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to array of arrays (handling raw data)
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: options.raw !== undefined ? options.raw : true,
      });

      if (!rows || rows.length < headerRowIndex + 1) {
        throw new BadRequestException(
          'Could not read Excel content or file is empty',
        );
      }

      return rows;
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse Excel file: ${error.message}`,
      );
    }
  }

  /**
   * Parse all sheets from an Excel buffer and concatenate their rows.
   */
  parseAllSheets(buffer: Buffer, options: { raw?: boolean } = {}): any[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allRows: any[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          raw: options.raw !== undefined ? options.raw : true,
        });
        allRows = allRows.concat(rows);
      }

      if (allRows.length === 0) {
        throw new BadRequestException(
          'Could not read Excel content or file is empty',
        );
      }

      return allRows;
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse Excel file across sheets: ${error.message}`,
      );
    }
  }

  /**
   * Parse specific sheets from an Excel buffer and concatenate their rows.
   * Useful for templates spread across multiple tabs.
   */
  parseMultipleSheets(buffer: Buffer, targetSheetNames: string[], options: { raw?: boolean } = {}): any[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allRows: any[] = [];

      for (const sheetName of targetSheetNames) {
        if (!workbook.SheetNames.includes(sheetName)) {
          continue; // Skip if sheet is not in the workbook
        }
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          raw: options.raw !== undefined ? options.raw : true,
        });
        allRows = allRows.concat(rows);
      }

      if (allRows.length === 0) {
        throw new BadRequestException(
          'Could not find requested tabs or file is empty',
        );
      }

      return allRows;
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse Excel file across sheets: ${error.message}`,
      );
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
