import { google } from 'googleapis';

export function getGoogleClients() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

  if (!keyJson && !keyBase64) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set');
  }

  let key: any;
  try {
    const raw = keyBase64
      ? Buffer.from(keyBase64, 'base64').toString('utf-8')
      : keyJson!;
    key = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse Google service account key: ${(e as Error).message}`);
  }

  if (!key.client_email || !key.private_key) {
    throw new Error('Google service account key is missing client_email or private_key');
  }

  // Handle escaped newlines (common in env vars)
  key.private_key = key.private_key.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}
