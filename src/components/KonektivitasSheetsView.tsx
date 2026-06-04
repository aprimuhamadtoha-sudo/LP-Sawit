import React, { useState, useEffect } from 'react';
import { AppState, LapakSetting } from '../types';
import { 
  Database, Radio, ShieldCheck, Sparkles, RefreshCw, ExternalLink, Cloud, Settings, Server, Share2, HelpCircle
} from 'lucide-react';
import { createLapakSpreadsheet } from '../sheetsService';

interface KonektivitasSheetsViewProps {
  state: AppState;
  onUpdateSetting: (setting: LapakSetting) => Promise<void>;
  onForceSync: () => Promise<void>;
  onPullSync: () => Promise<void>;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
}

export default function KonektivitasSheetsView({
  state,
  onUpdateSetting,
  onForceSync,
  onPullSync,
  onSignInGoogle,
  onSignOutGoogle
}: KonektivitasSheetsViewProps) {
  const { setting, googleUser, googleToken, isOnline, isSyncing } = state;

  const [tempSpreadsheetId, setTempSpreadsheetId] = useState(setting.spreadsheet_id);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync tempSpreadsheetId if setting changes
  useEffect(() => {
    setTempSpreadsheetId(setting.spreadsheet_id);
  }, [setting.spreadsheet_id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    try {
      const updated: LapakSetting = {
        ...setting,
        spreadsheet_id: tempSpreadsheetId.trim()
      };

      await onUpdateSetting(updated);
      setSuccessMsg('ID Google Spreadsheet berhasil dihubungkan beku!');
    } catch (err: any) {
      setErrorMsg(`Gagal menyimpan ID: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAutoSheet = async () => {
    if (!googleToken) {
      alert('Anda harus menghubungkan Akun Google terlebih dahulu!');
      return;
    }

    const confirmCreate = window.confirm(
      'Apakah Anda ingin membuat Spreadsheet Database baru di Google Drive Anda secara otomatis?'
    );
    if (!confirmCreate) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const sheetId = await createLapakSpreadsheet(googleToken, `Database Lapak Sawit - ${setting.nama_lapak || 'Sawit Riau'}`);
      setTempSpreadsheetId(sheetId);
      
      const updated: LapakSetting = {
        ...setting,
        spreadsheet_id: sheetId
      };

      await onUpdateSetting(updated);
      setSuccessMsg(`Spreadsheet baru berhasil dibuat dan diprovisikan! ID: ${sheetId}`);
    } catch (err: any) {
      setErrorMsg(`Gagal membuat Spreadsheet: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = state.transaksi.filter(t => t.sync_status === 'pending').length;
  const syncedCount = state.transaksi.filter(t => t.sync_status === 'synced').length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6" id="owner-sheets-view-container">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-2 relative overflow-hidden" id="sheets-banner">
        <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
          <Database size={240} />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white/10 w-fit p-1.5 px-3 rounded-full text-emerald-100">
          <Server size={12} />
          <span>Akses Khusus Pemilik Lapak (Owner)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight">Konektivitas & Google Sheets API</h1>
        <p className="text-emerald-100/90 text-sm max-w-2xl font-medium">
          Dapatkan kontrol absolut pada database awan. Sinkronisasikan secara langsung rekap timbangan, jurnal kas, dan audit log stasiun timbangan sawit Anda langsung ke akun Google Drive pribadi Anda untuk keaslian mutlak.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Radio className="animate-pulse text-emerald-600 shrink-0" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="sheets-split-workspace">
        
        {/* DATA CONNECTION CHASSIS */}
        <div className="lg:col-span-2 space-y-6" id="sheets-info-panel-inner">
          
          {/* Connection status indicator */}
          <div className="p-5 rounded-2xl border border-gray-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Radio className={isOnline ? "animate-pulse" : ""} size={20} />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold block uppercase leading-none mb-1">Status Koneksi Lapak</span>
                <span className="font-extrabold text-gray-800 text-sm">
                  {isOnline ? 'Online (Real-time Cloud Sync Ready)' : 'Offline (Local Backup Only)'}
                </span>
              </div>
            </div>
          </div>

          {/* Google Credentials Board */}
          <div className="p-6 rounded-3xl border border-gray-150 bg-white space-y-4 shadow-xs">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={18} />
                <span>Otorisasi & Keamanan Google</span>
              </h4>
              <p className="text-gray-400 text-[10px5] text-xs">Aktifkan integrasi spreadsheet Google dengan mengotorisasi akun Pemilik Google Workspace.</p>
            </div>

            {googleUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/40 text-emerald-800 border border-emerald-100 rounded-2xl">
                <div className="flex items-center gap-3 text-xs">
                  {googleUser.photoURL ? (
                    <img src={googleUser.photoURL} className="w-10 h-10 rounded-full border border-emerald-200 shadow-xs" referrerPolicy="no-referrer" alt="Google Profile" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-base shadow-xs">G</span>
                  )}
                  <div>
                    <div className="font-black text-sm text-emerald-950">{googleUser.name}</div>
                    <div className="text-[11px] text-emerald-700 font-mono font-medium">{googleUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={onSignOutGoogle}
                  className="p-2 px-4 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-inner"
                >
                  Putus Sesi Hubungan
                </button>
              </div>
            ) : (
              <div className="text-center p-8 bg-[#FAFBF9] border border-dashed border-emerald-200 rounded-2xl space-y-4">
                <p className="text-xs text-gray-500 leading-normal max-w-md mx-auto">
                  Database lokal bekerja secara offline, namun sangat direkomendasikan untuk menghubungkannya secara periodik dengan Google Spreadsheet agar backup data tidak hilang.
                </p>
                <button
                  onClick={onSignInGoogle}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-600/20 cursor-pointer flex items-center gap-2 mx-auto shadow-md"
                >
                  <ShieldCheck size={16} />
                  <span>Hubungkan dengan Google Sheets API</span>
                </button>
              </div>
            )}
          </div>

          {/* Linking Specific Sheets ID */}
          <div className="p-6 rounded-3xl border border-gray-150 bg-white space-y-4 shadow-xs">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Share2 className="text-teal-600" size={18} />
                <span>ID Google Spreadsheet Database</span>
              </h4>
              <p className="text-gray-400 text-xs">Setiap baris data akan dipetakan langsung ke sheet terbitan Anda di dalam Google Drive.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-bold text-gray-700">
              <div className="space-y-1.5">
                <label className="block uppercase text-gray-500 text-[10px] tracking-wider">SPREADSHEET ID SAAT INI</label>
                <input
                  type="text"
                  value={tempSpreadsheetId}
                  onChange={(e) => setTempSpreadsheetId(e.target.value)}
                  placeholder="Contoh: 1vJ8_vXbIunGsm7-AkiP..."
                  className="w-full p-3 bg-gray-55/40 border border-zinc-200 rounded-xl font-mono text-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 placeholder-zinc-300"
                />
                <p className="text-[10px] text-gray-400 font-normal leading-normal">
                  ID ini dapat diambil dari link browser spreadsheet Anda: `https://docs.google.com/spreadsheets/d/<b>[SPREADSHEET-ID]</b>/edit`
                </p>
              </div>

              <div className="flex gap-2 flex-wrap pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Hubungkan ID Secara Manual'}
                </button>
                
                <button
                  type="button"
                  onClick={handleCreateAutoSheet}
                  disabled={actionLoading || !googleToken}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <Sparkles size={14} />
                  <span>Auto-buat & Provisi Baru</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* SIDE STATUS CONSOLE */}
        <div className="space-y-6" id="sheets-statistics-panel">
          <div className="bg-white border border-gray-150 p-6 rounded-3xl space-y-4 shadow-xs" id="sync-console-side-exclusive">
            <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
              <Database size={15} className="text-emerald-700" />
              <span>Status Ledger Data</span>
            </h4>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-455 font-bold uppercase tracking-wider block">Antrean Sync</span>
                  <span className="font-black text-amber-600 text-lg font-mono leading-none">{pendingCount} baris</span>
                </div>
                <Cloud size={24} className="text-amber-500/20" />
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-455 font-bold uppercase tracking-wider block">Tersinkronisasi</span>
                  <span className="font-black text-emerald-700 text-lg font-mono leading-none">{syncedCount} baris</span>
                </div>
                <Cloud size={24} className="text-emerald-600/20" />
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/20 border border-emerald-100/50">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest block">URL GOOGLE SPREADSHEET</span>
                {setting.spreadsheet_id ? (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${setting.spreadsheet_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-700 font-bold inline-flex items-center gap-1 hover:underline truncate max-w-full"
                  >
                    <span>Buka Lembar Kerja</span>
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-gray-400 text-[10px]">Belum terhubung ke spreadsheet apa pun.</span>
                )}
              </div>
            </div>

            <button
              onClick={onForceSync}
              disabled={isSyncing || actionLoading || !googleToken || !setting.spreadsheet_id}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sinkronisasi Berjalan...' : 'Sinkron Seluruh Tabel Sekarang'}</span>
            </button>

            <button
              onClick={onPullSync}
              disabled={isSyncing || actionLoading || !googleToken || !setting.spreadsheet_id}
              className="w-full mt-2 py-3 bg-white text-emerald-750 hover:bg-emerald-50 border border-emerald-200 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>Tarik Data Terbaru dari Database</span>
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200/60 p-5 rounded-3xl space-y-3" id="sheet-guide-note">
            <h5 className="font-bold text-gray-700 text-xs flex items-center gap-1.5">
              <HelpCircle size={14} className="text-teal-600" />
              <span>Panduan Struktur Database</span>
            </h5>
            <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
              Platform mengalirkan data ke 4 worksheet utama: <b>TRANSAKSI</b>, <b>KAS</b>, <b>PENJUALAN</b>, and <b>USERS</b>. Jangan mengubah nama kolom paling atas di spreadsheet Anda untuk menghindari kegagalan sinkronisasi otomatis.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
