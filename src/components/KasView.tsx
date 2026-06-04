import React, { useState } from 'react';
import { AppState, KasRecord, PenjualanRecord } from '../types';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coins, 
  Layers, 
  Scale, 
  User, 
  FileText, 
  Search,
  Truck,
  Building2,
  TrendingUp,
  TrendingDown,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';

interface KasViewProps {
  state: AppState;
  onAddKas: (record: KasRecord) => Promise<void>;
  onAddPenjualan: (record: PenjualanRecord) => Promise<void>;
}

export default function KasView({ state, onAddKas, onAddPenjualan }: KasViewProps) {
  const { kas, penjualan, currentUser } = state;
  const todayStr = new Date().toISOString().split('T')[0];

  // Active view tab inside Kas page
  const [activeSubTab, setActiveSubTab] = useState<'jurnal' | 'penjualan-pks'>('jurnal');

  // Authorization policy (Only Owner, Admin or Kasir can make transactions)
  const isOperatorOnly = currentUser?.role === 'Operator Timbangan';

  // --- Sub-Tab 1: Jurnal Kas States ---
  const [kasJenis, setKasJenis] = useState<'Masuk' | 'Keluar'>('Keluar');
  const [kasKategori, setKasKategori] = useState('Operasional');
  const [kasNominal, setKasNominal] = useState<number | ''>('');
  const [kasKeterangan, setKasKeterangan] = useState('');
  const [kasFilterTerm, setKasFilterTerm] = useState('');

  // --- Sub-Tab 2: Penjualan PKS States ---
  const [pembeli, setPembeli] = useState('');
  const [pksJenisSawit, setPksJenisSawit] = useState<'TBS' | 'Brondolan'>('TBS');
  const [pksBerat, setPksBerat] = useState<number | ''>('');
  const [pksHargaJual, setPksHargaJual] = useState<number | ''>('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ARUS KAS BALANCES CALCULATION ---
  const initialCapital = 50000000; // Rp 50,000,000 starting cash reserve
  
  const totalMasuk = kas
    .filter(k => k.jenis === 'Masuk')
    .reduce((sum, k) => sum + k.nominal, 0);

  const totalKeluar = kas
    .filter(k => k.jenis === 'Keluar')
    .reduce((sum, k) => sum + k.nominal, 0);

  const currentCapital = initialCapital + totalMasuk - totalKeluar;

  // Sorting Kas Ledger chronologically descending
  const sortedKas = [...kas].sort((a, b) => b.id_kas.localeCompare(a.id_kas));

  const filteredKas = sortedKas.filter(k => {
    const term = kasFilterTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      k.kategori.toLowerCase().includes(term) ||
      k.keterangan.toLowerCase().includes(term) ||
      k.user.toLowerCase().includes(term)
    );
  });

  // Handle addition of standard journal entry
  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperatorOnly) return;

    setErrorMsg('');
    setSuccessMsg('');

    const nominal = Number(kasNominal);
    if (nominal <= 0) {
      setErrorMsg('Nominal transaksi harus lebih besar dari Rp 0!');
      return;
    }

    setIsSubmitting(true);

    try {
      const nextId = 'KAS-' + String(kas.length + 1).padStart(4, '0');
      const newRecord: KasRecord = {
        id_kas: nextId,
        tanggal: todayStr,
        jenis: kasJenis,
        kategori: kasKategori,
        keterangan: kasKeterangan.trim() || `${kasKategori} - Transaksi Manual`,
        nominal: nominal,
        user: currentUser?.nama || 'Kasir',
        sync_status: 'pending'
      };

      await onAddKas(newRecord);

      setSuccessMsg(`Berhasil mencatatkan jurnal keuangan ${nextId}!`);
      
      // Reset inputs
      setKasNominal('');
      setKasKeterangan('');
    } catch (e: any) {
      setErrorMsg(`Gagal menyimpan jurnal kas: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle logging bulk sale dispatch to big commercial mill PKS
  const handleAddDispatchSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperatorOnly) return;

    setErrorMsg('');
    setSuccessMsg('');

    const berat = Number(pksBerat);
    const hargaJual = Number(pksHargaJual);

    if (!pembeli.trim()) {
      setErrorMsg('Nama PKS Pembeli wajib diisi!');
      return;
    }
    if (berat <= 0 || hargaJual <= 0) {
      setErrorMsg('Berat tonase and Harga jual harus bernilai positif!');
      return;
    }

    setIsSubmitting(true);

    try {
      const nextId = 'SL-' + String(penjualan.length + 1).padStart(4, '0');
      const totalRevenue = berat * hargaJual;

      // 1. Create bulk sale record
      const newSale: PenjualanRecord = {
        id_penjualan: nextId,
        tanggal: todayStr,
        pembeli: pembeli.trim(),
        jenis_sawit: pksJenisSawit,
        berat: berat,
        harga_jual: hargaJual,
        total: totalRevenue,
        sync_status: 'pending'
      };

      // 2. Automatically log a matching Kas Masuk entry under segment "Penjualan Sawit"
      const matchingKasId = 'KAS-' + String(kas.length + 1).padStart(4, '0');
      const matchingKas: KasRecord = {
        id_kas: matchingKasId,
        tanggal: todayStr,
        jenis: 'Masuk',
        kategori: 'Penjualan Sawit',
        keterangan: `Hasil jual bulk ${pksJenisSawit} ke ${pembeli.trim()} (${berat} Kg) No Jual ${nextId}`,
        nominal: totalRevenue,
        user: currentUser?.nama || 'Owner Haji Apri',
        sync_status: 'pending'
      };

      // Execute both saves (which also sync to Sheets)
      await onAddPenjualan(newSale);
      await onAddKas(matchingKas);

      setSuccessMsg(`Berhasil mencatatkan ekspor dispatch ${nextId} bernilai ${formatRupiah(totalRevenue)}. Pendapatan otomatis disetor ke Kas Lapak!`);

      // Reset
      setPembeli('');
      setPksBerat('');
      setPksHargaJual('');
    } catch (e: any) {
      setErrorMsg(`Gagal mendispatch penjualan: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
  };

  return (
    <div className="space-y-6" id="kas-view-container">
      {/* Sub page navigation headers */}
      <div className="bg-white px-5 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="kas-subnav">
        <div className="flex gap-1.5 border-b sm:border-b-0 pb-2 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('jurnal')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'jurnal' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-55 text-gray-600'}`}
          >
            Buku Jurnal Kas Lapak
          </button>
          <button
            onClick={() => setActiveSubTab('penjualan-pks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'penjualan-pks' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-55 text-gray-600'}`}
          >
            Penjualan Bulk ke PKS Mill
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'Operator Timbangan' && (
            <div className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-semibold flex items-center gap-1">
              <Lock size={12} /> Read-Only
            </div>
          )}
          {currentUser?.role !== 'Operator Timbangan' && (
            <div className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1">
              <ShieldCheck size={14} className="text-slate-600" /> Kasir Terverifikasi
            </div>
          )}
        </div>
      </div>

      {/* RENDER MODE 1: BOOK JOURNAL KAS LAPAK */}
      {activeSubTab === 'jurnal' && (
        <div className="space-y-6 animate-fadeIn" id="jurnal-tab-section">
          {/* CAPITAL STATS CARDS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="kas-summary-balances">
            {/* Box: Saldo Awal */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Modal / Saldo Awal</span>
                <h3 className="text-xl font-extrabold text-zinc-950 mt-1">{formatRupiah(initialCapital)}</h3>
                <span className="text-[9px] text-zinc-400 leading-normal block mt-1">Suntikan kas operational cadangan</span>
              </div>
              <div className="p-3 bg-zinc-55 text-zinc-600 rounded-xl">
                <Coins size={18} />
              </div>
            </div>

            {/* Box: Saldo Masuk - Keluar (Pergerakan) */}
            <div className="bg-white p-5 rounded-2xl border border-[#ECECEC] shadow-sm flex justify-between items-center">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Mutasi Arus Berjalan</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-slate-700 flex items-center"><TrendingUp size={12} className="mr-0.5 text-slate-600" /> {formatRupiah(totalMasuk)}</span>
                  <span className="text-zinc-300">/</span>
                  <span className="text-sm font-bold text-red-500 flex items-center"><TrendingDown size={12} /> {formatRupiah(totalKeluar)}</span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-1">Penerimaan vs Biaya & Sourced Petani</span>
              </div>
              <div className="p-3 bg-zinc-55 text-zinc-650 rounded-xl">
                <Coins size={18} />
              </div>
            </div>

            {/* Box: Saldo Akhir Berjalan */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider block">Realisasi Saldo Akhir</span>
                <h3 className="text-xl font-black text-slate-800 mt-1">{formatRupiah(currentCapital)}</h3>
                <span className="text-[9px] text-slate-650 font-medium block mt-1">Total kas terlikuidasi di brankas</span>
              </div>
              <div className="p-3 bg-slate-100 text-slate-800 border border-slate-200/50 rounded-xl">
                <Coins size={18} className="text-slate-700" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="jurnal-layout-split">
            {/* Input form: disabled for Operator */}
            {!isOperatorOnly ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-105 shadow-sm h-fit space-y-4" id="kas-entry-form">
                <h4 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <Plus size={16} className="text-slate-600" />
                  <span>Jurnal Buku Kas Baru</span>
                </h4>

                <form onSubmit={handleAddJournal} className="space-y-4">
                  {errorMsg && (
                    <div className="text-xs p-2.5 bg-red-50 border border-red-150 text-red-6500 rounded-lg">{errorMsg}</div>
                  )}
                  {successMsg && (
                    <div className="text-xs p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg">{successMsg}</div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Jenis Transaksi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setKasJenis('Masuk');
                          setKasKategori('Pendapatan Lain');
                        }}
                        className={`py-2 px-3 text-center border font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                          kasJenis === 'Masuk'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <ArrowUpRight size={14} className="text-slate-600" />
                        <span>KAS MASUK</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setKasJenis('Keluar');
                          setKasKategori('Operasional');
                        }}
                        className={`py-2 px-3 text-center border font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                          kasJenis === 'Keluar'
                            ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-500/10'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <ArrowDownRight size={14} className="text-red-500" />
                        <span>KAS KELUAR</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Kategori Kas</label>
                    <select
                      value={kasKategori}
                      onChange={(e) => setKasKategori(e.target.value)}
                      className="w-full p-2 py-2.5 bg-gray-55/40 border border-gray-200 rounded-xl text-xs font-semibold text-gray-750 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    >
                      {kasJenis === 'Masuk' ? (
                        <>
                          <option value="Penjualan Sawit">Penjualan Sawit (PKS)</option>
                          <option value="Pendapatan Lain">Pendapatan Lain</option>
                        </>
                      ) : (
                        <>
                          <option value="Pembayaran Petani">Pembayaran Petani</option>
                          <option value="Operasional">Kebutuhan Operasional</option>
                          <option value="BBM">Pengadaan BBM Solar</option>
                          <option value="Gaji">Gaji Pekerja & Operator</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Nominal (Rupiah)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-gray-400">Rp</span>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Contoh: 150000"
                        value={kasNominal}
                        onChange={(e) => setKasNominal(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-xl text-xs font-bold text-gray-805 text-right focus:outline-none focus:ring-1 focus:ring-slate-500"
                        id="input-kas-nominal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Keterangan Jurnal</label>
                    <textarea
                      rows={2}
                      placeholder="Tujuan atau peruntukan kas..."
                      value={kasKeterangan}
                      onChange={(e) => setKasKeterangan(e.target.value)}
                      className="w-full p-2.5 bg-gray-55/40 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder:text-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md"
                  >
                    <span>{isSubmitting ? 'Membukukan...' : 'Membukukan Jurnal Kas'}</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-amber-50/25 border border-amber-100 p-5 rounded-2xl text-center space-y-3 h-fit" id="readonly-jurnal-warning">
                <Lock size={36} className="text-amber-600 mx-auto" />
                <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wider select-none">Menu Terkunci</h4>
                <p className="text-gray-500 text-xs leading-normal">
                  Halaman perubahan Jurnal Keuangan Kas hanya boleh dimodifikasi oleh <strong>Kasir</strong>, Admin, atau Pemilik. Operator timbangan dilarang memanipulasi mutasi buku kas.
                </p>
              </div>
            )}

            {/* Jurnal Ledger Table List */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 gap-3">
                <h4 className="font-bold text-gray-800 text-sm">Buku Jurnal Aliran Keuangan</h4>
                <div className="relative max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 pointer-events-none">
                    <Search size={13} />
                  </span>
                  <input
                    type="text"
                    value={kasFilterTerm}
                    onChange={(e) => setKasFilterTerm(e.target.value)}
                    placeholder="Saring keterangan/kategori..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5">ID KAS</th>
                      <th className="py-2.5">Tanggal</th>
                      <th className="py-2.5">Jenis</th>
                      <th className="py-2.5">Kategori</th>
                      <th className="py-2.5">Keterangan</th>
                      <th className="py-2.5 text-right">Nominal (Rupiah)</th>
                      <th className="py-2.5">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-gray-700 font-medium">
                    {filteredKas.map((k, index) => (
                      <tr key={k.id_kas || index} className="hover:bg-gray-55/35 transition-colors">
                        <td className="py-3 font-mono font-bold text-gray-900">{k.id_kas}</td>
                        <td className="py-3 text-gray-500">{k.tanggal.split('-').reverse().join('/')}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-0.5 p-0.5 px-1.5 rounded-full text-[9px] font-bold ${
                            k.jenis === 'Masuk' ? 'bg-slate-100 text-slate-850' : 'bg-red-50 text-red-800'
                          }`}>
                            {k.jenis === 'Masuk' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {k.jenis}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-gray-900">{k.kategori}</td>
                        <td className="py-3 text-[11px] text-gray-500 leading-normal max-w-[200px] truncate" title={k.keterangan}>{k.keterangan}</td>
                        <td className={`py-3 text-right font-mono font-bold ${k.jenis === 'Masuk' ? 'text-slate-805' : 'text-red-600'}`}>
                          {k.jenis === 'Masuk' ? '+' : '-'}{formatRupiah(k.nominal)}
                        </td>
                        <td className="py-3 text-gray-400 font-semibold">@{k.user}</td>
                      </tr>
                    ))}
                    {filteredKas.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-400">Arus kas tidak ditemukan atau kosong.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER MODE 2: PENJUALAN BULK KE PKS MILL */}
      {activeSubTab === 'penjualan-pks' && (
        <div className="space-y-6 animate-fadeIn" id="penjualan-pks-section">
          {/* Informational Header */}
          <div className="bg-slate-50 border border-slate-205 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Truck size={18} />
                <span>Pencatatan Penjualan Besar/Bulk ke Pabrik (PKS)</span>
              </h3>
              <p className="text-gray-550 text-xs leading-normal">
                Catat pengiriman armada tronton/dump truck lapak Anda yang menjual kelapa sawit ke PKS Mill. Nominal penjualan akan secara otomatis dicatatkan ke kas penerimaan lapak berjalan!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dispatch-layout">
            {/* Input Form Dispatch */}
            {!isOperatorOnly ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit space-y-4" id="dispatch-form-box">
                <h4 className="font-bold text-gray-800 text-sm border-b border-gray-150 pb-3 flex items-center gap-1.5">
                  <Truck size={16} className="text-slate-600 animate-bounce" />
                  <span>Jual Baru ke PKS</span>
                </h4>

                <form onSubmit={handleAddDispatchSale} className="space-y-4">
                  {errorMsg && (
                    <div className="text-xs p-2.5 bg-red-50 border border-red-150 text-red-6500 rounded-lg">{errorMsg}</div>
                  )}
                  {successMsg && (
                    <div className="text-xs p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg">{successMsg}</div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">PKS Pembeli (Mill)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Building2 size={14} />
                      </span>
                      <input
                        type="text"
                        required
                        value={pembeli}
                        onChange={(e) => setPembeli(e.target.value)}
                        placeholder="Contoh: PT Tri Bakti Sawit"
                        className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Jenis Sawit</label>
                      <select
                        value={pksJenisSawit}
                        onChange={(e: any) => setPksJenisSawit(e.target.value)}
                        className="w-full p-2 bg-gray-55/40 border border-gray-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="TBS">TBS</option>
                        <option value="Brondolan">Brondolan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Total Tonase (Kg)</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          value={pksBerat}
                          onChange={(e) => setPksBerat(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 15000"
                          className="w-full p-2 pr-8 bg-gray-55/40 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                          id="export-weight"
                        />
                        <span className="absolute inset-y-0 right-3.5 flex items-center text-[9px] font-bold text-gray-400">KG</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Harga Jual Pabrik (Rp/Kg)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-zinc-400">Rp</span>
                      <input
                        type="number"
                        required
                        value={pksHargaJual}
                        onChange={(e) => setPksHargaJual(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 2450"
                        className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-xl text-xs font-bold text-gray-805 text-right"
                        id="export-price"
                      />
                    </div>
                  </div>

                  {/* LARGE CALCULATOR REVENUE PREVIEW */}
                  <div className="p-4 bg-emerald-50 text-zinc-800 rounded-xl border border-emerald-105 flex justify-between items-center font-mono text-center">
                    <div className="text-left">
                      <span className="text-[9px] text-emerald-700 block font-bold leading-none">TOTAL DISPATCH REVENUE</span>
                      <span className="text-sm font-black text-emerald-905 leading-normal">
                        {formatRupiah((Number(pksBerat) || 0) * (Number(pksHargaJual) || 0))}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    <span>Lapor & Setor Penjualan Besar</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-amber-50/20 border border-amber-100 p-5 rounded-2xl text-center space-y-3 h-fit">
                <Lock size={36} className="text-amber-600 mx-auto" />
                <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wider">Akses Terkunci</h4>
                <p className="text-gray-500 text-xs leading-normal">
                  Pencatatan Penjualan Bulk ke PKS dilarang dilakukan oleh Operator Timbangan. Harap gunakan login Owner / Haji Apri untuk mendaftarkan nota timbang PKS.
                </p>
              </div>
            )}

            {/* List bulk sales records */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
              <h4 className="font-bold text-gray-800 text-sm border-b border-gray-150 pb-3 flex justify-between items-center">
                <span>Arsip Dispatch Penjualan ke PKS</span>
                <span className="text-[10px] text-zinc-400 font-mono">Total {penjualan.length} Dispatch</span>
              </h4>

              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5">ID JUAL</th>
                      <th className="py-2.5">Tanggal</th>
                      <th className="py-2.5">Pembeli PKS</th>
                      <th className="py-2.5">Komoditas</th>
                      <th className="py-2.5 text-right">Berat dispatch</th>
                      <th className="py-2.5 text-right">Harga Jual (Kg)</th>
                      <th className="py-2.5 text-right">Total Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-semibold">
                    {penjualan.map((p, idx) => (
                      <tr key={p.id_penjualan || idx} className="hover:bg-gray-55/35 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-805">{p.id_penjualan}</td>
                        <td className="py-3 text-gray-500">{p.tanggal.split('-').reverse().join('/')}</td>
                        <td className="py-3 font-semibold text-gray-900">{p.pembeli}</td>
                        <td className="py-3">
                          <span className={`inline-block p-0.5 px-2 rounded-full text-[9px] font-bold p-1 px-1.5 border ${
                            p.jenis_sawit === 'TBS' ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-amber-50 text-amber-850 border-amber-200'
                          }`}>{p.jenis_sawit}</span>
                        </td>
                        <td className="py-3 text-right font-mono text-gray-900">{p.berat.toLocaleString('id-ID')} Kg</td>
                        <td className="py-3 text-right font-mono text-gray-400">{formatRupiah(p.harga_jual)}</td>
                        <td className="py-3 text-right font-mono font-black text-slate-850">{formatRupiah(p.total)}</td>
                      </tr>
                    ))}
                    {penjualan.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-400">Belum ada penyetoran penjualan pabrik tercatat.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
