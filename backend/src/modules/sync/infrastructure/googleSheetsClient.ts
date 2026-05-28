import { google } from 'googleapis';

export function getGoogleClients() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  let key: any;
  try {
    key = JSON.parse(keyJson);
  } catch (e) {
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${(e as Error).message}`);
  }

  if (!key.client_email || !key.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email or private_key');
  }

  // Vercel may store \n as literal backslash-n — convert to real newlines
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
