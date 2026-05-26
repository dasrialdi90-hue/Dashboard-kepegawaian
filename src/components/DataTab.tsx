import React, { useState, useEffect, useMemo } from 'react';
import { parseCSV } from '../utils/csvParser';
import { 
  Award, 
  BookOpen, 
  Clock, 
  Users, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Info, 
  Calendar, 
  MapPin, 
  UserCheck, 
  RefreshCw,
  FileCheck,
  Plus,
  Trash2,
  Edit2,
  Save,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const DIKLAT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRqKLf4G97i9kkEY8yqdhUzVmJz6NWOFPPlO5zT9La5XdIiIXT-aI1WeEB2SsdbsvYv2FSNcOPWgYiR/pub?gid=0&single=true&output=csv';

const CORRECT_PIN = '2026';

// Premium fallback dummy data matching Indonesian civil service / kepegawaian training contexts
const FALLBACK_DIKLAT_HEADERS = ['Nama Pegawai', 'NIP', 'Nama Diklat/Pelatihan', 'Penyelenggara', 'Tanggal Mulai', 'Jam Pelajaran (JP)', 'No Sertifikat', 'Status'];

const FALLBACK_DIKLAT_ROWS = [
  ['Darmawan Santoso', '198804122015031002', 'Diklat Kepemimpinan Tingkat IV', 'Aparatur Negara Training Center', '2026-03-10', '40', 'CERT/2026/0491', 'Lulus'],
  ['Siti Rahmawati', '199108152018012005', 'Bimtek Evaluasi Jabatan ASN', 'Badan Kepegawaian Negara', '2026-04-12', '16', 'CERT/2026/0512', 'Lulus'],
  ['Budi Hartono', '198511212010031001', 'Pelatihan Teknis Tata Naskah Dinas', 'Sekretariat Daerah', '2026-02-15', '32', 'CERT/2026/0122', 'Lulus'],
  ['Lestari Handayani', '199301052019032008', 'Sosialisasi Sistem Informasi SIASN', 'BKN Kanreg II', '2026-05-02', '8', 'CERT/2026/0890', 'Lulus'],
  ['Andi Wijaya', '198906302014021003', 'Peningkatan Kompetensi Bidang Perencanaan', 'Kementerian Dalam Negeri', '2026-01-20', '24', 'CERT/2026/0045', 'Lulus'],
  ['Darmawan Santoso', '198804122015031002', 'Bimtek Manajemen Kinerja Pegawai', 'Badan Kepegawaian Negara', '2026-05-18', '24', 'CERT/2026/0912', 'Lulus'],
  ['Siti Rahmawati', '199108152018012005', 'Aplikasi Penilaian Kinerja E-Kinerja', 'BKN Pusat', '2026-05-20', '16', 'CERT/2026/0995', 'Lulus'],
  ['Rian Hidayat', '199512042021011002', 'Latihan Jabatan Fungsional Kepegawaian', 'Pusbangpeg ASN BKN', '2026-04-18', '80', 'CERT/2026/0710', 'Lulus'],
  ['Mega Utami', '199203142018012011', 'Pelayanan Prima (Service Excellence) ASN', 'LP3I Professional', '2026-03-22', '16', 'CERT/2026/0421', 'Lulus'],
  ['Farhan Nugraha', '199002152016021004', 'Analisis Jabatan dan Beban Kerja', 'Kementerian Keuangan', '2026-02-10', '40', 'CERT/2026/0101', 'Lulus'],
  ['Indah Permata', '199405102020012007', 'Diklat Pengelola Kepegawaian Tingkat Dasar', 'Badan Diklat Daerah', '2026-03-05', '32', 'CERT/2026/0302', 'Lulus'],
  ['Rudi Hermawan', '198709142012031005', 'Manajemen Portofolio Rencana Kebutuhan ASN', 'LAN RI', '2026-04-05', '24', 'CERT/2026/0510', 'Lulus']
];

interface DiklatDoc {
  id: string;
  nama: string;
  nip: string;
  diklat: string;
  penyelenggara: string;
  tanggal: string;
  jp: number;
  sertifikat: string;
  status: string;
  createdAt: string;
}

export default function DataTab() {
  const [items, setItems] = useState<DiklatDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshedTime, setRefreshedTime] = useState('');

  // Table Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Detail Modal index
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  // Form states for Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newNip, setNewNip] = useState('');
  const [newDiklat, setNewDiklat] = useState('');
  const [newPenyelenggara, setNewPenyelenggara] = useState('');
  const [newTanggal, setNewTanggal] = useState('');
  const [newJp, setNewJp] = useState('16');
  const [newSertifikat, setNewSertifikat] = useState('');
  const [newStatus, setNewStatus] = useState('Lulus');
  const [newPin, setNewPin] = useState('');

  // Form states for Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [editingDoc, setEditingDoc] = useState<DiklatDoc | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editDiklat, setEditDiklat] = useState('');
  const [editPenyelenggara, setEditPenyelenggara] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editJp, setEditJp] = useState('');
  const [editSertifikat, setEditSertifikat] = useState('');
  const [editStatus, setEditStatus] = useState('Lulus');
  const [editPin, setEditPin] = useState('');

  // Static columns to fit original UI layout
  const headers = FALLBACK_DIKLAT_HEADERS;
  const colIndexes = { name: 0, course: 2, jp: 5 };

  // Listen to Firestore diklats collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'diklats'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          setIsLoading(true);
          let rawDataRows = FALLBACK_DIKLAT_ROWS;
          try {
            const res = await fetch(DIKLAT_CSV_URL);
            if (res.ok) {
              const text = await res.text();
              const parsed = parseCSV(text);
              if (parsed.length >= 2) {
                rawDataRows = parsed.slice(1);
              }
            }
          } catch (e) {
            console.warn("CSV load failed for seeding. Utilizing fallback dataset.", e);
          }

          // Seed default documents
          rawDataRows.forEach(async (row, idx) => {
            const docId = 'diklat-' + idx + '-' + Date.now();
            await setDoc(doc(db, 'diklats', docId), {
              nama: row[0] || '',
              nip: row[1] || '',
              diklat: row[2] || '',
              penyelenggara: row[3] || '',
              tanggal: row[4] || '',
              jp: parseFloat(row[5]) || 0,
              sertifikat: row[6] || '',
              status: row[7] || 'Lulus',
              createdAt: new Date().toISOString()
            });
          });
        } catch (e) {
          console.error("Gagal menyemai database diklat awal:", e);
        } finally {
          setIsLoading(false);
        }
      } else {
        const fetched: DiklatDoc[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          fetched.push({
            id: d.id,
            nama: data.nama || '',
            nip: data.nip || '',
            diklat: data.diklat || '',
            penyelenggara: data.penyelenggara || '',
            tanggal: data.tanggal || '',
            jp: typeof data.jp === 'number' ? data.jp : parseFloat(data.jp) || 0,
            sertifikat: data.sertifikat || '',
            status: data.status || 'Lulus',
            createdAt: data.createdAt || new Date().toISOString()
          });
        });

        // Sorted by createdAt descending
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(fetched);
        setIsLoading(false);
        setRefreshedTime(new Date().toLocaleTimeString('id-ID'));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'diklats');
    });

    return () => unsub();
  }, []);

  // Filter dropdown lists: alphabetical options built dynamically
  const uniqueEmployees = useMemo(() => {
    const names = new Set<string>();
    items.forEach(item => {
      if (item.nama) names.add(item.nama);
    });
    return Array.from(names).sort();
  }, [items]);

  const uniqueCourses = useMemo(() => {
    const courses = new Set<string>();
    items.forEach(item => {
      if (item.diklat) courses.add(item.diklat);
    });
    return Array.from(courses).sort();
  }, [items]);

  // Overall database statistics
  const coreStats = useMemo(() => {
    const totalCertificates = items.length;
    let summedJP = 0;
    items.forEach(item => {
      summedJP += item.jp || 0;
    });

    const uniqueEmployeesCount = new Set(items.map(item => item.nama).filter(Boolean)).size;

    return {
      totalCertificates,
      summedJP,
      uniqueEmployeesCount
    };
  }, [items]);

  // Apply filters in pipeline
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedEmployeeName && item.nama !== selectedEmployeeName) return false;
      if (selectedCourseName && item.diklat !== selectedCourseName) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.nama.toLowerCase().includes(query);
        const matchesCourse = item.diklat.toLowerCase().includes(query);
        const matchesNip = item.nip.toLowerCase().includes(query);
        const matchesPenyelenggara = item.penyelenggara.toLowerCase().includes(query);
        const matchesSertifikat = item.sertifikat.toLowerCase().includes(query);

        if (!matchesName && !matchesCourse && !matchesNip && !matchesPenyelenggara && !matchesSertifikat) return false;
      }

      return true;
    });
  }, [items, selectedEmployeeName, selectedCourseName, searchQuery]);

  // Selected dynamic banner showing details on employee specifically
  const employeeSumStats = useMemo(() => {
    if (!selectedEmployeeName) return null;
    const records = items.filter(r => r.nama === selectedEmployeeName);
    
    let totalJP = 0;
    records.forEach(r => {
      totalJP += r.jp || 0;
    });

    return {
      name: selectedEmployeeName,
      count: records.length,
      jp: totalJP
    };
  }, [items, selectedEmployeeName]);

  // Pagination bounds
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const pageSliceItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const changePage = (change: number) => {
    setCurrentPage(prev => {
      const next = prev + change;
      if (next < 1) return 1;
      if (next > totalPages) return totalPages;
      return next;
    });
  };

  useEffect(() => {
    setCurrentPage(1);
    setActiveRowIndex(null);
  }, [selectedEmployeeName, selectedCourseName, searchQuery]);

  // Modal active details mapping
  const activeItem = useMemo(() => {
    if (activeRowIndex === null) return null;
    return pageSliceItems[activeRowIndex];
  }, [pageSliceItems, activeRowIndex]);

  // Resolves semantic icons for various dynamic fields
  const getFieldIcon = (header: string) => {
    const h = header.toLowerCase();
    if (/nama|pegawai|nip|peserta/i.test(h)) return <UserCheck size={18} className="text-blue-500" />;
    if (/diklat|program|pelatihan|kursus/i.test(h)) return <BookOpen size={18} className="text-emerald-500" />;
    if (/jp|jam|pembelajaran|durasi/i.test(h)) return <Clock size={18} className="text-purple-500" />;
    if (/tanggal|tgl|date|mulai|selesai/i.test(h)) return <Calendar size={18} className="text-indigo-500" />;
    if (/sertifikat|cert|no.*cert|nomor/i.test(h)) return <Award size={18} className="text-amber-500" />;
    if (/tempat|lokasi|penyelenggara|institusi/i.test(h)) return <MapPin size={18} className="text-rose-500" />;
    return <Info size={18} className="text-slate-400" />;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newNama.trim() || !newDiklat.trim()) {
      setAddError('Mohon isi nama pegawai dan nama diklat.');
      return;
    }

    if (newPin !== CORRECT_PIN) {
      setAddError('PIN Keamanan tidak valid.');
      return;
    }

    const docId = 'diklat-' + Date.now();
    const newItem = {
      nama: newNama.trim(),
      nip: newNip.trim(),
      diklat: newDiklat.trim(),
      penyelenggara: newPenyelenggara.trim(),
      tanggal: newTanggal.trim(),
      jp: parseFloat(newJp) || 0,
      sertifikat: newSertifikat.trim(),
      status: newStatus.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'diklats', docId), newItem);
      
      // Reset & Close
      setNewNama('');
      setNewNip('');
      setNewDiklat('');
      setNewPenyelenggara('');
      setNewTanggal('');
      setNewJp('16');
      setNewSertifikat('');
      setNewStatus('Lulus');
      setNewPin('');
      setIsAddOpen(false);
    } catch (error) {
      setAddError('Gagal menyimpan ke database. Coba lagi.');
      handleFirestoreError(error, OperationType.WRITE, 'diklats/' + docId);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editingDoc) return;

    if (!editNama.trim() || !editDiklat.trim()) {
      setEditError('Mohon isi nama pegawai dan nama diklat.');
      return;
    }

    if (editPin !== CORRECT_PIN) {
      setEditError('PIN Keamanan tidak valid.');
      return;
    }

    try {
      await setDoc(doc(db, 'diklats', editingDoc.id), {
        nama: editNama.trim(),
        nip: editNip.trim(),
        diklat: editDiklat.trim(),
        penyelenggara: editPenyelenggara.trim(),
        tanggal: editTanggal.trim(),
        jp: parseFloat(editJp) || 0,
        sertifikat: editSertifikat.trim(),
        status: editStatus.trim(),
        createdAt: editingDoc.createdAt
      });
      setIsEditOpen(false);
      setEditingDoc(null);
    } catch (error) {
      setEditError('Gagal memperbarui database.');
      handleFirestoreError(error, OperationType.WRITE, 'diklats/' + editingDoc.id);
    }
  };

  const handleDelete = async () => {
    setEditError('');
    if (!editingDoc) return;

    if (editPin !== CORRECT_PIN) {
      setEditError('PIN Keamanan diperlukan untuk menghapus.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'diklats', editingDoc.id));
      setIsEditOpen(false);
      setEditingDoc(null);
    } catch (error) {
      setEditError('Gagal menghapus dari database.');
      handleFirestoreError(error, OperationType.DELETE, 'diklats/' + editingDoc.id);
    }
  };

  const startEdit = () => {
    if (!activeItem) return;
    setEditingDoc(activeItem);
    setEditNama(activeItem.nama);
    setEditNip(activeItem.nip);
    setEditDiklat(activeItem.diklat);
    setEditPenyelenggara(activeItem.penyelenggara);
    setEditTanggal(activeItem.tanggal);
    setEditJp(String(activeItem.jp));
    setEditSertifikat(activeItem.sertifikat);
    setEditStatus(activeItem.status);
    setEditPin('');
    setEditError('');
    setActiveRowIndex(null); // Close detail drawer
    setIsEditOpen(true);
  };

  return (
    <div className="animate-fade-in-up md:p-1">
      {/* Header element */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 block">
              <BookOpen size={20} />
            </span>
            Katalog Data Diklat Pegawai
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Daftar sertifikasi kompetensi, pelatihan kejuruan, dan jam pelajaran (JP) dinas terakreditasi pegawai.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 self-start lg:self-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            {refreshedTime && (
              <span>Terakhir disinkron: <span className="font-mono text-slate-600 font-semibold">{refreshedTime} WIB</span></span>
            )}
            <span className="p-1 px-2.5 bg-emerald-50 text-emerald-600 rounded-lg font-bold flex items-center gap-1">
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              Database Aktif
            </span>
          </div>

          <button
            onClick={() => {
              setAddError('');
              setIsAddOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm hover:shadow transition-all font-medium text-sm cursor-pointer shadow-emerald-100"
          >
            <Plus size={16} />
            Tambah Data Diklat
          </button>
        </div>
      </div>

      {/* Stats row layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-blue-350 transition-colors">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Award size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sertifikat</span>
          </div>
          <p className="text-2xl font-black text-slate-800 font-mono">
            {isLoading ? '...' : coreStats.totalCertificates}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-purple-350 transition-colors">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Clock size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Akumulasi JP</span>
          </div>
          <p className="text-2xl font-black text-slate-800 font-mono">
            {isLoading ? '...' : coreStats.summedJP.toFixed(1)} <span className="text-xs font-semibold text-slate-400">JP</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-amber-350 transition-colors">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Users size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pegawai Terdaftar</span>
          </div>
          <p className="text-2xl font-black text-slate-800 font-mono">
            {isLoading ? '...' : coreStats.uniqueEmployeesCount}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:border-emerald-355 transition-colors">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Filter size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hasil Pencarian</span>
          </div>
          <p className="text-2xl font-black text-emerald-800 font-mono">
            {isLoading ? '...' : totalItems}
          </p>
        </div>
      </div>

      {/* Interactive table filters block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-3xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Filter size={14} className="text-emerald-600" />
          Filter & Cari Kegiatan Diklat
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pencarian Umum</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama pegawai, NIP, diklat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Saring Nama Pegawai</label>
            <select
              value={selectedEmployeeName}
              onChange={(e) => setSelectedEmployeeName(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
            >
              <option value="">Semua Pegawai</option>
              {uniqueEmployees.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Target Kursus / Diklat</label>
            <select
              value={selectedCourseName}
              onChange={(e) => setSelectedCourseName(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
            >
              <option value="">Semua Kursus/Diklat</option>
              {uniqueCourses.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filtered Summary Target card */}
      {employeeSumStats && (
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 mb-6 shadow-3xs animate-fade-in-up">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-3xs">
                <UserCheck size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Informasi Pegawai Terpilih</p>
                <h4 className="font-bold text-slate-800 text-base">{employeeSumStats.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menyelesaikan <span className="font-bold text-emerald-700 font-mono text-sm">{employeeSumStats.count}</span> sertifikat pendidikan.
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-1 bg-white border border-emerald-150 px-4 py-2 rounded-2xl shadow-3xs">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Akumulasi Jam:</span>
              <span className="text-xl font-black text-emerald-600 font-mono">{employeeSumStats.jp.toFixed(1)}</span>
              <span className="text-xs text-slate-400 font-semibold uppercase font-mono">JP</span>
            </div>
          </div>
        </div>
      )}

      {/* Main spreadsheet rendering table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">No</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Pegawai</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">NIP</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Pelatihan/Diklat</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Penyelenggara</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Durasi (JP)</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">No Sertifikat</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 divide-y-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400 text-xs">
                    Sinkronisasi database diklat kepegawaian...
                  </td>
                </tr>
              ) : pageSliceItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400 text-xs">
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-350">
                      <FileCheck size={18} />
                    </div>
                    Tidak terdapat data diklat terdaftar yang memenuhi kriteria pencarian.
                  </td>
                </tr>
              ) : (
                pageSliceItems.map((item, rIdx) => {
                  const absoluteIndex = (currentPage - 1) * itemsPerPage + rIdx + 1;
                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setActiveRowIndex(rIdx)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                      title="Klik untuk tampilkan informasi lengkap"
                    >
                      <td className="px-5 py-4 text-xs font-semibold text-slate-400 font-mono">
                        {absoluteIndex}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        {item.nama}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-650 font-mono">
                        {item.nip || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-655 truncate max-w-[200px]" title={item.diklat}>
                        {item.diklat}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-650 truncate max-w-[150px]" title={item.penyelenggara}>
                        {item.penyelenggara || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-650 font-mono">
                        {item.tanggal || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-center font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-700 font-black border border-slate-200">
                          {item.jp}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-650 truncate max-w-[150px]" title={item.sertifikat}>
                        {item.sertifikat || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-650">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${
                          item.status.toLowerCase().includes('lulus') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-750 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Local Pagination Bar controls */}
        <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 font-medium font-mono text-center md:text-left">
            Menampilkan <span className="text-emerald-600 font-bold">{filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> sampai{' '}
            <span className="text-emerald-600 font-bold">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> dari{' '}
            <span className="text-emerald-600 font-bold">{filteredItems.length}</span> data sertifikasi
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className="p-1 px-3 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-105 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft size={14} />
              Sebelumnya
            </button>
            <span className="text-xs font-semibold text-slate-600 px-3 py-1 bg-white border border-slate-200 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={currentPage >= totalPages}
              className="p-1 px-3 bg-white border border-slate-200 rounded-xl text-xs hover:bg-slate-105 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              Berikutnya
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ADD DIKLAT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up my-8">
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="font-semibold text-slate-800 text-base">Tambah Data Diklat</h3>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Pegawai</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Darmawan Santoso"
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">NIP Pegawai</label>
                  <input
                    type="text"
                    placeholder="Contoh: 198804122..."
                    value={newNip}
                    onChange={(e) => setNewNip(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Pelatihan / Diklat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bimtek Manajemen Kinerja Pegawai"
                  value={newDiklat}
                  onChange={(e) => setNewDiklat(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Penyelenggara</label>
                <input
                  type="text"
                  placeholder="Contoh: Badan Kepegawaian Negara"
                  value={newPenyelenggara}
                  onChange={(e) => setNewPenyelenggara(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Durasi / Jam Pelajaran (JP)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 16"
                    value={newJp}
                    onChange={(e) => setNewJp(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nomor Sertifikat</label>
                  <input
                    type="text"
                    placeholder="Contoh: CERT/2026/0995"
                    value={newSertifikat}
                    onChange={(e) => setNewSertifikat(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition cursor-pointer text-slate-705"
                  >
                    <option value="Lulus">Lulus</option>
                    <option value="Proses">Proses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">PIN Keamanan</label>
                  <span className="text-[10px] font-mono text-slate-405 italic">PIN Keamanan: 2026</span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="Masukkan 4 digit PIN"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition font-mono tracking-widest text-center"
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
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-50"
                >
                  <Save size={16} />
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DIKLAT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up my-8">
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-50 text-blue-600">
                  <Edit2 size={16} />
                </div>
                <h3 className="font-semibold text-slate-800 text-base">Edit / Hapus Data Diklat</h3>
              </div>
              <button 
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingDoc(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-150 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Pegawai</label>
                  <input
                    type="text"
                    required
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">NIP Pegawai</label>
                  <input
                    type="text"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Pelatihan / Diklat</label>
                <input
                  type="text"
                  required
                  value={editDiklat}
                  onChange={(e) => setEditDiklat(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Penyelenggara</label>
                <input
                  type="text"
                  value={editPenyelenggara}
                  onChange={(e) => setEditPenyelenggara(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Durasi / Jam Pelajaran (JP)</label>
                  <input
                    type="number"
                    min="0"
                    value={editJp}
                    onChange={(e) => setEditJp(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nomor Sertifikat</label>
                  <input
                    type="text"
                    value={editSertifikat}
                    onChange={(e) => setEditSertifikat(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition cursor-pointer"
                  >
                    <option value="Lulus">Lulus</option>
                    <option value="Proses">Proses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">PIN Keamanan Verifikasi</label>
                  <span className="text-[10px] font-mono text-slate-400 italic">Verifikasi: 2206 atau 2026</span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="Masukkan PIN verifikasi"
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none transition font-mono tracking-widest text-center animate-pulse"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-medium text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditingDoc(null);
                    }}
                    className="flex-1 px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-50"
                  >
                    <Save size={16} />
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / POPUP MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-150 overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Detail Lengkap Kegiatan Diklat</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Informasi Berkas Terdaftar</p>
              </div>
              <button 
                onClick={() => setActiveRowIndex(null)}
                className="text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-150 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('Nama Pegawai')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Pegawai</p>
                  <p className="text-sm font-semibold text-slate-700 leading-normal break-words">{activeItem.nama}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('NIP')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIP Pegawai</p>
                  <p className="text-sm font-semibold text-slate-705 leading-normal break-words">{activeItem.nip || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('Nama Diklat/Pelatihan')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Pelatihan/Diklat</p>
                  <p className="text-sm font-semibold text-slate-700 leading-normal break-words">{activeItem.diklat}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('Penyelenggara')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Penyelenggara</p>
                  <p className="text-sm font-semibold text-slate-700 leading-normal break-words">{activeItem.penyelenggara || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('Tanggal Mulai')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Mulai</p>
                  <p className="text-sm font-semibold text-slate-700 leading-normal break-words">{activeItem.tanggal || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('Jam Pelajaran')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jam Pelajaran (JP)</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-black text-slate-850 text-base font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-150">{activeItem.jp}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">JP</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('No Sertifikat')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">No Sertifikat</p>
                  <p className="text-sm font-semibold text-slate-700 leading-normal break-words">{activeItem.sertifikat || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-0 last:pb-0 font-sans">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {getFieldIcon('Status')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Keaktifan</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${
                    activeItem.status.toLowerCase().includes('lulus') ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-amber-50 text-amber-700 border-amber-250'
                  }`}>{activeItem.status}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex justify-between items-center">
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition border border-slate-200"
              >
                <Edit2 size={12} />
                Edit / Hapus Data
              </button>

              <button
                onClick={() => setActiveRowIndex(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 border border-slate-850 text-white font-medium text-xs rounded-xl shadow-xs cursor-pointer transition"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
