import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  Eye,
  ArrowUpDown, 
  Building2, 
  PlusCircle, 
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  X,
  Sparkles
} from 'lucide-react';
import { EBiddingProject, JobType } from '../types';
import { formatBaht, formatPercent, formatNumber } from '../utils/calculator';
import { SHEETS_HEADERS, projectToSheetRow } from '../utils/googleSheets';
import { ProjectDetailModal } from './ProjectDetailModal';

interface ProjectTableProps {
  projects: EBiddingProject[];
  onAddNew: () => void;
  onEdit: (project: EBiddingProject) => void;
  onDelete: (id: string) => void;
  onImportCsv: (imported: EBiddingProject[]) => void;
  onNavigateToSheets: () => void;
  onOpenSimulator?: (project: EBiddingProject) => void;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onAddNew,
  onEdit,
  onDelete,
  onImportCsv,
  onNavigateToSheets,
  onOpenSimulator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof EBiddingProject>('fiscalYear');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<EBiddingProject | null>(null);
  const [detailProject, setDetailProject] = useState<EBiddingProject | null>(null);

  // Distinct filters
  const fiscalYears = Array.from(new Set<number>(projects.map((p) => p.fiscalYear))).sort((a: number, b: number) => b - a);
  const jobTypes = Array.from(new Set<JobType>(projects.map((p) => p.jobType)));

  // Filter & Search Logic
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.projectNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.winnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesJobType = selectedJobType === 'all' || p.jobType === selectedJobType;
      const matchesYear = selectedYear === 'all' || String(p.fiscalYear) === selectedYear;

      return matchesSearch && matchesJobType && matchesYear;
    });
  }, [projects, searchQuery, selectedJobType, selectedYear]);

  // Sorting Logic
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortField, sortAsc]);

  const handleSort = (field: keyof EBiddingProject) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headerRow = SHEETS_HEADERS.join(',');
    const rows = sortedProjects.map((p) => {
      return [
        `"${p.projectNo}"`,
        p.fiscalYear,
        `"${p.agencyName}"`,
        `"${p.projectName.replace(/"/g, '""')}"`,
        `"${p.jobType}"`,
        p.medianPrice,
        p.budgetPrice,
        p.winningPrice,
        `"${p.winnerName.replace(/"/g, '""')}"`,
        p.diffFromMedian,
        `"${p.diffFromMedianPercent}%"`,
        p.diffFromBudget,
        `"${p.diffFromBudgetPercent}%"`,
        `"${p.winningToMedianPercent}%"`,
        `"${p.winningToBudgetPercent}%"`,
        p.totalWorkers,
        p.supervisors,
        p.workerStaff,
        p.durationMonths,
        `"${p.location}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
        `"${p.createdAt}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...rows].join('\n'); // UTF-8 BOM for Excel Thai support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `e-bidding-procurement-data-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) return;

        const newItems: EBiddingProject[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 7) {
            const medianPrice = Number(cols[5]) || 0;
            const budgetPrice = Number(cols[6]) || medianPrice;
            const winningPrice = Number(cols[7]) || 0;
            const totalWorkers = Number(cols[15]) || 10;
            const supervisors = Number(cols[16]) || 1;

            const safeMedian = medianPrice || 1;
            const safeBudget = budgetPrice || 1;
            const diffFromMedian = medianPrice - winningPrice;
            const diffFromMedianPercent = Number(((diffFromMedian / safeMedian) * 100).toFixed(2));
            const diffFromBudget = budgetPrice - winningPrice;
            const diffFromBudgetPercent = Number(((diffFromBudget / safeBudget) * 100).toFixed(2));

            newItems.push({
              id: `csv-${Date.now()}-${i}`,
              projectNo: cols[0] || `68${Math.floor(100000000 + Math.random() * 900000000)}`,
              fiscalYear: Number(cols[1]) || 2568,
              agencyName: cols[2] || 'หน่วยงานภาครัฐ',
              projectName: cols[3] || 'โครงการจ้างเหมาบริการ',
              jobType: (cols[4] as JobType) || 'จ้างเหมาบริการทำความสะอาดอาคาร',
              medianPrice,
              budgetPrice,
              winningPrice,
              winnerName: cols[8] || 'ไม่ระบุ',
              diffFromMedian,
              diffFromMedianPercent,
              diffFromBudget,
              diffFromBudgetPercent,
              winningToMedianPercent: Number(((winningPrice / safeMedian) * 100).toFixed(2)),
              winningToBudgetPercent: Number(((winningPrice / safeBudget) * 100).toFixed(2)),
              totalWorkers,
              supervisors,
              workerStaff: Math.max(0, totalWorkers - supervisors),
              durationMonths: Number(cols[18]) || 12,
              location: cols[19] || 'กรุงเทพมหานคร',
              notes: cols[20] || '',
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (newItems.length > 0) {
          onImportCsv(newItems);
          alert(`นำเข้าข้อมูลสำเร็จ ${newItems.length} โครงการ`);
        }
      } catch (err: any) {
        alert(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>ฐานข้อมูลโครงการจัดซื้อจัดจ้าง e-Bidding</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                {sortedProjects.length} จาก {projects.length} รายการ
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              ตารางบันทึกราคากลาง งบประมาณ ราคาชนะ ผลต่าง และโครงสร้างกำลังพล (22 คอลัมน์)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAddNew}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer tracking-wider uppercase"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ เพิ่มโครงการ</span>
            </button>

            <button
              onClick={onNavigateToSheets}
              className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheets Sync</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <label className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่โครงการ, ชื่อหน่วยงาน, ผู้ชนะ, ชื่อสัญญา..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>

          {/* Job Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedJobType}
              onChange={(e) => setSelectedJobType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
            >
              <option value="all">ทุกประเภทงาน ({projects.length})</option>
              {jobTypes.map((jt) => (
                <option key={jt} value={jt}>{jt}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
            >
              <option value="all">ทุกปีงบประมาณ</option>
              {fiscalYears.map((yr) => (
                <option key={yr} value={String(yr)}>ปี {yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 cursor-pointer hover:text-blue-600" onClick={() => handleSort('fiscalYear')}>
                  <div className="flex items-center gap-1">
                    <span>ปีงบ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5 cursor-pointer hover:text-blue-600" onClick={() => handleSort('projectNo')}>
                  <div className="flex items-center gap-1">
                    <span>เลขที่โครงการ / หน่วยงาน</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5">ประเภทงาน</th>
                <th className="px-3 py-2.5 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('medianPrice')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>ราคากลาง (฿)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('budgetPrice')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>ราคางบประมาณ (฿)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right cursor-pointer hover:text-blue-700 text-blue-600" onClick={() => handleSort('winningPrice')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>ราคาที่ชนะ (฿)</span>
                    <ArrowUpDown className="w-3 h-3 text-blue-500" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('diffFromMedianPercent')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>ผลต่างราคากลาง (%)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('diffFromBudgetPercent')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>ผลต่างงบ (%)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">คนงาน/หัวหน้า</th>
                <th className="px-3 py-2.5">ผู้ชนะการประมูล</th>
                <th className="px-3 py-2.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    ไม่พบข้อมูลโครงการที่ตรงกับเงื่อนไขค้นหา
                  </td>
                </tr>
              ) : (
                sortedProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Fiscal Year */}
                    <td className="px-3 py-2.5 font-bold text-blue-600 font-mono">{p.fiscalYear}</td>

                    {/* Project No & Agency & Name */}
                    <td className="px-3 py-2.5 max-w-xs truncate">
                      <div className="font-semibold text-slate-900 truncate">{p.agencyName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{p.projectName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.projectNo}</div>
                    </td>

                    {/* Job Type & Work Schedule */}
                    <td className="px-3 py-2.5 space-y-1">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 border border-slate-200 text-slate-700">
                          {p.jobType.replace('จ้างเหมาบริการ', '')}
                        </span>
                      </div>
                      {p.workingDaysPerMonth && (
                        <div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            p.workScheduleType === 'everyday_airport' || p.workingDaysPerMonth === 30
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : p.workingDaysPerMonth === 26
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {p.workScheduleType === 'everyday_airport' ? '✈️ 30 วัน 24/7' : `${p.workingDaysPerMonth} วัน/ด.`}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Median Price */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 font-mono">
                      {formatBaht(p.medianPrice)}
                    </td>

                    {/* Budget Price */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 font-mono">
                      {formatBaht(p.budgetPrice)}
                    </td>

                    {/* Winning Price */}
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-blue-600 font-mono">
                      {formatBaht(p.winningPrice)}
                    </td>

                    {/* Diff from Median % */}
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <div className="font-bold text-blue-600">
                        -{p.diffFromMedianPercent}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        (-{formatBaht(p.diffFromMedian)})
                      </div>
                    </td>

                    {/* Diff from Budget % */}
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <div className="font-bold text-emerald-600">
                        -{p.diffFromBudgetPercent}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        (-{formatBaht(p.diffFromBudget)})
                      </div>
                    </td>

                    {/* Workers & Supervisors */}
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      <div className="font-semibold text-slate-800">{p.totalWorkers} คน</div>
                      <div className="text-[10px] text-slate-400">หัวหน้า {p.supervisors} คน</div>
                    </td>

                    {/* Winner Name */}
                    <td className="px-3 py-2.5 max-w-xs truncate">
                      <div className="text-slate-800 font-medium truncate">{p.winnerName}</div>
                      {p.notes && (
                        <div className="text-[10px] text-slate-400 truncate" title={p.notes}>
                          💡 {p.notes}
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setDetailProject(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="ดูรายละเอียดโครงการ (สูตรคำนวณมาตรฐาน)"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => onEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProjectToDelete(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="ลบโครงการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Detail Modal (Matching user real-world procurement sheet) */}
      <ProjectDetailModal
        isOpen={!!detailProject}
        onClose={() => setDetailProject(null)}
        project={detailProject}
        onOpenSimulator={onOpenSimulator}
      />

      {/* In-App Deletion Confirmation Modal (Safe for iFrame & Mobile) */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-rose-50/80 border-b border-rose-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 border border-rose-200 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">ยืนยันการลบโครงการ</h3>
                  <p className="text-[11px] text-rose-700">การดำเนินการนี้จะลบรายการออกจากฐานข้อมูล</p>
                </div>
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">ชื่อโครงการ:</span>
                  <p className="font-bold text-slate-900 line-clamp-2 mt-0.5">{projectToDelete.projectName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                  <div>
                    <span className="text-slate-400 text-[10px]">หน่วยงาน:</span>
                    <p className="font-semibold text-slate-800 truncate">{projectToDelete.agencyName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">ปีงบประมาณ / ประเภท:</span>
                    <p className="font-semibold text-slate-800">{projectToDelete.fiscalYear} ({projectToDelete.jobType.replace('จ้างเหมาบริการ', '')})</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">ราคากลาง:</span>
                    <p className="font-mono text-slate-800 font-bold">{formatBaht(projectToDelete.medianPrice)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">ราคาชนะ:</span>
                    <p className="font-mono text-blue-600 font-bold">{formatBaht(projectToDelete.winningPrice)}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบโครงการนี้? ข้อมูลจะถูกนำออกจากตารางสถิติและการวิเคราะห์ต้นทุน
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer shadow-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบโครงการ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
