import React, { useState } from 'react';
import { AppState, TransaksiTimbang } from '../types';
import { 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  Scale, 
  Coins, 
  Calendar,
  Layers,
  Search,
  ArrowDownToLine,
  Printer
} from 'lucide-react';
import { motion } from 'motion/react';

interface LaporanViewProps {
  state: AppState;
}

export default function LaporanView({ state }: LaporanViewProps) {
  const { transaksi } = state;

  // Selected reporting month/year. Default to current month.
  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Filter transactions for chosen month
  const reportTrxs = transaksi.filter(t => t.tanggal.startsWith(selectedMonth));

  // 1. TBS STATS
  const tbsTrxs = reportTrxs.filter(t => t.jenis_sawit === 'TBS');
  const tbsCount = tbsTrxs.length;
  const tbsBerat = tbsTrxs.reduce((sum, t) => sum + t.berat_bersih, 0);
  const tbsBayar = tbsTrxs.reduce((sum, t) => sum + t.total_bayar, 0);
  const tbsRataHarga = tbsBerat > 0 ? Math.round(tbsBayar / tbsBerat) : 0;

  // 2. BRONDOLAN STATS
  const bronTrxs = reportTrxs.filter(t => t.jenis_sawit === 'Brondolan');
  const bronCount = bronTrxs.length;
  const bronBerat = bronTrxs.reduce((sum, t) => sum + t.berat_bersih, 0);
  const bronBayar = bronTrxs.reduce((sum, t) => sum + t.total_bayar, 0);
  const bronRataHarga = bronBerat > 0 ? Math.round(bronBayar / bronBerat) : 0;

  // 3. COMBINED STATS
  const overallCount = reportTrxs.length;
  const overallBerat = tbsBerat + bronBerat;
  const overallBayar = tbsBayar + bronBayar;
  const overallRataHarga = overallBerat > 0 ? Math.round(overallBayar / overallBerat) : 0;

  // Format Helpers
  const formatKg = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val) + ' Kg';
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
  };

  // CSV EXCO EXPORT MECHANISM
  const handleExportCSV = () => {
    if (reportTrxs.length === 0) {
      alert('Tidak ada transaksi untuk diekspor pada bulan terpilih!');
      return;
    }

    const headers = ['Nomor Transaksi', 'Tanggal', 'Jam', 'Pemasok', 'Supir', 'No Kendaraan', 'Komoditas', 'Kotor (Kg)', 'Tara (Kg)', 'Pot (Kg)', 'Netto (Kg)', 'Harga (Rp)', 'Total Bayar (Rp)', 'Operator'];
    
    const rows = reportTrxs.map(t => [
      t.id_transaksi,
      t.tanggal,
      t.jam,
      t.nama_petani,
      t.supir,
      t.kendaraan.toUpperCase(),
      t.jenis_sawit,
      t.berat_kotor,
      t.berat_tara,
      t.potongan,
      t.berat_bersih,
      t.harga_kg,
      t.total_bayar,
      t.operator
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Pembelian_Sawit_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF WINDOW PRINT ACTION
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert('Sistem memblokir pop-up! Izinkan pop-up untuk melakukan cetak PDF.');
      return;
    }

    const formattedMonth = selectedMonth.split('-').reverse().join('/');

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Bulanan Lapak Sawit - ${selectedMonth}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 25px; }
            .header h1 { margin: 0; color: #14532d; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 5px 0 0 0; color: #666; font-size: 12px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; color: #444; }
            .grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; background: #fdfdfd; }
            .card-title { font-size: 11px; font-weight: bold; color: #16a34a; text-transform: uppercase; margin-bottom: 8px; }
            .card-val { font-size: 18px; font-weight: 800; color: #111827; }
            .card-meta { font-size: 11px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 20px; }
            th { background: #f4fbf4; color: #14532d; font-weight: bold; text-align: left; border-bottom: 2px solid #bbf7d0; padding: 10px; }
            td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
            .number { text-align: right; }
            .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #888; border-top: 1px solid #eee; pt: 15px; display: flex; justify-content: space-between; }
            .sign { margin-top: 40px; display: flex; justify-content: flex-end; }
            .sign-box { border-top: 1px solid #444; width: 150px; text-align: center; padding-top: 5px; font-size: 11px; margin-top: 60px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <h1>${state.setting.nama_lapak || 'Lapak Sawit Riau'}</h1>
            <p>${state.setting.alamat || ''} • Telp: ${state.setting.telp || ''}</p>
            <h3 style="margin-top: 15px; font-size: 16px; margin-bottom: 0;">LAPORAN REKAPITULASI BULANAN</h3>
            <p>Periode: <strong>${formattedMonth}</strong></p>
          </div>

          <div class="meta">
            <div>Dibuat Oleh: <strong>${state.currentUser?.nama}</strong></div>
            <div>Waktu Cetak: <strong>${new Date().toLocaleString('id-ID')}</strong></div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Kategori TBS</div>
              <div class="card-val">${new Intl.NumberFormat('id-ID').format(tbsBerat)} Kg</div>
              <div class="card-meta">Total Sourced: ${tbsCount} Trx<br/>Payout: Rp ${new Intl.NumberFormat('id-ID').format(tbsBayar)}</div>
            </div>
            <div class="card">
              <div class="card-title">Kategori Brondolan</div>
              <div class="card-val">${new Intl.NumberFormat('id-ID').format(bronBerat)} Kg</div>
              <div class="card-meta">Total Sourced: ${bronCount} Trx<br/>Payout: Rp ${new Intl.NumberFormat('id-ID').format(bronBayar)}</div>
            </div>
            <div class="card" style="background: #f4fbf4; border-color: #bbf7d0;">
              <div class="card-title" style="color: #12532d;">TOTAL REKAPITULASI</div>
              <div class="card-val" style="color: #14532d;">${new Intl.NumberFormat('id-ID').format(overallBerat)} Kg</div>
              <div class="card-meta">Total Slip: ${overallCount} Trx<br/>Grand Payout: Rp ${new Intl.NumberFormat('id-ID').format(overallBayar)}</div>
            </div>
          </div>

          <h3 style="color: #14532d; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Rincian Transaksi Timbang</h3>
          <table>
            <thead>
              <tr>
                <th>No Karcis</th>
                <th>Tanggal</th>
                <th>Pemasok</th>
                <th>Komoditas</th>
                <th class="number">Bruto (Kg)</th>
                <th class="number">Tara (Kg)</th>
                <th class="number">Pot (Kg)</th>
                <th class="number">Netto (Kg)</th>
                <th class="number">Harga (Rp/Kg)</th>
                <th class="number">Total Bayar (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${reportTrxs.map(t => `
                <tr>
                  <td><strong>${t.id_transaksi}</strong></td>
                  <td>${t.tanggal.split('-').reverse().join('/')} ${t.jam}</td>
                  <td>${t.nama_petani}</td>
                  <td>${t.jenis_sawit}</td>
                  <td class="number">${t.berat_kotor}</td>
                  <td class="number">${t.berat_tara}</td>
                  <td class="number">${t.potongan}</td>
                  <td class="number"><strong>${t.berat_bersih}</strong></td>
                  <td class="number">${t.harga_kg}</td>
                  <td class="number" style="font-weight: bold; color: #15803d;">${new Intl.NumberFormat('id-ID').format(t.total_bayar)}</td>
                </tr>
              `).join('')}
              <tr style="background: #f9f9f9; font-weight: bold; border-top: 2px solid #ccc;">
                <td colSpan="4">TOTAL KESELURUHAN</td>
                <td class="number">${reportTrxs.reduce((sum, t) => sum + t.berat_kotor, 0)}</td>
                <td class="number">${reportTrxs.reduce((sum, t) => sum + t.berat_tara, 0)}</td>
                <td class="number">${reportTrxs.reduce((sum, t) => sum + t.potongan, 0)}</td>
                <td class="number" style="color: #15803d;">${new Intl.NumberFormat('id-ID').format(overallBerat)}</td>
                <td class="number">-</td>
                <td class="number" style="color: #15803d; font-size: 12px;">Rp ${new Intl.NumberFormat('id-ID').format(overallBayar)}</td>
              </tr>
            </tbody>
          </table>

          <div class="sign">
            <div>
              <p style="font-size: 11px; margin-bottom: 0;">Riau, ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
              <div class="sign-box">
                Pemilik / Haji Apri
              </div>
            </div>
          </div>

          <div class="footer">
            <span>Lapak Sawit Riau Makmur - Cetak PDF Laporan</span>
            <span>Halaman 1 dari 1</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" id="reports-view-container">
      {/* Search Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="reports-top">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pusat Analisis & Laporan Pembelian</h1>
          <p className="text-gray-500 text-xs">Pilih periode pelaporan bulanan sawit untuk mengompilasi statistik keuangan and tonase.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Calendar size={14} />
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3 py-2 bg-gray-55/40 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-500 text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* COMPILATION SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="reports-metrics-bento">
        {/* Box 1: TBS Buying Report */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Scale size={16} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-xs">Laporan TBS (Tandan Buah Segar)</h4>
              <p className="text-gray-400 text-[10px]">Segmentasi kualitas buah tandan</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Jumlah Transaksi:</span>
              <span className="font-bold text-gray-900">{tbsCount} Tiket</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Total Berat Bersih:</span>
              <span className="font-extrabold text-slate-705 text-sm">{formatKg(tbsBerat)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Rata-rata Harga Sourced:</span>
              <span className="font-bold font-mono">{formatRupiah(tbsRataHarga)}/Kg</span>
            </div>
            <div className="border-t border-dotted border-gray-100 pt-2.5 flex justify-between items-center text-xs">
              <span className="text-gray-500">Total Pembayaran:</span>
              <span className="font-extrabold text-gray-900">{formatRupiah(tbsBayar)}</span>
            </div>
          </div>
        </div>

        {/* Box 2: Brondolan Sourced Report */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Scale size={16} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-xs">Laporan Brondolan</h4>
              <p className="text-gray-400 text-[10px]">Segmentasi kualitas brondol sawit pipilan</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Jumlah Transaksi:</span>
              <span className="font-bold text-gray-900">{bronCount} Tiket</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Total Berat Bersih:</span>
              <span className="font-extrabold text-amber-700 text-sm">{formatKg(bronBerat)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Rata-rata Harga Sourced:</span>
              <span className="font-bold font-mono">{formatRupiah(bronRataHarga)}/Kg</span>
            </div>
            <div className="border-t border-dotted border-gray-100 pt-2.5 flex justify-between items-center text-xs">
              <span className="text-gray-500">Total Pembayaran:</span>
              <span className="font-extrabold text-gray-900">{formatRupiah(bronBayar)}</span>
            </div>
          </div>
        </div>

        {/* Box 3: Total Combined Ledger Aggregates */}
        <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between border border-emerald-700">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <div className="p-2 bg-white/10 text-emerald-100 rounded-lg">
              <Layers size={16} />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">Rekap Keseluruhan Milestones</h4>
              <p className="text-emerald-100 text-[10px]">Aggregat seluruh pembelian berjalan</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-50 text-[11px] font-semibold">Total Sourced Tonase:</span>
              <span className="font-black text-white text-base">{formatKg(overallBerat)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-50 text-[11px] font-semibold">Rata-rata Harga Komoditas:</span>
              <span className="font-semibold text-yellow-300">{formatRupiah(overallRataHarga)}/Kg</span>
            </div>
            <div className="border-t border-dashed border-white/10 pt-2.5 flex justify-between items-center text-xs">
              <span className="text-emerald-50 font-bold">Total Pembayaran Petani:</span>
              <span className="font-black text-yellow-400 text-base">{formatRupiah(overallBayar)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS BUTTON BAR & DETAIL REPORTING PREVIEW */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5" id="report-ledger-preview">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
          <div>
            <h4 className="font-bold text-gray-850 text-sm">Pratinjau Lembar Bukti Timbangan ({selectedMonth})</h4>
            <p className="text-gray-400 text-xs text-medium">Rincian seluruh transaksi aktif sebelum diekspor atau diprint.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Ekspor Excel (CSV)</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Ekspor PDF & Cetak</span>
            </button>
          </div>
        </div>

        {/* Tabular summary */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2 pb-3">No Karcis</th>
                <th className="py-2 pb-3">Tanggal / Jam</th>
                <th className="py-2 pb-3">Pemasok</th>
                <th className="py-2 pb-3">Komoditas</th>
                <th className="py-2 pb-3 text-right">Kotor (Kg)</th>
                <th className="py-2 pb-3 text-right">Tara (Kg)</th>
                <th className="py-2 pb-3 text-right">Pot (Kg)</th>
                <th className="py-2 pb-3 text-right">Netto Bersih</th>
                <th className="py-2 pb-3 text-right">Total Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {reportTrxs.map((t, idx) => (
                <tr key={t.id_transaksi || idx} className="hover:bg-gray-55/30 transition-colors">
                  <td className="py-2.5 font-mono font-bold text-slate-850">{t.id_transaksi}</td>
                  <td className="py-2.5">{t.tanggal.split('-').reverse().join('/')} {t.jam}</td>
                  <td className="py-2.5 font-semibold text-gray-900">{t.nama_petani}</td>
                  <td className="py-2.5">
                    <span className={`inline-block p-0.5 px-1.5 rounded-full text-[9px] font-bold p-1 px-1.5 border ${t.jenis_sawit === 'TBS' ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-amber-50 text-amber-800'}`}>{t.jenis_sawit}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-gray-500">{t.berat_kotor}</td>
                  <td className="py-2.5 text-right font-mono text-gray-500">{t.berat_tara}</td>
                  <td className="py-2.5 text-right font-mono text-gray-500">{t.potongan}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-gray-950">{t.berat_bersih} Kg</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-805">{formatRupiah(t.total_bayar)}</td>
                </tr>
              ))}
              {reportTrxs.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">Tidak ada pengiriman sawit di periode terpilih.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
