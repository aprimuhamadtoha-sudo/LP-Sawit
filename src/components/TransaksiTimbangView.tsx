import React, { useState, useEffect } from 'react';
import { AppState, TransaksiTimbang, HargaHarian } from '../types';
import { generateNextTrxNumber, addAuditLog, saveLocalState } from '../storage';
import { 
  Scale, 
  User, 
  Truck, 
  TrendingUp, 
  Calculator, 
  Save, 
  Printer, 
  Trash2, 
  Sparkles, 
  CheckCircle,
  FileText,
  Clock,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransaksiTimbangProps {
  state: AppState;
  onSave: (trx: TransaksiTimbang) => Promise<void>;
}

export default function TransaksiTimbangView({ state, onSave }: TransaksiTimbangProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().slice(0, 5);

  // States for form inputs
  const [namaPetani, setNamaPetani] = useState('Umum');
  const [supir, setSupir] = useState('');
  const [nopol, setNopol] = useState('');
  const [jenisSawit, setJenisSawit] = useState<'TBS' | 'Brondolan'>('TBS');
  const [beratKotor, setBeratKotor] = useState<number | ''>('');
  const [beratTara, setBeratTara] = useState<number | ''>('');
  const [potongan, setPotongan] = useState<number | ''>('');

  // Auto generated transaction calculations
  const [idTransaksi, setIdTransaksi] = useState('');
  const [hargaKg, setHargaKg] = useState(0);
  const [beratBersih, setBeratBersih] = useState(0);
  const [totalBayar, setTotalBayar] = useState(0);

  // Active validation state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active printing states
  const [printTrx, setPrintTrx] = useState<TransaksiTimbang | null>(null);
  const [printType, setPrintType] = useState<'Nota' | 'Struk'>('Nota');

  // Regenerate transaction ID on load and look up correct daily price
  useEffect(() => {
    setIdTransaksi(generateNextTrxNumber(state.transaksi));
  }, [state.transaksi]);

  // Look up price whenever jenis_sawit or hargaHarian changes
  useEffect(() => {
    const todayPriceRecord = state.hargaHarian.find(h => h.tanggal === todayStr);
    if (todayPriceRecord) {
      setHargaKg(jenisSawit === 'TBS' ? todayPriceRecord.harga_tbs : todayPriceRecord.harga_brondolan);
    } else {
      // Use fallback default prices if admin has not set today's price yet
      setHargaKg(jenisSawit === 'TBS' ? 2200 : 2650);
    }
  }, [jenisSawit, state.hargaHarian, todayStr]);

  // Watch weights to calculate net and total cost in real-time
  useEffect(() => {
    const kotor = Number(beratKotor) || 0;
    const tara = Number(beratTara) || 0;
    const pot = Number(potongan) || 0;

    const bersih = Math.max(0, kotor - tara - pot);
    setBeratBersih(bersih);
    setTotalBayar(bersih * hargaKg);
  }, [beratKotor, beratTara, potongan, hargaKg]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const kotor = Number(beratKotor) || 0;
    const tara = Number(beratTara) || 0;
    const pot = Number(potongan) || 0;

    if (kotor === 0) {
      setErrorMsg('Berat Kotor tidak boleh kosong!');
      return;
    }
    if (kotor <= tara) {
      setErrorMsg('Berat Kotor harus lebih besar dari Berat Tara (timbangan kosong)!');
      return;
    }
    if (beratBersih <= 0) {
      setErrorMsg('Hasil Berat Bersih harus lebih besar dari 0!');
      return;
    }
    if (!namaPetani.trim()) {
      setErrorMsg('Nama Petani wajib diisi!');
      return;
    }

    setIsSubmitting(true);

    try {
      const newTrx: TransaksiTimbang = {
        id_transaksi: idTransaksi,
        tanggal: todayStr,
        jam: new Date().toTimeString().slice(0, 5),
        id_petani: 'PET-' + namaPetani.trim().substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 100),
        nama_petani: namaPetani.trim(),
        jenis_sawit: jenisSawit,
        kendaraan: nopol.toUpperCase().trim() || 'Tanpa Nopol',
        supir: supir.trim() || namaPetani.trim(),
        berat_kotor: kotor,
        berat_tara: tara,
        potongan: pot,
        berat_bersih: beratBersih,
        harga_kg: hargaKg,
        total_bayar: totalBayar,
        operator: state.currentUser?.nama || 'Operator Timbangan',
        sync_status: 'pending'
      };

      await onSave(newTrx);

      // Trigger success indicators
      setSuccessMsg(`Transaksi ${idTransaksi} berhasil disimpan dan diantrekan untuk sinkronisasi!`);
      
      // Auto open print modal for operators
      setPrintTrx(newTrx);
      setPrintType('Nota');

      // Reset form variables
      setNamaPetani('Umum');
      setSupir('');
      setNopol('');
      setBeratKotor('');
      setBeratTara('');
      setPotongan('');
      
      // Regenerate ID
      setIdTransaksi(generateNextTrxNumber([...state.transaksi, newTrx]));
    } catch (err: any) {
      setErrorMsg(`Gagal menyimpan transaksi: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper formats
  const formatRupiah = (val: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
  };

  const getTodayTransactions = () => {
    return state.transaksi.filter(t => t.tanggal === todayStr);
  };

  const todayTrxs = getTodayTransactions();

  return (
    <div className="space-y-6" id="timbang-view-container">
      {/* Visual Header */}
      <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-sm flex items-center justify-between border border-emerald-700" id="timbang-header-banner">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="p-1 px-2.5 rounded-full bg-white/10 border border-white/10 text-xs font-semibold backdrop-blur-sm">STASIUN UTAMA</span>
            <span className="flex items-center gap-1 text-xs text-emerald-100"><Clock size={12} /> {todayStr.split('-').reverse().join('/')} {timeStr}</span>
          </div>
          <h2 className="text-xl font-bold font-sans tracking-tight">Kalkulator Timbang Lapak Sawit</h2>
          <p className="text-emerald-100 text-xs">Pencatatan real-time berat kotor, tara, and potongan untuk pembayaran petani otomatis.</p>
        </div>
        <div className="shrink-0 p-3 bg-white/10 rounded-xl border border-white/10 hidden md:block">
          <Scale size={32} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="calculator-section-layout">
        {/* Left Col: The Calculator Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" id="scale-form-container">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Formulir Timbangan Digital</h3>
                <p className="text-gray-400 text-xs">Karcis No: <span className="font-bold font-mono text-emerald-700">{idTransaksi}</span></p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-6500 text-sm rounded-xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* SECTION: DATA UMUM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Nama Supir Kendaraan</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <User size={16} className="text-gray-300" />
                    </span>
                    <input
                      type="text"
                      value={supir}
                      onChange={(e) => setSupir(e.target.value)}
                      placeholder="Nama supir pengantar sawit"
                      className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-505/20 focus:border-slate-500 text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">No. Polisi/Kendaraan</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Truck size={16} />
                    </span>
                    <input
                      type="text"
                      value={nopol}
                      onChange={(e) => setNopol(e.target.value)}
                      placeholder="Contoh: BM 1234 XY"
                      className="w-full pl-9 pr-4 py-2 bg-gray-55/40 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-transform-uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Jenis Komoditas Kelapa Sawit *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setJenisSawit('TBS')}
                      className={`py-2 px-3 text-center border font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        jenisSawit === 'TBS'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>TBS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setJenisSawit('Brondolan')}
                      className={`py-2 px-3 text-center border font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        jenisSawit === 'Brondolan'
                          ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Brondolan</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: DATA BERAT (TIMBANG DIGITAL) */}
              <div className="bg-[#FAFBF9]/80 p-5 rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-550 border-b border-gray-100 pb-2 mb-2">
                  <span>METRIK BERAT DAN HARGA</span>
                  <span className="text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm text-[10px]">HARGA HARIAN AKTIF: {formatRupiah(hargaKg)}/Kg</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-750 mb-1">Berat Kotor (Kg) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="0"
                        value={beratKotor}
                        onChange={(e) => setBeratKotor(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold text-gray-800"
                        id="weight-kotor"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-gray-400">KG</span>
                    </div>
                  </div>
 
                  <div>
                    <label className="block text-xs font-semibold text-gray-750 mb-1">Berat Tara / Kosong (Kg)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={beratTara}
                        onChange={(e) => setBeratTara(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold text-gray-800"
                        id="weight-tara"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-gray-400">KG</span>
                    </div>
                  </div>
 
                  <div>
                    <label className="block text-xs font-semibold text-gray-750 mb-1">Potongan Sampah/Air (Kg)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={potongan}
                        onChange={(e) => setPotongan(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold text-gray-800"
                        id="weight-potongan"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-gray-400">KG</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REAL-TIME CALCULATION SCREEN */}
              <div className="bg-emerald-600 text-white p-6 rounded-2xl flex flex-col sm:flex-row shadow-inner justify-between items-center gap-4 relative overflow-hidden border border-emerald-700">
                <div className="absolute top-0 right-0 opacity-5 translate-x-4 -translate-y-4">
                  <Scale size={160} />
                </div>
                
                <div className="space-y-1 relative z-10 text-center sm:text-left">
                  <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">BERAT BERSIH (NETTO)</span>
                  <div className="text-3xl font-black font-sans leading-none">{new Intl.NumberFormat('id-ID').format(beratBersih)} <span className="text-sm font-normal">Kg</span></div>
                  <span className="text-[10px] text-emerald-100 block">Kotor ({beratKotor || 0} Kg) - Tara ({beratTara || 0} Kg) - Pot ({potongan || 0} Kg)</span>
                </div>

                <div className="h-px sm:h-12 w-12 sm:w-px bg-emerald-500/40"></div>

                <div className="space-y-1 relative z-10 text-center sm:text-right">
                  <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">TOTAL PEMBAYARAN PETANI</span>
                  <div className="text-3xl font-black font-sans text-yellow-300 leading-none">{formatRupiah(totalBayar)}</div>
                  <span className="text-[10px] text-emerald-100 block">Rumus: {new Intl.NumberFormat('id-ID').format(beratBersih)} Kg × {formatRupiah(hargaKg)}</span>
                </div>
              </div>

              {/* SAVE TRANSACTION ACTION ROW */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-600/15 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Save size={16} />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi & Cetak'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Today's transactions quick list */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-800 text-sm mb-3">Timbangan Hari Ini</h4>
            <p className="text-gray-400 text-xs mb-4">Total terbit karcis timbang hari ini.</p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1" id="today-trx-quicklist">
              {todayTrxs.map((t, idx) => (
                <div key={t.id_transaksi || idx} className="p-3 bg-[#F9FAF9] hover:bg-emerald-50/25 rounded-xl border border-gray-100 text-xs space-y-2 transition-all flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-mono font-bold text-emerald-800">{t.id_transaksi}</div>
                    <div className="text-[10px] text-gray-405 font-medium">{t.jam} • {t.nama_petani} • {t.kendaraan}</div>
                    <div className="font-semibold text-gray-755 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${t.jenis_sawit === 'TBS' ? 'bg-emerald-600' : 'bg-yellow-500'}`}></span>
                      <span>{t.jenis_sawit} ({new Intl.NumberFormat('id-ID').format(t.berat_bersih)} Kg)</span>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="font-bold text-gray-900">{formatRupiah(t.total_bayar)}</div>
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => {
                          setPrintTrx(t);
                          setPrintType('Nota');
                        }}
                        className="p-1 px-1.5 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-emerald-700 font-bold rounded-md text-[10px] transition-colors cursor-pointer"
                        title="Cetak Nota"
                      >
                        Nota
                      </button>
                      <button
                        onClick={() => {
                          setPrintTrx(t);
                          setPrintType('Struk');
                        }}
                        className="p-1 px-1.5 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-emerald-700 font-bold rounded-md text-[10px] transition-colors cursor-pointer"
                        title="Cetak Struk"
                      >
                        Struk
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {todayTrxs.length === 0 && (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs text-medium">
                  Belum ada timbangan masuk hari ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- NOTA / STRUK VOUCHER PRINT MODAL --- */}
      <AnimatePresence>
        {printTrx && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 overflow-y-auto" id="print-modal-overlay">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-emerald-100 flex flex-col"
              id="print-modal-box"
            >
              {/* Modal Switch Tabs */}
              <div className="bg-emerald-600 text-white px-4 py-3.5 flex items-center justify-between">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPrintType('Nota')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${printType === 'Nota' ? 'bg-white text-emerald-800' : 'hover:bg-white/10 text-white'}`}
                  >
                    Nota Timbang
                  </button>
                  <button 
                    onClick={() => setPrintType('Struk')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${printType === 'Struk' ? 'bg-white text-emerald-800' : 'hover:bg-white/10 text-white'}`}
                  >
                    Struk Kecil
                  </button>
                </div>
                <button 
                  onClick={() => setPrintTrx(null)}
                  className="text-white hover:text-red-200 text-sm font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {/* PRINT CONTENT CANVAS */}
              <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col items-center" id="printable-voucher-body">
                {/* Visual slip paper container */}
                <div 
                  className={`w-full bg-slate-50 border p-4 sm:p-5 rounded-lg font-mono text-zinc-800 shadow-sm ${printType === 'Struk' ? 'max-w-[280px] text-xs' : 'text-sm'}`}
                  style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.01) 50%, transparent 50%)', backgroundSize: '100% 4px' }}
                >
                  {/* SLIP LOGO OR LAPAK HEADER */}
                  <div className="text-center space-y-1 border-b border-dashed border-zinc-300 pb-3 mb-4">
                    <h5 className="font-bold text-sm tracking-tight text-zinc-900 uppercase">
                      {state.setting.nama_lapak || 'LAPAK SAWIT RIAU'}
                    </h5>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      {state.setting.alamat || 'Jl. Trans Sumatra KM 42'}
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-none">
                      No: {state.setting.telp || '0812345678'}
                    </p>
                  </div>

                  {/* KARTU TIMBANG DETAILS */}
                  <div className="space-y-1.5 text-[11px] pb-3 mb-3 border-b border-dashed border-zinc-300 text-left">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">NO TICKET:</span>
                      <span className="font-bold text-zinc-900">{printTrx.id_transaksi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">TANGGAL:</span>
                      <span>{printTrx.tanggal.split('-').reverse().join('/')}  ({printTrx.jam})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">PETANI:</span>
                      <span className="font-bold text-zinc-900">{printTrx.nama_petani}</span>
                    </div>
                    {printTrx.supir && printTrx.supir !== printTrx.nama_petani && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">SUPIR:</span>
                        <span>{printTrx.supir}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-500">KENDARAAN:</span>
                      <span className="uppercase">{printTrx.kendaraan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">KOMODITAS:</span>
                      <span className="font-bold text-emerald-800">{printTrx.jenis_sawit}</span>
                    </div>
                  </div>

                  {/* NETTO / HARGA BREAKDOWN */}
                  <div className="space-y-1.5 text-xs pb-3 mb-4 border-b border-dashed border-zinc-400">
                    <div className="flex justify-between">
                      <span>BRUTO (KOTOR):</span>
                      <span className="font-bold">{new Intl.NumberFormat('id-ID').format(printTrx.berat_kotor)} KG</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TARA (KENDARAAN):</span>
                      <span className="text-zinc-650">-{new Intl.NumberFormat('id-ID').format(printTrx.berat_tara)} KG</span>
                    </div>
                    <div className="flex justify-between">
                      <span>POTONGAN:</span>
                      <span className="text-zinc-650">-{new Intl.NumberFormat('id-ID').format(printTrx.potongan)} KG</span>
                    </div>
                    <div className="flex justify-between font-bold text-zinc-900 pt-1 border-t border-dotted border-zinc-300">
                      <span>NETTO (BERSIH):</span>
                      <span className="text-slate-850">{new Intl.NumberFormat('id-ID').format(printTrx.berat_bersih)} KG</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>HARGA PER KG:</span>
                      <span>{formatRupiah(printTrx.harga_kg)}</span>
                    </div>
                  </div>

                  {/* GRAND TOTAL PAYOUT ROW */}
                  <div className="text-center space-y-1 bg-white/80 p-2.5 rounded border border-zinc-200/50 mb-4">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">TOTAL PAYOUT</span>
                    <h4 className="text-base font-black text-slate-850 font-mono tracking-tight leading-none">
                      {formatRupiah(printTrx.total_bayar)}
                    </h4>
                  </div>

                  {/* QR CODE & FOOTER DECORATOR */}
                  <div className="flex flex-col items-center justify-center space-y-3 pt-1 text-center font-mono">
                    {/* Public secure query string QR code using standard qrserver API */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(`ID:${printTrx.id_transaksi}|Netto:${printTrx.berat_bersih}Kg|Total:${printTrx.total_bayar}|Lapak:${state.setting.nama_lapak}`)}`}
                      className="w-24 h-24 border border-zinc-250 bg-white p-1 rounded-md"
                      alt="Transaction Auth QR"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[10px] text-zinc-400">
                      <p>Scan QR untuk validasi keaslian nota</p>
                      <p className="mt-2 text-zinc-450 border-t border-zinc-200/50 pt-2 text-[9px]">Operator: {printTrx.operator}</p>
                      <p className="mt-0.5 text-[8px]">Terima kasih atas kerja sama Anda</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Operations to PDF or Printer */}
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => {
                    const printContents = document.getElementById('printable-voucher-body')?.innerHTML;
                    const originalContents = document.body.innerHTML;
                    
                    if (printContents) {
                      const popupWin = window.open('', '_blank', 'width=600,height=600');
                      if (popupWin) {
                        popupWin.document.open();
                        popupWin.document.write(`
                          <html>
                            <head>
                              <title>Cetak Nota ${printTrx.id_transaksi}</title>
                              <style>
                                body { font-family: monospace; padding: 20px; background: white; color: black; display: flex; justify-content: center; }
                                .printable-body { max-width: 320px; width: 100%; border: 1px solid #ccc; padding: 15px; border-radius: 4px; }
                                .text-center { text-align: center; }
                                .flex { display: flex; justify-content: space-between; }
                                .flex-col { display: flex; flex-direction: column; align-items: center; }
                                h5, h4 { margin: 10px 0; }
                                hr { border: none; border-top: 1px dashed #333; margin: 10px 0; }
                                .bold { font-weight: bold; }
                                .qr-img { width: 120px; height: 120px; margin-top: 10px; }
                              </style>
                            </head>
                            <body onload="window.print();window.close();">
                              <div class="printable-body">
                                <div class="text-center">
                                  <h3 style="margin: 0; text-transform: uppercase;">${state.setting.nama_lapak || 'LAPAK SAWIT RIAU'}</h3>
                                  <p style="font-size: 11px; margin: 3px 0;">${state.setting.alamat || ''}</p>
                                  <p style="font-size: 11px; margin: 3px 0;">Telp: ${state.setting.telp || ''}</p>
                                </div>
                                <hr />
                                <div style="font-size: 12px; line-height: 1.6;">
                                  <div class="flex"><span>KARCIS NO:</span> <span class="bold">${printTrx.id_transaksi}</span></div>
                                  <div class="flex"><span>TANGGAL:</span> <span>${printTrx.tanggal.split('-').reverse().join('/')} (${printTrx.jam})</span></div>
                                  <div class="flex"><span>PETANI:</span> <span class="bold">${printTrx.nama_petani}</span></div>
                                  <div class="flex"><span>SUPIR:</span> <span>${printTrx.supir}</span></div>
                                  <div class="flex"><span>KENDARAAN:</span> <span class="bold" style="text-transform: uppercase;">${printTrx.kendaraan}</span></div>
                                  <div class="flex"><span>KOMODITAS:</span> <span class="bold">${printTrx.jenis_sawit}</span></div>
                                </div>
                                <hr />
                                <div style="font-size: 12px; line-height: 1.6;">
                                  <div class="flex"><span>BERAT KOTOR:</span> <span>${printTrx.berat_kotor} KG</span></div>
                                  <div class="flex"><span>BERAT TARA:</span> <span>-${printTrx.berat_tara} KG</span></div>
                                  <div class="flex"><span>POTONGAN:</span> <span>-${printTrx.potongan} KG</span></div>
                                  <div class="flex" style="border-top: 1px dotted #333; padding-top: 5px; margin-top: 5px;">
                                    <span class="bold">NETTO BERSIH:</span> <span class="bold">${printTrx.berat_bersih} KG</span>
                                  </div>
                                  <div class="flex"><span>HARGA / KG:</span> <span>Rp ${new Intl.NumberFormat('id-ID').format(printTrx.harga_kg)}</span></div>
                                </div>
                                <hr />
                                <div class="text-center" style="background: #ecfdf5; padding: 10px; margin: 10px 0; border-radius: 4px; border: 1px solid #a7f3d0;">
                                  <span style="font-size: 10px; display: block; color: #047857; font-weight: bold;">TOTAL WAJIB BAYAR</span>
                                  <h3 style="margin: 5px 0; color: #059669; font-family: monospace; font-weight: 800;">Rp ${new Intl.NumberFormat('id-ID').format(printTrx.total_bayar)}</h3>
                                </div>
                                <hr />
                                <div class="flex-col" style="font-size: 10px; text-align: center;">
                                  <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=ID:${printTrx.id_transaksi}|Netto:${printTrx.berat_bersih}Kg|Total:${printTrx.total_bayar}|Lapak:${state.setting.nama_lapak}" />
                                  <p style="margin-top: 10px;">Scan QR untuk validitas transaksi sawit</p>
                                  <p style="margin-top: 5px; font-weight: bold;">Operator: ${printTrx.operator}</p>
                                </div>
                              </div>
                            </body>
                          </html>
                        `);
                        popupWin.document.close();
                      } else {
                        // Safe fallback inside the active iframe if popup is blocked
                        window.print();
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Langsung</span>
                </button>
                <button
                  onClick={() => setPrintTrx(null)}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup Nota
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
