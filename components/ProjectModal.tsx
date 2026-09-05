import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Sparkles, Calendar, Building, Briefcase, Plane } from 'lucide-react';
import { EBiddingProject, JobType, WorkScheduleType } from '../types';
import { calculateProjectMetrics, formatBaht, formatPercent } from '../utils/calculator';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: EBiddingProject) => void;
  editingProject?: EBiddingProject | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProject,
}) => {
  const [projectNo, setProjectNo] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(2568);
  const [agencyName, setAgencyName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [jobType, setJobType] = useState<JobType>('จ้างเหมาบริการทำความสะอาดอาคาร');
  const [workScheduleType, setWorkScheduleType] = useState<WorkScheduleType>('mon_fri');
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState<number>(22);
  const [medianPrice, setMedianPrice] = useState<number>(0);
  const [budgetPrice, setBudgetPrice] = useState<number>(0);
  const [winningPrice, setWinningPrice] = useState<number>(0);
  const [winnerName, setWinnerName] = useState('');
  const [totalWorkers, setTotalWorkers] = useState<number>(10);
  const [supervisors, setSupervisors] = useState<number>(1);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [location, setLocation] = useState('กรุงเทพมหานคร');
  const [notes, setNotes] = useState('');

  // Populate data if editing
  useEffect(() => {
    if (editingProject) {
      setProjectNo(editingProject.projectNo);
      setFiscalYear(editingProject.fiscalYear);
      setAgencyName(editingProject.agencyName);
      setProjectName(editingProject.projectName);
      setJobType(editingProject.jobType);
      setWorkScheduleType(editingProject.workScheduleType || 'mon_fri');
      setWorkingDaysPerMonth(editingProject.workingDaysPerMonth || 22);
      setMedianPrice(editingProject.medianPrice);
      setBudgetPrice(editingProject.budgetPrice);
      setWinningPrice(editingProject.winningPrice);
      setWinnerName(editingProject.winnerName);
      setTotalWorkers(editingProject.totalWorkers);
      setSupervisors(editingProject.supervisors);
      setDurationMonths(editingProject.durationMonths);
      setLocation(editingProject.location);
      setNotes(editingProject.notes || '');
    } else {
      // Defaults for new project
      setProjectNo(`68${Math.floor(100000000 + Math.random() * 900000000)}`);
      setFiscalYear(2568);
      setAgencyName('');
      setProjectName('');
      setJobType('จ้างเหมาบริการทำความสะอาดอาคาร');
      setWorkScheduleType('mon_fri');
      setWorkingDaysPerMonth(22);
      setMedianPrice(10000000);
      setBudgetPrice(10000000);
      setWinningPrice(8900000);
      setWinnerName('');
      setTotalWorkers(35);
      setSupervisors(2);
      setDurationMonths(12);
      setLocation('กรุงเทพมหานคร');
      setNotes('');
    }
  }, [editingProject, isOpen]);

  if (!isOpen) return null;

  // Real-time calculated metrics
  const metrics = calculateProjectMetrics(
    medianPrice,
    budgetPrice,
    winningPrice,
    totalWorkers,
    supervisors
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNo || !agencyName || !projectName) {
      alert('กรุณากรอก เลขที่โครงการ, ชื่อหน่วยงาน และชื่อโครงการให้ครบถ้วน');
      return;
    }

    const savedProject: EBiddingProject = {
      id: editingProject ? editingProject.id : `proj-${Date.now()}`,
      projectNo,
      fiscalYear: Number(fiscalYear),
      agencyName,
      projectName,
      jobType,
      workScheduleType,
      workingDaysPerMonth: Number(workingDaysPerMonth),
      medianPrice: Number(medianPrice),
      budgetPrice: Number(budgetPrice),
      winningPrice: Number(winningPrice),
      winnerName: winnerName || 'ไม่ระบุ',
      diffFromMedian: metrics.diffFromMedian,
      diffFromMedianPercent: metrics.diffFromMedianPercent,
      diffFromBudget: metrics.diffFromBudget,
      diffFromBudgetPercent: metrics.diffFromBudgetPercent,
      winningToMedianPercent: metrics.winningToMedianPercent,
      winningToBudgetPercent: metrics.winningToBudgetPercent,
      totalWorkers: Number(totalWorkers),
      supervisors: Number(supervisors),
      workerStaff: metrics.workerStaff,
      durationMonths: Number(durationMonths),
      location: location || 'กรุงเทพมหานคร',
      notes,
      createdAt: editingProject ? editingProject.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{editingProject ? 'แก้ไขข้อมูลโครงการ e-Bidding' : 'บันทึกข้อมูลโครงการ e-Bidding ใหม่'}</span>
            </h2>
            <p className="text-xs text-slate-500">
              กรอกตัวเลขราคากลาง งบประมาณ ราคาชนะ รูปแบบวันทำงาน/OT ระบบจะคำนวณผลต่างและร้อยละอัตโนมัติ
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Top Grid: Project Identification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">เลขที่โครงการ (e-GP No.) *</label>
              <input
                type="text"
                required
                value={projectNo}
                onChange={(e) => setProjectNo(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                placeholder="เช่น 67017482910"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">ปีงบประมาณ *</label>
              <input
                type="number"
                required
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                placeholder="2568"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">ประเภทงาน *</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
              >
                <option value="จ้างเหมาบริการทำความสะอาดอาคาร">จ้างเหมาบริการทำความสะอาดอาคาร</option>
                <option value="จ้างเหมาบริการรักษาความปลอดภัย">จ้างเหมาบริการรักษาความปลอดภัย</option>
                <option value="จ้างเหมาบริการดูแลภูมิทัศน์และคนสวน">จ้างเหมาบริการดูแลภูมิทัศน์และคนสวน</option>
                <option value="จ้างเหมาบริการงานช่างและบำรุงรักษาอาคาร">จ้างเหมาบริการงานช่างและบำรุงรักษาอาคาร</option>
                <option value="จ้างเหมาบริการพนักงานขับรถและยานพาหนะ">จ้างเหมาบริการพนักงานขับรถและยานพาหนะ</option>
                <option value="จ้างเหมาบริการธุรการและสนับสนุนทั่วไป">จ้างเหมาบริการธุรการและสนับสนุนทั่วไป</option>
                <option value="งานบริการอื่นๆ">งานบริการอื่นๆ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">ชื่อส่วนราชการ / หน่วยงาน *</label>
              <input
                type="text"
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                placeholder="เช่น กรมศุลกากร, กรมสรรพากร, ท่าอากาศยานสุวรรณภูมิ"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">ชื่อโครงการ *</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                placeholder="เช่น จ้างเหมาบริการทำความสะอาดอาคารสำนักงาน..."
              />
            </div>
          </div>

          {/* Work Schedule and Days Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                รูปแบบวันทำงานตาม TOR
              </label>
              <select
                value={workScheduleType}
                onChange={(e) => {
                  const type = e.target.value as WorkScheduleType;
                  setWorkScheduleType(type);
                  if (type === 'mon_fri') setWorkingDaysPerMonth(22);
                  else if (type === 'mon_fri_last_sat') setWorkingDaysPerMonth(23);
                  else if (type === 'mon_sat') setWorkingDaysPerMonth(26);
                  else if (type === 'everyday_airport') setWorkingDaysPerMonth(30);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 outline-none shadow-sm"
              >
                <option value="mon_fri">จันทร์ - ศุกร์ (หยุด ส.-อา. ทั่วไป ~22 วัน)</option>
                <option value="mon_fri_last_sat">จ.-ศ. + เสาร์สุดท้ายของเดือน (~23 วัน)</option>
                <option value="mon_sat">จันทร์ - เสาร์ (ทำทุกเสาร์ ~26 วัน)</option>
                <option value="everyday_airport">สนามบิน / รพ. / 24 ชม. (สลับกะ 30 วัน + OT)</option>
                <option value="custom">กำหนดเอง (Custom)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                จำนวนวันทำงานต่อเดือน (วัน/เดือน)
              </label>
              <input
                type="number"
                min="15"
                max="31"
                value={workingDaysPerMonth}
                onChange={(e) => setWorkingDaysPerMonth(Math.max(1, Math.min(31, Number(e.target.value) || 22)))}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold tabular-nums font-mono focus:border-blue-500 outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] text-slate-600 font-semibold mb-1">ราคากลาง (บาท) *</label>
              <input
                type="number"
                required
                value={medianPrice}
                onChange={(e) => setMedianPrice(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-bold tabular-nums font-mono focus:border-blue-500 outline-none shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-semibold mb-1">ราคางบประมาณ (บาท) *</label>
              <input
                type="number"
                required
                value={budgetPrice}
                onChange={(e) => setBudgetPrice(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-bold tabular-nums font-mono focus:border-blue-500 outline-none shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-700 font-semibold mb-1">ราคาที่ชนะ (บาท) *</label>
              <input
                type="number"
                required
                value={winningPrice}
                onChange={(e) => setWinningPrice(Number(e.target.value))}
                className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs text-blue-700 font-bold tabular-nums font-mono focus:border-blue-500 outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Calculated Preview Pill */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] font-medium">ผลต่างจากราคากลาง:</span>
              <span className="font-bold text-slate-900 tabular-nums font-mono">{formatBaht(metrics.diffFromMedian)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-medium">ลดจากราคากลาง (%):</span>
              <span className="font-bold text-blue-700 tabular-nums">{metrics.diffFromMedianPercent}%</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-medium">ผลต่างจากงบประมาณ:</span>
              <span className="font-bold text-slate-900 tabular-nums font-mono">{formatBaht(metrics.diffFromBudget)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-medium">ลดจากงบประมาณ (%):</span>
              <span className="font-bold text-emerald-700 tabular-nums">{metrics.diffFromBudgetPercent}%</span>
            </div>
          </div>

          {/* Winner and Manpower */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">ชื่อผู้ชนะ / บริษัท / หจก. ที่ได้งาน</label>
              <input
                type="text"
                value={winnerName}
                onChange={(e) => setWinnerName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                placeholder="เช่น บริษัท สยามคลีนนิ่ง จำกัด"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-medium mb-1">คนงานทั้งหมด</label>
                <input
                  type="number"
                  value={totalWorkers}
                  onChange={(e) => setTotalWorkers(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-bold tabular-nums font-mono shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-medium mb-1">หัวหน้างาน</label>
                <input
                  type="number"
                  value={supervisors}
                  onChange={(e) => setSupervisors(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-bold tabular-nums font-mono shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-medium mb-1">ระยะสัญญา (ด.)</label>
                <input
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-bold tabular-nums font-mono shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Location & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">พื้นที่ / จังหวัด</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 outline-none shadow-sm"
                placeholder="เช่น กรุงเทพมหานคร, นนทบุรี"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">หมายเหตุ / สเปกสำคัญ</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 outline-none shadow-sm"
                placeholder="เช่น ทำงาน จ.-ศ., รวมเครื่องขัดพื้น 4 เครื่อง, สเปกฉลากเขียว"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer uppercase tracking-wider"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกข้อมูลโครงการ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
