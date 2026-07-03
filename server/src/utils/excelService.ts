import ExcelJS from 'exceljs';
import { corporateLogger } from './logger';

export async function generateStyledWorkbook(
  title: string,
  headers: string[],
  rows: Record<string, any>[],
  generatedBy: string = 'HR Admin'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title);

  // Metadata block at the top
  worksheet.addRow([]);
  const companyCell = worksheet.getCell('A2');
  companyCell.value = 'TATA MOTORS LTD.';
  companyCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '002060' } }; // Corporate Blue

  const titleCell = worksheet.getCell('A3');
  titleCell.value = `${title} Report`;
  titleCell.font = { name: 'Arial', size: 12, bold: true };

  const genCell = worksheet.getCell('A4');
  genCell.value = `Generated: ${new Date().toLocaleString('en-IN')} by ${generatedBy}`;
  genCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '595959' } };

  worksheet.addRow([]); // Blank spacer
  worksheet.addRow([]); // Blank spacer

  // Header row (usually row 7)
  const headerRowNumber = 7;
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '002060' } // Corporate Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'D3D3D3' } },
      left: { style: 'thin', color: { argb: 'D3D3D3' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: 'D3D3D3' } }
    };
  });

  // Populate data rows starting at row 8
  rows.forEach((rowObj, index) => {
    const rowValues = headers.map(h => {
      const val = rowObj[h];
      return val === undefined || val === null ? '' : val;
    });

    const addedRow = worksheet.addRow(rowValues);
    addedRow.height = 20;

    // Zebra striping (alternating row colors)
    const isEven = index % 2 === 0;
    const rowBgColor = isEven ? 'F2F4F7' : 'FFFFFF';

    addedRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  // Freeze panes: Freeze above row 8 (rows 1-7)
  worksheet.views = [
    { state: 'frozen', ySplit: 7, xSplit: 0, activeCell: 'A8', showGridLines: true }
  ];

  // Auto-fit column widths dynamically
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = Math.min(maxLength + 4, 35); // limit max width to prevent extremely wide columns
  });

  // Total summary footer row
  const summaryRow = worksheet.addRow([`Total Records: ${rows.length}`]);
  worksheet.mergeCells(`A${summaryRow.number}:${worksheet.columns[headers.length - 1]?.letter || 'E'}${summaryRow.number}`);
  const summaryCell = worksheet.getCell(`A${summaryRow.number}`);
  summaryCell.font = { name: 'Arial', size: 10, bold: true };
  summaryCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
