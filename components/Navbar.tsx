import React from 'react';
import { 
  BarChart3, 
  Table, 
  Calculator, 
  FileSpreadsheet, 
  Sparkles, 
  PlusCircle, 
  Building2,
  TrendingDown
} from 'lucide-react';

export type NavTab = 'dashboard' | 'projects' | 'simulator' | 'sheets';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenNewProjectModal: () => void;
  totalProjects: number;
  isSheetsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewProjectModal,
  totalProjects,
  isSheetsConnected,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'แดชบอร์ดสถิติ e-Bidding',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'projects' as NavTab,
      label: 'ฐานข้อมูลโครงการ',
      icon: Table,
      badge: totalProjects,
    },
    {
      id: 'simulator' as NavTab,
      label: 'คำนวณต้นทุน & จำลองราคาเสนอ',
      icon: Calculator,
      badge: 'แนะนำ',
    },
    {
      id: 'sheets' as NavTab,
      label: 'Google Sheets & Apps Script',
      icon: FileSpreadsheet,
      badge: isSheetsConnected ? 'เชื่อมต่อแล้ว' : 'Sync',
    },
  ];

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      {/* Top Corporate Strip */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Brand Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm tracking-wider">
                EB
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">E-BIDDING PRO</span>
                <span className="hidden sm:inline-block text-[11px] text-blue-400 font-medium tracking-normal">
                  | Decision Support System (Thailand)
                </span>
              </div>
            </div>

            {/* Right Status & Actions */}
            <div className="flex items-center space-x-3 text-xs">
              {/* Google Sheets Connection Pill */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono">
                <span className="text-slate-400">GSHEET:</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isSheetsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className={isSheetsConnected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                    {isSheetsConnected ? 'CONNECTED' : 'LOCAL_STORAGE'}
                  </span>
                </div>
              </div>

              {/* Total records count */}
              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-[11px] font-mono font-medium border border-slate-700">
                {totalProjects} PROJECTS
              </span>

              {/* Add Project Button */}
              <button
                onClick={onOpenNewProjectModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded shadow-sm transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ เพิ่มโครงการ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-blue-800 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
