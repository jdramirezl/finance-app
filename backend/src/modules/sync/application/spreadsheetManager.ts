import { drive_v3, sheets_v4 } from 'googleapis';

export async function createSpreadsheet(
  drive: drive_v3.Drive,
  title: string,
  userEmail: string
): Promise<string> {
  const res = await drive.files.create({
    requestBody: { name: title, mimeType: 'application/vnd.google-apps.spreadsheet' },
    fields: 'id',
  });
  const id = res.data.id;
  if (!id) throw new Error('Failed to create spreadsheet: no ID returned');
  await drive.permissions.create({
    fileId: id,
    requestBody: { type: 'user', role: 'writer', emailAddress: userEmail },
  });
  return id;
}

export async function writeAllTabs(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabData: Map<string, string[][]>
): Promise<void> {
  const tabNames = [...tabData.keys()];
  if (!tabNames.length) return;

  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  const existing = meta.data.sheets || [];

  const existingMap = new Map(existing.map(s => [s.properties!.title!, s.properties!.sheetId!]));
  const requests: sheets_v4.Schema$Request[] = [];

  // Rename Sheet1 to first tab if it exists, otherwise delete it
  if (existingMap.has('Sheet1')) {
    if (!existingMap.has(tabNames[0])) {
      requests.push({ updateSheetProperties: {
        properties: { sheetId: existingMap.get('Sheet1'), title: tabNames[0] },
        fields: 'title',
      }});
      existingMap.set(tabNames[0], existingMap.get('Sheet1')!);
    } else {
      requests.push({ deleteSheet: { sheetId: existingMap.get('Sheet1') } });
    }
    existingMap.delete('Sheet1');
  }

  // Delete tabs not in tabData
  for (const [name, sheetId] of existingMap) {
    if (!tabData.has(name)) requests.push({ deleteSheet: { sheetId } });
  }

  // Create tabs that don't exist
  for (const name of tabNames) {
    if (!existingMap.has(name)) requests.push({ addSheet: { properties: { title: name } } });
  }

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  // Write data to each tab
  for (const [name, rows] of tabData) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${name}'`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }
}
