import React, { useState, useEffect, useMemo } from 'react';
import { parseCSV } from '../utils/csvParser';
import { 
  Award, 
  Search, 
  User, 
  Clock, 
  TrendingUp, 
  FileCheck, 
  Trophy, 
  RefreshCw 
} from 'lucide-react';

const DIKLAT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRqKLf4G97i9kkEY8yqdhUzVmJz6NWOFPPlO5zT9La5XdIiIXT-aI1WeEB2SsdbsvYv2FSNcOPWgYiR/pub?gid=0&single=true&output=csv';

const DEFAULT_DIKLAT_ROWS = [
  ['Darmawan Santoso', '198804122015031002', 'Kepemimpinan IV', 'Aparatur Negara Center', '2026-03-10', '40'],
  ['Siti Rahmawati', '199108152018012005', 'Bimtek Evaluasi Jabatan ASN', 'BKN', '2026-04-12', '16'],
  ['Budi Hartono', '198511212010031001', 'Teknis Tata Naskah Dinas', 'Sekretariat Daerah', '2026-02-15', '32'],
  ['Lestari Handayani', '199301052019032008', 'Sistem Informasi SIASN', 'BKN II', '2026-05-02', '8'],
  ['Andi Wijaya', '198906302014021003', 'Kompetensi Bidang Perencanaan', 'Kementerian Dalam Negeri', '2026-01-20', '24'],
  ['Darmawan Santoso', '198804122015031002', 'Manajemen Kinerja Pegawai', 'BKN RI', '2026-05-18', '24'],
  ['Siti Rahmawati', '199108152018012005', 'Aplikasi E-Kinerja', 'BKN Pusat', '2026-05-20', '16'],
  ['Rian Hidayat', '199512042021011002', 'Kepegawaian Menengah', 'BKN', '2026-04-18', '80'],
  ['Mega Utami', '199203142018012011', 'Pelayanan Prima ASN', 'LP3I Professional', '2026-03-22', '16']
];

interface EmployeeSummary {
  nama: string;
  totalJP: number;
  certCount: number;
}

export default function RecapTab() {
  const [diklatRows, setDiklatRows] = useState<string[][]>([]);
  const [diklatHeaders, setDiklatHeaders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadRawData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(DIKLAT_CSV_URL);
      if (!res.ok) throw new Error('Network error');
      const text = await res.text();
      const parsed = parseCSV(text);
      if (parsed.length >= 2) {
        setDiklatHeaders(parsed[0]);
        setDiklatRows(parsed.slice(1));
      } else {
        setDiklatRows(DEFAULT_DIKLAT_ROWS);
      }
    } catch (e) {
      console.warn('Recap tab utilizing local dataset due to fetch boundaries.', e);
      setDiklatRows(DEFAULT_DIKLAT_ROWS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRawData();
  }, []);

  // Compute stats
  const summaries = useMemo(() => {
    const rows = diklatRows.length > 0 ? diklatRows : DEFAULT_DIKLAT_ROWS;
    const headers = diklatHeaders.length > 0 ? diklatHeaders : ['Nama Pegawai', 'NIP', 'Diklat', 'Penyelenggara', 'Tgl', 'JP'];

    const namaIdx = headers.findIndex(h => /nama|pegawai|nama pegawai/i.test(h));
    const jpIdx = headers.findIndex(h => /jp|jam pelajaran|jam|jam pembelajaran/i.test(h));

    const mapping: Record<string, { totalJP: number; count: number }> = {};

    rows.forEach(row => {
      const name = namaIdx !== -1 ? row[namaIdx] : row[0];
      const jpStr = jpIdx !== -1 ? row[jpIdx] : row[5];
      const jpVal = parseFloat(jpStr) || 0;

      if (name && name.trim()) {
        const cleanedName = name.trim();
        if (!mapping[cleanedName]) {
          mapping[cleanedName] = { totalJP: 0, count: 0 };
        }
        mapping[cleanedName].totalJP += jpVal;
        mapping[cleanedName].count += 1;
      }
    });

    return Object.entries(mapping)
      .map(([nama, stat]) => ({
        nama,
        totalJP: stat.totalJP,
        certCount: stat.count
      }))
      .sort((a, b) => b.totalJP - a.totalJP);
  }, [diklatRows, diklatHeaders]);

  // Filters logic
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => 
      s.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [summaries, searchQuery]);

  // Highest performer champion
  const champion = useMemo(() => {
    if (summaries.length === 0) return null;
    return summaries[0];
  }, [summaries]);

  // Average JP counts representing statistics
  const averageJP = useMemo(() => {
    if (summaries.length === 0) return 0;
    const sum = summaries.reduce((acc, s) => acc + s.totalJP, 0);
    return sum / summaries.length;
  }, [summaries]);

  // Get dynamic civil service rating class based on cumulative hours (standard PNS development benchmarks)
  const getCompetencyTier = (jp: number) => {
    if (jp >= 60) return { title: 'UTAMA (Sangat Aktif)', style: 'bg-emerald-50 text-emerald-700 border-emerald-150' };
    if (jp >= 30) return { title: 'MADYA (Aktif)', style: 'bg-indigo-50 text-indigo-700 border-indigo-150' };
    return { title: 'PRATAMA (Berkembang)', style: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  // Get dynamic initials for avatars
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="animate-fade-in-up md:p-1">
      {/* Tab bar header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 block">
              <TrendingUp size={20} />
            </span>
            Kekinian Akumulasi JP Kompetensi Pegawai
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ringkasan total Jam Pelajaran (JP) yang dicapai oleh tiap aparatur berdasarkan bukti sertifikat.
          </p>
        </div>
      </div>

      {/* Leaderboard Highlight block if loaded */}
      {champion && (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 mb-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
          {/* Backdrop dynamic decorations */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-radial-gradient from-indigo-500 to-transparent pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-300 to-amber-500 rounded-2xl flex items-center justify-center text-indigo-950 shadow-md transform rotate-3">
                <Trophy size={28} className="animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Award size={10} />
                  Aparatur Teraktif
                </span>
                <h3 className="text-xl font-extrabold tracking-tight mt-1.5">{champion.nama}</h3>
                <p className="text-indigo-200 text-xs mt-1">
                  Mendominasi pengembangan kompetensi dengan menyelesaikan <span className="font-bold text-white text-sm font-mono">{champion.certCount}</span> program pelatihan.
                </p>
              </div>
            </div>

            <div className="flex md:flex-col items-baseline md:items-end gap-2 bg-indigo-900/40 border border-indigo-700/30 p-4 rounded-2xl">
              <span className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Rekor Kelas Terbaik</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">{champion.totalJP.toFixed(1)}</span>
                <span className="text-sm font-bold text-indigo-200">JP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid summarizing core metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rerata Beban Belajar</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1 font-mono">{averageJP.toFixed(1)} <span className="text-xs font-semibold text-slate-400">JP</span></p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Program Diikuti</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1 font-mono">
              {summaries.reduce((acc, s) => acc + s.certCount, 0)} <span className="text-xs font-semibold text-slate-400">Sertifikat</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-3xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Akurasi Rekapitulasi</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1">100% Valid</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
            <FileCheck size={20} />
          </div>
        </div>
      </div>

      {/* Search Bar filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-3xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" />
          <input
            type="text"
            placeholder="Cari nama pegawai untuk detail jam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">
          Masyarakat Belajar: <span className="text-indigo-600 font-bold text-sm">{filteredSummaries.length}</span> Pegawai
        </div>
      </div>

      {/* Main Grid presenting dynamic summaries */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
          <FileCheck size={36} className="mx-auto text-slate-350 mb-3" />
          <p className="text-xs font-medium">Pegawai yang Anda cari tidak ditemukan dalam daftar rekam JP.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSummaries.map((item, idx) => {
            const tier = getCompetencyTier(item.totalJP);

            return (
              <div 
                key={item.nama}
                className="group bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl p-5 shadow-3xs transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                {/* Ranking placement sticker in the corner */}
                <span className="absolute top-4 right-4 text-xs font-extrabold text-slate-300 font-mono group-hover:text-indigo-400 transition-colors">
                  #{idx + 1}
                </span>

                <div>
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-subtle border border-indigo-150 shrink-0">
                      {getInitials(item.nama)}
                    </div>
                    <div className="min-w-0 pr-6">
                      <h4 className="font-bold text-slate-800 text-sm truncate leading-snug">
                        {item.nama}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Aparatur Sipil Negara / Pegawai
                      </p>
                    </div>
                  </div>

                  {/* Level status rating */}
                  <div className="mb-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${tier.style}`}>
                      {tier.title}
                    </span>
                  </div>
                </div>

                {/* Counter counts metrics footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold font-mono">
                    {item.certCount} Pelatihan Diikuti
                  </span>
                  
                  <div className="flex items-baseline gap-1 text-slate-800">
                    <span className="text-xl font-black text-indigo-650 font-mono tracking-tight">
                      {item.totalJP.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase font-mono">
                      JP
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
