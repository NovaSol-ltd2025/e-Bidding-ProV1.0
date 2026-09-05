import React, { useState } from 'react';
import { 
  History, 
  Search, 
  RotateCcw, 
  Copy, 
  Trash2, 
  ExternalLink, 
  FileSpreadsheet, 
  TrendingDown, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  Calendar,
  AlertTriangle,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';
import { CostSimulationRecord, EBiddingProject, JobType } from '../types';
import { formatBaht, formatPercent, formatNumber } from '../utils/calculator';

interface SavedScenariosManagerProps {
  simulations: CostSimulationRecord[];
  activeScenarioId: string | null;
  onLoadScenario: (scenario: CostSimulationRecord) => void;
  onDeleteScenario: (id: string) => void;
  onDuplicateScenario: (scenario: CostSimulationRecord) => void;
  onPushToSheet: (scenario: CostSimulationRecord) => Promise<boolean>;
  onConvertToProject?: (scenario: CostSimulationRecord) => void;
  spreadsheetUrl: string | null;
}

export const SavedScenariosManager: React.FC<SavedScenariosManagerProps> = ({
  simulations,
  activeScenarioId,
  onLoadScenario,
  onDeleteScenario,
  onDuplicateScenario,
  onPushToSheet,
  onConvertToProject,
  spreadsheetUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [deletingScenario, setDeletingScenario] = useState<CostSimulationRecord | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncSuccessId, setSyncSuccessId] = useState<string | null>(null);

  // Filter scenarios
  const filteredSimulations = simulations.filter((s) => {
    const matchesSearch = 
      s.scenarioName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.competitorStrategyNotes && s.competitorStrategyNotes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.competitorTargetName && s.competitorTargetName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesJob = selectedJobType === 'all' || s.jobType === selectedJobType;
    return matchesSearch && matchesJob;
  });

  const handlePush = async (scenario: CostSimulationRecord) => {
    try {
      setSyncingId(scenario.id);
      const ok = await onPushToSheet(scenario);
      if (ok) {
        setSyncSuccessId(scenario.id);
        setTimeout(() => setSyncSuccessId(null), 3000);
      }
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ประวัติแผนจำลองราคา & กลยุทธ์ประมูลที่บันทึกไว้ ({simulations.length} แผน)
            </h3>
            <p className="text-[11px] text-slate-500">
              เรียกคืนการคำนวณและปรับแก้มูลค่าราคาเสนอเพื่อสู้กับคู่แข่งได้ทันทีโดยไม่ต้องกรอกใหม่
            </p>
          </div>
        </div>

        {spreadsheetUrl && (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>เปิดดูใน Google Sheets (แผ่นงาน Cost_Simulations)</span>
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </a>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อแผนจำลอง, หน่วยงาน, หรือบันทึกกลยุทธ์คู่แข่ง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:border-indigo-500 outline-none shadow-xs"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedJobType}
            onChange={(e) => setSelectedJobType(e.target.value)}
            className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:border-indigo-500 outline-none shadow-xs"
          >
            <option value="all">ทุกประเภทงานบริการ</option>
            <option value="จ้างเหมาบริการทำความสะอาดอาคาร">ทำความสะอาดอาคาร</option>
            <option value="จ้างเหมาบริการรักษาความปลอดภัย">รักษาความปลอดภัย (รปภ.)</option>
            <option value="จ้างเหมาบริการดูแลภูมิทัศน์และคนสวน">ดูแลภูมิทัศน์และคนสวน</option>
            <option value="จ้างเหมาบริการงานช่างและบำรุงรักษาอาคาร">ช่างและบำรุงรักษาอาคาร</option>
          </select>
        </div>
      </div>

      {/* List of Saved Scenarios */}
      {filteredSimulations.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">ยังไม่มีแผนจำลองราคาที่บันทึกไว้</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ปรับแต่งตัวแปรต้นทุนในแถบ "เครื่องมือถอดโครงสร้างราคา" แล้วกดปุ่ม <strong>"💾 บันทึกแผนจำลองราคานี้"</strong> ระบบจะบันทึกประวัติและส่งข้อมูลไปยัง Google Sheets ให้ทันที
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredSimulations.map((scenario) => {
            const isActive = activeScenarioId === scenario.id;
            const isSyncing = syncingId === scenario.id;
            const isSuccess = syncSuccessId === scenario.id;

            return (
              <div
                key={scenario.id}
                className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left: Info & Specs */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                            กำลังใช้งาน / แก้ไข
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {scenario.jobType.replace('จ้างเหมาบริการ', '')}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(scenario.updatedAt || scenario.createdAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{scenario.scenarioName}</span>
                      </h4>

                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{scenario.agencyName}</span>
                        <span className="text-slate-300">•</span>
                        <span>สัญญา {scenario.durationMonths} เดือน</span>
                      </div>

                      {/* Labor Specs Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1">
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                          👥 คนงาน {scenario.totalWorkers} คน (หัวหน้า {scenario.supervisors} คน)
                        </span>
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                          ⏱️ {scenario.workScheduleType === 'mon_fri' ? 'จ.-ศ. (22 วัน)' : 
                              scenario.workScheduleType === 'mon_fri_last_sat' ? 'จ.-ศ. + ส.สิ้นเดือน (23 วัน)' :
                              scenario.workScheduleType === 'mon_sat' ? 'จ.-ส. (26 วัน)' :
                              scenario.workScheduleType === 'everyday_airport' ? 'ทุกวัน 24 ชม.' : `กำหนดเอง (${scenario.customDays} วัน)`}
                        </span>
                        {scenario.hasWeekendSkeletonCrew && (
                          <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            🌟 เวรวันหยุด: {scenario.weekendWorkersCount} คน ({scenario.weekendDutyDaysPerMonth} วัน)
                          </span>
                        )}
                        {scenario.hasOvertime && (
                          <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200 font-medium">
                            ⚡ มี OT ({scenario.otWorkersCount} คน)
                          </span>
                        )}
                      </div>

                      {/* Competitor / Strategy Notes */}
                      {scenario.competitorStrategyNotes && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950 mt-2">
                          <div className="font-bold flex items-center gap-1.5 text-[11px] text-amber-900 mb-0.5">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>กลยุทธ์รับมือคู่แข่ง:</span>
                          </div>
                          <p className="line-clamp-2 leading-relaxed">{scenario.competitorStrategyNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: Key Price Metrics & Actions */}
                    <div className="lg:w-80 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-5 space-y-3">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">ราคากลาง:</span>
                          <span className="text-xs font-mono font-semibold text-slate-800">
                            {formatBaht(scenario.medianPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">ราคาเสนอรวม (VAT 7%):</span>
                          <span className="text-xs font-mono font-bold text-blue-700">
                            {formatBaht(scenario.recommendedPriceTotal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">ส่วนต่างราคากลาง:</span>
                          <span className={`text-xs font-mono font-bold ${
                            scenario.discountFromMedianPercent > 0 ? 'text-emerald-700' : 'text-slate-700'
                          }`}>
                            -{scenario.discountFromMedianPercent}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">กำไรเป้าหมาย:</span>
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            {scenario.profitPercent}% ({formatBaht(scenario.profitPerMonth * scenario.durationMonths)})
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onLoadScenario(scenario)}
                          className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isActive ? 'กำลังแก้ไข' : 'โหลดมาคำนวณต่อ'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateScenario(scenario)}
                          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                          title="ทำสำเนาแผนเพื่อปรับราคาเปรียบเทียบ"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePush(scenario)}
                          disabled={isSyncing}
                          className={`p-2 rounded-lg transition cursor-pointer ${
                            isSuccess 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title="ส่งไปยัง Google Sheet อีกครั้ง"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        {onConvertToProject && (
                          <button
                            type="button"
                            onClick={() => onConvertToProject(scenario)}
                            className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            title="บันทึกเข้าสู่ฐานข้อมูลโครงการประมูลจริง"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeletingScenario(scenario)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="ลบแผนจำลองราคานี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 bg-rose-50 border-b border-rose-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">ลบแผนจำลองราคา</h3>
                  <p className="text-[11px] text-rose-700">ยืนยันการลบข้อมูลแผนออกจากประวัติ</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingScenario(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 text-xs text-slate-700">
              <p>คุณต้องการลบแผนจำลองราคา <strong>"{deletingScenario.scenarioName}"</strong> หรือไม่?</p>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setDeletingScenario(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onDeleteScenario(deletingScenario.id);
                  setDeletingScenario(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
