export interface ArchiveItem {
  id: string;
  nama: string;
  url: string;
  createdAt: string;
}

export interface IjinRecord {
  nama: string;
  alasan: string;
  kategori: string;
  tanggal: string;
  jamKeluar: string;
  jamMasuk: string;
}

export interface DiklatRecord {
  nama: string;
  diklat: string;
  jp: number;
  row: string[]; // Keep raw values for display
}

export type TabType = 'archive' | 'monitoring' | 'data' | 'recap';
