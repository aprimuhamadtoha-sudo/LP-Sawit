import React, { useState, useEffect } from 'react';
import { AppState, UserAccount, HargaHarian, TransaksiTimbang, KasRecord, PenjualanRecord, LapakSetting } from './types';
import { 
  loadLocalState, 
  saveLocalState, 
  addAuditLog, 
  DEFAULT_SETTING, 
  DEFAULT_USERS, 
  DEFAULT_HARGA, 
  DEFAULT_TRANSAKSI, 
  DEFAULT_KAS,
  DEFAULT_PENJUALAN,
  DEFAULT_LOGS
} from './storage';
import { initAuth, googleSignIn, logoutGoogle, getAccessToken, setAccessToken } from './authService';
import { fetchSheetRows, saveFullTable, appendRow, SHEET_HEADERS, SheetMappers } from './sheetsService';
import {
  pullAllDataFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveRoleToFirestore,
  deleteRoleFromFirestore,
  saveHargaToFirestore,
  saveTransaksiToFirestore,
  deleteTransaksiFromFirestore,
  saveKasToFirestore,
  savePenjualanToFirestore,
  saveSettingToFirestore,
  saveAuditLogToFirestore
} from './firebaseService';

// Icons
import { 
  LayoutDashboard, 
  Scale, 
  Tags, 
  History, 
  FileText, 
  Coins, 
  Settings, 
  Power, 
  Cloud, 
  CloudOff, 
  Sun, 
  Moon, 
  Building2, 
  Menu,
  X,
  Share2,
  Trash2,
  RefreshCw,
  Clock,
  Database,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Modular Subviews imports
import LoginGate from './components/LoginGate';
import Dashboard from './components/Dashboard';
import TransaksiTimbangView from './components/TransaksiTimbangView';
import HargaHarianView from './components/HargaHarianView';
import RiwayatTransaksiView from './components/RiwayatTransaksiView';
import LaporanView from './components/LaporanView';
import KasView from './components/KasView';
import PengaturanView from './components/PengaturanView';
import MasterManagerView from './components/MasterManagerView';

export default function App() {
  // Global Application State loading from cache or Defaults
  const [state, setState] = useState<AppState>(() => loadLocalState());
  const [firestoreSyncError, setFirestoreSyncError] = useState<string | null>(null);

  // Synchronously load database documents from Cloud Firestore upon initialization
  useEffect(() => {
    let ignore = false;
    const fetchCloudDbData = async () => {
      try {
        console.log('[Firestore Sync] Mengambil snapshots data dari Firebase Cloud...');
        const fullCloud = await pullAllDataFromFirestore();
        if (!ignore) {
          if (fullCloud.syncError) {
            setFirestoreSyncError(fullCloud.syncError);
          }
          setState(prev => {
            const nextState = {
              ...prev,
              users: fullCloud.users.length > 0 ? fullCloud.users : prev.users,
              roles: fullCloud.roles.length > 0 ? fullCloud.roles : prev.roles,
              hargaHarian: fullCloud.hargaHarian.length > 0 ? fullCloud.hargaHarian : prev.hargaHarian,
              transaksi: fullCloud.transaksi.length > 0 ? fullCloud.transaksi : prev.transaksi,
              kas: fullCloud.kas.length > 0 ? fullCloud.kas : prev.kas,
              penjualan: fullCloud.penjualan.length > 0 ? fullCloud.penjualan : prev.penjualan,
              auditLogs: fullCloud.auditLogs.length > 0 ? fullCloud.auditLogs : prev.auditLogs,
              setting: fullCloud.setting || prev.setting
            };
            saveLocalState(nextState);
            return nextState;
          });
          console.log('[Firestore Sync] Sinkronisasi cloud database selesai!');
        }
      } catch (err) {
        console.error('[Firestore Sync] Gagal menarik data dari serverless Firebase', err);
      }
    };
    fetchCloudDbData();
    return () => {
      ignore = true;
    };
  }, []);

  // Trigger audit logging dynamically to both local storage state and Firestore cloud
  const triggerAuditLog = async (user: string, aktivitas: string, detail: string) => {
    const freshLog = addAuditLog(state, user, aktivitas, detail);
    setState(prev => ({
      ...prev,
      auditLogs: [freshLog, ...prev.auditLogs]
    }));
    await saveAuditLogToFirestore(freshLog).catch(err => {
      console.warn('Gagal menyimpan audit log ke cloud DB:', err);
    });
    return freshLog;
  };

  // Active View router
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Compute background pending queue metrics
  const pendingTransactionsCount = state.transaksi.filter(t => t.sync_status === 'pending' || t.sync_status === 'failed').length;
  const pendingKasCount = state.kas.filter(k => k.sync_status === 'pending' || k.sync_status === 'failed').length;
  const pendingPenjualanCount = state.penjualan.filter(p => p.sync_status === 'pending' || p.sync_status === 'failed').length;
  const pendingLogsCount = state.auditLogs.filter(l => l.sync_status === 'pending' || l.sync_status === 'failed').length;
  const totalPending = pendingTransactionsCount + pendingKasCount + pendingPenjualanCount + pendingLogsCount;

  // Connection listener for sync indicators
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background Auto-Sync Queue effect: runs when going online, or after loading
  useEffect(() => {
    if (!state.isOnline || !state.googleToken || !state.setting.spreadsheet_id || totalPending === 0 || state.isSyncing) {
      return;
    }

    console.log(`[Background Sync Queue] Terdeteksi ${totalPending} data belum sinkron. Menjalankan retry otomatis...`);
    const timer = setTimeout(() => {
      handleForceSync(true); // run silently
    }, 1500);

    return () => clearTimeout(timer);
  }, [state.isOnline, totalPending, state.googleToken, state.setting.spreadsheet_id, state.isSyncing]);

  // Periodic Background Poller Retry (every 25 seconds if unsynced data remains outstanding)
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isOnline && state.googleToken && state.setting.spreadsheet_id && totalPending > 0 && !state.isSyncing) {
        console.log('[Background Sync Queue] Polling sinkronisasi ritmik otomatis...');
        handleForceSync(true);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [state.isOnline, totalPending, state.googleToken, state.setting.spreadsheet_id, state.isSyncing]);

  // Initialize Firebase sign-in state caches on load
  useEffect(() => {
    initAuth(
      (user, token) => {
        setState(prev => {
          const updated = {
            ...prev,
            googleUser: { name: user.displayName || 'Google User', email: user.email || '', photoURL: user.photoURL || undefined },
            googleToken: token
          };
          saveLocalState(updated);
          return updated;
        });
      },
      () => {
        // No Google active token
        setState(prev => ({ ...prev, googleToken: null, googleUser: null }));
      }
    );
  }, []);

  // Save changes locally whenever state changes (excluding transient state logs)
  const updateGlobalState = (updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev);
      saveLocalState(next);
      return next;
    });
  };

  // --- GOOGLE SIGN-IN FLOW ACTIONS ---
  const handleSignInGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        updateGlobalState(prev => ({
          ...prev,
          googleUser: { name: result.user.displayName || 'User', email: result.user.email || '', photoURL: result.user.photoURL || undefined },
          googleToken: result.accessToken
        }));
        addAuditLog(state, state.currentUser?.username || 'user', 'Google Login', 'Berhasil menghubungkan akun Google untuk integrasi Sheets.');
        
        // Auto pull db data on login if a spreadsheet ID is already linked
        if (state.setting.spreadsheet_id) {
          setTimeout(() => {
            handlePullSync(true);
          }, 1000);
        }
      }
    } catch (e: any) {
      const errCode = e?.code || '';
      const errMsg = e?.message || '';
      if (
        errCode === 'auth/cancelled-popup-request' || 
        errCode === 'auth/popup-closed-by-user' ||
        errMsg.includes('cancelled-popup-request') ||
        errMsg.includes('popup-closed-by-user')
      ) {
        console.warn('Google sign-in popup flow cancelled or closed by user.');
        return;
      }
      alert(`Gagal otorisasi Google: ${errMsg || e}`);
    }
  };

  const handleSignOutGoogle = async () => {
    const confirm = window.confirm('Apakah Anda yakin ingin melepas integrasi Google Sheets?');
    if (!confirm) return;

    try {
      await logoutGoogle();
      updateGlobalState(prev => ({ ...prev, googleToken: null, googleUser: null }));
      addAuditLog(state, state.currentUser?.username || 'user', 'Google Logout', 'Melepas tautan Google Sheets.');
    } catch (e: any) {
      alert(`Gagal logout: ${e.message || e}`);
    }
  };

  // --- MANUAL FORCE SYNC MECHANISM (Flushes whole table contents cleanly) ---
  const handleForceSync = async (silent: boolean = false) => {
    const token = state.googleToken;
    const spreadsheetId = state.setting.spreadsheet_id;

    if (!token || !spreadsheetId) {
      if (!silent) {
        alert('Tautkan Google Sheets di tab Pengaturan terlebih dahulu!');
      }
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true }));
    if (!silent) {
      addAuditLog(state, state.currentUser?.username || 'user', 'Mulai Sinkronisasi', 'Memulai pengunggahan sinkronisasi batch tabel ke Google Drive.');
    }

    try {
      // 1. Sync USERS
      const userRows = [['user_id', 'nama', 'username', 'password_hash', 'role', 'status'], ...state.users.map(u => [
        u.user_id, u.nama, u.username, u.password_hash, u.role, u.status
      ])];
      await saveFullTable(token, spreadsheetId, 'USERS', SHEET_HEADERS.USERS, userRows.slice(1));

      // 2. Sync HARGA_HARIAN
      const hargaRows = [['tanggal', 'harga_tbs', 'harga_brondolan'], ...state.hargaHarian.map(h => [
        h.tanggal, h.harga_tbs, h.harga_brondolan
      ])];
      await saveFullTable(token, spreadsheetId, 'HARGA_HARIAN', SHEET_HEADERS.HARGA_HARIAN, hargaRows.slice(1));

      // 3. Sync TRANSAKSI_TIMBANG
      const trxRows = [['id_transaksi', 'tanggal', 'jam', 'id_petani', 'nama_petani', 'jenis_sawit', 'kendaraan', 'supir', 'berat_kotor', 'berat_tara', 'potongan', 'berat_bersih', 'harga_kg', 'total_bayar', 'operator'], ...state.transaksi.map(t => [
        t.id_transaksi, t.tanggal, t.jam, t.id_petani, t.nama_petani, t.jenis_sawit, t.kendaraan, t.supir, t.berat_kotor, t.berat_tara, t.potongan, t.berat_bersih, t.harga_kg, t.total_bayar, t.operator
      ])];
      await saveFullTable(token, spreadsheetId, 'TRANSAKSI_TIMBANG', SHEET_HEADERS.TRANSAKSI_TIMBANG, trxRows.slice(1));

      // 4. Sync KAS
      const kasRows = [['id_kas', 'tanggal', 'jenis', 'kategori', 'keterangan', 'nominal', 'user'], ...state.kas.map(k => [
        k.id_kas, k.tanggal, k.jenis, k.kategori, k.keterangan, k.nominal, k.user
      ])];
      await saveFullTable(token, spreadsheetId, 'KAS', SHEET_HEADERS.KAS, kasRows.slice(1));

      // 5. Sync PENJUALAN
      const penRows = [['id_penjualan', 'tanggal', 'pembeli', 'jenis_sawit', 'berat', 'harga_jual', 'total'], ...state.penjualan.map(p => [
        p.id_penjualan, p.tanggal, p.pembeli, p.jenis_sawit, p.berat, p.harga_jual, p.total
      ])];
      await saveFullTable(token, spreadsheetId, 'PENJUALAN', SHEET_HEADERS.PENJUALAN, penRows.slice(1));

      // 6. Sync AUDIT_LOG
      const logRows = [['id_log', 'tanggal', 'user', 'aktivitas', 'detail'], ...state.auditLogs.map(l => [
        l.id_log, l.tanggal, l.user, l.aktivitas, l.detail
      ])];
      await saveFullTable(token, spreadsheetId, 'AUDIT_LOG', SHEET_HEADERS.AUDIT_LOG, logRows.slice(1));

      // Mark all transaction statuses as synced locally!
      updateGlobalState(prev => ({
        ...prev,
        transaksi: prev.transaksi.map(t => ({ ...t, sync_status: 'synced' })),
        kas: prev.kas.map(k => ({ ...k, sync_status: 'synced' })),
        penjualan: prev.penjualan.map(p => ({ ...p, sync_status: 'synced' })),
        auditLogs: prev.auditLogs.map(l => ({ ...l, sync_status: 'synced' }))
      }));

      // Log success audit
      addAuditLog(state, state.currentUser?.username || 'user', 'Sinkronisasi Sukses', 'Seluruh data offline berhasil disinkronkan ke Google Sheets.');
      if (!silent) {
        alert('Seluruh data berhasil disinkronkan ke Google Spreadsheet!');
      }
    } catch (e: any) {
      if (!silent) {
        addAuditLog(state, state.currentUser?.username || 'user', 'Sinkronisasi Gagal', `Error: ${e.message || e}`);
        alert(`Gagal sinkronisasi data: ${e.message || e}`);
      } else {
        console.warn('Silent auto background sync failed:', e);
      }
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  // --- DOWNLOAD SYNC FROM GOOGLE SPREADSHEET (Pull data down to match DB) ---
  const handlePullSync = async (silent: boolean = false) => {
    const token = state.googleToken || state.googleToken; // use state or parameter
    const spreadsheetId = state.setting.spreadsheet_id;

    if (!token || !spreadsheetId) {
      if (!silent) {
        alert('Tautkan Google Sheets di tab Konektivitas terlebih dahulu!');
      }
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true }));
    if (!silent) {
      addAuditLog(state, state.currentUser?.username || 'user', 'Tarik Data', 'Memulai pengunduhan data pendukung dari database Google Sheets.');
    }

    try {
      // 1. Fetch USERS
      const usersRaw = await fetchSheetRows(token, spreadsheetId, 'USERS').catch(() => []);
      const usersData = SheetMappers.users(usersRaw);

      // 2. Fetch HARGA_HARIAN
      const hargaRaw = await fetchSheetRows(token, spreadsheetId, 'HARGA_HARIAN').catch(() => []);
      const hargaData = SheetMappers.hargaHarian(hargaRaw);

      // 3. Fetch TRANSAKSI_TIMBANG
      const trxRaw = await fetchSheetRows(token, spreadsheetId, 'TRANSAKSI_TIMBANG').catch(() => []);
      const trxData = SheetMappers.transaksi(trxRaw);

      // 4. Fetch KAS
      const kasRaw = await fetchSheetRows(token, spreadsheetId, 'KAS').catch(() => []);
      const kasData = SheetMappers.kas(kasRaw);

      // 5. Fetch PENJUALAN
      const penRaw = await fetchSheetRows(token, spreadsheetId, 'PENJUALAN').catch(() => []);
      const penData = SheetMappers.penjualan(penRaw);

      // 6. Fetch AUDIT_LOG
      const logRaw = await fetchSheetRows(token, spreadsheetId, 'AUDIT_LOG').catch(() => []);
      const logData = SheetMappers.auditLogs(logRaw);

      updateGlobalState(prev => {
        return {
          ...prev,
          users: usersData.length > 0 ? usersData : prev.users,
          hargaHarian: hargaData.length > 0 ? hargaData : prev.hargaHarian,
          transaksi: trxData,
          kas: kasData,
          penjualan: penData,
          auditLogs: logData.length > 0 ? logData : prev.auditLogs
        };
      });

      addAuditLog(state, state.currentUser?.username || 'user', 'Sinkronisasi Tarik Sukses', 'Berhasil menyinkronkan data aplikasi dari database Google Sheets.');
      if (!silent) {
        alert('Tampilan aplikasi berhasil diperbarui dengan data dari database Google Sheets saat ini!');
      }
    } catch (e: any) {
      console.error(e);
      if (!silent) {
        alert(`Gagal mengambil data dari Google Sheets: ${e.message || e}`);
      }
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  // --- 1. SAVE WEIGHBRIDGE TICKET (With Instant local storage write + Cloud Sync) ---
  const handleSaveTransaction = async (trx: TransaksiTimbang) => {
    // Audit logger before save
    const audit = await triggerAuditLog(state.currentUser?.username || 'operator', 'Simpan Timbangan', `Buat karcis ${trx.id_transaksi} untuk pemasok ${trx.nama_petani} total ${trx.berat_bersih} Kg.`);

    // 1. Instantly update UI and Local Storage with 'pending'
    updateGlobalState(prev => ({
      ...prev,
      transaksi: [{ ...trx, sync_status: 'pending' }, ...prev.transaksi],
      auditLogs: [{ ...audit, sync_status: 'pending' }, ...prev.auditLogs]
    }));

    // Save to Firestore Cloud
    await saveTransaksiToFirestore(trx).catch(err => console.error('Cloud trx error', err));

    // 2. Perform background network sync without blocking UI
    const token = state.googleToken;
    const spreadsheetId = state.setting.spreadsheet_id;
    if (token && spreadsheetId && state.isOnline) {
      (async () => {
        try {
          const row = [
            trx.id_transaksi, trx.tanggal, trx.jam, trx.id_petani, trx.nama_petani,
            trx.jenis_sawit, trx.kendaraan, trx.supir, trx.berat_kotor, trx.berat_tara,
            trx.potongan, trx.berat_bersih, trx.harga_kg, trx.total_bayar, trx.operator
          ];
          await appendRow(token, spreadsheetId, 'TRANSAKSI_TIMBANG', row);
          
          // Append Audit Log too
          const auditRow = [audit.id_log, audit.tanggal, audit.user, audit.aktivitas, audit.detail];
          await appendRow(token, spreadsheetId, 'AUDIT_LOG', auditRow);

          // Mark as synced in state and cache
          setState(prev => {
            const nextTrxs = prev.transaksi.map(t => t.id_transaksi === trx.id_transaksi ? { ...t, sync_status: 'synced' as const } : t);
            const nextLogs = prev.auditLogs.map(l => l.id_log === audit.id_log ? { ...l, sync_status: 'synced' as const } : l);
            const nextState = { ...prev, transaksi: nextTrxs, auditLogs: nextLogs };
            saveLocalState(nextState);
            return nextState;
          });
        } catch (err) {
          console.warn('Gagal background append ke sheets:', err);
        }
      })();
    }
  };

  // --- 2. UPDATE WEIGHBRIDGE (Calibration edit) ---
  const handleUpdateTransaction = async (updatedTrx: TransaksiTimbang) => {
    await triggerAuditLog(state.currentUser?.username || 'admin', 'Kalibrasi Timbangan', `Kalibrasi karcis ${updatedTrx.id_transaksi} menjadi Netto: ${updatedTrx.berat_bersih} Kg.`);

    updateGlobalState(prev => {
      const idx = prev.transaksi.findIndex(t => t.id_transaksi === updatedTrx.id_transaksi);
      if (idx !== -1) {
        const copy = [...prev.transaksi];
        copy[idx] = { ...updatedTrx, sync_status: 'pending' };
        return { ...prev, transaksi: copy };
      }
      return prev;
    });

    // Save to Cloud
    await saveTransaksiToFirestore(updatedTrx).catch(err => console.error('Cloud trx update error', err));

    // Run trigger sync after edit to update changes in Sheets
    setTimeout(() => {
      if (state.googleToken && state.setting.spreadsheet_id) {
        handleForceSync();
      }
    }, 400);
  };

  // --- 3. DELETE TRANSACTION ---
  const handleDeleteTransaction = async (id: string) => {
    await triggerAuditLog(state.currentUser?.username || 'admin', 'Hapus Timbangan', `Hapus karcis timbang ${id} secara permanen.`);

    updateGlobalState(prev => ({
      ...prev,
      transaksi: prev.transaksi.filter(t => t.id_transaksi !== id)
    }));

    // Delete from Cloud
    await deleteTransaksiFromFirestore(id).catch(err => console.error('Cloud trx delete error', err));

    // Trigger force overwrite down-sync
    setTimeout(() => {
      if (state.googleToken && state.setting.spreadsheet_id) {
        handleForceSync();
      }
    }, 400);
  };

  // --- 4. SAVE DAILY PRICES REFERENCE ---
  const handleSavePrice = async (priceRecord: HargaHarian) => {
    await triggerAuditLog(state.currentUser?.username || 'admin', 'Modifikasi Harga', `Atur harga harian untuk ${priceRecord.tanggal}: TBS ${priceRecord.harga_tbs}, Brondolan ${priceRecord.harga_brondolan}`);

    updateGlobalState(prev => {
      const copy = [...prev.hargaHarian];
      const idx = copy.findIndex(h => h.tanggal === priceRecord.tanggal);
      if (idx !== -1) {
        copy[idx] = priceRecord;
      } else {
        copy.push(priceRecord);
      }
      return { ...prev, hargaHarian: copy };
    });

    // Save to Cloud
    await saveHargaToFirestore(priceRecord).catch(err => console.error('Cloud price save error', err));

    // Wait a brief delay and trigger sync update
    setTimeout(() => {
      if (state.googleToken && state.setting.spreadsheet_id) {
        handleForceSync();
      }
    }, 400);
  };

  // --- 5. FINANCES: LOG KAS JURNAL ---
  const handleAddKas = async (kasRecord: KasRecord) => {
    const audit = await triggerAuditLog(state.currentUser?.username || 'kasir', 'Log Jurnal Kas', `Buku kas ${kasRecord.jenis} kategori ${kasRecord.kategori} bernilai ${kasRecord.nominal}`);

    // 1. Instantly update UI and Local Storage with 'pending'
    const pendingKasRecord = { ...kasRecord, sync_status: 'pending' as const };
    updateGlobalState(prev => ({
      ...prev,
      kas: [pendingKasRecord, ...prev.kas],
      auditLogs: [{ ...audit, sync_status: 'pending' }, ...prev.auditLogs]
    }));

    // Save to Cloud
    await saveKasToFirestore(kasRecord).catch(err => console.error('Cloud kas save error', err));

    // 2. Perform background network sync without blocking UI
    const token = state.googleToken;
    const spreadsheetId = state.setting.spreadsheet_id;
    if (token && spreadsheetId && state.isOnline) {
      (async () => {
        try {
          const row = [
            kasRecord.id_kas, kasRecord.tanggal, kasRecord.jenis, kasRecord.kategori,
            kasRecord.keterangan, kasRecord.nominal, kasRecord.user
          ];
          await appendRow(token, spreadsheetId, 'KAS', row);

          const auditRow = [audit.id_log, audit.tanggal, audit.user, audit.aktivitas, audit.detail];
          await appendRow(token, spreadsheetId, 'AUDIT_LOG', auditRow);

          // Mark as synced in state and cache
          setState(prev => {
            const nextKas = prev.kas.map(k => k.id_kas === kasRecord.id_kas ? { ...k, sync_status: 'synced' as const } : k);
            const nextLogs = prev.auditLogs.map(l => l.id_log === audit.id_log ? { ...l, sync_status: 'synced' as const } : l);
            const nextState = { ...prev, kas: nextKas, auditLogs: nextLogs };
            saveLocalState(nextState);
            return nextState;
          });
        } catch (err) {
          console.warn('Gagal background append kas:', err);
        }
      })();
    }
  };

  // --- 6. FINANCES: DISPATCH BULK SALES TO COMM MILLS ---
  const handleAddPenjualan = async (penRecord: PenjualanRecord) => {
    const audit = await triggerAuditLog(state.currentUser?.username || 'owner', 'Dispatch Penjualan PKS', `Jual bulk ${penRecord.jenis_sawit} ke ${penRecord.pembeli} (${penRecord.berat} Kg) rata ${penRecord.harga_jual}/Kg`);

    // 1. Instantly update UI and Local Storage with 'pending'
    const pendingPenRecord = { ...penRecord, sync_status: 'pending' as const };
    updateGlobalState(prev => ({
      ...prev,
      penjualan: [pendingPenRecord, ...prev.penjualan],
      auditLogs: [{ ...audit, sync_status: 'pending' }, ...prev.auditLogs]
    }));

    // Save to Cloud
    await savePenjualanToFirestore(penRecord).catch(err => console.error('Cloud penjualan save error', err));

    // 2. Perform background network sync without blocking UI
    const token = state.googleToken;
    const spreadsheetId = state.setting.spreadsheet_id;
    if (token && spreadsheetId && state.isOnline) {
      (async () => {
        try {
          const row = [
            penRecord.id_penjualan, penRecord.tanggal, penRecord.pembeli, penRecord.jenis_sawit,
            penRecord.berat, penRecord.harga_jual, penRecord.total
          ];
          await appendRow(token, spreadsheetId, 'PENJUALAN', row);

          const auditRow = [audit.id_log, audit.tanggal, audit.user, audit.aktivitas, audit.detail];
          await appendRow(token, spreadsheetId, 'AUDIT_LOG', auditRow);

          // Mark as synced in state and cache
          setState(prev => {
            const nextPen = prev.penjualan.map(p => p.id_penjualan === penRecord.id_penjualan ? { ...p, sync_status: 'synced' as const } : p);
            const nextLogs = prev.auditLogs.map(l => l.id_log === audit.id_log ? { ...l, sync_status: 'synced' as const } : l);
            const nextState = { ...prev, penjualan: nextPen, auditLogs: nextLogs };
            saveLocalState(nextState);
            return nextState;
          });
        } catch (err) {
          console.warn('Gagal background append ekspor penjualan:', err);
        }
      })();
    }
  };

  // --- 7. GENERAL METADATA LAPAK & SPREADSHEET UPDATE ---
  const handleUpdateSetting = async (updatedSetting: LapakSetting) => {
    await triggerAuditLog(state.currentUser?.username || 'owner', 'Ubah Profil Lapak', 'Memperbarui nama, nomor telephone, and alamat stasiun lapak.');

    updateGlobalState(prev => ({
      ...prev,
      setting: updatedSetting
    }));

    // Save to Cloud
    await saveSettingToFirestore(updatedSetting).catch(err => console.error('Cloud settings error', err));
  };

  // --- 8. REGISTER NEW USER ACCOUNT ---
  const handleAddUser = async (newUser: UserAccount) => {
    await triggerAuditLog(state.currentUser?.username || 'developer', 'Tambah Karyawan', `Mendaftarkan karyawan baru ${newUser.nama} sebagai ${newUser.role}`);

    updateGlobalState(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));

    // Save to Cloud
    await saveUserToFirestore(newUser).catch(err => console.error('Cloud user add error', err));

    // Trigger sync overwriter to push users list changes onto main spreadsheet USERS worksheet
    setTimeout(() => {
      if (state.googleToken && state.setting.spreadsheet_id) {
        handleForceSync();
      }
    }, 450);
  };

  // --- 9. FREEZE/UNFREEZE USER ACCOUNT ---
  const handleToggleUserStatus = async (userId: string) => {
    let savedU: UserAccount | null = null;
    updateGlobalState(prev => {
      const copy = [...prev.users];
      const idx = copy.findIndex(u => u.user_id === userId);
      if (idx !== -1) {
        const targetStatus = copy[idx].status === 'Aktif' ? 'Nonaktif' : 'Aktif';
        copy[idx] = { ...copy[idx], status: targetStatus };
        savedU = copy[idx];
        addAuditLog(state, state.currentUser?.username || 'developer', 'Ubah Akses Karyawan', `Merubah status akun ${copy[idx].nama} menjadi ${targetStatus}`);
      }
      return { ...prev, users: copy };
    });

    if (savedU) {
      await saveUserToFirestore(savedU).catch(err => console.error('Cloud user toggle error', err));
    }

    // Sycn
    setTimeout(() => {
      if (state.googleToken && state.setting.spreadsheet_id) {
        handleForceSync();
      }
    }, 450);
  };

  // --- 9b. UPDATE EXISTING USER ACCOUNT ---
  const handleUpdateUser = async (updatedUser: UserAccount) => {
    await triggerAuditLog(state.currentUser?.username || 'developer', 'Ubah Karyawan', `Mengubah informasi akun karyawan ${updatedUser.nama}`);
    updateGlobalState(prev => {
      const copy = prev.users.map(u => u.user_id === updatedUser.user_id ? updatedUser : u);
      return { ...prev, users: copy };
    });

    // Save to Cloud
    await saveUserToFirestore(updatedUser).catch(err => console.error('Cloud user edit error', err));

    setTimeout(() => {
      if (state.googleToken && state.setting.spreadsheet_id) {
        handleForceSync();
      }
    }, 450);
  };

  // --- 9c. DELETE EXISTING USER ACCOUNT ---
  const handleDeleteUser = async (userId: string) => {
    const target = state.users.find(u => u.user_id === userId);
    if (!target) return;
    await triggerAuditLog(state.currentUser?.username || 'developer', 'Hapus Karyawan', `Menghapus akun karyawan ${target.nama}`);
    updateGlobalState(prev => {
      const copy = prev.users.filter(u => u.user_id !== userId);
      return { ...prev, users: copy };
    });

    // Delete from Cloud
    await deleteUserFromFirestore(userId).catch(err => console.error('Cloud user delete error', err));

    setTimeout(() => {
      if (state.googleToken && state.setting.spreadsheet_id) {
        handleForceSync();
      }
    }, 450);
  };

  // --- MASTER MENU: ADD CUSTOM ROLE ---
  const handleAddRole = async (roleName: string, menus: string[] = []) => {
    await triggerAuditLog(state.currentUser?.username || 'developer', 'Tambah Peran', `Membuat custom role baru: "${roleName}" dengan menu: ${menus.join(', ')}`);
    updateGlobalState(prev => {
      const copy = [...prev.roles];
      if (!copy.includes(roleName)) {
        copy.push(roleName);
      }
      const configs = prev.roleConfigs ? [...prev.roleConfigs] : [];
      const roleId = 'id-' + roleName.toLowerCase().replace(/\s+/g, '-');
      const existingIdx = configs.findIndex(c => c.id === roleId || c.role_name === roleName);
      if (existingIdx > -1) {
        configs[existingIdx] = { id: roleId, role_name: roleName, menus };
      } else {
        configs.push({ id: roleId, role_name: roleName, menus });
      }
      return { ...prev, roles: copy, roleConfigs: configs };
    });
    await saveRoleToFirestore(roleName, menus).catch(err => console.error('Cloud add role error', err));
  };

  const handleUpdateRole = async (roleId: string, newRoleName: string, menus: string[]) => {
    await triggerAuditLog(state.currentUser?.username || 'developer', 'Ubah Peran', `Mengubah custom role "${roleId}" menjadi "${newRoleName}" dengan menu: ${menus.join(', ')}`);
    
    let oldRoleName = '';
    let dbUpdateNeeded = false;
    
    updateGlobalState(prev => {
      const configs = prev.roleConfigs ? [...prev.roleConfigs] : [];
      const idx = configs.findIndex(c => c.id === roleId);
      if (idx > -1) {
        oldRoleName = configs[idx].role_name;
        configs[idx] = { ...configs[idx], role_name: newRoleName, menus };
        dbUpdateNeeded = true;
      }
      
      const updatedRoles = prev.roles.map(r => r === oldRoleName ? newRoleName : r);
      const updatedUsers = prev.users.map(u => u.role === oldRoleName ? { ...u, role: newRoleName as any } : u);
      
      return { ...prev, roles: updatedRoles, roleConfigs: configs, users: updatedUsers };
    });

    if (dbUpdateNeeded) {
      if (oldRoleName && oldRoleName.trim() !== newRoleName.trim()) {
        await deleteRoleFromFirestore(oldRoleName).catch(err => console.error('Cloud remove old role error', err));
      }
      await saveRoleToFirestore(newRoleName, menus).catch(err => console.error('Cloud update role error', err));
    }
  };

  // --- MASTER MENU: DELETE CUSTOM ROLE ---
  const handleDeleteRole = async (roleName: string) => {
    await triggerAuditLog(state.currentUser?.username || 'developer', 'Hapus Peran', `Menghapus custom role: "${roleName}"`);
    updateGlobalState(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r !== roleName),
      roleConfigs: (prev.roleConfigs || []).filter(c => c.role_name !== roleName)
    }));
    await deleteRoleFromFirestore(roleName).catch(err => console.error('Cloud remove role error', err));
  };

  // --- 10. SYSTEM AUTH LOGOUT (Keluaran dari gerbang utama) ---
  const handleAppLogout = () => {
    addAuditLog(state, state.currentUser?.username || 'user', 'Sistem Logout', 'Keluar dari lembar kerja stasiun timbangan.');
    updateGlobalState(prev => ({ ...prev, currentUser: null }));
    setActiveTab('dashboard');
  };

  // --- 11. PREMIUM TRANS-MODAL VOUCHER LAUNCHER ---
  const [activePrintTrx, setActivePrintTrx] = useState<TransaksiTimbang | null>(null);
  const [activePrintType, setActivePrintType] = useState<'Nota' | 'Struk'>('Nota');

  const triggerVoucherPrint = (trx: TransaksiTimbang, type: 'Nota' | 'Struk') => {
    setActivePrintTrx(trx);
    setActivePrintType(type);
  };

  const handleShareWhatsApp = (trx: TransaksiTimbang) => {
    const textStr = `*BASKET NOTA TIMBANGAN LAPAK*
Lapak: ${state.setting.nama_lapak}
No Karcis: ${trx.id_transaksi}
Tanggal: ${trx.tanggal.split('-').reverse().join('/')}
Pemasok: ${trx.nama_petani}
Jenis: ${trx.jenis_sawit}
------------------------
*Bruto:* ${trx.berat_kotor} Kg
*Tara:* ${trx.berat_tara} Kg
*Pot:* ${trx.potongan} Kg
*Netto:* ${trx.berat_bersih} Kg
*Harga:* Rp ${new Intl.NumberFormat('id-ID').format(trx.harga_kg)}/Kg
========================
*TOTAL PAYOUT:* Rp ${new Intl.NumberFormat('id-ID').format(trx.total_bayar)}
------------------------
Operator: ${trx.operator}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textStr)}`;
    window.open(url, '_blank');
  };

  // RENDER APP CHASSIS
  const toggleTheme = () => {
    updateGlobalState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  // Helper to determine if current user role has access to specific tab
  const hasAccessToTab = (tab: string): boolean => {
    const role = state.currentUser?.role;
    if (!role) return false;
    
    // Developer automatically gets access to everything
    if (role === 'Developer' || state.currentUser?.username === 'developer') {
      return true;
    }
    
    // Check if custom config exists
    const config = state.roleConfigs?.find(c => c.role_name === role);
    if (config) {
      return config.menus.includes(tab);
    }
    
    // Fallback to default system permissions
    // dashboard, harga, riwayat, pengaturan are default-open for everyone
    if (['dashboard', 'harga', 'riwayat', 'pengaturan'].includes(tab)) {
      return true;
    }
    
    if (tab === 'timbang') {
      return role !== 'Kasir';
    }
    
    if (tab === 'laporan' || tab === 'kas') {
      return role !== 'Operator Timbangan';
    }
    
    if (tab === 'master') {
      return false;
    }
    
    return false;
  };

  // Guard: require credentials login gateway first
  if (!state.currentUser) {
    return (
      <LoginGate 
        users={state.users} 
        onLoginSuccess={(user) => {
          updateGlobalState(prev => ({ ...prev, currentUser: user }));
          addAuditLog(state, user.username, 'Sistem Login', `Berhasl masuk sebagai ${user.role}.`);
        }} 
        lapakName={state.setting.nama_lapak || 'Lapak Sawit Riau'} 
        syncError={firestoreSyncError}
      />
    );
  }

  // Active View router mapping
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard state={state} setActiveTab={setActiveTab} />;
      case 'timbang':
        if (!hasAccessToTab('timbang')) return <Dashboard state={state} setActiveTab={setActiveTab} />;
        return <TransaksiTimbangView state={state} onSave={handleSaveTransaction} />;
      case 'harga':
        if (!hasAccessToTab('harga')) return <Dashboard state={state} setActiveTab={setActiveTab} />;
        return <HargaHarianView state={state} onSavePrice={handleSavePrice} />;
      case 'riwayat':
        if (!hasAccessToTab('riwayat')) return <Dashboard state={state} setActiveTab={setActiveTab} />;
        return (
          <RiwayatTransaksiView 
            state={state} 
            onUpdate={handleUpdateTransaction} 
            onDelete={handleDeleteTransaction}
            onTriggerPrint={triggerVoucherPrint}
          />
        );
      case 'laporan':
        if (!hasAccessToTab('laporan')) return <Dashboard state={state} setActiveTab={setActiveTab} />;
        return <LaporanView state={state} />;
      case 'kas':
        if (!hasAccessToTab('kas')) return <Dashboard state={state} setActiveTab={setActiveTab} />;
        return <KasView state={state} onAddKas={handleAddKas} onAddPenjualan={handleAddPenjualan} />;
      case 'pengaturan':
        if (!hasAccessToTab('pengaturan')) return <Dashboard state={state} setActiveTab={setActiveTab} />;
        return (
          <PengaturanView 
            state={state} 
            onUpdateSetting={handleUpdateSetting} 
          />
        );
      case 'master':
        if (state.currentUser?.role === 'Developer' || state.currentUser?.username === 'developer') {
          return (
            <MasterManagerView
              state={state}
              onAddUser={handleAddUser}
              onToggleUserStatus={handleToggleUserStatus}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onAddRole={handleAddRole}
              onUpdateRole={handleUpdateRole}
              onDeleteRole={handleDeleteRole}
            />
          );
        }
        return <Dashboard state={state} setActiveTab={setActiveTab} />;

      default:
        return <Dashboard state={state} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-55/60 text-slate-900`} id="app-root-chassis">
      
      {/* MOBILE HEADER ACCENT */}
      <div className="lg:hidden bg-emerald-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-emerald-700" id="mobile-top-bar">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-white" />
          <span className="font-bold text-xs truncate max-w-[200px]">{state.setting.nama_lapak || 'Lapak Sawit'}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Connection Indicator with Background Queue Indicator */}
          {state.isOnline ? (
            <div className="flex items-center gap-1.5 relative cursor-help" title={totalPending > 0 ? `${totalPending} data belum sinkron` : 'Koneksi Stabil'}>
              <Cloud size={16} className={state.isSyncing ? 'text-white animate-pulse' : 'text-emerald-100'} />
              {totalPending > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 relative cursor-help" title="Modus Karyawan Offline">
              <CloudOff size={16} className="text-amber-400" />
              {totalPending > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500"></span>}
            </div>
          )}
          
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-white/10 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
 
      <div className="flex" id="app-body-container">
        {/* --- DESKTOP RUGGED PALM-EMERALD SIDEBAR NAVIGATION --- */}
        <div className={`
          fixed lg:sticky top-0 left-0 h-screen w-64 bg-white shrink-0 border-r border-gray-200 z-50 flex flex-col justify-between p-6 text-gray-800 transition-transform duration-300 transform shadow-lg lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `} id="main-sidebar">
          
          <div className="space-y-6">
            {/* Branding Identity */}
            <div className="flex items-center gap-3 pb-5 border-b border-gray-150">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Building2 size={22} className="text-white" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-bold text-base leading-tight uppercase tracking-wider text-gray-900 truncate" title={state.setting.nama_lapak}>
                  {state.setting.nama_lapak || 'LAPAK SAWIT'}
                </h1>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5 truncate uppercase">
                  PIMS • {state.currentUser.role}
                </span>
              </div>
            </div>
            {/* Menu options mapped with granular permission controls */}
            <nav className="space-y-1 flex flex-col" id="nav-group">
              {hasAccessToTab('dashboard') && (
                <button
                  onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </button>
              )}
 
              {hasAccessToTab('timbang') && (
                <button
                  onClick={() => { setActiveTab('timbang'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'timbang' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <Scale size={15} />
                  <span>Transaksi Timbang</span>
                </button>
              )}
 
              {hasAccessToTab('harga') && (
                <button
                  onClick={() => { setActiveTab('harga'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'harga' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <Tags size={15} />
                  <span>Harga Harian</span>
                </button>
              )}
 
              {hasAccessToTab('riwayat') && (
                <button
                  onClick={() => { setActiveTab('riwayat'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'riwayat' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <History size={15} />
                  <span>Riwayat & Laporan</span>
                </button>
              )}
 
              {hasAccessToTab('laporan') && (
                <button
                  onClick={() => { setActiveTab('laporan'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'laporan' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <FileText size={15} />
                  <span>Laporan Periodik</span>
                </button>
              )}
 
              {hasAccessToTab('kas') && (
                <button
                  onClick={() => { setActiveTab('kas'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'kas' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <Coins size={15} />
                  <span>Kas Operasional</span>
                </button>
              )}
 
              {(state.currentUser?.role === 'Developer' || state.currentUser?.username === 'developer') && (
                <button
                  onClick={() => { setActiveTab('master'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'master' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <ShieldCheck size={15} />
                  <span>Menu Master</span>
                </button>
              )}
 
              {hasAccessToTab('pengaturan') && (
                <button
                  onClick={() => { setActiveTab('pengaturan'); setSidebarOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'pengaturan' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <Settings size={15} />
                  <span>Pengaturan Lapak</span>
                </button>
              )}
            </nav>
          </div>
 
          {/* User sign out foot area links and background queue indicators */}
          <div className="pt-4 border-t border-gray-150">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs space-y-1 overflow-hidden shrink-0">
              <div className="truncate max-w-[140px]">
                <h5 className="font-bold text-zinc-905 truncate leading-none mb-1">@{state.currentUser.nama}</h5>
                <span className="text-[10px] text-zinc-500 font-bold">{state.currentUser.role}</span>
              </div>
              <button
                onClick={handleAppLogout}
                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg transition-colors cursor-pointer"
                title="Keluar Akun"
              >
                <Power size={13} />
              </button>
            </div>
          </div>
        </div>
 
        {/* Content Page wrapper context frame */}
        <main className="flex-1 min-h-screen p-4 sm:p-6 lg:p-8 overflow-y-auto" id="main-content-flow">
          {renderActiveView()}
        </main>
      </div>

      {/* GLOBAL REPRINT THERMAL VOUCHER PREVIEW LAYOUT */}
      <AnimatePresence>
        {activePrintTrx && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 overflow-y-auto" id="global-print-overlay">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-emerald-100 flex flex-col text-left"
              id="global-print-box"
            >
              <div className="bg-emerald-600 text-white px-4 py-3.5 flex justify-between items-center">
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setActivePrintType('Nota')}
                     className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${activePrintType === 'Nota' ? 'bg-white text-slate-805 font-extrabold shadow-sm' : 'text-white/80 hover:text-white'}`}
                   >
                     Nota Timbang
                   </button>
                   <button 
                     onClick={() => setActivePrintType('Struk')}
                     className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${activePrintType === 'Struk' ? 'bg-white text-slate-805 font-extrabold shadow-sm' : 'text-white/80 hover:text-white'}`}
                   >
                    Struk Kecil
                  </button>
                </div>
                <button onClick={() => setActivePrintTrx(null)} className="text-white hover:text-red-300 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* SLIP PAPER CONTAINER FOR RENDER */}
              <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col items-center" id="global-printable-body">
                <div 
                  className={`w-full bg-[#FAFAF8] border p-4.5 rounded-lg font-mono text-zinc-850 shadow-inner ${activePrintType === 'Struk' ? 'max-w-[280px] text-xs' : 'text-sm'}`}
                  style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.01) 50%, transparent 50%)', backgroundSize: '100% 4px' }}
                >
                  <div className="text-center space-y-1 border-b border-dashed border-zinc-300 pb-3 mb-4">
                    <h5 className="font-bold text-sm text-zinc-950 uppercase">{state.setting.nama_lapak || 'LAPAK SAWIT RIAU'}</h5>
                    <p className="text-[10px] text-zinc-500">{state.setting.alamat || 'Riau'}</p>
                    <p className="text-[9px] text-zinc-500">Tel: {state.setting.telp || '081234'}</p>
                  </div>

                  <div className="space-y-1 text-xs pb-3 mb-3 border-b border-dashed border-zinc-300 text-left">
                    <div className="flex justify-between"><span>KARCIS NO:</span> <span className="font-bold text-zinc-900">{activePrintTrx.id_transaksi}</span></div>
                    <div className="flex justify-between"><span>TANGGAL:</span> <span>{activePrintTrx.tanggal.split('-').reverse().join('/')} ({activePrintTrx.jam})</span></div>
                    <div className="flex justify-between"><span>PETANI:</span> <span className="font-bold text-zinc-900">{activePrintTrx.nama_petani}</span></div>
                    <div className="flex justify-between"><span>VEHICLE:</span> <span className="uppercase">{activePrintTrx.kendaraan}</span></div>
                    <div className="flex justify-between"><span>KOMODITAS:</span> <span className="font-bold text-slate-850">{activePrintTrx.jenis_sawit}</span></div>
                  </div>

                  <div className="space-y-1.5 text-xs pb-3 mb-4 border-b border-dashed border-zinc-350">
                    <div className="flex justify-between"><span>BRUTO (KG):</span> <span>{activePrintTrx.berat_kotor} Kg</span></div>
                    <div className="flex justify-between"><span>TARA (KG):</span> <span>-{activePrintTrx.berat_tara} Kg</span></div>
                    <div className="flex justify-between"><span>POTONGAN:</span> <span>-{activePrintTrx.potongan} Kg</span></div>
                    <div className="flex justify-between font-bold pt-1 border-t border-dotted border-zinc-300 text-zinc-900">
                      <span>NETTO (BERSIH):</span> <span>{activePrintTrx.berat_bersih} Kg</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 font-medium">
                      <span>HARGA KG:</span> <span>Rp {new Intl.NumberFormat('id-ID').format(activePrintTrx.harga_kg)}</span>
                    </div>
                  </div>

                  {/* CASH OUTROW BOX */}
                  <div className="text-center space-y-1 bg-white p-2 border rounded-lg mb-4">
                    <span className="text-[10px] text-zinc-400 font-bold block">TOTAL WAJIB BAYAR</span>
                    <h3 className="text-base font-black text-slate-800 tracking-tight leading-none">
                      Rp {new Intl.NumberFormat('id-ID').format(activePrintTrx.total_bayar)}
                    </h3>
                  </div>

                  <div className="flex flex-col items-center space-y-3.5 pt-1 text-center font-mono">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(`ID:${activePrintTrx.id_transaksi}|Netto:${activePrintTrx.berat_bersih}Kg|Total:${activePrintTrx.total_bayar}|Lapak:${state.setting.nama_lapak}`)}`}
                      className="w-24 h-24 border bg-white p-1 rounded-md"
                      alt="Thermal Receipt Auth QR"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[9px] text-zinc-400">
                      <p>Karcis Timbangan Digital validitas terjamin</p>
                      <p className="mt-1 border-t pt-1.5">Operator: {activePrintTrx.operator}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operations Footer */}
              <div className="bg-gray-55 p-4 border-t border-gray-150 flex gap-2">
                <button
                  onClick={() => {
                    const printContents = document.getElementById('global-printable-body')?.innerHTML;
                    if (printContents) {
                      const popupWin = window.open('', '_blank', 'width=600,height=600');
                      if (popupWin) {
                        popupWin.document.open();
                        popupWin.document.write(`
                          <html>
                            <head>
                              <title>Cetak Nota ${activePrintTrx.id_transaksi}</title>
                              <style>
                                body { font-family: monospace; padding: 20px; display: flex; justify-content: center; }
                                .box { max-width: 320px; width: 100%; border: 1px solid #ccc; padding: 15px; border-radius: 4px; }
                                .text-center { text-align: center; }
                                .flex { display: flex; justify-content: space-between; }
                                hr { border: none; border-top: 1px dashed #333; margin: 10px 0; }
                                .bold { font-weight: bold; }
                              </style>
                            </head>
                            <body onload="window.print();window.close();">
                              <div class="box">
                                <div class="text-center">
                                  <h3 style="margin: 0; text-transform: uppercase;">${state.setting.nama_lapak || 'LAPAK SAWIT RIAU'}</h3>
                                  <p style="font-size: 11px; margin: 3px 0;">${state.setting.alamat || ''}</p>
                                </div>
                                <hr />
                                <div style="font-size: 11px; line-height: 1.6;">
                                  <div class="flex"><span>NO TICKET:</span> <span class="bold">${activePrintTrx.id_transaksi}</span></div>
                                  <div class="flex"><span>PETANI:</span> <span class="bold">${activePrintTrx.nama_petani}</span></div>
                                  <div class="flex"><span>KENDARAAN:</span> <span class="bold" style="text-transform: uppercase;">${activePrintTrx.kendaraan}</span></div>
                                  <div class="flex"><span>KOMODITAS:</span> <span class="bold">${activePrintTrx.jenis_sawit}</span></div>
                                </div>
                                <hr />
                                <div style="font-size: 11px; line-height: 1.6;">
                                  <div class="flex"><span>NETTO:</span> <span class="bold">${activePrintTrx.berat_bersih} KG</span></div>
                                  <div class="flex"><span>HARGA:</span> <span>Rp ${new Intl.NumberFormat('id-ID').format(activePrintTrx.harga_kg)}</span></div>
                                </div>
                                <hr />
                                <div class="text-center" style="background: #eee; padding: 8px; border-radius: 4px;">
                                  <span style="font-size: 9px; display: block;">NOMINAL TIMBANG</span>
                                  <h3 style="margin: 3px 0; color: #16a34a;">Rp ${new Intl.NumberFormat('id-ID').format(activePrintTrx.total_bayar)}</h3>
                                </div>
                                <hr />
                                <div style="text-align: center; font-size: 10px;">
                                  <img style="width: 100px; height: 100px;" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=ID:${activePrintTrx.id_transaksi}|Netto:${activePrintTrx.berat_bersih}Kg|Total:${activePrintTrx.total_bayar}|Lapak:${state.setting.nama_lapak}" />
                                  <p style="margin-top: 5px;">Operator: ${activePrintTrx.operator}</p>
                                </div>
                              </div>
                            </body>
                          </html>
                        `);
                        popupWin.document.close();
                      } else {
                        window.print();
                      }
                    }
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Scale size={13} />
                  <span>Cetak Nota</span>
                </button>
                <button
                  onClick={() => handleShareWhatsApp(activePrintTrx)}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 size={13} />
                  <span>Share WhatsApp</span>
                </button>
                <button
                  onClick={() => setActivePrintTrx(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
