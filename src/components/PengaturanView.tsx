import React, { useState } from 'react';
import { AppState, LapakSetting } from '../types';
import { Building2 } from 'lucide-react';

interface PengaturanProps {
  state: AppState;
  onUpdateSetting: (setting: LapakSetting) => Promise<void>;
}

export default function PengaturanView({
  state,
  onUpdateSetting
}: PengaturanProps) {
  const { setting } = state;

  // --- Profile Settings States ---
  const [namaLapak, setNamaLapak] = useState(setting.nama_lapak);
  const [alamat, setAlamat] = useState(setting.alamat);
  const [telp, setTelp] = useState(setting.telp);
  const [namaPemilik, setNamaPemilik] = useState(setting.nama_pemilik);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
      setFormSuccess('Berhasil memperbarui profil dan informasi stasiun timbangan sawit!');
    } catch (err: any) {
      setFormError(`Gagal menyimpan profile: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="settings-view-container">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" id="settings-dynamic-form-container">
        {formError && (
          <div className="mb-4 text-xs p-3 bg-red-50 border border-red-200 text-red-800 font-semibold rounded-lg">{formError}</div>
        )}
        {formSuccess && (
          <div className="mb-4 text-xs p-3 bg-emerald-50 border border-emerald-205 text-emerald-800 font-semibold rounded-lg">{formSuccess}</div>
        )}

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
      </div>
    </div>
  );
}
