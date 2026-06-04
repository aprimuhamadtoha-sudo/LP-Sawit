import React, { useState } from 'react';
import { AppState, TransaksiTimbang } from '../types';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Printer, 
  Calendar, 
  Tag, 
  CloudCheck, 
  CloudLightning, 
  Scale, 
  AlertTriangle,
  X,
  Save,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RiwayatTransaksiProps {
  state: AppState;
  onUpdate: (updatedTrx: TransaksiTimbang) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTriggerPrint: (trx: TransaksiTimbang, type: 'Nota' | 'Struk') => void;
}

type DateFilterType = 'All' | 'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan';

export default function RiwayatTransaksiView({ state, onUpdate, onDelete, onTriggerPrint }: RiwayatTransaksiProps) {
  const { transaksi, currentUser } = state;

  // Search & Filter controls
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('All');
  const [commodityFilter, setCommodityFilter] = useState<'All' | 'TBS' | 'Brondolan'>('All');

  // Edit states
  const [editingTrx, setEditingTrx] = useState<TransaksiTimbang | null>(null);
  const [editKotor, setEditKotor] = useState<number>(0);
  const [editTara, setEditTara] = useState<number>(0);
  const [editPotongan, setEditPotongan] = useState<number>(0);
  const [editSupir, setEditSupir] = useState('');
  const [editPetani, setEditPetani] = useState('');
  const [editNopol, setEditNopol] = useState('');

  // Delete states
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Authorization checks
  const isAdminOrOwner = currentUser?.role === 'Admin' || currentUser?.role === 'Owner';

  // Apply filters on the transaction history array
  const filteredTransactions = transaksi.filter(t => {
    // 1. Text Search matching supir, petani, nopol, or id_transaksi
    const sTerm = searchTerm.toLowerCase().trim();
    if (sTerm) {
      const matchId = t.id_transaksi.toLowerCase().includes(sTerm);
      const matchPetani = t.nama_petani.toLowerCase().includes(sTerm);
      const matchSupir = t.supir.toLowerCase().includes(sTerm);
      const matchNopol = t.kendaraan.toLowerCase().includes(sTerm);
      if (!matchId && !matchPetani && !matchSupir && !matchNopol) return false;
    }

    // 2. Commodity Filter
    if (commodityFilter !== 'All' && t.jenis_sawit !== commodityFilter) return false;

    // 3. Date Timeframe Filter
    const tDate = new Date(t.tanggal);
    const now = new Date();
    
    if (dateFilter === 'Harian') {
      const todayStr = now.toISOString().split('T')[0];
      return t.tanggal === todayStr;
    }
    
    if (dateFilter === 'Mingguan') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return tDate >= oneWeekAgo;
    }
    
    if (dateFilter === 'Bulanan') {
      const currentMonthPrefix = now.toISOString().substring(0, 7); // "YYYY-MM"
      return t.tanggal.startsWith(currentMonthPrefix);
    }
    
    if (dateFilter === 'Tahunan') {
      const currentYearStr = String(now.getFullYear());
      return t.tanggal.startsWith(currentYearStr);
    }

    return true;
  });

  // Open transaction edit dialog
  const handleOpenEdit = (t: TransaksiTimbang) => {
    if (!isAdminOrOwner) return;
    setEditingTrx(t);
    setEditKotor(t.berat_kotor);
    setEditTara(t.berat_tara);
    setEditPotongan(t.potongan);
    setEditSupir(t.supir);
    setEditPetani(t.nama_petani);
    setEditNopol(t.kendaraan);
  };

  // Submit edits
  const handleSaveEdit = async () => {
    if (!editingTrx) return;

    // Recalculates variables
    const newBersih = Math.max(0, editKotor - editTara - editPotongan);
    const newTotal = newBersih * editingTrx.harga_kg;

    const updated: TransaksiTimbang = {
      ...editingTrx,
      nama_petani: editPetani,
      supir: editSupir,
      kendaraan: editNopol,
      berat_kotor: editKotor,
      berat_tara: editTara,
      potongan: editPotongan,
      berat_bersih: newBersih,
      total_bayar: newTotal,
      sync_status: 'pending' // Flag for resync!
    };

    const confirmEdit = window.confirm(
      `Konfirmasi perubahan transaksi ${editingTrx.id_transaksi}?\n` +
      `Berat Bersih diperbarui: ${newBersih} Kg\n` +
      `Total Pembayaran diperbarui: Rp ${new Intl.NumberFormat('id-ID').format(newTotal)}`
    );

    if (!confirmEdit) return;

    try {
      await onUpdate(updated);
      setEditingTrx(null);
    } catch (e: any) {
      alert(`Gagal merubah transaksi: ${e.message || e}`);
    }
  };

  // Trigger record delete
  const handleDeleteConfirm = async (id: string) => {
    if (!isAdminOrOwner) return;

    const confirmDelete = window.confirm(
      `⚠️ TINDAKAN DESTRUKTIF ⚠️\n\n` +
      `Apakah Anda yakin ingin menghapus transaksi ${id}?\n` +
      `Tindakan ini akan menghapus data timbangan di database lokal and spreadsheet secara permanen!`
    );

    if (confirmDelete) {
      try {
        await onDelete(id);
        setDeletingId(null);
      } catch (e: any) {
        alert(`Gagal menghapus data: ${e.message || e}`);
      }
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
  };

  const formatKg = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val) + ' Kg';
  };

  return (
    <div className="space-y-6" id="history-view-container">
      {/* Header and status descriptors */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="history-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Riwayat Transaksi Timbangan</h1>
          <p className="text-gray-500 text-xs">Kelola, saring, edit, and cetak ulang sertifikat timbangan petani. Sinkronisasi Google Sheets berjalan di latar belakang.</p>
        </div>
        <div className="text-xs text-semibold p-1 px-3 bg-emerald-55 font-semibold text-emerald-800 rounded-lg border border-emerald-100/50">
          Total: <span className="font-bold underline">{transaksi.length}</span> Transaksi Terdaftar
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3.5" id="history-filters-bar">
        {/* Search Input */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search size={15} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari transaksi: No Karcis, Supir, Pemasok, Nopol..."
              className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Commodity Dropdown */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Tag size={14} />
            </span>
            <select
              value={commodityFilter}
              onChange={(e: any) => setCommodityFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700"
            >
              <option value="All">Semua Komoditas</option>
              <option value="TBS">TBS Saja</option>
              <option value="Brondolan">Brondolan Saja</option>
            </select>
          </div>

          {/* Date Filter Selection */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Calendar size={14} />
            </span>
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700"
            >
              <option value="All">Semua Waktu</option>
              <option value="Harian">Hari Ini</option>
              <option value="Mingguan">7 Hari Terakhir</option>
              <option value="Bulanan">Bulan Ini</option>
              <option value="Tahunan">Tahun Ini</option>
            </select>
          </div>
        </div>
      </div>

      {/* RENDER TABLE OF HISTORY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="history-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF8] border-b border-gray-150 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3 pl-4">No Karcis</th>
                <th className="p-3">Tanggal / Jam</th>
                <th className="p-3">Pemasok / Supir</th>
                <th className="p-3">Komoditas</th>
                <th className="p-3 text-right">Netto Bersih</th>
                <th className="p-3 text-right">Harga (Kg)</th>
                <th className="p-3 text-right">Total Bayar</th>
                <th className="p-3 text-center">Sync</th>
                <th className="p-3 pr-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredTransactions.map((t, idx) => (
                <tr key={t.id_transaksi || idx} className="hover:bg-gray-55/40 transition-colors">
                  <td className="p-3 pl-4 font-mono font-bold text-emerald-800">{t.id_transaksi}</td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-900">{t.tanggal.split('-').reverse().join('/')}</div>
                    <div className="text-[10px] text-gray-400">{t.jam}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-900">{t.nama_petani}</div>
                    <div className="text-[10px] text-gray-405">Supir: {t.supir} • {t.kendaraan}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 p-1 px-2 rounded-full text-[9px] font-bold ${
                      t.jenis_sawit === 'TBS' ? 'bg-zinc-100 text-zinc-850 border border-zinc-200/60' : 'bg-amber-50 text-amber-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.jenis_sawit === 'TBS' ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
                      {t.jenis_sawit}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900">{formatKg(t.berat_bersih)}</td>
                  <td className="p-3 text-right font-mono text-gray-500">{formatRupiah(t.harga_kg)}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-805 text-sm">{formatRupiah(t.total_bayar)}</td>
                  <td className="p-3 text-center">
                    {t.sync_status === 'synced' ? (
                      <span className="inline-flex justify-center text-slate-600" title="Sinkron Terverifikasi">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <span className="inline-flex justify-center text-amber-500 animate-pulse" title="Mengantre sinkronisasi">
                        <CloudLightning size={16} />
                      </span>
                    )}
                  </td>
                  <td className="p-3 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Reprints */}
                      <button
                        onClick={() => onTriggerPrint(t, 'Nota')}
                        className="p-1.5 text-zinc-650 hover:bg-zinc-100 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Print Nota Thermal"
                      >
                        <Printer size={14} />
                      </button>

                      {/* Authorized modifications */}
                      {isAdminOrOwner ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-zinc-650 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Timbangan"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(t.id_transaksi)}
                            className="p-1.5 text-zinc-650 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="p-1.5 text-zinc-300 cursor-not-allowed"
                          title="Terkunci: Membutuhkan Role Admin/Owner"
                        >
                          <Lock size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">Tidak ada transaksi timbangan ditemukan sesuai filter pencarian.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EDIT TRANSACTION MODAL DRAWER --- */}
      <AnimatePresence>
        {editingTrx && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 text-left"
              id="edit-drawer-modal"
            >
              <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Scale size={16} />
                  <span className="font-bold text-sm">Kalibrasi Timbangan: {editingTrx.id_transaksi}</span>
                </div>
                <button onClick={() => setEditingTrx(null)} className="text-white hover:text-red-200 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-semibold text-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-gray-700 uppercase tracking-wide">Nama Petani / Pemasok</label>
                    <input
                      type="text"
                      value={editPetani}
                      onChange={(e) => setEditPetani(e.target.value)}
                      className="w-full p-2 bg-gray-55 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700 uppercase tracking-wide">Supir</label>
                    <input
                      type="text"
                      value={editSupir}
                      onChange={(e) => setEditSupir(e.target.value)}
                      className="w-full p-2 bg-gray-55 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700 uppercase tracking-wide">Kendaraan</label>
                    <input
                      type="text"
                      value={editNopol}
                      onChange={(e) => setEditNopol(e.target.value)}
                      className="w-full p-2 bg-gray-55 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700 uppercase tracking-wide">Komoditas</label>
                    <input
                      disabled
                      type="text"
                      value={editingTrx.jenis_sawit}
                      className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-500 font-bold"
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl space-y-3.5 border border-emerald-100">
                  <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-100 pb-1.5 mb-2">KALIBRASI ULANG TIMBANGAN (KG)</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block mb-1 font-bold text-gray-600">BRUTO (KOTOR)</label>
                      <input
                        type="number"
                        value={editKotor}
                        onChange={(e) => setEditKotor(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-gray-600">TARA (KOSONG)</label>
                      <input
                        type="number"
                        value={editTara}
                        onChange={(e) => setEditTara(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-gray-600">POTONGAN</label>
                      <input
                        type="number"
                        value={editPotongan}
                        onChange={(e) => setEditPotongan(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* REAL-TIME PREVIEW OF SAVINGS */}
                <div className="bg-gray-50 border p-4 rounded-xl flex justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold tracking-wider block">BERAT BERSIH BERJALAN</span>
                    <span className="text-normal font-black text-gray-800">{Math.max(0, editKotor - editTara - editPotongan)} Kg</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold tracking-wider block">ESTIMASI TOTAL BILL</span>
                    <span className="text-normal font-black text-slate-805">{formatRupiah(Math.max(0, editKotor - editTara - editPotongan) * editingTrx.harga_kg)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-2 justify-end">
                <button
                  onClick={() => setEditingTrx(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Save size={13} />
                  <span>Terapkan Kalibrasi</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
