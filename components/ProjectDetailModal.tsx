import React from 'react';
import { 
  X, 
  Folder, 
  Building2, 
  Calendar, 
  Users, 
  UserCheck, 
  DollarSign, 
  ShieldCheck, 
  Briefcase, 
  Layers, 
  Percent, 
  Clock, 
  User, 
  ArrowRight,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { EBiddingProject } from '../types';
import { formatBaht, formatNumber } from '../utils/calculator';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: EBiddingProject | null;
  onOpenSimulator?: (project: EBiddingProject) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  isOpen,
  onClose,
  project,
  onOpenSimulator,
}) => {
  if (!isOpen || !project) return null;

  // Derive standard fields if missing from project
  const supervisorCount = project.supervisors !== undefined ? project.supervisors : 1;
  const workerCount = project.workerStaff !== undefined ? project.workerStaff : Math.max(0, project.totalWorkers - supervisorCount);
  const totalWorkers = project.totalWorkers || (supervisorCount + workerCount);
  const supervisorWage = project.supervisorWage || 12000;
  const workerWage = project.workerWage || 9900;
  const socialSecurityPercent = project.socialSecurityPercent || 5;
  const managementFeePerPerson = project.managementFeePerPerson || 900;
  const materialEquipmentPerPerson = project.materialEquipmentPerPerson || 1000;
  const vatPercent = project.vatPercent || 7;
  const durationMonths = project.durationMonths || 12;
  const areaSqM = project.areaSqM || 5065;
  const recordedBy = project.recordedBy || 'ผู้ดูแลระบบ';

  // Calculate live standard breakdown if not pre-stored
  const totalMonthlySalary = (supervisorCount * supervisorWage) + (workerCount * workerWage);
  const monthlySocialSecurity = Math.round(totalMonthlySalary * (socialSecurityPercent / 100));
  const monthlyManagementFee = totalWorkers * managementFeePerPerson;
  const monthlyMaterialEquipment = totalWorkers * materialEquipmentPerPerson;
  const monthlyBeforeVat = totalMonthlySalary + monthlySocialSecurity + monthlyManagementFee + monthlyMaterialEquipment;
  const totalBeforeVat = monthlyBeforeVat * durationMonths;
  const vatAmount = Math.round(totalBeforeVat * (vatPercent / 100));
  const totalExpenses = project.totalExpenses || (totalBeforeVat + vatAmount);
  const diffMargin = project.diffMargin !== undefined ? project.diffMargin : (project.medianPrice - totalExpenses);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">รายละเอียดโครงการ</h2>
              <p className="text-[11px] text-slate-500 font-mono">รหัสโครงการ: {project.projectNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">หน่วยงาน:</span>
              <p className="font-semibold text-slate-900 leading-snug">{project.agencyName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">ราคากลาง:</span>
              <p className="font-bold text-slate-900 font-mono text-sm">{formatBaht(project.medianPrice)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">พื้นที่ทำงาน:</span>
              <p className="font-medium text-slate-800 font-mono">{formatNumber(areaSqM)} ตร.ม.</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">ระยะเวลาสัญญา:</span>
              <p className="font-medium text-slate-800">{durationMonths} เดือน</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">วันเริ่มสัญญา:</span>
              <p className="font-mono text-slate-700 text-[11px]">{project.startDate || '-'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">วันสิ้นสุดสัญญา:</span>
              <p className="font-mono text-slate-700 text-[11px]">{project.endDate || '-'}</p>
            </div>
          </div>

          {/* Manpower & Salary Section */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>อัตรากำลังคนและค่าแรง (Manpower & Wages)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px]">จำนวนหัวหน้าคนงาน:</span>
                <p className="font-semibold text-slate-800">{supervisorCount} คน</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">จำนวนคนงาน:</span>
                <p className="font-semibold text-slate-800">{workerCount} คน</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">รวมคนงานทั้งหมด:</span>
                <p className="font-bold text-blue-700">{totalWorkers} คน</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">เงินเดือนหัวหน้า:</span>
                <p className="font-bold text-slate-900 font-mono">{formatBaht(supervisorWage)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">เงินเดือนคนงาน:</span>
                <p className="font-bold text-slate-900 font-mono">{formatBaht(workerWage)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">รวมเงินเดือนฐาน/เดือน:</span>
                <p className="font-bold text-slate-900 font-mono">{formatBaht(totalMonthlySalary)}</p>
              </div>
            </div>
          </div>

          {/* Costs & Overheads Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>ค่าใช้จ่ายโครงการ (Project Expenses)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px]">ค่าประกันสังคม:</span>
                <p className="font-bold text-slate-900 font-mono">{socialSecurityPercent}%</p>
                <span className="text-[10px] text-slate-500 font-mono">({formatBaht(monthlySocialSecurity)}/ด.)</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">ค่าบริหารจัดการ:</span>
                <p className="font-bold text-slate-900 font-mono">{formatBaht(managementFeePerPerson)}/คน/เดือน</p>
                <span className="text-[10px] text-slate-500 font-mono">({formatBaht(monthlyManagementFee)}/ด.)</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">ค่าวัสดุอุปกรณ์:</span>
                <p className="font-bold text-slate-900 font-mono">{formatBaht(materialEquipmentPerPerson)}/คน/เดือน</p>
                <span className="text-[10px] text-slate-500 font-mono">({formatBaht(monthlyMaterialEquipment)}/ด.)</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">ภาษีมูลค่าเพิ่ม (VAT):</span>
                <p className="font-bold text-slate-900 font-mono">{vatPercent}%</p>
                <span className="text-[10px] text-slate-500 font-mono">({formatBaht(vatAmount)}/ปี)</span>
              </div>
            </div>
          </div>

          {/* Calculation Summary Box (Matching Screenshot) */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center justify-between">
              <span>สรุปการคำนวณ</span>
              <span className="text-[11px] font-normal text-blue-700">ระยะเวลาคำนวณ: {durationMonths} เดือน</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200/80 text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">รายจ่ายทั้งหมด (รวม VAT 7%):</span>
                <p className="text-base sm:text-lg font-extrabold text-blue-900 font-mono mt-0.5">
                  {formatBaht(totalExpenses)}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  (เฉลี่ย {formatBaht(Math.round(totalExpenses / durationMonths))}/เดือน)
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">ผลต่าง (ส่วนต่างจากราคากลาง):</span>
                <p className={`text-base sm:text-lg font-extrabold font-mono mt-0.5 ${diffMargin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {diffMargin >= 0 ? '+' : ''}{formatBaht(diffMargin)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {project.medianPrice > 0 ? `(${((diffMargin / project.medianPrice) * 100).toFixed(2)}% ของราคากลาง)` : ''}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>บันทึกโดย: <strong className="text-slate-700">{recordedBy}</strong></span>
              </div>
              {project.winnerName && (
                <div>
                  ผู้ชนะ: <span className="font-semibold text-slate-700">{project.winnerName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>

          {onOpenSimulator && (
            <button
              type="button"
              onClick={() => {
                onOpenSimulator(project);
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>นำเข้าเครื่องจำลองราคา (Simulate Price)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
