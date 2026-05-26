import React, { useState, useEffect } from 'react';
import { ArchiveItem } from '../types';
import { 
  Plus, 
  Trash2, 
  Save, 
  ExternalLink, 
  Edit2, 
  X, 
  AlertCircle, 
  Search, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const CORRECT_PIN = '2026';

// Seed initial data for a pristine user experience
const DEFAULT_DOCUMENTS: ArchiveItem[] = [
  {
    id: 'doc-1',
    nama: 'Surat Keputusan (SK) Standar Pelayanan Kepegawaian',
    url: 'https://www.bkn.go.id/',
    createdAt: '2026-05-10T08:00:00.000Z'
  },
  {
    id: 'doc-2',
    nama: 'SOP Pelaporan Kinerja Bulanan & Jam Kerja ASN',
    url: 'https://menpan.go.id/',
    createdAt: '2026-05-12T09:30:00.000Z'
  },
  {
    id: 'doc-3',
    nama: 'Panduan Teknis Pengajuan Cuti & Ijin Elektronik',
    url: 'https://siasn.bkn.go.id/',
    createdAt: '2026-05-15T14:15:00.000Z'
  }
];

export default function ArchiveTab() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal for Add
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPin, setNewPin] = useState('');
  const [addError, setAddError] = useState('');

  // Modal for Edit/Delete
  const [editingItem, setEditingItem] = useState<ArchiveItem | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editError, setEditError] = useState('');

  // Load from Firestore on mount
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'archives'), (snapshot) => {
      if (snapshot.empty) {
        // Seed initial documents to firestore if completely empty
        DEFAULT_DOCUMENTS.forEach(async (docItem) => {
          try {
            await setDoc(doc(db, 'archives', docItem.id), {
              nama: docItem.nama,
              url: docItem.url,
              createdAt: docItem.createdAt
            });
          } catch (e) {
            console.error("Gagal menyemai data awal arsip:", docItem.id, e);
          }
        });
      } else {
        const fetched: ArchiveItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          fetched.push({
            id: d.id,
            nama: data.nama || '',
            url: data.url || '',
            createdAt: data.createdAt || new Date().toISOString()
          });
        });
        // Sort by dates descending
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(fetched);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'archives');
    });

    return () => unsub();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newNama.trim() || !newUrl.trim()) {
      setAddError('Mohon isi nama arsip dan URL.');
      return;
    }

    if (newPin !== CORRECT_PIN) {
      setAddError('PIN Keamanan tidak valid.');
      return;
    }

    let urlToSave = newUrl.trim();
    if (!/^https?:\/\//i.test(urlToSave)) {
      urlToSave = 'https://' + urlToSave;
    }

    const docId = 'doc-' + Date.now();
    const newItem = {
      nama: newNama.trim(),
      url: urlToSave,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'archives', docId), newItem);
      
      // Reset & Close
      setNewNama('');
      setNewUrl('');
      setNewPin('');
      setIsAddOpen(false);
    } catch (error) {
      setAddError('Gagal menyimpan ke database. Coba lagi.');
      handleFirestoreError(error, OperationType.WRITE, 'archives/' + docId);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editingItem) return;

    if (!editNama.trim() || !editUrl.trim()) {
      setEditError('Mohon isi nama arsip dan URL.');
      return;
    }

    if (editPin !== CORRECT_PIN) {
      setEditError('PIN Keamanan tidak valid.');
      return;
    }

    let urlToSave = editUrl.trim();
    if (!/^https?:\/\//i.test(urlToSave)) {
      urlToSave = 'https://' + urlToSave;
    }

    try {
      await setDoc(doc(db, 'archives', editingItem.id), {
        nama: editNama.trim(),
        url: urlToSave,
        createdAt: editingItem.createdAt
      });
      closeEditModal();
    } catch (error) {
      setEditError('Gagal memperbarui database.');
      handleFirestoreError(error, OperationType.WRITE, 'archives/' + editingItem.id);
    }
  };

  const handleDelete = async () => {
    setEditError('');
    if (!editingItem) return;

    if (editPin !== CORRECT_PIN) {
      setEditError('PIN Keamanan diperlukan untuk menghapus.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'archives', editingItem.id));
      closeEditModal();
    } catch (error) {
      setEditError('Gagal menghapus dari database.');
      handleFirestoreError(error, OperationType.DELETE, 'archives/' + editingItem.id);
    }
  };

  const openEditModal = (item: ArchiveItem) => {
    setEditingItem(item);
    setEditNama(item.nama);
    setEditUrl(item.url);
    setEditPin('');
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditNama('');
    setEditUrl('');
    setEditPin('');
    setEditError('');
  };

  const filteredItems = items.filter(item => 
    item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up md:p-1">
      {/* Title Header Section inside Tab */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 block">
              <FolderOpen size={20} />
            </span>
            Katalog Data & Arsip Kepegawaian
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola dokumen eksternal, referensi peraturan, SOP, dan tautan sistem kepegawaian internal.
          </p>
        </div>

        <button
          onClick={() => {
            setAddError('');
            setIsAddOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow transition-all font-medium text-sm self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          Tambah Tautan Arsip
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama dokumen atau link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all placeholder:text-slate-400 text-slate-700"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium self-end md:self-auto uppercase tracking-wider">
          Total Koleksi: <span className="text-blue-600 font-bold text-sm">{filteredItems.length}</span> Arsip
        </div>
      </div>

      {/* Documents Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <FileText size={22} />
          </div>
          <h4 className="font-semibold text-slate-700">Tidak ada arsip ditemukan</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Hubungkan referensi link yang dapat diakses oleh seluruh pegawai.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <div 
              key={item.id}
              className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {/* Decorative accent top line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                <div className="flex justify-between items-start gap-3 mb-3">
                  <span className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <FileText size={18} />
                  </span>
                  
                  <button 
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit Tautan"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>

                <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors text-sm line-clamp-2 min-h-[40px] leading-relaxed">
                  {item.nama}
                </h3>
                
                <p className="text-xs text-slate-400 font-mono mt-1 break-all line-clamp-1">
                  {item.url}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium font-mono">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>

                <a 
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener referrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold group/link transition-colors"
                >
                  Buka Data
                  <ExternalLink size={12} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD ARSIP MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-50 text-blue-600">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="font-semibold text-slate-800 text-base">Tambah Tautan Dokumen</h3>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nama Arsip / Dokumen</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SK Standar Kepegawaian"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Link / URL Dokumen</label>
                <input
                  type="text"
                  required
                  placeholder="https://docs.google.com/... atau tautan lain"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">PIN Keamanan</label>
                  <span className="text-[10px] font-mono text-slate-400 italic">Petunjuk PIN: 2026</span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="4 digit PIN"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono tracking-widest text-center"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save size={16} />
                  Simpan Tautan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / DELETE MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-50 text-blue-600">
                  <Edit2 size={16} />
                </div>
                <h3 className="font-semibold text-slate-800 text-base">Edit / Hapus Tautan</h3>
              </div>
              <button 
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nama Arsip / Dokumen</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Dokumen"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Link / URL Dokumen</label>
                <input
                  type="text"
                  required
                  placeholder="URL Dokumen"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">PIN Keamanan Verifikasi</label>
                  <span className="text-[10px] font-mono text-slate-400 italic">Verifikasi: 2026</span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="Masukkan PIN verifikasi"
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono tracking-widest text-center"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-medium text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Hapus tautan ini"
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save size={16} />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
