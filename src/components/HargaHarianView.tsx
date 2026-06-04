import React, { useState } from 'react';
import { AppState, HargaHarian } from '../types';
import { addAuditLog } from '../storage';
import { 
  DollarSign, 
  Leaf, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ShieldAlert, 
  ShieldCheck, 
  HelpCircle,
  Tag
} from 'lucide-react';
import { motion } from 'motion/react';

interface HargaHarianProps {
  state: AppState;
  onSavePrice: (priceRecord: HargaHarian) => Promise<void>;
}

export default function HargaHarianView({ state, onSavePrice }: HargaHarianProps) {
  const { hargaHarian, currentUser } = state;
  const todayStr = new Date().toISOString().split('T')[0];

  // Form states
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [hargaTbs, setHargaTbs] = useState<number | ''>('');
  const [hargaBron, setHargaBron] = useState<number | ''>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Determine authorized roles
  const canModify = currentUser?.role === 'Admin' || currentUser?.role === 'Owner';

  // Sort prices by date descending
  const sortedPrices = [...hargaHarian].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  // Access current prices for information display
  const getLatestPrices = () => {
    return sortedPrices[0] || { tanggal: todayStr, harga_tbs: 2200, harga_brondolan: 2650 };
  };

  const latest = getLatestPrices();

  // Compare today's price with yesterday's
  const getFluctuation = (key: 'harga_tbs' | 'harga_brondolan') => {
    if (sortedPrices.length < 2) return { value: 0, direction: 'flat' };
    const latestVal = sortedPrices[0][key];
    const prevVal = sortedPrices[1][key];
    const diff = latestVal - prevVal;
    
    if (diff > 0) return { value: diff, direction: 'up' };
    if (diff < 0) return { value: Math.abs(diff), direction: 'down' };
    return { value: 0, direction: 'flat' };
  };

  const tbsFluct = getFluctuation('harga_tbs');
  const bronFluct = getFluctuation('harga_brondolan');

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;

    setErrorMsg('');
    setSuccessMsg('');

    const tbsNum = Number(hargaTbs);
    const bronNum = Number(hargaBron);

    if (tbsNum <= 0 || bronNum <= 0) {
      setErrorMsg('Harga harus lebih besar dari Rp 0!');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPrice: HargaHarian = {
        tanggal: selectedDate,
        harga_tbs: tbsNum,
        harga_brondolan: bronNum
      };

      await onSavePrice(newPrice);

      setSuccessMsg(`Berhasil memperbarui harga harian untuk tanggal ${selectedDate.split('-').reverse().join('/')}!`);
      
      // Reset inputs
      if (selectedDate === todayStr) {
        setHargaTbs('');
        setHargaBron('');
      }
    } catch (err: any) {
      setErrorMsg(`Gagal menyimpan harga: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
  };

  return (
    <div className="space-y-6" id="harga-view-container">
      {/* Informational Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="harga-status-top">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pengaturan Harga Harian Komoditas</h1>
          <p className="text-gray-500 text-xs">Atur referensi harga harian kelapa sawit untuk mengotomatisasi perhitungan berat bersih timbangan.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {canModify ? (
            <div className="px-3.5 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200">
              <ShieldCheck size={14} className="text-slate-600" />
              <span>Akses Terbuka: Administrator / Owner</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-amber-100">
              <ShieldAlert size={14} className="text-amber-600" />
              <span>Layar Hanya-Baca (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* PRICE COMPARATIVE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="current-prices-cards">
        {/* Card: TBS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
              <Leaf size={12} className="text-slate-600" /> Referensi Harga TBS Hari Ini
            </span>
            <h3 className="text-2xl font-black font-sans text-gray-900">{formatRupiah(latest.harga_tbs)} <span className="text-xs font-normal text-gray-400">/ Kg</span></h3>
            <div className="flex items-center gap-1 text-[11px]">
              {tbsFluct.direction === 'up' && (
                <span className="text-slate-700 font-bold flex items-center"><TrendingUp size={12} className="mr-0.5 text-slate-650" /> +{formatRupiah(tbsFluct.value)} (Naik)</span>
              )}
              {tbsFluct.direction === 'down' && (
                <span className="text-red-500 font-semibold flex items-center"><TrendingDown size={12} className="mr-0.5" /> -{formatRupiah(tbsFluct.value)} (Turun)</span>
              )}
              {tbsFluct.direction === 'flat' && (
                <span className="text-gray-400">Stabil (Sama dengan kemarin)</span>
              )}
              <span className="text-gray-400">• Dibanding kemarin</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 border border-slate-200/55 shrink-0">
            <Tag size={20} />
          </div>
        </div>

        {/* Card: Brondolan */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBEBEB] flex items-center justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
              <Leaf size={12} className="text-amber-500" /> Referensi Harga Brondolan Hari Ini
            </span>
            <h3 className="text-2xl font-black font-sans text-gray-900">{formatRupiah(latest.harga_brondolan)} <span className="text-xs font-normal text-gray-400">/ Kg</span></h3>
            <div className="flex items-center gap-1 text-[11px]">
              {bronFluct.direction === 'up' && (
                <span className="text-slate-700 font-bold flex items-center"><TrendingUp size={12} className="mr-0.5 text-slate-650" /> +{formatRupiah(bronFluct.value)} (Naik)</span>
              )}
              {bronFluct.direction === 'down' && (
                <span className="text-red-500 font-semibold flex items-center"><TrendingDown size={12} className="mr-0.5" /> -{formatRupiah(bronFluct.value)} (Turun)</span>
              )}
              {bronFluct.direction === 'flat' && (
                <span className="text-gray-400">Stabil (Sama dengan kemarin)</span>
              )}
              <span className="text-gray-400">• Dibanding kemarin</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
            <Tag size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="harga-layout-split">
        {/* Input form panel: Access limited to authorised managers */}
        {canModify ? (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit space-y-4" id="harga-form-box">
            <h4 className="font-bold text-gray-800 text-sm mb-1 pb-3 border-b border-gray-100 flex items-center gap-1.5">
              <Plus size={16} className="text-slate-600" />
              <span>Update Harga Baru</span>
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="text-xs p-2.5 bg-red-50 border border-red-100 text-red-600 rounded-lg">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="text-xs p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Tanggal Berlaku</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Calendar size={14} />
                  </span>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Harga TBS (Rp/Kg)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[11px] font-bold text-gray-400">Rp</span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 2200"
                    value={hargaTbs}
                    onChange={(e) => setHargaTbs(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-right"
                    id="input-harga-tbs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Harga Brondolan (Rp/Kg)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[11px] font-bold text-gray-400">Rp</span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 2650"
                    value={hargaBron}
                    onChange={(e) => setHargaBron(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-right"
                    id="input-harga-brondolan"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 hover:shadow-md cursor-pointer"
                id="btn-save-price"
              >
                <span>{isSubmitting ? 'Menyimpan...' : 'Terapkan & Simpan Harga'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-amber-50/20 border border-amber-100 p-5 rounded-2xl text-center space-y-3 h-fit" id="readonly-warning">
            <ShieldAlert size={36} className="text-amber-600 mx-auto" />
            <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wider">Akses Terbaca Terbatas</h4>
            <p className="text-gray-500 text-xs leading-normal">
              Operator lapangan atau Kasir tidak diperkenankan mengubah harga referensi timbangan harian. Silakan hubungi <strong>Haji Apri (Owner)</strong> atau Admin untuk perubahan harga pasar.
            </p>
          </div>
        )}

        {/* Right ledger tables: sorted daily history */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <h4 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-3 flex justify-between items-center">
            <span>Riwayat Referensi Harga Harian</span>
            <span className="text-[10px] text-gray-400 font-mono">Total {sortedPrices.length} Catatan</span>
          </h4>

          <div className="overflow-x-auto" id="harga-history-table">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 pb-3">Tanggal</th>
                  <th className="py-2.5 pb-3 text-right">Harga TBS (Rp/Kg)</th>
                  <th className="py-2.5 pb-3 text-right">Harga Brondolan (Rp/Kg)</th>
                  <th className="py-2.5 pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {sortedPrices.map((price, index) => (
                  <tr key={price.tanggal || index} className="hover:bg-gray-55/40 transition-colors">
                    <td className="py-3 font-semibold text-gray-900 flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400 shrink-0" />
                      {price.tanggal.split('-').reverse().join('/')}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-805">{formatRupiah(price.harga_tbs)}</td>
                    <td className="py-3 text-right font-mono font-bold text-amber-700">{formatRupiah(price.harga_brondolan)}</td>
                    <td className="py-3 text-center">
                      {price.tanggal === todayStr ? (
                        <span className="p-1 px-1.5 rounded-full bg-slate-100 text-slate-800 text-[9px] font-bold border border-slate-200">Hari Ini (Aktif)</span>
                      ) : (
                        <span className="p-1 px-1.5 rounded-full bg-gray-100 text-gray-500 text-[9px]">Arsip</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedPrices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400">Belum ada riwayat harga yang tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
