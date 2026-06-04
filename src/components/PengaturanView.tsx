import React, { useState } from 'react';
import { AppState, UserAccount, LapakSetting, UserRole } from '../types';
import { 
  Building2, 
  Users2, 
  Smartphone, 
  UserPlus2, 
  Lock,
  FileCheck,
  ChevronRight,
  History,
  PowerOff,
  Edit2,
  Trash2,
  X,
  Check
} from 'lucide-react';

interface PengaturanProps {
  state: AppState;
  onUpdateSetting: (setting: LapakSetting) => Promise<void>;
  onAddUser: (user: UserAccount) => Promise<void>;
  onToggleUserStatus: (userId: string) => Promise<void>;
  onUpdateUser: (user: UserAccount) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export default function PengaturanView({
  state,
  onUpdateSetting,
  onAddUser,
  onToggleUserStatus,
  onUpdateUser,
  onDeleteUser
}: PengaturanProps) {
  const { setting, users, auditLogs } = state;

  // Active sub tab inside Settings
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'users' | 'logs'>('profile');

  // --- Profile Settings States ---
  const [namaLapak, setNamaLapak] = useState(setting.nama_lapak);
  const [alamat, setAlamat] = useState(setting.alamat);
  const [telp, setTelp] = useState(setting.telp);
  const [namaPemilik, setNamaPemilik] = useState(setting.nama_pemilik);

  // --- User Manager States ---
  const [newNama, setNewNama] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Owner' | 'Admin' | 'Operator Timbangan' | 'Kasir'>('Operator Timbangan');

  // --- Edit User States ---
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Operator Timbangan');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Authorization (Only Owners have rights to change permissions)
  const isOwner = state.currentUser?.role === 'Owner';

  // --- SAVE PROFILE METADATA ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    setActionLoading(true);
    try {
      const updated: LapakSetting = {
        ...setting,
        nama_lapak: namaLapak.trim(),
        alamat: alamat.trim(),
        telp: telp.trim(),
        nama_pemilik: namaPemilik.trim()
      };

      await onUpdateSetting(updated);
      setFormSuccess('Berhasil memperbarui profil dan informasi lapak sawit!');
    } catch (err: any) {
      setFormError(`Gagal menyimpan profile: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- ADD NEW ROLE ACCOUNT ---
  const handleAddUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setFormError('');
    setFormSuccess('');

    if (!newNama.trim() || !newUsername.trim() || !newPassword.trim()) {
      setFormError('Semua field wajib diisi!');
      return;
    }

    const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase().trim());
    if (exists) {
      setFormError('Username sudah terpakai!');
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
        role: newRole,
        status: 'Aktif'
      };

      await onAddUser(newUser);
      setFormSuccess(`Berhasil mendaftarkan akun baru @${newUsername} (${newRole})!`);

      // Reset
      setNewNama('');
      setNewUsername('');
      setNewPassword('');
    } catch (err: any) {
      setFormError(`Gagal mendaftarkan user: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- TOGGLE ACCOUNT STATUS (ACTIVE/DISABLED) ---
  const handleToggleUser = async (u: UserAccount) => {
    if (!isOwner) return;
    if (u.user_id === state.currentUser?.user_id) {
      alert('Anda tidak bisa menonaktifkan akun sendiri yang sedang login!');
      return;
    }

    const confirmToggle = window.confirm(
      `Apakah Anda yakin ingin ${u.status === 'Aktif' ? 'Menonaktifkan' : 'Mengaktifkan'} akun ${u.nama}?`
    );

    if (confirmToggle) {
      try {
        await onToggleUserStatus(u.user_id);
      } catch (err: any) {
        alert(`Gagal merubah status: ${err.message || err}`);
      }
    }
  };

  // --- SUBMIT USER EXPLICIT EDIT ---
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editNama.trim() || !editUsername.trim() || !editPassword.trim()) {
      alert('Semua field wajib diisi!');
      return;
    }

    setActionLoading(true);
    try {
      const updated: UserAccount = {
        ...editingUser,
        nama: editNama.trim(),
        username: editUsername.trim().toLowerCase(),
        password_hash: editPassword.trim(),
        role: editRole
      };

      await onUpdateUser(updated);
      setEditingUser(null);
      setFormSuccess(`Informasi karyawan @${editUsername} berhasil diubah!`);
    } catch (err: any) {
      alert(`Gagal mengubah informasi user: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- PROCESS USER HARD DELETE ---
  const handleDeleteUserClick = async (userId: string, nama: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin MENGHAPUS secara PERMANEN akun karyawan ${nama}? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      await onDeleteUser(userId);
      setFormSuccess(`Akun karyawan ${nama} berhasil dihapus dari sistem!`);
    } catch (err: any) {
      alert(`Gagal menghapus user: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="settings-view-container">
      {/* Subnav links */}
      <div className="bg-white px-4 py-3 rounded-xl border border-gray-150 shadow-sm flex flex-wrap gap-1.5" id="settings-internal-tabs">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'profile' ? 'bg-emerald-600 text-white border border-emerald-700/40 shadow-sm' : 'hover:bg-gray-55 text-gray-600'}`}
        >
          Informasi Lapak
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'users' ? 'bg-emerald-600 text-white border border-emerald-700/40 shadow-sm' : 'hover:bg-gray-55 text-gray-600'}`}
        >
          Manajemen Karyawan / Hak Akses
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'logs' ? 'bg-emerald-600 text-white border border-emerald-700/40 shadow-sm' : 'hover:bg-gray-55 text-gray-600'}`}
        >
          Audit Log Keaslian
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" id="settings-dynamic-form-container">
        {formError && (
          <div className="mb-4 text-xs p-3 bg-red-50 border border-red-200 text-red-800 font-semibold rounded-lg">{formError}</div>
        )}
        {formSuccess && (
          <div className="mb-4 text-xs p-3 bg-emerald-50 border border-emerald-205 text-emerald-800 font-semibold rounded-lg">{formSuccess}</div>
        )}

        {/* --- RENDER 1: PROFILE INFORMATION SETTINGS --- */}
        {activeSubTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6" id="profile-edit-form">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-1.5">
                <Building2 size={18} className="text-emerald-700" />
                <span>Ubah Profil & Stasiun Timbangan</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Atur informasi utama lapak sawit Anda yang akan dicantumkan di print out struk / nota karcis timbang.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-gray-750">
              <div>
                <label className="block mb-1.5 uppercase tracking-wider text-gray-500">Nama Lapak Sawit</label>
                <input
                  type="text"
                  required
                  value={namaLapak}
                  onChange={(e) => setNamaLapak(e.target.value)}
                  className="w-full p-2.5 bg-gray-55/40 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block mb-1.5 uppercase tracking-wider text-gray-500">Nama Pemilik / Direktur</label>
                <input
                  type="text"
                  required
                  value={namaPemilik}
                  onChange={(e) => setNamaPemilik(e.target.value)}
                  className="w-full p-2.5 bg-gray-55/40 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block mb-1.5 uppercase tracking-wider text-gray-500">Nomor Telepon Lapak</label>
                <input
                  type="text"
                  required
                  value={telp}
                  onChange={(e) => setTelp(e.target.value)}
                  className="w-full p-2.5 bg-gray-55/40 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block mb-1.5 uppercase tracking-wider text-gray-500">Alamat Fisik Stasiun Timbangan</label>
                <input
                  type="text"
                  required
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full p-2.5 bg-gray-55/40 border border-gray-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer hover:shadow-md text-xs"
              >
                <span>{actionLoading ? 'Menyimpan...' : 'Perbarui Profil Lapak'}</span>
              </button>
            </div>
          </form>
        )}

        {/* --- RENDER 2: EMPLOYEE CREDENTIALS & MANAGEMENTS --- */}
        {activeSubTab === 'users' && (
          <div className="space-y-6" id="users-manager-tab">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-1.5">
                <Users2 size={18} className="text-emerald-700" />
                <span>Hak Akses & Manajemen Karyawan</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Daftarkan akun kasir, operator timbangan sawit, maupun admin baru dengan wewenang yang berbeda.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="users-split-panel">
              {/* Add form */}
              {isOwner ? (
                <div className="p-5 rounded-2xl bg-[#F9FAF9] border border-gray-150 h-fit space-y-4" id="add-user-card">
                  <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2.5 border-gray-150">
                    <UserPlus2 size={15} className="text-emerald-700" />
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
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg placeholder-zinc-300"
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
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg placeholder-zinc-300"
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
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg placeholder-zinc-300"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Role / Peran Utama</label>
                      <select
                        value={newRole}
                        onChange={(e: any) => setNewRole(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg"
                      >
                        <option value="Operator Timbangan">Operator Timbangan (Timbang saja)</option>
                        <option value="Kasir">Kasir (Pembayaran & Kas saja)</option>
                        <option value="Admin">Administrator (Laporan & Harga)</option>
                        <option value="Owner">Owner (Akses Tanpa Batas)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Daftarkan Akun
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-amber-50/25 border border-amber-100 p-5 rounded-2xl text-center space-y-2">
                  <Lock size={32} className="text-amber-600 mx-auto" />
                  <h4 className="font-bold text-amber-800 text-xs uppercase select-none">Terkunci</h4>
                  <p className="text-gray-500 text-xs">Pendaftaran Karyawan baru serta modifikasi status login hanya boleh dijalankan oleh Pemilik Lapak selaku Owner.</p>
                </div>
              )}

              {/* Account Registry list */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Arsip Akun Aktif</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="users-grid">
                  {users.map(u => (
                    <div key={u.user_id} className={`p-4 rounded-xl border flex items-start justify-between shadow-xs ${u.status === 'Aktif' ? 'bg-white border-zinc-200' : 'bg-zinc-50 border-zinc-200/50 opacity-60'}`}>
                      <div className="space-y-1.5 text-xs text-zinc-500 flex-1 min-w-0 pr-2">
                        <span className={`inline-block py-0.5 px-2 rounded-full font-bold text-[9px] ${
                          u.role === 'Owner' ? 'bg-purple-50 text-purple-800' :
                          u.role === 'Admin' ? 'bg-blue-50 text-blue-800' :
                          u.role === 'Kasir' ? 'bg-emerald-50 text-emerald-800' :
                          'bg-zinc-100 text-zinc-800'
                        }`}>{u.role}</span>
                        <h4 className="font-bold text-zinc-900 text-sm leading-none truncate">{u.nama}</h4>
                        <div className="text-[10px] truncate">User: <span className="font-semibold font-mono text-slate-800">@{u.username}</span> • Pass: <span className="font-mono">{u.password_hash}</span></div>
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${u.status === 'Aktif' ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                          <span className="text-[10px] font-semibold">{u.status === 'Aktif' ? 'Status: Aktif' : 'Status: Nonaktif/Beku'}</span>
                        </div>
                      </div>

                      {isOwner && u.user_id !== state.currentUser?.user_id && (
                        <div className="flex flex-col gap-1 shadow-xs shrink-0 border border-zinc-150 p-1 bg-zinc-50/50 rounded-xl">
                          <button
                            onClick={() => handleToggleUser(u)}
                            className="p-1 px-2.5 hover:bg-white rounded-lg text-zinc-700 text-[10px] font-bold transition-all cursor-pointer text-left"
                            title="Aktifkan atau Bekukan akun"
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
                            className="p-1 px-2.5 hover:bg-emerald-55 hover:text-emerald-700 text-zinc-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 size={10} />
                            <span>Ubah</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUserClick(u.user_id, u.nama)}
                            className="p-1 px-2.5 hover:bg-red-50 hover:text-red-600 text-zinc-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 size={10} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- RENDER 3: AUDIT LOG VIEWER --- */}
        {activeSubTab === 'logs' && (
          <div className="space-y-6 animate-fadeIn" id="logs-sub-tab">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-1.5">
                  <History size={18} className="text-slate-700" />
                  <span>Rekap Transparansi & Audit Log</span>
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">Seluruh aktivitas platform timbang sawit dicatatkan secara transparan untuk audit penyelewengan.</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1" id="full-audit-logs">
              {auditLogs.map((log, index) => (
                <div key={log.id_log ? `${log.id_log}-${index}` : `log-${index}`} className="p-3 bg-gray-55/65 hover:bg-gray-55 rounded-xl border flex justify-between items-start text-xs font-semibold gap-4 leading-normal transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-1.5 rounded bg-gray-200 text-gray-700 text-[9px] font-bold font-mono uppercase">{log.aktivitas}</span>
                      <span className="text-gray-400 font-mono text-[10px]">{log.tanggal}</span>
                    </div>
                    <p className="text-gray-600 text-[11px] font-normal leading-relaxed">{log.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-slate-800 font-bold block">@{log.user}</span>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-20 text-gray-455 text-xs">Belum ada catatan aktivitas di auditor log.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- EDIT ACCOUNT MODAL POPUP --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-emerald-100 shadow-2xl animate-scaleIn">
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
                  <option value="Operator Timbangan">Operator Timbangan (Timbang saja)</option>
                  <option value="Kasir">Kasir (Pembayaran & Kas saja)</option>
                  <option value="Admin">Administrator (Laporan & Harga)</option>
                  <option value="Owner">Owner (Akses Tanpa Batas)</option>
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
    </div>
  );
}
