import { UserAccount, HargaHarian, TransaksiTimbang, KasRecord, PenjualanRecord, AuditLog } from './types';

export const SHEET_HEADERS = {
  USERS: ['user_id', 'nama', 'username', 'password_hash', 'role', 'status'],
  HARGA_HARIAN: ['tanggal', 'harga_tbs', 'harga_brondolan'],
  TRANSAKSI_TIMBANG: [
    'id_transaksi', 'tanggal', 'jam', 'id_petani', 'nama_petani',
    'jenis_sawit', 'kendaraan', 'supir', 'berat_kotor', 'berat_tara',
    'potongan', 'berat_bersih', 'harga_kg', 'total_bayar', 'operator'
  ],
  KAS: ['id_kas', 'tanggal', 'jenis', 'kategori', 'keterangan', 'nominal', 'user'],
  PENJUALAN: ['id_penjualan', 'tanggal', 'pembeli', 'jenis_sawit', 'berat', 'harga_jual', 'total'],
  AUDIT_LOG: ['id_log', 'tanggal', 'user', 'aktivitas', 'detail']
};

/**
 * Creates a new Spreadsheet with the designated lapak sawit structures
 */
export async function createLapakSpreadsheet(token: string, title: string): Promise<string> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const payload = {
    properties: {
      title: title || 'Database Lapak Sawit'
    },
    sheets: Object.keys(SHEET_HEADERS).map(name => ({
      properties: { title: name }
    }))
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membuat Spreadsheet: ${response.statusText} (${errText})`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Now, initialize headers for each sheet
  await initializeSpreadsheetHeaders(token, spreadsheetId);

  return spreadsheetId;
}

/**
 * Initializes headers on all sheets
 */
export async function initializeSpreadsheetHeaders(token: string, spreadsheetId: string): Promise<void> {
  const dataToUpdate = Object.entries(SHEET_HEADERS).map(([sheetName, headers]) => ({
    range: `${sheetName}!A1:${getColLetter(headers.length)}1`,
    values: [headers]
  }));

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const payload = {
    valueInputOption: 'USER_ENTERED',
    data: dataToUpdate
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal menginisialisasi header: ${response.statusText} (${errText})`);
  }
}

/**
 * Fetch rows from a spreadsheet sheet
 */
export async function fetchSheetRows(token: string, spreadsheetId: string, sheetName: string): Promise<any[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat data sheet ${sheetName}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Clears and syncs/saves whole table contents (excluding the header row)
 */
export async function saveFullTable(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: any[][]
): Promise<void> {
  // First clear everything below row 1
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:${getColLetter(headers.length)}100000:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (rows.length === 0) return;

  // Insert the rows starting at row 2
  const range = `${sheetName}!A2:${getColLetter(headers.length)}${rows.length + 1}`;
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(`${writeUrl}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: rows
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal memperbarui data sheet ${sheetName}: ${response.statusText} (${errText})`);
  }
}

/**
 * Append one row to Google Sheets
 */
export async function appendRow(token: string, spreadsheetId: string, sheetName: string, rowValues: any[]): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:A:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowValues]
    })
  });

  if (!response.ok) {
    throw new Error(`Gagal menyisipkan baris di ${sheetName}: ${response.statusText}`);
  }
}

/**
 * Convert number of columns to letter
 */
function getColLetter(colCount: number): string {
  let letter = '';
  let temp = colCount;
  while (temp > 0) {
    let tempMod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + tempMod) + letter;
    temp = Math.floor((temp - tempMod) / 26);
  }
  return letter || 'Z';
}

/**
 * Helpers to parse Date and Time values to string securely, preventing serial numbers format change
 */
export function parseDateValue(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str === '') return '';
  
  const num = Number(str);
  // Check if it fits the typical range of spreadsheet serial dates
  if (!isNaN(num) && num > 10000 && num < 100000) {
    try {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      const hasFraction = str.includes('.');
      if (hasFraction) {
        return d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      } else {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {
      return str;
    }
  }
  return str;
}

export function parseTimeValue(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str === '') return '';

  const num = Number(str);
  // Check if it fits the typical range of fractional time of a day
  if (!isNaN(num) && num >= 0 && num < 1) {
    try {
      const totalMinutes = Math.round(num * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    } catch {
      return str;
    }
  }
  return str;
}

/**
 * Mappers to map sheet arrays to typed objects, keeping everything organized
 */
export const SheetMappers = {
  users: (rows: any[][]): UserAccount[] => {
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      user_id: String(row[0] || ''),
      nama: String(row[1] || ''),
      username: String(row[2] || ''),
      password_hash: String(row[3] || ''),
      role: (row[4] || 'Operator Timbangan') as any,
      status: (row[5] || 'Aktif') as any
    }));
  },
  hargaHarian: (rows: any[][]): HargaHarian[] => {
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      tanggal: parseDateValue(row[0]),
      harga_tbs: Number(row[1] || 0),
      harga_brondolan: Number(row[2] || 0)
    }));
  },
  transaksi: (rows: any[][]): TransaksiTimbang[] => {
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      id_transaksi: String(row[0] || ''),
      tanggal: parseDateValue(row[1]),
      jam: parseTimeValue(row[2]),
      id_petani: String(row[3] || ''),
      nama_petani: String(row[4] || ''),
      jenis_sawit: (row[5] || 'TBS') as any,
      kendaraan: String(row[6] || ''),
      supir: String(row[7] || ''),
      berat_kotor: Number(row[8] || 0),
      berat_tara: Number(row[9] || 0),
      potongan: Number(row[10] || 0),
      berat_weights: Number(row[11] || 0), // wait, original uses berat_bersih
      berat_bersih: Number(row[11] || 0),
      harga_kg: Number(row[12] || 0),
      total_bayar: Number(row[13] || 0),
      operator: String(row[14] || ''),
      sync_status: 'synced'
    }));
  },
  kas: (rows: any[][]): KasRecord[] => {
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      id_kas: String(row[0] || ''),
      tanggal: parseDateValue(row[1]),
      jenis: (row[2] || 'Masuk') as any,
      kategori: String(row[3] || ''),
      keterangan: String(row[4] || ''),
      nominal: Number(row[5] || 0),
      user: String(row[6] || ''),
      sync_status: 'synced'
    }));
  },
  penjualan: (rows: any[][]): PenjualanRecord[] => {
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      id_penjualan: String(row[0] || ''),
      tanggal: parseDateValue(row[1]),
      pembeli: String(row[2] || ''),
      jenis_sawit: (row[3] || 'TBS') as any,
      berat: Number(row[4] || 0),
      harga_jual: Number(row[5] || 0),
      total: Number(row[6] || 0),
      sync_status: 'synced'
    }));
  },
  auditLogs: (rows: any[][]): AuditLog[] => {
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      id_log: String(row[0] || ''),
      tanggal: parseDateValue(row[1]),
      user: String(row[2] || ''),
      aktivitas: String(row[3] || ''),
      detail: String(row[4] || ''),
      sync_status: 'synced'
    }));
  }
};
