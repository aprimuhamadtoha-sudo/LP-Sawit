import { AppState, UserAccount, HargaHarian, TransaksiTimbang, KasRecord, PenjualanRecord, AuditLog, LapakSetting } from './types';

// Default initial settings
export const DEFAULT_SETTING: LapakSetting = {
  nama_lapak: 'Lapak Sawit Riau Makmur',
  logo_lapak: '',
  alamat: 'Jl. Trans Sumatra KM 42, Kandis, Riau',
  telp: '0812-3456-7890',
  nama_pemilik: 'Haji Apri Muhamad Toha',
  spreadsheet_id: ''
};

// Default seeded users
export const DEFAULT_USERS: UserAccount[] = [
  {
    user_id: 'USR-001',
    nama: 'Haji Apri',
    username: 'owner',
    password_hash: 'owner123', // plain for simple preview login
    role: 'Owner',
    status: 'Aktif'
  },
  {
    user_id: 'USR-002',
    nama: 'Budi Operator',
    username: 'operator',
    password_hash: 'operator123',
    role: 'Operator Timbangan',
    status: 'Aktif'
  },
  {
    user_id: 'USR-003',
    nama: 'Siti Kasir',
    username: 'kasir',
    password_hash: 'kasir123',
    role: 'Kasir',
    status: 'Aktif'
  },
  {
    user_id: 'USR-004',
    nama: 'Andi Admin',
    username: 'admin',
    password_hash: 'admin123',
    role: 'Admin',
    status: 'Aktif'
  }
];

// Initial seeded prices (for last 5 days)
const todayStr = new Date().toISOString().split('T')[0];
const getPastDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const DEFAULT_HARGA: HargaHarian[] = [];

// Seeded Transactions
export const DEFAULT_TRANSAKSI: TransaksiTimbang[] = [];

// Seeded Cash Flow Records
export const DEFAULT_KAS: KasRecord[] = [];

// Seeded Sales
export const DEFAULT_PENJUALAN: PenjualanRecord[] = [];

// Seeded Logs
export const DEFAULT_LOGS: AuditLog[] = [
  {
    id_log: 'LOG-0001',
    tanggal: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    user: 'owner',
    aktivitas: 'Inisialisasi Sistem',
    detail: 'Sistem web timbangan sawit pertama kali dijalankan',
    sync_status: 'synced'
  }
];

const LOCAL_STORAGE_KEY = 'LAPAK_SAWIT_APP_STATE';

export function loadLocalState(): AppState {
  const serialized = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!serialized) {
    // Generate fresh seeded state
    const state: AppState = {
      users: DEFAULT_USERS,
      hargaHarian: DEFAULT_HARGA,
      transaksi: DEFAULT_TRANSAKSI,
      kas: DEFAULT_KAS,
      penjualan: DEFAULT_PENJUALAN,
      auditLogs: DEFAULT_LOGS,
      setting: DEFAULT_SETTING,
      currentUser: null,
      googleUser: null,
      googleToken: null,
      isOnline: navigator.onLine,
      isSyncing: false,
      theme: 'light'
    };
    saveLocalState(state);
    return state;
  }

  try {
    const parsed = JSON.parse(serialized);
    // Ensure all structures are present
    return {
      users: parsed.users || DEFAULT_USERS,
      hargaHarian: parsed.hargaHarian || DEFAULT_HARGA,
      transaksi: parsed.transaksi || DEFAULT_TRANSAKSI,
      kas: parsed.kas || DEFAULT_KAS,
      penjualan: parsed.penjualan || DEFAULT_PENJUALAN,
      auditLogs: parsed.auditLogs || DEFAULT_LOGS,
      setting: parsed.setting || DEFAULT_SETTING,
      currentUser: parsed.currentUser || null,
      googleUser: parsed.googleUser || null,
      googleToken: parsed.googleToken || null,
      isOnline: navigator.onLine,
      isSyncing: false,
      theme: parsed.theme || 'light'
    };
  } catch (e) {
    console.error('Error parsing local storage state', e);
    // Return safe default
    return {
      users: DEFAULT_USERS,
      hargaHarian: DEFAULT_HARGA,
      transaksi: DEFAULT_TRANSAKSI,
      kas: DEFAULT_KAS,
      penjualan: DEFAULT_PENJUALAN,
      auditLogs: DEFAULT_LOGS,
      setting: DEFAULT_SETTING,
      currentUser: null,
      googleUser: null,
      googleToken: null,
      isOnline: navigator.onLine,
      isSyncing: false,
      theme: 'light'
    };
  }
}

export function saveLocalState(state: AppState) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Log an audit activity both locally and to sheets
 */
export function addAuditLog(state: AppState, user: string, aktivitas: string, detail: string): AuditLog {
  const newLog: AuditLog = {
    id_log: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    tanggal: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    user,
    aktivitas,
    detail,
    sync_status: 'pending'
  };

  state.auditLogs = [newLog, ...state.auditLogs];
  saveLocalState(state);
  return newLog;
}

/**
 * Generate transactions sequence number: TRX-YYYYMMDD-XXXX
 */
export function generateNextTrxNumber(transaksi: TransaksiTimbang[]): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`; // 20260604

  // Filter transactions created on this date
  const todaysTrxs = transaksi.filter(t => t.id_transaksi.startsWith(`TRX-${dateStr}-`));
  let nextNum = 1;

  if (todaysTrxs.length > 0) {
    // Collect numbers
    const nums = todaysTrxs.map(t => {
      const parts = t.id_transaksi.split('-');
      const numPart = parts[2];
      return parseInt(numPart, 10);
    }).filter(n => !isNaN(n));
    
    if (nums.length > 0) {
      nextNum = Math.max(...nums) + 1;
    }
  }

  return `TRX-${dateStr}-${String(nextNum).padStart(4, '0')}`;
}
