import React, { useState } from 'react';
import { AppState, TransaksiTimbang, KasRecord, PenjualanRecord } from '../types';
import { 
  Leaf, 
  Weight, 
  Coins, 
  TrendingUp, 
  CalendarRange, 
  ChevronRight, 
  AlertCircle, 
  ArrowUpRight, 
  Scale, 
  ChevronDown, 
  CheckCircle2 
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  state: AppState;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ state, setActiveTab }: DashboardProps) {
  const { transaksi, kas, penjualan, users } = state;
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper date calculators
  const getTodayTransactions = (): TransaksiTimbang[] => {
    return transaksi.filter(t => t.tanggal === todayStr);
  };

  const getMonthTransactions = (): TransaksiTimbang[] => {
    const currentMonthPrefix = todayStr.substring(0, 7); // "YYYY-MM"
    return transaksi.filter(t => t.tanggal.startsWith(currentMonthPrefix));
  };

  const getMonthPenjualan = (): PenjualanRecord[] => {
    const currentMonthPrefix = todayStr.substring(0, 7);
    return penjualan.filter(p => p.tanggal.startsWith(currentMonthPrefix));
  };

  const getMonthKasKeluar = (): KasRecord[] => {
    const currentMonthPrefix = todayStr.substring(0, 7);
    return kas.filter(k => k.tanggal.startsWith(currentMonthPrefix) && k.jenis === 'Keluar');
  };

  // --- 1. STATISTICS CALCULATION ---
  // Today's Stats
  const todayTrxs = getTodayTransactions();
  const totalTodayCount = todayTrxs.length;
  
  const todayTbsTonage = todayTrxs
    .filter(t => t.jenis_sawit === 'TBS')
    .reduce((sum, t) => sum + t.berat_bersih, 0);

  const todayBronTonage = todayTrxs
    .filter(t => t.jenis_sawit === 'Brondolan')
    .reduce((sum, t) => sum + t.berat_bersih, 0);

  const todayPembayaranPetani = todayTrxs.reduce((sum, t) => sum + t.total_bayar, 0);
  
  // Total Purchases today includes farmer payments and operational kas keluar tagged today
  const todayKasKeluarNonPetani = kas
    .filter(k => k.tanggal === todayStr && k.jenis === 'Keluar' && k.kategori !== 'Pembayaran Petani')
    .reduce((sum, k) => sum + k.nominal, 0);
  const totalTodayPembelian = todayPembayaranPetani + todayKasKeluarNonPetani;

  // Month-to-date Stats
  const monthTrxs = getMonthTransactions();
  const monthTbsTonage = monthTrxs
    .filter(t => t.jenis_sawit === 'TBS')
    .reduce((sum, t) => sum + t.berat_bersih, 0);

  const monthBronTonage = monthTrxs
    .filter(t => t.jenis_sawit === 'Brondolan')
    .reduce((sum, t) => sum + t.berat_bersih, 0);

  const monthPembayaranPetani = monthTrxs.reduce((sum, t) => sum + t.total_bayar, 0);

  // Profit Calculation: Sales (Penjualan) - Purchase Cost (Transaksi) - Other Expenses (Kas Keluar except farmer payments)
  const monthSalesCount = getMonthPenjualan();
  const totalMonthSalesValue = monthSalesCount.reduce((sum, p) => sum + p.total, 0);
  
  const monthOperationalExpenses = getMonthKasKeluar()
    .filter(k => k.kategori !== 'Pembayaran Petani')
    .reduce((sum, k) => sum + k.nominal, 0);

  const totalMonthExpenses = monthPembayaranPetani + monthOperationalExpenses;
  const estimatedProfit = totalMonthSalesValue - totalMonthExpenses;

  // Formatting helpers
  const formatKg = (kg: number) => {
    return new Intl.NumberFormat('id-ID').format(kg) + ' Kg';
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
  };

  // --- 2. DATA PROCESSING FOR CHART GENERATION ---
  // Last 5 days daily Sourced Tonnage Chart
  const getDailyChartData = () => {
    const days = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      
      const dayTrxs = transaksi.filter(t => t.tanggal === dStr);
      const tbsVal = dayTrxs.filter(t => t.jenis_sawit === 'TBS').reduce((sum, t) => sum + t.berat_bersih, 0);
      const bronVal = dayTrxs.filter(t => t.jenis_sawit === 'Brondolan').reduce((sum, t) => sum + t.berat_bersih, 0);
      
      // Formatting date label: "DD/MM"
      const dateParts = dStr.split('-');
      const label = `${dateParts[2]}/${dateParts[1]}`;
      
      days.push({
        dateStr: dStr,
        label,
        TBS: tbsVal,
        Brondolan: bronVal,
        total: tbsVal + bronVal
      });
    }
    return days;
  };

  const dailyChartData = getDailyChartData();
  const maxDailyVal = Math.max(...dailyChartData.map(d => d.total), 1000);

  // Month-by-month Comparative Tonnage
  const getMonthlyChartData = () => {
    const months = [
      { num: '01', name: 'Jan' },
      { num: '02', name: 'Feb' },
      { num: '03', name: 'Mar' },
      { num: '04', name: 'Apr' },
      { num: '05', name: 'Mei' },
      { num: '06', name: 'Jun' },
      { num: '07', name: 'Jul' },
      { num: '08', name: 'Agt' },
      { num: '09', name: 'Sep' },
      { num: '10', name: 'Okt' },
      { num: '11', name: 'Nov' },
      { num: '12', name: 'Des' }
    ];

    // Show latest 6 months up to current month (June)
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1; // 1-12
    
    return months.slice(Math.max(0, currentMonthNum - 6), currentMonthNum).map(m => {
      const monthPrefix = `${currentYear}-${m.num}`;
      const mTrxs = transaksi.filter(t => t.tanggal.startsWith(monthPrefix));
      const totalTbs = mTrxs.filter(t => t.jenis_sawit === 'TBS').reduce((sum, t) => sum + t.berat_bersih, 0);
      const totalBron = mTrxs.filter(t => t.jenis_sawit === 'Brondolan').reduce((sum, t) => sum + t.berat_bersih, 0);

      return {
        label: m.name,
        TBS: totalTbs,
        Brondolan: totalBron,
        total: totalTbs + totalBron
      };
    });
  };

  const monthlyChartData = getMonthlyChartData();
  const maxMonthlyVal = Math.max(...monthlyChartData.map(d => d.total), 5000);

  // Commodity Percentages
  const totalMonthTonnage = monthTbsTonage + monthBronTonage;
  const tbsPercentage = totalMonthTonnage > 0 ? (monthTbsTonage / totalMonthTonnage) * 100 : 70;
  const bronPercentage = totalMonthTonnage > 0 ? (monthBronTonage / totalMonthTonnage) * 100 : 30;

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Realtime Alert Bar & Quick Access Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm gap-4" id="intro-bar">
        <div>
          <h1 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Selamat Datang, {state.currentUser?.nama}</h1>
          <p className="text-slate-400 text-xs mt-0.5">Lapak: <span className="font-semibold">{state.setting.nama_lapak || 'Timbangan Sawit'}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {state.currentUser?.role !== 'Kasir' && (
            <button
              onClick={() => setActiveTab('timbang')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-slate-950/10 cursor-pointer"
            >
              <Scale size={14} />
              <span>Timbang Baru</span>
            </button>
          )}
          {state.currentUser?.role !== 'Operator Timbangan' && (
            <button
              onClick={() => setActiveTab('kas')}
              className="px-5 py-3 bg-slate-55 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Coins size={14} className="text-slate-600" />
              <span>Kas Operasional</span>
            </button>
          )}
        </div>
      </div>

      {/* --- SECTION 1: RINGKASAN HARI INI --- */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5">
          <CalendarRange size={14} className="text-slate-500" />
          <span>RINGKASAN REKAPITULASI HARI INI ({todayStr.split('-').reverse().join('/')})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-today-grid">
          {/* Card: Total Transaksi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Timbang</p>
                <h3 className="text-2xl font-black font-sans text-slate-900 mt-1">{totalTodayCount} <span className="text-sm font-medium text-slate-400 italic">Karcis</span></h3>
              </div>
              <div className="p-3 bg-slate-100 text-slate-700 border border-slate-200/50 rounded-xl">
                <Leaf size={18} />
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-1 text-[11px] text-slate-500">
              <span className="font-bold text-slate-650">{todayTrxs.filter(t => t.sync_status === 'synced').length}</span> Tersinkronisasi,
              <span className="font-bold text-amber-600">{todayTrxs.filter(t => t.sync_status === 'pending').length}</span> Pending
            </div>
          </div>

          {/* Card: TBS Tonage */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tonase TBS</p>
                <h3 className="text-2xl font-black font-sans text-slate-805 mt-1">{formatKg(todayTbsTonage)}</h3>
              </div>
              <div className="p-3 bg-slate-100 text-slate-700 border border-slate-200/50 rounded-xl">
                <Weight size={18} />
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>Rata-rata: {todayTbsTonage > 0 ? formatKg(Math.round(todayTbsTonage / todayTrxs.filter(t => t.jenis_sawit === 'TBS').length)) : '0 Kg'} / Trx</span>
            </div>
          </div>

          {/* Card: Brondolan Tonage */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tonase Brondolan</p>
                <h3 className="text-2xl font-black font-sans text-amber-600 mt-1">{formatKg(todayBronTonage)}</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                <Weight size={18} />
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>Kontribusi: {todayTbsTonage + todayBronTonage > 0 ? Math.round((todayBronTonage / (todayTbsTonage + todayBronTonage)) * 100) : 0}% Tonase</span>
            </div>
          </div>

          {/* Card: Total Pembelian */}
          <div className="bg-emerald-600 p-6 rounded-2xl border border-emerald-500 shadow-md text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Total Pembayaran</p>
                <h3 className="text-lg font-black font-sans text-white mt-1.5">{formatRupiah(totalTodayPembelian)}</h3>
              </div>
              <div className="p-3 bg-white/10 text-white rounded-xl">
                <Coins size={18} />
              </div>
            </div>
            <div className="mt-3.5 text-[11px] text-emerald-100 flex justify-between">
              <span>Bayar Petani: {formatRupiah(todayPembayaranPetani)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 2: RINGKASAN BULAN INI --- */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5">
          <CalendarRange size={14} className="text-slate-500" />
          <span>RINGKASAN BULANAN (BULAN BERJALAN)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-month-grid">
          {/* Card: Month Tonase TBS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Bulan Ini Tonase TBS</p>
            <h3 className="text-2xl font-black font-sans text-slate-805 mt-1">{formatKg(monthTbsTonage)}</h3>
            <div className="mt-2.5 flex items-center gap-1 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span> Sourced dari petani lokal
            </div>
          </div>

          {/* Card: Month Tonase Bron */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Bulan Ini Tonase Brondolan</p>
            <h3 className="text-2xl font-black font-sans text-amber-600 mt-1">{formatKg(monthBronTonage)}</h3>
            <div className="mt-2.5 flex items-center gap-1 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Kandungan asam tinggi
            </div>
          </div>

          {/* Card: Month Pengeluaran Pembelian */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sourced Cost & Ops</p>
            <h3 className="text-lg font-black font-sans text-slate-900 mt-1.5">{formatRupiah(totalMonthExpenses)}</h3>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Ops: {formatRupiah(monthOperationalExpenses)}</span>
              <span>Sourced: {formatRupiah(monthPembayaranPetani)}</span>
            </div>
          </div>

          {/* Card: Estimasi Profit */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-slate-805 opacity-10">
              <TrendingUp size={44} />
            </div>
            <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">Estimasi Net Profit</p>
            <h3 className={`text-xl font-bold font-sans mt-1.5 ${estimatedProfit >= 0 ? 'text-slate-705' : 'text-red-655'}`}>
              {formatRupiah(estimatedProfit)}
            </h3>
            <div className="mt-2.5 text-[11px] text-slate-500 flex justify-between items-center bg-slate-50 p-1.5 px-2.5 rounded-xl">
              <span className="text-slate-400 font-medium">Penjualan ke PKS:</span>
              <span className="font-bold text-slate-705">{formatRupiah(totalMonthSalesValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 3: GRAFIK & VISUALIZATIONS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-graphics">
        {/* Graphic 1: Timbangan Harian 5 Hari Terakhir */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Grafik Pembelian Harian (5 Hari Terakhir)</h4>
              <p className="text-slate-400 text-[11px]">Komparasi tonase harian TBS & Brondolan (Kg)</p>
            </div>
            <div className="flex gap-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span> TBS</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Brondolan</span>
            </div>
          </div>

          {/* Elegant Native custom SVG Chart */}
          <div className="h-64 flex items-end gap-4 px-2 pt-6 relative" id="daily-bar-chart">
            {/* Grid background lines */}
            <div className="absolute inset-x-0 bottom-6 border-b border-gray-100 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-1/4 bottom-0 border-t border-gray-100 border-dashed pointer-events-none"></div>
            <div className="absolute inset-x-0 top-1/2 bottom-0 border-t border-gray-100 border-dashed pointer-events-none"></div>
            <div className="absolute inset-x-0 top-3/4 bottom-0 border-t border-gray-100 border-dashed pointer-events-none"></div>

            {dailyChartData.map((day, idx) => {
              const tbsHeightPct = (day.TBS / maxDailyVal) * 100;
              const bronHeightPct = (day.Brondolan / maxDailyVal) * 100;
              const isToday = day.dateStr === todayStr;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full relative group">
                  <div className="w-full flex justify-center gap-1 items-end h-[85%] pb-1 relative z-10">
                    {/* TBS Bar */}
                    <div 
                      style={{ height: `${Math.max(tbsHeightPct, 2)}%` }}
                      className={`w-4 sm:w-6 rounded-t-md transition-all duration-500 ${isToday ? 'bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    ></div>
                    {/* Brondolan Bar */}
                    <div 
                      style={{ height: `${Math.max(bronHeightPct, 2)}%` }}
                      className={`w-4 sm:w-6 rounded-t-md transition-all duration-500 ${isToday ? 'bg-yellow-500' : 'bg-yellow-600/80 hover:bg-yellow-500'}`}
                    ></div>

                    {/* Popover Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-20 whitespace-nowrap text-left border border-gray-800">
                      <p className="font-bold text-gray-300 border-b border-gray-800 pb-1 mb-1">{day.dateStr.split('-').reverse().join('/')}</p>
                      <p className="flex justify-between gap-4"><span>TBS:</span> <span className="font-semibold text-slate-350">{formatKg(day.TBS)}</span></p>
                      <p className="flex justify-between gap-4"><span>Brondolan:</span> <span className="font-semibold text-yellow-400">{formatKg(day.Brondolan)}</span></p>
                      <div className="border-t border-gray-800 mt-1 pt-1 flex justify-between text-white font-bold">
                        <span>Total:</span> <span>{formatKg(day.total)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <span className={`text-[11px] h-[15%] pt-1 ${isToday ? 'text-slate-750 font-bold' : 'text-gray-400'}`}>{day.label} {isToday ? '(Hari ini)' : ''}</span>
                </div>
              );
            })}
          </div>
        </div>        {/* Graphic 2: Komposisi Jenis Sawit (TBS vs Brondolan) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Rasio Jenis Sawit Bulan Ini</h4>
            <p className="text-slate-400 text-[11px]">Distribusi volume Sourced TBS vs Brondolan</p>
          </div>
 
          <div className="py-6 flex flex-col items-center">
            {/* Visual Donut representation */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  className="stroke-slate-100"
                  strokeWidth="16"
                  fill="transparent"
                />
                {/* TBS segment */}
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  className="stroke-emerald-600"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - tbsPercentage / 100)}`}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">TBS</span>
                <span className="text-2xl font-black text-slate-900">{Math.round(tbsPercentage)}%</span>
              </div>
            </div>
          </div>
 
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> TBS</span>
              <span className="font-extrabold text-slate-800">{formatKg(monthTbsTonage)} ({Math.round(tbsPercentage)}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Brondolan</span>
              <span className="font-extrabold text-slate-800">{formatKg(monthBronTonage)} ({Math.round(bronPercentage)}%)</span>
            </div>
          </div>
        </div>
      </div>
 
      {/* --- SECTION 4: GRAFIK BULANAN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-bottom-section">
        {/* Graphic 3: Grafik Tonase Bulanan (6 Bulan Terakhir) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-3">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Grafik Tonase Bulanan</h4>
            <p className="text-slate-400 text-[11px]">Perkembangan volume timbangan Sourced (Kg) dalam beberapa bulan terakhir</p>
          </div>
 
          <div className="h-60 flex items-end gap-3 px-2 pt-6 relative" id="monthly-bar-chart">
            <div className="absolute inset-x-0 bottom-6 border-b border-slate-50 pointer-events-none"></div>
            <div className="absolute inset-x-0 top-1/2 bottom-0 border-t border-slate-50 border-dashed pointer-events-none"></div>
 
            {monthlyChartData.map((m, idx) => {
              const heightPct = (m.total / maxMonthlyVal) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full group relative">
                  <div className="w-full flex justify-center items-end h-[85%] pb-1 relative z-10">
                    <div 
                      style={{ height: `${Math.max(heightPct, 5)}%` }}
                      className="w-full max-w-[36px] bg-slate-800/5 hover:bg-slate-800/10 border border-slate-800/10 rounded-t-xl transition-all duration-300 relative overflow-hidden shadow-inner"
                    >
                      {/* Sub column color fill inside */}
                      <div className="absolute bottom-0 inset-x-0 bg-slate-600/90 rounded-t-md hover:bg-slate-550" style={{ height: `${m.total > 0 ? (m.TBS / m.total) * 100 : 0}%` }}></div>
                    </div>
 
                    {/* Popover Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] p-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-20 whitespace-nowrap border border-slate-850 text-left">
                      <p className="font-bold text-slate-400 mb-1">M-T-D {m.label}</p>
                      <p>TBS: <span className="font-semibold">{formatKg(m.TBS)}</span></p>
                      <p>Brondolan: <span className="font-semibold">{formatKg(m.Brondolan)}</span></p>
                      <p className="border-t border-slate-850 mt-1 pt-1 font-bold">Total: {formatKg(m.total)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 h-[15%] pt-1">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
