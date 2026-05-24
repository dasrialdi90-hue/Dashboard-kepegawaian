import React, { useState } from 'react';
import Header from './components/Header';
import ArchiveTab from './components/ArchiveTab';
import MonitoringTab from './components/MonitoringTab';
import DataTab from './components/DataTab';
import RecapTab from './components/RecapTab';
import { TabType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('archive');

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-800">
      {/* Master Top Hub Navigation Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Primary Page Layout View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {activeTab === 'archive' && <ArchiveTab />}
        {activeTab === 'monitoring' && <MonitoringTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'recap' && <RecapTab />}
      </main>

      {/* Humble, Clean Corporate Footer Indicator */}
      <footer className="w-full bg-white border-t border-slate-200 py-5 px-4 text-center mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-slate-400 text-xs font-medium">
          <p>© 2026 Pojok Kepegawaian • Kementerian & Pemerintah Provinsi.</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] tracking-wide text-slate-450 uppercase">
              Security Encrypted & Database Connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
