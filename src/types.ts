export type UserRole = 'Owner' | 'Admin' | 'Operator Timbangan' | 'Kasir';

export interface UserAccount {
  user_id: string;
  nama: string;
  username: string;
  password_hash: string;
  role: UserRole;
  status: 'Aktif' | 'Nonaktif';
}

export interface HargaHarian {
  tanggal: string; // YYYY-MM-DD
  harga_tbs: number;
  harga_brondolan: number;
}

export interface TransaksiTimbang {
  id_transaksi: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:MM
  id_petani: string;
  nama_petani: string;
  jenis_sawit: 'TBS' | 'Brondolan';
  kendaraan: string; // Nopol
  supir: string;
  berat_kotor: number;
  berat_tara: number;
  potongan: number;
  berat_bersih: number;
  harga_kg: number;
  total_bayar: number;
  operator: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

export interface KasRecord {
  id_kas: string;
  tanggal: string; // YYYY-MM-DD
  jenis: 'Masuk' | 'Keluar';
  kategori: string; // Pembayaran Petani, Operasional, BBM, Gaji, Penjualan Sawit, Pendapatan Lain, dll
  keterangan: string;
  nominal: number;
  user: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

export interface PenjualanRecord {
  id_penjualan: string;
  tanggal: string;
  pembeli: string;
  jenis_sawit: 'TBS' | 'Brondolan';
  berat: number;
  harga_jual: number;
  total: number;
  sync_status: 'synced' | 'pending' | 'failed';
}

export interface AuditLog {
  id_log: string;
  tanggal: string; // YYYY-MM-DD HH:mm:ss
  user: string;
  aktivitas: string;
  detail: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

export interface LapakSetting {
  nama_lapak: string;
  logo_lapak: string; // base64 or placeholder
  alamat: string;
  telp: string;
  nama_pemilik: string;
  spreadsheet_id: string;
}

export interface AppState {
  users: UserAccount[];
  hargaHarian: HargaHarian[];
  transaksi: TransaksiTimbang[];
  kas: KasRecord[];
  penjualan: PenjualanRecord[];
  auditLogs: AuditLog[];
  setting: LapakSetting;
  currentUser: UserAccount | null;
  googleUser: { name: string; email: string; photoURL?: string } | null;
  googleToken: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  theme: 'light' | 'dark';
}
