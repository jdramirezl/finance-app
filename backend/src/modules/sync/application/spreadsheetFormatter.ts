import { sheets_v4 } from 'googleapis';

export async function applyFormatting(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabData: Map<string, string[][]>
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  const sheetMap = new Map<string, number>();
  for (const s of meta.data.sheets || []) {
    if (s.properties?.title && s.properties.sheetId != null) {
      sheetMap.set(s.properties.title, s.properties.sheetId);
    }
  }

  const requests: sheets_v4.Schema$Request[] = [];

  const numericTabs: Record<string, number[]> = {
    'Accounts': [3, 4],
    'Pockets': [3],
    'Fixed Expenses': [2, 4, 5],
    'Net Worth': [1, 2, 3, 4],
  };

  for (const [tabName, rows] of tabData) {
    const sheetId = sheetMap.get(tabName);
    if (sheetId == null) continue;

    const rowCount = rows.length;
    const colCount = rows[0]?.length || 1;

    // Freeze header row
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    });

    // Bold header with dark background and white text
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            backgroundColor: { red: 31 / 255, green: 41 / 255, blue: 55 / 255 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    });

    // Auto-resize columns
    requests.push({
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: colCount },
      },
    });

    // Number formatting for known tabs
    const cols = numericTabs[tabName] || (tabName.startsWith('Movements') ? [5] : null);
    if (cols) {
      for (const col of cols) {
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: col, endColumnIndex: col + 1 },
            cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat',
          },
        });
      }
    }

    // Movement tabs: highlight pending rows
    if (tabName.startsWith('Movements') && rowCount > 1) {
      for (let r = 1; r < rowCount; r++) {
        if (rows[r]?.[7] === 'Yes') {
          requests.push({
            repeatCell: {
              range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: colCount },
              cell: { userEnteredFormat: { backgroundColor: { red: 254 / 255, green: 249 / 255, blue: 195 / 255 } } },
              fields: 'userEnteredFormat.backgroundColor',
            },
          });
        }
      }
    }

    // Accounts tab: CD rows blue, archived rows gray text
    if (tabName === 'Accounts' && rowCount > 1) {
      for (let r = 1; r < rowCount; r++) {
        if (rows[r]?.[2] === 'cd') {
          requests.push({
            repeatCell: {
              range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: colCount },
              cell: { userEnteredFormat: { backgroundColor: { red: 219 / 255, green: 234 / 255, blue: 254 / 255 } } },
              fields: 'userEnteredFormat.backgroundColor',
            },
          });
        }
        const lastCol = rows[r]?.[colCount - 1];
        if (lastCol === 'Yes') {
          requests.push({
            repeatCell: {
              range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: colCount },
              cell: { userEnteredFormat: { textFormat: { foregroundColor: { red: 156 / 255, green: 163 / 255, blue: 175 / 255 } } } },
              fields: 'userEnteredFormat.textFormat.foregroundColor',
            },
          });
        }
      }
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }
}
