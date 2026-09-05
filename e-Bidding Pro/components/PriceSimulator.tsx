import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Sparkles, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  Sliders, 
  FileText, 
  Info,
  Calendar,
  Clock,
  Building2,
  Briefcase,
  Layers,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Flame,
  Plus,
  Save,
  History,
  FileSpreadsheet,
  ExternalLink,
  Check,
  RefreshCw,
  Copy,
  Settings,
  Link,
  X,
  ArrowRight,
  ShieldCheck,
  Percent,
  Maximize2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CostSimulationRecord, EBiddingProject, JobType, WorkScheduleType, StandardCostCalculation } from '../types';
import { 
  estimateCostStructure, 
  calculateStandardProcurementCost, 
  computeMarketAnalytics, 
  formatBaht, 
  formatPercent, 
  formatNumber 
} from '../utils/calculator';
import { appendSheetRows, sendToAppsScriptWebhook, simulationToSheetRow } from '../utils/googleSheets';
import { SavedScenariosManager } from './SavedScenariosManager';

interface PriceSimulatorProps {
  historicalProjects: EBiddingProject[];
  onSaveAsProject?: (projectData: Partial<EBiddingProject>) => void;
  spreadsheetId?: string | null;
  spreadsheetUrl?: string | null;
  isTokenActive?: boolean;
}

export const PriceSimulator: React.FC<PriceSimulatorProps> = ({
  historicalProjects,
  onSaveAsProject,
  spreadsheetId: propSpreadsheetId,
  spreadsheetUrl: propSpreadsheetUrl,
  isTokenActive = false,
}) => {
  // Navigation View: 'calculator' or 'history'
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');

  // Calculation Engine Mode: 'standard' (สูตรมาตรฐานภาครัฐตามภาพจริง) vs 'advanced' (สูตรละเอียด OT/กะ)
  const [calculationMode, setCalculationMode] = useState<'standard' | 'advanced'>('standard');

  // Scenario Identity & Tracking
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState<string>('แผนหลัก: โครงการทำความสะอาด (สูตรมาตรฐาน)');
  const [competitorStrategyNotes, setCompetitorStrategyNotes] = useState<string>('');
  const [competitorTargetName, setCompetitorTargetName] = useState<string>('');

  // 1. Standard Government Procurement Mode States (ตรงตามสูตรจริงในภาพ 100%)
  const [projectNo, setProjectNo] = useState<string>('69089470200');
  const [agencyName, setAgencyName] = useState<string>('กองบังคับการปราบปรามการกระทำความผิดเกี่ยวกับอาชญากรรมทางเศรษฐกิจ');
  const [jobType, setJobType] = useState<JobType>('จ้างเหมาบริการทำความสะอาดอาคาร');
  const [medianPrice, setMedianPrice] = useState<number>(993600);
  const [budgetPrice, setBudgetPrice] = useState<number>(993600);
  const [areaSqM, setAreaSqM] = useState<number>(5065);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [startDate, setStartDate] = useState<string>('2026-09-30T17:00:00.000Z');
  const [endDate, setEndDate] = useState<string>('2027-09-29T17:00:00.000Z');
  const [recordedBy, setRecordedBy] = useState<string>('ผู้ดูแลระบบ');

  // Manpower & Wages (Enforce supervisor salary min 8,000 THB)
  const [supervisorCount, setSupervisorCount] = useState<number>(1);
  const [workerCount, setWorkerCount] = useState<number>(5);
  const [supervisorWage, setSupervisorWage] = useState<number>(12000); // Min 8,000 THB
  const [workerWage, setWorkerWage] = useState<number>(9900);

  // Standard Cost Components
  const [socialSecurityPercent, setSocialSecurityPercent] = useState<number>(5);
  const [managementFeePerPerson, setManagementFeePerPerson] = useState<number>(900);
  const [materialEquipmentPerPerson, setMaterialEquipmentPerPerson] = useState<number>(1000);
  const [vatPercent, setVatPercent] = useState<number>(7);

  // 2. Advanced Mode States (OT, Shift, Machinery, Overhead sliders)
  const [location, setLocation] = useState('กรุงเทพมหานคร');
  const [workScheduleType, setWorkScheduleType] = useState<WorkScheduleType>('mon_fri');
  const [customDays, setCustomDays] = useState<number>(22);
  const [isMonthlyFixedWage, setIsMonthlyFixedWage] = useState<boolean>(false);
  const [hasOvertime, setHasOvertime] = useState<boolean>(false);
  const [otDaysPerMonth, setOtDaysPerMonth] = useState<number>(0);
  const [otHoursPerDay, setOtHoursPerDay] = useState<number>(0);
  const [customOtHourlyRate, setCustomOtHourlyRate] = useState<number>(0);
  const [customOtDailyRate, setCustomOtDailyRate] = useState<number>(0);
  const [otWorkersCount, setOtWorkersCount] = useState<number>(5);
  const [nightShiftAllowance, setNightShiftAllowance] = useState<number>(0);
  const [hasWeekendSkeletonCrew, setHasWeekendSkeletonCrew] = useState<boolean>(false);
  const [weekendDutyDaysPerMonth, setWeekendDutyDaysPerMonth] = useState<number>(8);
  const [weekendWorkersCount, setWeekendWorkersCount] = useState<number>(1);
  const [customWeekendDailyRate, setCustomWeekendDailyRate] = useState<number>(0);
  const [dailyMinWage, setDailyMinWage] = useState<number>(380);
  const [consumablesPerWorker, setConsumablesPerWorker] = useState<number>(600);
  const [machineryMonthly, setMachineryMonthly] = useState<number>(3500);
  const [overheadPercent, setOverheadPercent] = useState<number>(6);
  const [profitPercent, setProfitPercent] = useState<number>(8);

  // Saved Scenarios Store
  const [simulations, setSimulations] = useState<CostSimulationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ebidding_saved_simulations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Google Sheets Webhook and Sync States
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('ebidding_webhook_url') || '';
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Save simulations to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('ebidding_saved_simulations', JSON.stringify(simulations));
    } catch (e) {
      console.warn('Failed to save simulations to localStorage', e);
    }
  }, [simulations]);

  // STANDARD FORMULA CALCULATION (Live)
  const standardCost: StandardCostCalculation = useMemo(() => {
    return calculateStandardProcurementCost({
      supervisorCount,
      workerCount,
      supervisorWage: Math.max(8000, supervisorWage), // Enforce 8000 THB floor
      workerWage,
      socialSecurityPercent,
      managementFeePerPerson,
      materialEquipmentPerPerson,
      vatPercent,
      durationMonths,
      medianPrice,
      areaSqM,
    });
  }, [
    supervisorCount,
    workerCount,
    supervisorWage,
    workerWage,
    socialSecurityPercent,
    managementFeePerPerson,
    materialEquipmentPerPerson,
    vatPercent,
    durationMonths,
    medianPrice,
    areaSqM,
  ]);

  // ADVANCED FORMULA CALCULATION (Live)
  const totalWorkers = supervisorCount + workerCount;
  const costBreakdown = useMemo(() => {
    return estimateCostStructure({
      totalWorkers,
      supervisors: supervisorCount,
      dailyMinWage,
      workScheduleType,
      workingDaysPerMonth: workScheduleType === 'custom' ? customDays : undefined,
      isMonthlyFixedWage,
      hasOvertime: hasOvertime || workScheduleType === 'everyday_airport' || otDaysPerMonth > 0 || otHoursPerDay > 0,
      otDaysPerMonth,
      otHoursPerDay,
      otHourlyRate: customOtHourlyRate > 0 ? customOtHourlyRate : undefined,
      otDailyRate: customOtDailyRate > 0 ? customOtDailyRate : undefined,
      otWorkersCount: Math.min(otWorkersCount, totalWorkers),
      nightShiftAllowancePerPerson: nightShiftAllowance,
      hasWeekendSkeletonCrew,
      weekendDutyDaysPerMonth,
      weekendWorkersCount: Math.min(weekendWorkersCount, totalWorkers),
      weekendDailyRate: customWeekendDailyRate > 0 ? customWeekendDailyRate : undefined,
      supervisorMonthlyWage: Math.max(8000, supervisorWage),
      consumablesPerWorkerPerMonth: consumablesPerWorker,
      machineryDepreciationPerMonth: machineryMonthly,
      overheadRatePercent: overheadPercent,
      targetProfitPercent: profitPercent,
      durationMonths,
    });
  }, [
    totalWorkers,
    supervisorCount,
    dailyMinWage,
    workScheduleType,
    customDays,
    isMonthlyFixedWage,
    hasOvertime,
    otDaysPerMonth,
    otHoursPerDay,
    customOtHourlyRate,
    customOtDailyRate,
    otWorkersCount,
    nightShiftAllowance,
    hasWeekendSkeletonCrew,
    weekendDutyDaysPerMonth,
    weekendWorkersCount,
    customWeekendDailyRate,
    supervisorWage,
    consumablesPerWorker,
    machineryMonthly,
    overheadPercent,
    profitPercent,
    durationMonths,
  ]);

  // Quick Project Scale Presets (ตรงตามงานจริงและราคาที่ถูกต้อง)
  const handleApplyPreset = (presetKey: 'screenshot_6' | 'small_5' | 'medium_15' | 'large_40') => {
    if (presetKey === 'screenshot_6') {
      setProjectNo('69089470200');
      setAgencyName('กองบังคับการปราบปรามการกระทำความผิดเกี่ยวกับอาชญากรรมทางเศรษฐกิจ');
      setMedianPrice(993600);
      setBudgetPrice(993600);
      setAreaSqM(5065);
      setDurationMonths(12);
      setSupervisorCount(1);
      setWorkerCount(5);
      setSupervisorWage(12000);
      setWorkerWage(9900);
      setSocialSecurityPercent(5);
      setManagementFeePerPerson(900);
      setMaterialEquipmentPerPerson(1000);
      setVatPercent(7);
      setScenarioName('แผนจริง: บก.ปอศ. (6 คน - รายจ่าย 9.75 แสน, กำไร 1.8 หมื่น)');
    } else if (presetKey === 'small_5') {
      setAgencyName('สำนักงานสรรพากรพื้นที่ / หน่วยงานราชการ');
      setMedianPrice(750000);
      setBudgetPrice(750000);
      setAreaSqM(3800);
      setDurationMonths(12);
      setSupervisorCount(1);
      setWorkerCount(4);
      setSupervisorWage(10000);
      setWorkerWage(9900);
      setSocialSecurityPercent(5);
      setManagementFeePerPerson(900);
      setMaterialEquipmentPerPerson(1000);
      setVatPercent(7);
      setScenarioName('แผนขนาดเล็ก (5 คน - ราคากลาง 7.5 แสน)');
    } else if (presetKey === 'medium_15') {
      setAgencyName('ศูนย์ราชการ / กรมศุลกากร / สถาบันการศึกษา');
      setMedianPrice(2500000);
      setBudgetPrice(2500000);
      setAreaSqM(14000);
      setDurationMonths(12);
      setSupervisorCount(1);
      setWorkerCount(14);
      setSupervisorWage(15000);
      setWorkerWage(10000);
      setSocialSecurityPercent(5);
      setManagementFeePerPerson(900);
      setMaterialEquipmentPerPerson(1000);
      setVatPercent(7);
      setScenarioName('แผนขนาดกลาง (15 คน - ราคากลาง 2.5 ล้าน)');
    } else if (presetKey === 'large_40') {
      setAgencyName('สำนักงานใหญ่ / โรงพยาบาลรัฐ / ศูนย์ประชุม');
      setMedianPrice(6500000);
      setBudgetPrice(6500000);
      setAreaSqM(38000);
      setDurationMonths(12);
      setSupervisorCount(3);
      setWorkerCount(37);
      setSupervisorWage(16000);
      setWorkerWage(10000);
      setSocialSecurityPercent(5);
      setManagementFeePerPerson(900);
      setMaterialEquipmentPerPerson(1000);
      setVatPercent(7);
      setScenarioName('แผนขนาดใหญ่ (40 คน - ราคากลาง 6.5 ล้าน)');
    }
  };

  // Push single simulation record to Google Sheets
  const pushSimulationToSheet = async (scenario: CostSimulationRecord): Promise<boolean> => {
    let pushed = false;
    const token = sessionStorage.getItem('google_sheets_token') || sessionStorage.getItem('google_access_token');
    const sheetId = propSpreadsheetId || localStorage.getItem('ebidding_sheet_id');

    // 1. Try Google Apps Script Webhook first (if configured)
    if (webhookUrl) {
      try {
        await sendToAppsScriptWebhook(webhookUrl, {
          action: 'save_simulation',
          data: scenario,
        });
        pushed = true;
      } catch (err) {
        console.warn('Apps script webhook push failed', err);
      }
    }

    // 2. Try Google Sheets API with Token
    if (token && sheetId) {
      try {
        const row = simulationToSheetRow(scenario);
        await appendSheetRows(token, sheetId, 'Cost_Simulations!A:X', [row]);
        pushed = true;
      } catch (err: any) {
        console.warn('Sheets API append failed', err);
      }
    }

    return pushed;
  };

  // Construct current state into CostSimulationRecord
  const buildCurrentScenarioRecord = (idToUse?: string): CostSimulationRecord => {
    const isStd = calculationMode === 'standard';
    const totalExp = isStd ? standardCost.totalExpenses : costBreakdown.recommendedPriceTotal;
    const monthlyExp = isStd ? Math.round(standardCost.totalExpenses / durationMonths) : costBreakdown.recommendedPriceMonthly;
    const diff = medianPrice > 0 ? (medianPrice - totalExp) : 0;
    const diffPct = medianPrice > 0 ? Number(((diff / medianPrice) * 100).toFixed(2)) : 0;

    return {
      id: idToUse || activeScenarioId || `sim-${Date.now()}`,
      scenarioName: scenarioName || `${jobType} (${formatBaht(totalExp)})`,
      jobType,
      agencyName,
      location,
      durationMonths,
      medianPrice,
      budgetPrice,
      calculationMode,
      areaSqM,
      startDate,
      endDate,
      supervisorWage: Math.max(8000, supervisorWage),
      workerWage,
      socialSecurityPercent,
      managementFeePerPerson,
      materialEquipmentPerPerson,
      vatPercent,
      totalExpenses: totalExp,
      diffMargin: diff,
      diffMarginPercent: diffPct,
      recordedBy,
      totalWorkers: supervisorCount + workerCount,
      supervisors: supervisorCount,
      dailyMinWage,
      supervisorMonthlyWage: Math.max(8000, supervisorWage),
      workScheduleType,
      customDays,
      isMonthlyFixedWage,
      hasOvertime,
      otHoursPerDay,
      otDaysPerMonth,
      customOtHourlyRate,
      customOtDailyRate,
      otWorkersCount,
      nightShiftAllowance,
      hasWeekendSkeletonCrew,
      weekendDutyDaysPerMonth,
      weekendWorkersCount,
      customWeekendDailyRate,
      consumablesPerWorker,
      machineryMonthly,
      overheadPercent,
      profitPercent,
      totalLaborCostPerMonth: isStd ? (standardCost.totalMonthlySalary + standardCost.monthlySocialSecurity) : costBreakdown.totalLaborCostPerMonth,
      totalConsumablesPerMonth: isStd ? standardCost.monthlyMaterialEquipment : costBreakdown.totalConsumablesPerMonth,
      machineryDepreciationPerMonth: isStd ? 0 : costBreakdown.machineryDepreciationPerMonth,
      overheadCostPerMonth: isStd ? standardCost.monthlyManagementFee : costBreakdown.overheadCostPerMonth,
      profitPerMonth: isStd ? Math.round(diff / durationMonths) : costBreakdown.profitPerMonth,
      subtotalMonthlyCost: isStd ? standardCost.monthlyBeforeVat : costBreakdown.subtotalMonthlyCost,
      recommendedPriceMonthly: monthlyExp,
      recommendedPriceTotal: totalExp,
      discountFromMedianPercent: diffPct,
      discountFromBudgetPercent: diffPct,
      competitorStrategyNotes,
      competitorTargetName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Save current simulation (Update or New)
  const handleSaveSimulation = async (asNew: boolean = false) => {
    try {
      setIsSaving(true);
      const record = buildCurrentScenarioRecord(asNew ? `sim-${Date.now()}` : undefined);

      setSimulations((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === record.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = record;
          return next;
        } else {
          return [record, ...prev];
        }
      });

      setActiveScenarioId(record.id);

      // Auto Push to Google Sheets
      const pushedToSheet = await pushSimulationToSheet(record);

      if (pushedToSheet) {
        setSaveToast({
          message: `✓ บันทึกแผนจำลองราคาและส่งข้อมูลไปยัง Google Sheets เรียบร้อยแล้ว!`,
          type: 'success',
        });
      } else {
        setSaveToast({
          message: `✓ บันทึกแผนในระบบเรียบร้อย (บันทึกเก็บเป็นประวัติ พร้อมนำมาปรับแก้ไขได้ตลอด)`,
          type: 'success',
        });
      }

      setTimeout(() => setSaveToast(null), 4000);
    } catch (err: any) {
      setSaveToast({
        message: `เกิดข้อผิดพลาดในการบันทึก: ${err.message}`,
        type: 'error',
      });
      setTimeout(() => setSaveToast(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved scenario back into the simulator
  const handleLoadScenario = (scenario: CostSimulationRecord) => {
    setActiveScenarioId(scenario.id);
    setScenarioName(scenario.scenarioName);
    setJobType(scenario.jobType);
    setAgencyName(scenario.agencyName);
    setMedianPrice(scenario.medianPrice);
    setBudgetPrice(scenario.budgetPrice || scenario.medianPrice);
    setAreaSqM(scenario.areaSqM || 5065);
    setDurationMonths(scenario.durationMonths || 12);
    setStartDate(scenario.startDate || '2026-09-30T17:00:00.000Z');
    setEndDate(scenario.endDate || '2027-09-29T17:00:00.000Z');
    setRecordedBy(scenario.recordedBy || 'ผู้ดูแลระบบ');

    // Standard fields
    setSupervisorCount(scenario.supervisors !== undefined ? scenario.supervisors : 1);
    setWorkerCount(scenario.totalWorkers !== undefined ? Math.max(0, scenario.totalWorkers - (scenario.supervisors || 1)) : 5);
    setSupervisorWage(Math.max(8000, scenario.supervisorWage || scenario.supervisorMonthlyWage || 12000));
    setWorkerWage(scenario.workerWage || 9900);
    setSocialSecurityPercent(scenario.socialSecurityPercent || 5);
    setManagementFeePerPerson(scenario.managementFeePerPerson || 900);
    setMaterialEquipmentPerPerson(scenario.materialEquipmentPerPerson || 1000);
    setVatPercent(scenario.vatPercent || 7);

    // Mode
    if (scenario.calculationMode) {
      setCalculationMode(scenario.calculationMode);
    }

    setCompetitorStrategyNotes(scenario.competitorStrategyNotes || '');
    setCompetitorTargetName(scenario.competitorTargetName || '');

    setActiveTab('calculator');
    setSaveToast({
      message: `⚡ โหลดแผน "${scenario.scenarioName}" สำเร็จ พร้อมปรับแก้ราคาและประเมินกลยุทธ์ต่อได้ทันที`,
      type: 'success',
    });
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Duplicate scenario
  const handleDuplicateScenario = (scenario: CostSimulationRecord) => {
    const clone: CostSimulationRecord = {
      ...scenario,
      id: `sim-${Date.now()}`,
      scenarioName: `${scenario.scenarioName} (สำเนา)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSimulations((prev) => [clone, ...prev]);
    setSaveToast({
      message: `ทำสำเนาแผน "${clone.scenarioName}" สำเร็จ`,
      type: 'info',
    });
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Delete scenario
  const handleDeleteScenario = (id: string) => {
    setSimulations((prev) => prev.filter((s) => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(null);
    }
  };

  // Convert scenario to EBiddingProject
  const handleConvertToProject = (scenario: CostSimulationRecord) => {
    if (onSaveAsProject) {
      onSaveAsProject({
        projectName: scenario.scenarioName,
        agencyName: scenario.agencyName,
        jobType: scenario.jobType,
        medianPrice: scenario.medianPrice,
        budgetPrice: scenario.budgetPrice,
        winningPrice: scenario.totalExpenses || scenario.recommendedPriceTotal,
        winnerName: 'บริษัทเรา (ราคาเสนอจำลอง)',
        totalWorkers: scenario.totalWorkers,
        supervisors: scenario.supervisors,
        durationMonths: scenario.durationMonths,
        areaSqM: scenario.areaSqM,
        supervisorWage: scenario.supervisorWage,
        workerWage: scenario.workerWage,
        socialSecurityPercent: scenario.socialSecurityPercent,
        managementFeePerPerson: scenario.managementFeePerPerson,
        materialEquipmentPerPerson: scenario.materialEquipmentPerPerson,
        vatPercent: scenario.vatPercent,
        totalExpenses: scenario.totalExpenses,
        diffMargin: scenario.diffMargin,
        recordedBy: scenario.recordedBy,
        notes: `ถอดโครงสร้างราคา: ${scenario.competitorStrategyNotes || 'กลยุทธ์จำลอง e-Bidding'}`,
      });
    }
  };

  const isConnectedToSheets = Boolean(isTokenActive || webhookUrl);

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification Banner */}
      {saveToast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md animate-in slide-in-from-top duration-200 ${
            saveToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : saveToast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : saveToast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
            <span>{saveToast.message}</span>
          </div>
          <button
            onClick={() => setSaveToast(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Scenario Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span>คำนวณต้นทุน & จำลองราคาเสนอ (e-Bidding Decision Engine)</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            ระบบบันทึกประวัติการคำนวณและดึงกลับมาปรับราคาแข่งกับคู่แข่งได้ทันที พร้อมบังคับส่งข้อมูลลง Google Sheets อัตโนมัติ
          </p>
        </div>

        {/* Tab Switcher & Google Sheets Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>เครื่องมือคำนวณราคา</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>ประวัติแผน ({simulations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: Saved Scenarios History Tab */}
      {activeTab === 'history' ? (
        <SavedScenariosManager
          simulations={simulations}
          activeScenarioId={activeScenarioId}
          onLoadScenario={handleLoadScenario}
          onDeleteScenario={handleDeleteScenario}
          onDuplicateScenario={handleDuplicateScenario}
          onPushToSheet={pushSimulationToSheet}
          onConvertToProject={handleConvertToProject}
          spreadsheetUrl={propSpreadsheetUrl || null}
        />
      ) : (
        /* VIEW: Active Simulator Calculator Tab */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Active Scenario Title Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-white tracking-wider">
                  {activeScenarioId ? 'กำลังแก้ไขแผนจำลอง' : 'แผนจำลองราคาใหม่'}
                </span>
                {activeScenarioId && (
                  <button
                    onClick={() => {
                      setActiveScenarioId(null);
                      setScenarioName('แผนใหม่: จำลองราคาเสนอ');
                    }}
                    className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    สร้างเป็นแผนใหม่ (New Blank)
                  </button>
                )}
              </div>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="ระบุชื่อแผน เช่น [แผน A] งานทำความสะอาด กองบังคับการปราบปรามฯ - กำไร 1.8 หมื่น"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold placeholder-slate-400 focus:border-blue-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1 md:pt-0">
              <button
                onClick={() => handleSaveSimulation(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{activeScenarioId ? '💾 บันทึกทับแผนเดิม' : '💾 บันทึกแผนจำลองราคานี้'}</span>
              </button>

              {activeScenarioId && (
                <button
                  onClick={() => handleSaveSimulation(true)}
                  disabled={isSaving}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="บันทึกแยกเป็นอีกเวอร์ชันเพื่อเปรียบเทียบ"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>บันทึกเป็นแผนใหม่</span>
                </button>
              )}
            </div>
          </div>

          {/* Mode Selector & Quick Scale Presets */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block">เลือกโหมดการคำนวณต้นทุน:</span>
                <span className="text-[11px] text-slate-500">แนะนำ "สูตรมาตรฐานภาครัฐ" สำหรับการถอดราคาจัดซื้อจัดจ้าง e-Bidding</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalculationMode('standard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    calculationMode === 'standard'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>สูตรมาตรฐานภาครัฐ (e-Bidding TOR)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalculationMode('advanced')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    calculationMode === 'advanced'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>สูตรขั้นสูง (OT/กะดึก/วันหยุด)</span>
                </button>
              </div>
            </div>

            {/* Quick Scale Presets Bar */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ สลับตัวอย่างโครงการจริงด่วน (Quick Presets):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('screenshot_6')}
                  className="p-2 rounded-lg text-left border bg-blue-50/50 border-blue-200 hover:bg-blue-50 text-blue-950 transition cursor-pointer"
                >
                  <div className="text-[11px] font-bold">🏢 งานจริง บก.ปอศ. (6 คน)</div>
                  <div className="text-[10px] text-blue-700 font-mono">รายจ่าย 975,519 บ. (กำไร +18,081)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('small_5')}
                  className="p-2 rounded-lg text-left border bg-white border-slate-200 hover:bg-slate-50 text-slate-800 transition cursor-pointer"
                >
                  <div className="text-[11px] font-bold">🏢 ขนาดเล็ก 5 คน</div>
                  <div className="text-[10px] text-slate-500 font-mono">ราคากลาง ~7.5 แสนบาท</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('medium_15')}
                  className="p-2 rounded-lg text-left border bg-white border-slate-200 hover:bg-slate-50 text-slate-800 transition cursor-pointer"
                >
                  <div className="text-[11px] font-bold">🏢 ขนาดกลาง 15 คน</div>
                  <div className="text-[10px] text-slate-500 font-mono">ราคากลาง ~2.5 ล้านบาท</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('large_40')}
                  className="p-2 rounded-lg text-left border bg-white border-slate-200 hover:bg-slate-50 text-slate-800 transition cursor-pointer"
                >
                  <div className="text-[11px] font-bold">🏢 ขนาดใหญ่ 40 คน</div>
                  <div className="text-[10px] text-slate-500 font-mono">ราคากลาง ~6.5 ล้านบาท</div>
                </button>
              </div>
            </div>
          </div>

          {/* Competitor Strategy & Notes Box */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>บันทึกกลยุทธ์ประเมินคู่แข่ง (Competitor Intelligence & Strategy Notes)</span>
              </label>
              <span className="text-[11px] text-amber-700">จะถูกบันทึกเก็บเป็นประวัติและส่งลง Google Sheets อัตโนมัติ</span>
            </div>
            <textarea
              value={competitorStrategyNotes}
              onChange={(e) => setCompetitorStrategyNotes(e.target.value)}
              placeholder="บันทึกข้อสังเกตกลยุทธ์ เช่น คู่แข่งหลักมักเสนอราคาต่ำกว่าราคากลาง 2%, เราคุมค่าวัสดุ 1,000 บ./คน/ด. ทำให้มีกำไรส่วนต่าง 18,081 บาท..."
              rows={2}
              className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs text-slate-800 focus:border-amber-500 outline-none resize-none"
            />
          </div>

          {/* MAIN 2-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Input Form Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Section 1: Project Information */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. ข้อมูลโครงการและราคากลาง</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">เลขที่โครงการ / e-GP No.</label>
                    <input
                      type="text"
                      value={projectNo}
                      onChange={(e) => setProjectNo(e.target.value)}
                      placeholder="เช่น 69089470200"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-900 font-semibold focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">ชื่อหน่วยงาน / ส่วนราชการ</label>
                    <input
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="เช่น กองบังคับการปราบปรามการกระทำความผิดเกี่ยวกับอาชญากรรมทางเศรษฐกิจ"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-900 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">ราคากลาง (บาท)</label>
                      <input
                        type="number"
                        value={medianPrice || ''}
                        onChange={(e) => setMedianPrice(Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">พื้นที่ทำงาน (ตร.ม.)</label>
                      <input
                        type="number"
                        value={areaSqM || ''}
                        onChange={(e) => setAreaSqM(Number(e.target.value) || 0)}
                        placeholder="เช่น 5065"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">ระยะเวลาสัญญา (เดือน)</label>
                      <input
                        type="number"
                        min="1"
                        value={durationMonths || ''}
                        onChange={(e) => setDurationMonths(Number(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">บันทึกโดย</label>
                      <input
                        type="text"
                        value={recordedBy}
                        onChange={(e) => setRecordedBy(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Manpower & Wage Structure */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. อัตรากำลังคนและค่าแรง</span>
                  </h3>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    รวม {supervisorCount + workerCount} คน
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">จำนวนหัวหน้าคนงาน (คน)</label>
                      <input
                        type="number"
                        min="0"
                        value={supervisorCount}
                        onChange={(e) => setSupervisorCount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">จำนวนคนงาน (คน)</label>
                      <input
                        type="number"
                        min="1"
                        value={workerCount}
                        onChange={(e) => setWorkerCount(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-blue-700 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-700 font-semibold">
                          เงินเดือนหัวหน้า (บาท/คน/เดือน):
                        </label>
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          เริ่มต้นที่ 8,000 บาท
                        </span>
                      </div>
                      <input
                        type="number"
                        min="8000"
                        step="100"
                        value={supervisorWage}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 8000;
                          setSupervisorWage(val);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        เงินเดือนคนงาน (บาท/คน/เดือน):
                      </label>
                      <input
                        type="number"
                        min="5000"
                        step="100"
                        value={workerWage}
                        onChange={(e) => setWorkerWage(Number(e.target.value) || 9900)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Project Expenses & Overheads */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>3. ค่าใช้จ่ายโครงการ & ภาษี (Expenses & VAT)</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">ค่าประกันสังคม (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={socialSecurityPercent}
                        onChange={(e) => setSocialSecurityPercent(Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">ภาษีมูลค่าเพิ่ม VAT (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={vatPercent}
                        onChange={(e) => setVatPercent(Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">ค่าบริหารจัดการ (บาท/คน/เดือน)</label>
                    <input
                      type="number"
                      step="50"
                      value={managementFeePerPerson}
                      onChange={(e) => setManagementFeePerPerson(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">ค่าวัสดุอุปกรณ์ (บาท/คน/เดือน)</label>
                    <input
                      type="number"
                      step="50"
                      value={materialEquipmentPerPerson}
                      onChange={(e) => setMaterialEquipmentPerPerson(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Real-Time Results & Cost Breakdown Cards (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* PRIMARY SUMMARY CARD (Matching Exact User Benchmark) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300 block">
                      TOTAL EXPENSES (รายจ่ายทั้งหมด รวม VAT {vatPercent}%)
                    </span>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-0.5">
                      {formatBaht(standardCost.totalExpenses)}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block">รายจ่ายเฉลี่ยต่อเดือน</span>
                    <span className="text-base font-mono font-bold text-blue-300">
                      {formatBaht(Math.round(standardCost.totalExpenses / durationMonths))} /เดือน
                    </span>
                  </div>
                </div>

                {/* Grid Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 block">ราคากลาง</span>
                    <span className="text-sm font-mono font-bold text-white mt-0.5">
                      {formatBaht(medianPrice)}
                    </span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 block">ผลต่าง (กำไรส่วนต่าง)</span>
                    <span className={`text-sm font-mono font-extrabold mt-0.5 ${
                      standardCost.diffMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {standardCost.diffMargin >= 0 ? '+' : ''}{formatBaht(standardCost.diffMargin)}
                    </span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 block">สัดส่วนผลต่าง</span>
                    <span className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
                      {standardCost.diffMarginPercent}%
                    </span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 block">ต้นทุน/ตร.ม.</span>
                    <span className="text-sm font-mono font-bold text-blue-300 mt-0.5">
                      {standardCost.costPerSqM > 0 ? `${formatNumber(standardCost.costPerSqM)} ฿/ตร.ม.` : '-'}
                    </span>
                  </div>
                </div>

                {/* 1-Click Save Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                  <span className="text-xs text-slate-300">
                    💾 บันทึกผลการคำนวณนี้เก็บเป็นประวัติเพื่อปรับแก้กลยุทธ์ต่อ
                  </span>
                  <button
                    onClick={() => handleSaveSimulation(false)}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>บันทึกประวัติ & ส่ง Google Sheets</span>
                  </button>
                </div>
              </div>

              {/* DETAILED GOVERNMENT PROCUREMENT BREAKDOWN TABLE */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    ตารางสรุปการคำนวณตามมาตรฐานจัดซื้อจัดจ้าง (Government Breakdown)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">ระยะเวลา {durationMonths} เดือน</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                        <th className="p-2.5 text-left">หมวดหมู่รายการ</th>
                        <th className="p-2.5 text-right">ต่อเดือน (บาท)</th>
                        <th className="p-2.5 text-right">ทั้งสัญญา ({durationMonths} เดือน)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5 font-medium text-slate-900">
                          1. รวมเงินเดือนฐาน ({supervisorCount} หัวหน้า @ {formatBaht(supervisorWage)} + {workerCount} คนงาน @ {formatBaht(workerWage)})
                        </td>
                        <td className="p-2.5 text-right tabular-nums font-mono font-semibold">{formatBaht(standardCost.totalMonthlySalary)}</td>
                        <td className="p-2.5 text-right tabular-nums font-mono font-semibold">{formatBaht(standardCost.totalMonthlySalary * durationMonths)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 pl-5 text-slate-600">
                          + ค่าประกันสังคม ({socialSecurityPercent}%)
                        </td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.monthlySocialSecurity)}</td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.monthlySocialSecurity * durationMonths)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 pl-5 text-slate-600">
                          + ค่าบริหารจัดการ ({formatBaht(managementFeePerPerson)}/คน/เดือน x {standardCost.totalWorkers} คน)
                        </td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.monthlyManagementFee)}</td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.monthlyManagementFee * durationMonths)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 pl-5 text-slate-600">
                          + ค่าวัสดุอุปกรณ์ ({formatBaht(materialEquipmentPerPerson)}/คน/เดือน x {standardCost.totalWorkers} คน)
                        </td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.monthlyMaterialEquipment)}</td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.monthlyMaterialEquipment * durationMonths)}</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                        <td className="p-2.5">รวมรายจ่ายทั้งสัญญา (ก่อน VAT)</td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.monthlyBeforeVat)}</td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.totalBeforeVat)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-700">+ ภาษีมูลค่าเพิ่ม (VAT {vatPercent}%)</td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(Math.round(standardCost.vatAmount / durationMonths))}</td>
                        <td className="p-2.5 text-right tabular-nums font-mono">{formatBaht(standardCost.vatAmount)}</td>
                      </tr>
                      <tr className="bg-blue-50 font-extrabold text-blue-950 border-t border-b border-blue-200 text-sm">
                        <td className="p-3">รายจ่ายทั้งหมด (รวม VAT {vatPercent}%)</td>
                        <td className="p-3 text-right tabular-nums font-mono">{formatBaht(Math.round(standardCost.totalExpenses / durationMonths))}</td>
                        <td className="p-3 text-right tabular-nums font-mono text-blue-900">{formatBaht(standardCost.totalExpenses)}</td>
                      </tr>
                      <tr className="bg-emerald-50/70 font-extrabold text-emerald-950 text-sm">
                        <td className="p-3">ผลต่าง (กำไรส่วนต่างจากราคากลาง)</td>
                        <td className="p-3 text-right tabular-nums font-mono">{formatBaht(Math.round(standardCost.diffMargin / durationMonths))}</td>
                        <td className="p-3 text-right tabular-nums font-mono text-emerald-700">{formatBaht(standardCost.diffMargin)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
