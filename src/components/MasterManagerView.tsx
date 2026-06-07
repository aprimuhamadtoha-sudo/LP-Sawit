import React, { useState } from 'react';
import { AppState, UserAccount, RoleConfig, DEFAULT_ROLE_MENUS } from '../types';
import { 
  Users2, 
  ShieldCheck, 
  UserPlus2, 
  Lock, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  PlusCircle, 
  ShieldAlert 
} from 'lucide-react';

export const AVAILABLE_MENU_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'timbang', label: 'Transaksi Timbang' },
  { key: 'harga', label: 'Harga Harian' },
  { key: 'riwayat', label: 'Riwayat & Laporan' },
  { key: 'laporan', label: 'Laporan Periodik' },
  { key: 'kas', label: 'Kas Operasional' },
  { key: 'pengaturan', label: 'Pengaturan Lapak' }
];

interface MasterManagerProps {
  state: AppState;
  onAddUser: (user: UserAccount) => Promise<void>;
  onToggleUserStatus: (userId: string) => Promise<void>;
  onUpdateUser: (user: UserAccount) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onAddRole: (role: string, menus?: string[]) => Promise<void>;
  onUpdateRole?: (roleId: string, newRoleName: string, menus: string[]) => Promise<void>;
  onDeleteRole: (role: string) => Promise<void>;
}

export default function MasterManagerView({
  state,
  onAddUser,
  onToggleUserStatus,
  onUpdateUser,
  onDeleteUser,
  onAddRole,
  onUpdateRole,
  onDeleteRole
}: MasterManagerProps) {
  const { users, roles } = state;

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');

  // New User states
  const [newNama, setNewNama] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState(roles[0] || 'Operator Timbangan');

  // Edit User states
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');

  // New Role states
  const [newRoleName, setNewRoleName] = useState('');
  const [newSelectedMenus, setNewSelectedMenus] = useState<string[]>(['dashboard', 'harga', 'riwayat', 'pengaturan']);

  // Edit Role states
  const [editingRole, setEditingRole] = useState<RoleConfig | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editSelectedMenus, setEditSelectedMenus] = useState<string[]>([]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isAlert?: boolean;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      isAlert: true,
      confirmText: 'OK',
      type,
      onConfirm: () => setConfirmModal(null)
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    type: 'danger' | 'warning' | 'info' = 'warning',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm
    });
  };

  // Security Verification (Developer username is checked)
  const isDeveloper = state.currentUser?.role === 'Developer' || state.currentUser?.username === 'developer';

  if (!isDeveloper) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center max-w-lg mx-auto my-10 space-y-4">
        <ShieldAlert size={48} className="text-red-650 mx-auto animate-pulse" />
        <h3 className="text-lg font-black tracking-tight">Akses Terbatas (Master Menu)</h3>
        <p className="text-xs font-semibold leading-relaxed text-red-750">
          Maaf, menu manajemen master ini hanya khusus ditujukan bagi Pengembang Aplikasi (Developer) untuk hak akses kontrol penuh.
        </p>
      </div>
    );
  }

  // --- REGISTER USER ---
  const handleAddUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newNama.trim() || !newUsername.trim() || !newPassword.trim()) {
      setFormError('Semua field wajib diisi!');
      return;
    }

    const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase().trim());
    if (exists) {
      setFormError('Username sudah terpakai oleh akun lain!');
      return;
    }

    setActionLoading(true);

    try {
      const nextId = 'USR-' + String(users.length + 1).padStart(3, '0');
      const newUser: UserAccount = {
        user_id: nextId,
        nama: newNama.trim(),
        username: newUsername.trim().toLowerCase(),
        password_hash: newPassword.trim(),
        role: newRole as any,
        status: 'Aktif'
      };

      await onAddUser(newUser);
      setFormSuccess(`Berhasil mendaftarkan akun baru @${newUsername} (${newRole})!`);

      // Reset Form
      setNewNama('');
      setNewUsername('');
      setNewPassword('');
    } catch (err: any) {
      setFormError(`Gagal mendaftarkan user: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- SAVE EDIT USER ---
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editNama.trim() || !editUsername.trim() || !editPassword.trim()) {
      showAlert('Input Tidak Lengkap', 'Semua field wajib diisi!', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const updated: UserAccount = {
        ...editingUser,
        nama: editNama.trim(),
        username: editUsername.trim().toLowerCase(),
        password_hash: editPassword.trim(),
        role: editRole as any
      };

      await onUpdateUser(updated);
      setEditingUser(null);
      setFormSuccess(`Informasi karyawan @${editUsername} berhasil diubah!`);
    } catch (err: any) {
      showAlert('Gagal Mengubah', `Gagal mengubah informasi user: ${err.message || err}`, 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  // --- TOGGLE BANNED/ACTIVE ---
  const handleToggleUser = async (u: UserAccount) => {
    if (u.user_id === state.currentUser?.user_id) {
      showAlert('Aksi Ditolak', 'Anda tidak bisa membekukan akun yang sedang digunakan saat ini!', 'danger');
      return;
    }

    showConfirm(
      'Konfirmasi Perubahan Status',
      `Apakah Anda yakin ingin ${u.status === 'Aktif' ? 'Menonaktifkan' : 'Mengaktifkan'} akun karyawan ${u.nama}?`,
      async () => {
        try {
          await onToggleUserStatus(u.user_id);
          setConfirmModal(null);
          setFormSuccess(`Status akun ${u.nama} berhasil diubah.`);
        } catch (err: any) {
          showAlert('Gagal Mengubah Status', `Gagal memproses status: ${err.message || err}`, 'danger');
        }
      },
      'warning'
    );
  };

  // --- HARD DELETE USER ---
  const handleDeleteUserClick = async (userId: string, nama: string) => {
    showConfirm(
      'Hapus Permanen Akun',
      `Apakah Anda yakin ingin menghapus permanen akun karyawan ${nama}?\nTindakan pengembang ini bersifat mutlak dan data akun akan terhapus selamanya.`,
      async () => {
        setActionLoading(true);
        try {
          await onDeleteUser(userId);
          setFormSuccess(`Akun karyawan ${nama} telah dihapus total.`);
          setConfirmModal(null);
        } catch (err: any) {
          showAlert('Gagal Menghapus', `Gagal menghapus user: ${err.message || err}`, 'danger');
        } finally {
          setActionLoading(false);
        }
      },
      'danger',
      'Hapus Permanen'
    );
  };

  // --- ADD ROLE ---
  const handleAddRoleClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newRoleName.trim()) return;

    const trimmed = newRoleName.trim();
    if (roles.includes(trimmed)) {
      setFormError('Nama role tersebut sudah terdaftar di sistem!');
      return;
    }

    setActionLoading(true);
    try {
      await onAddRole(trimmed, newSelectedMenus);
      setFormSuccess(`Berhasil membuat role baru: "${trimmed}"`);
      setNewRoleName('');
      setNewSelectedMenus(['dashboard', 'harga', 'riwayat', 'pengaturan']);
    } catch (err: any) {
      setFormError(`Gagal membuat role: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- DELETE ROLE ---
  const handleDeleteRoleClick = async (r: string) => {
    const isSystemRole = ['Owner', 'Admin', 'Operator Timbangan', 'Kasir', 'Developer'].includes(r);
    if (isSystemRole) {
      showAlert('Aksi Ditolak', 'Role sistem bawaan tidak boleh dihapus untuk ketahanan database!', 'danger');
      return;
    }

    showConfirm(
      'Hapus Peran',
      `Apakah Anda yakin ingin menghapus role "${r}"? Karyawan dengan role ini mungkin perlu disesuaikan kembali jabatannya.`,
      async () => {
        setActionLoading(true);
        try {
          await onDeleteRole(r);
          setFormSuccess(`Role "${r}" berhasil dihapus.`);
          setConfirmModal(null);
        } catch (err: any) {
          showAlert('Gagal Menghapus', `Gagal menghapus role: ${err.message || err}`, 'danger');
        } finally {
          setActionLoading(false);
        }
      },
      'danger',
      'Hapus Peran'
    );
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !onUpdateRole) return;

    if (!editRoleName.trim()) {
      showAlert('Input Kurang Lengkap', 'Nama peran tidak boleh kosong!', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      await onUpdateRole(editingRole.id, editRoleName.trim(), editSelectedMenus);
      setEditingRole(null);
      setFormSuccess(`Berhasil memperbarui peran "${editRoleName.trim()}"!`);
    } catch (err: any) {
      showAlert('Gagal Memperbarui', `Gagal memperbarui peran: ${err.message || err}`, 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="master-manager-view">
      {/* Subnav links */}
      <div className="bg-teal-950 px-4 py-3 rounded-xl border border-teal-900 shadow-sm flex flex-wrap gap-1.5" id="master-internal-tabs">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'users' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-teal-900 text-teal-200'}`}
        >
          Manajemen Karyawan / Hak Akses
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'roles' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-teal-900 text-teal-200'}`}
        >
          Konfigurasi Custom Role
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm" id="master-dynamic-container">
        {formError && (
          <div className="mb-4 text-xs p-3 bg-red-50 border border-red-200 text-red-800 font-semibold rounded-lg">{formError}</div>
        )}
        {formSuccess && (
          <div className="mb-4 text-xs p-3 bg-emerald-50 border border-emerald-205 text-emerald-800 font-semibold rounded-lg">{formSuccess}</div>
        )}

        {/* --- RENDER TAB 1: EMPLOYEES & CREDENTIALS --- */}
        {activeSubTab === 'users' && (
          <div className="space-y-6" id="users-manager-tab">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-1.5">
                <Users2 size={18} className="text-emerald-700" />
                <span>Hak Akses & Manajemen Karyawan (Mode Pengembang)</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Daftarkan login operator timbangan, kasir, atau edit kredensial mereka dari database cloud Firebase.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="users-split-panel">
              {/* Left Panel: Register Form */}
              <div className="p-5 rounded-2xl bg-[#F9FAF9] border border-gray-150 h-fit space-y-4" id="add-user-card">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2.5 border-gray-150">
                  <UserPlus2 size={15} className="text-emerald-705" />
                  <span>Daftarkan Karyawan Baru</span>
                </h4>

                <form onSubmit={handleAddUserAccount} className="space-y-3.5 text-xs font-bold text-gray-700">
                  <div>
                    <label className="block mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Rendi Siregar"
                      value={newNama}
                      onChange={(e) => setNewNama(e.target.value)}
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg placeholder-zinc-300 font-normal"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Username Login</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: rendi99"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg placeholder-zinc-300 font-normal"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: password123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg placeholder-zinc-300 font-normal"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Role / Peran Utama</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-xs"
                    >
                      {roles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-center text-xs shadow-xs"
                  >
                    Daftarkan Akun
                  </button>
                </form>
              </div>

              {/* Right Panel: Account registries */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Daftar Akun Pengguna</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="users-grid">
                  {users.map(u => (
                    <div key={u.user_id} className={`p-4 rounded-xl border flex items-start justify-between shadow-xs ${u.status === 'Aktif' ? 'bg-white border-zinc-200' : 'bg-zinc-50 border-zinc-200/50 opacity-60'}`}>
                      <div className="space-y-1.5 text-xs text-zinc-500 flex-1 min-w-0 pr-2">
                        <span className={`inline-block py-0.5 px-2 rounded-full font-bold text-[9px] ${
                          u.role === 'Owner' ? 'bg-purple-50 text-purple-800' :
                          u.role === 'Admin' ? 'bg-blue-50 text-blue-800' :
                          u.role === 'Kasir' ? 'bg-emerald-50 text-emerald-800' :
                          u.role === 'Developer' ? 'bg-red-50 text-red-800' :
                          'bg-zinc-100 text-zinc-800'
                        }`}>{u.role}</span>
                        <h4 className="font-bold text-zinc-900 text-sm leading-none truncate">{u.nama}</h4>
                        <div className="text-[10px] truncate">User: <span className="font-semibold font-mono text-slate-800">@{u.username}</span> • Pass: <span className="font-mono">{u.password_hash}</span></div>
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${u.status === 'Aktif' ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                          <span className="text-[10px] font-semibold">{u.status === 'Aktif' ? 'Status: Aktif' : 'Status: Nonaktif/Beku'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0 border border-zinc-150 p-1 bg-zinc-50/50 rounded-xl shadow-xs">
                        <button
                          onClick={() => handleToggleUser(u)}
                          className="p-1 px-2.5 hover:bg-white rounded-lg text-zinc-700 text-[10px] font-bold transition-all cursor-pointer text-left"
                        >
                          {u.status === 'Aktif' ? 'Bekukan' : 'Aktifkan'}
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditNama(u.nama);
                            setEditUsername(u.username);
                            setEditPassword(u.password_hash);
                            setEditRole(u.role);
                          }}
                          className="p-1 px-2.5 hover:bg-emerald-50 hover:text-emerald-700 text-zinc-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 size={10} />
                          <span>Ubah</span>
                        </button>

                        <button
                          onClick={() => handleDeleteUserClick(u.user_id, u.nama)}
                          className="p-1 px-2.5 hover:bg-red-50 hover:text-red-650 text-zinc-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 size={10} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- RENDER TAB 2: ROLE CREATOR MODULE --- */}
        {activeSubTab === 'roles' && (
          <div className="space-y-6" id="roles-manager-tab">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-1.5">
                <ShieldCheck size={18} className="text-emerald-750" />
                <span>Manajemen & Pembuatan Custom Role</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Kelola tingkat keanggotaan dan hak wewenang akses yang digunakan di dalam sistem.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="roles-split-view">
              {/* Form to add custom role */}
              <form onSubmit={handleAddRoleClick} className="p-5 bg-zinc-50 border rounded-2xl h-fit space-y-4">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2.5">
                  <PlusCircle size={15} className="text-emerald-700" />
                  <span>Buat Custom Role Baru</span>
                </h4>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nama Peran / Tingkat Jabatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Asisten Timbangan atau Checker"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full p-2.5 bg-white border rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500">Akses Menu Sesuai Pilihan (Ceklis):</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-white border rounded-xl p-3">
                    {AVAILABLE_MENU_OPTIONS.map(opt => {
                      const isChecked = newSelectedMenus.includes(opt.key);
                      return (
                        <label key={opt.key} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-medium p-1 hover:bg-zinc-50 rounded-lg">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewSelectedMenus(newSelectedMenus.filter(k => k !== opt.key));
                              } else {
                                setNewSelectedMenus([...newSelectedMenus, opt.key]);
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4.5 h-4.5 border-zinc-300"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                >
                  Tambahkan Peran Baru
                </button>
              </form>

              {/* Roles registry output list */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Arsip Peran Platform</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1" id="roles-list-container">
                  {roles.map(r => {
                    const isSystem = ['Owner', 'Admin', 'Operator Timbangan', 'Kasir', 'Developer'].includes(r);
                    return (
                      <div key={r} className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSystem ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                          <div className="flex flex-col">
                            <span className="text-gray-800">{r}</span>
                            <span className="text-[9px] text-gray-400 font-normal">
                              {(() => {
                                const cfg = (state.roleConfigs || []).find(c => c.role_name === r);
                                const count = cfg ? cfg.menus.length : (DEFAULT_ROLE_MENUS[r] || []).length;
                                return `${count} menu diizinkan`;
                              })()}
                            </span>
                          </div>
                          {isSystem && (
                            <span className="text-[8px] bg-slate-100 text-slate-550 border uppercase py-0.5 px-1 rounded-md">System</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const config = (state.roleConfigs || []).find(c => c.role_name === r) || {
                                id: 'id-' + r.toLowerCase().replace(/\s+/g, '-'),
                                role_name: r,
                                menus: DEFAULT_ROLE_MENUS[r] || ['dashboard', 'harga', 'riwayat', 'pengaturan']
                              };
                              setEditingRole(config);
                              setEditRoleName(config.role_name);
                              setEditSelectedMenus([...config.menus]);
                            }}
                            className="p-1 px-2.5 bg-zinc-50 border hover:bg-zinc-100 text-zinc-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                          >
                            Ubah
                          </button>
                          {!isSystem && (
                            <button
                              onClick={() => handleDeleteRoleClick(r)}
                              className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- EDIT ACCOUNT MODAL POPUP --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-emerald-100 shadow-2xl animate-scaleIn">
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit2 size={16} />
                <span className="font-bold text-sm">Ubah Akun: {editingUser.nama}</span>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4 text-xs font-bold text-gray-750">
              <div>
                <label className="block mb-1.5">Nama Lengkap Karyawan</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block mb-1.5">Username Login (@)</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block mb-1.5">Password</label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block mb-1.5">Role / Peran</label>
                <select
                  value={editRole}
                  onChange={(e: any) => setEditRole(e.target.value)}
                  className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-xl text-xs"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-center cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center cursor-pointer transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT ROLE MODAL POPUP --- */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-emerald-100 shadow-2xl animate-scaleIn">
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} />
                <span className="font-bold text-sm">Ubah Hak Akses Peran: {editingRole.role_name}</span>
              </div>
              <button 
                onClick={() => setEditingRole(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="p-6 space-y-4 text-xs font-bold text-gray-750">
              <div>
                <label className="block mb-1.5 font-bold text-gray-700">Nama Peran / Jabatan</label>
                <input
                  type="text"
                  required
                  disabled={['Owner', 'Admin', 'Operator Timbangan', 'Kasir', 'Developer'].includes(editingRole.role_name)}
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full p-2.5 bg-gray-55 border border-gray-200 rounded-xl text-xs disabled:opacity-55"
                  placeholder="Contoh: Asisten Timbangan"
                />
                {['Owner', 'Admin', 'Operator Timbangan', 'Kasir', 'Developer'].includes(editingRole.role_name) && (
                  <p className="text-[10px] text-zinc-400 font-normal mt-1 leading-normal">System Role bawaan tidak bisa diubah namanya demi stabilitas database.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-500 font-bold">Akses Menu Sesuai Pilihan (Ceklis):</label>
                <div className="grid grid-cols-1 gap-1.5 bg-white border rounded-xl p-3 max-h-[180px] overflow-y-auto">
                  {AVAILABLE_MENU_OPTIONS.map(opt => {
                    const isChecked = editSelectedMenus.includes(opt.key);
                    return (
                      <label key={opt.key} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-medium p-1 hover:bg-zinc-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditSelectedMenus(editSelectedMenus.filter(k => k !== opt.key));
                            } else {
                              setEditSelectedMenus([...editSelectedMenus, opt.key]);
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4.5 h-4.5 border-zinc-300"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-center cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center cursor-pointer transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRMATION & ALERT MODAL --- */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-150 shadow-2xl animate-scaleIn">
            <div className={`p-4 text-white flex items-center gap-2 font-bold text-sm ${
              confirmModal.type === 'danger' ? 'bg-red-600' :
              confirmModal.type === 'warning' ? 'bg-amber-500' :
              'bg-emerald-600'
            }`}>
              <ShieldCheck size={16} />
              <span>{confirmModal.title}</span>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-line">
                {confirmModal.message}
              </p>

              <div className="flex gap-2.5 pt-2">
                {!confirmModal.isAlert && (
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-center text-xs cursor-pointer transition-colors"
                  >
                    {confirmModal.cancelText || 'Batal'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const cb = confirmModal.onConfirm;
                    cb();
                  }}
                  className={`flex-1 py-2 text-white font-bold rounded-xl text-center text-xs cursor-pointer transition-colors ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                    confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {confirmModal.confirmText || 'Ya, Lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
