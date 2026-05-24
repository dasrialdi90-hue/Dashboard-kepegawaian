import React from 'react';
import { TabType } from '../types';
import { 
  GraduationCap, 
  Archive, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  User, 
  Shield 
} from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const tabs = [
    { id: 'archive' as TabType, label: 'Data & Arsip', icon: <Archive size={16} /> },
    { id: 'monitoring' as TabType, label: 'Monitoring Ijin', icon: <Clock size={16} /> },
    { id: 'data' as TabType, label: 'Data Diklat', icon: <BookOpen size={16} /> },
    { id: 'recap' as TabType, label: 'Rekap JP', icon: <TrendingUp size={16} /> }
  ];

  return (
    <header className="w-full bg-white border-b border-slate-200 pt-6 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Dynamic HR Corporate Styling */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                Pojok Kepegawaian
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Sistem Informasi & Hub Pemantau Hubungan Dinas Aparatur
              </p>
            </div>
          </div>

          {/* Admin Profile User Credentials */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 p-2 px-3.5 rounded-2xl">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <User size={16} />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-slate-800 text-xs font-bold font-sans">
                  Staf HR / Admin
                </span>
                <Shield size={10} className="text-blue-500 fill-blue-50" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-none truncate max-w-[170px] mt-0.5">
                dasrialdi90@atim.ac.id
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu Layout */}
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none select-none">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4.5 py-3 border-b-2 font-semibold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
