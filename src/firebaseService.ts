import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { UserAccount, HargaHarian, TransaksiTimbang, KasRecord, PenjualanRecord, AuditLog, LapakSetting, RoleConfig, DEFAULT_ROLE_MENUS } from './types';

// Initialize or reuse Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Operational Error Handling for Firebase Security Audit Rules Tracking
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sync state items seamlessly on a single load
 */
export interface FirestoreFullState {
  users: UserAccount[];
  roles: string[];
  roleConfigs?: RoleConfig[];
  hargaHarian: HargaHarian[];
  transaksi: TransaksiTimbang[];
  kas: KasRecord[];
  penjualan: PenjualanRecord[];
  auditLogs: AuditLog[];
  setting: LapakSetting;
  syncError?: string;
}

// Default static lists if Firestore database is starting fresh
import { DEFAULT_SETTING, DEFAULT_USERS } from './storage';

const INITIAL_ROLES = ['Owner', 'Admin', 'Operator Timbangan', 'Kasir', 'Developer'];

/**
 * Pulls all state data from Firebase Firestore or seeds default state if database is empty.
 */
export async function pullAllDataFromFirestore(): Promise<FirestoreFullState> {
  const state: FirestoreFullState = {
    users: [],
    roles: [],
    roleConfigs: [],
    hargaHarian: [],
    transaksi: [],
    kas: [],
    penjualan: [],
    auditLogs: [],
    setting: DEFAULT_SETTING
  };

  try {
    // 1. Fetch settings
    const settingsCollect = collection(db, 'settings');
    const settingsSnap = await getDocs(settingsCollect).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'settings');
    });
    
    if (settingsSnap.empty) {
      // DB is fully fresh, let's write default settings
      await setDoc(doc(db, 'settings', 'default'), DEFAULT_SETTING).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, 'settings/default');
      });
      state.setting = DEFAULT_SETTING;
    } else {
      const docData = settingsSnap.docs.find(d => d.id === 'default')?.data() as LapakSetting;
      state.setting = docData || DEFAULT_SETTING;
    }

    // 2. Fetch Users
    const usersSnap = await getDocs(collection(db, 'users')).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });
    
    if (usersSnap.empty) {
      // Seed default accounts + developer
      const batch = writeBatch(db);
      DEFAULT_USERS.forEach(u => {
        batch.set(doc(db, 'users', u.user_id), u);
      });
      await batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, 'users-seed-batch');
      });
      state.users = DEFAULT_USERS;
    } else {
      const dbUsers = usersSnap.docs.map(d => d.data() as UserAccount);
      state.users = dbUsers;
    }

    // 3. Fetch Roles
    const rolesSnap = await getDocs(collection(db, 'roles')).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'roles');
    });
    
    if (rolesSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_ROLES.forEach(r => {
        const roleId = 'id-' + r.toLowerCase().replace(/\s+/g, '-');
        const defaultMenus = DEFAULT_ROLE_MENUS[r] || [];
        batch.set(doc(db, 'roles', roleId), { id: roleId, role_name: r, menus: defaultMenus });
      });
      await batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, 'roles-seed-batch');
      });
      state.roles = INITIAL_ROLES;
      state.roleConfigs = INITIAL_ROLES.map(r => ({
        id: 'id-' + r.toLowerCase().replace(/\s+/g, '-'),
        role_name: r,
        menus: DEFAULT_ROLE_MENUS[r] || []
      }));
    } else {
      const parsedConfigs: RoleConfig[] = [];
      rolesSnap.docs.forEach(d => {
        const data = d.data();
        parsedConfigs.push({
          id: data.id || d.id,
          role_name: data.role_name as string,
          menus: (data.menus as string[]) || DEFAULT_ROLE_MENUS[data.role_name] || []
        });
      });
      state.roleConfigs = parsedConfigs;
      state.roles = parsedConfigs.map(c => c.role_name);
    }

    // 4. Fetch Harga Harian
    const hargaSnap = await getDocs(collection(db, 'hargaHarian')).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'hargaHarian');
    });
    state.hargaHarian = hargaSnap.docs.map(d => d.data() as HargaHarian);

    // 5. Fetch Transaksi (Ordered by date/time parsed safely if possible, or loaded and client-sorted)
    const trxSnap = await getDocs(collection(db, 'transaksi')).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'transaksi');
    });
    state.transaksi = trxSnap.docs.map(d => d.data() as TransaksiTimbang);

    // 6. Fetch Jurnal Kas
    const kasSnap = await getDocs(collection(db, 'kas')).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'kas');
    });
    state.kas = kasSnap.docs.map(d => d.data() as KasRecord);

    // 7. Fetch Penjualan Bulk
    const penSnap = await getDocs(collection(db, 'penjualan')).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'penjualan');
    });
    state.penjualan = penSnap.docs.map(d => d.data() as PenjualanRecord);

    // 8. Fetch Audit Logs
    const logsSnap = await getDocs(collection(db, 'auditLogs')).catch(err => {
      handleFirestoreError(err, OperationType.LIST, 'auditLogs');
    });
    state.auditLogs = logsSnap.docs.map(d => d.data() as AuditLog);

    return state;
  } catch (error) {
    console.error('Failed to pull all data from Firestore, fallback to loaded params', error);
    // Return empty placeholders to allow local states to run
    state.syncError = error instanceof Error ? error.message : String(error);
    return state;
  }
}

// ----------------------------------------
// FIRESTORE CRUD ACTIONS IMPLEMENTATION
// ----------------------------------------

export async function saveSettingToFirestore(setting: LapakSetting): Promise<void> {
  const path = 'settings/default';
  await setDoc(doc(db, 'settings', 'default'), setting).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}

export async function saveUserToFirestore(user: UserAccount): Promise<void> {
  const path = `users/${user.user_id}`;
  await setDoc(doc(db, 'users', user.user_id), user).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  await deleteDoc(doc(db, 'users', userId)).catch(err => {
    handleFirestoreError(err, OperationType.DELETE, path);
  });
}

export async function saveRoleToFirestore(roleName: string, menus: string[] = []): Promise<void> {
  const roleId = 'id-' + roleName.toLowerCase().trim().replace(/\s+/g, '-');
  const path = `roles/${roleId}`;
  await setDoc(doc(db, 'roles', roleId), { id: roleId, role_name: roleName.trim(), menus }).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}

export async function deleteRoleFromFirestore(roleName: string): Promise<void> {
  const roleId = 'id-' + roleName.toLowerCase().trim().replace(/\s+/g, '-');
  const path = `roles/${roleId}`;
  await deleteDoc(doc(db, 'roles', roleId)).catch(err => {
    handleFirestoreError(err, OperationType.DELETE, path);
  });
}

export async function saveHargaToFirestore(harga: HargaHarian): Promise<void> {
  const path = `hargaHarian/${harga.tanggal}`;
  await setDoc(doc(db, 'hargaHarian', harga.tanggal), harga).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}

export async function saveTransaksiToFirestore(trx: TransaksiTimbang): Promise<void> {
  const path = `transaksi/${trx.id_transaksi}`;
  await setDoc(doc(db, 'transaksi', trx.id_transaksi), trx).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}

export async function deleteTransaksiFromFirestore(id_transaksi: string): Promise<void> {
  const path = `transaksi/${id_transaksi}`;
  await deleteDoc(doc(db, 'transaksi', id_transaksi)).catch(err => {
    handleFirestoreError(err, OperationType.DELETE, path);
  });
}

export async function saveKasToFirestore(kas: KasRecord): Promise<void> {
  const path = `kas/${kas.id_kas}`;
  await setDoc(doc(db, 'kas', kas.id_kas), kas).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}

export async function savePenjualanToFirestore(pen: PenjualanRecord): Promise<void> {
  const path = `penjualan/${pen.id_penjualan}`;
  await setDoc(doc(db, 'penjualan', pen.id_penjualan), pen).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}

export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  const path = `auditLogs/${log.id_log}`;
  await setDoc(doc(db, 'auditLogs', log.id_log), log).catch(err => {
    handleFirestoreError(err, OperationType.WRITE, path);
  });
}
