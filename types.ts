export type JobType = 
  | 'จ้างเหมาบริการทำความสะอาดอาคาร'
  | 'จ้างเหมาบริการรักษาความปลอดภัย'
  | 'จ้างเหมาบริการดูแลภูมิทัศน์และคนสวน'
  | 'จ้างเหมาบริการงานช่างและบำรุงรักษาอาคาร'
  | 'จ้างเหมาบริการพนักงานขับรถและยานพาหนะ'
  | 'จ้างเหมาบริการธุรการและสนับสนุนทั่วไป'
  | 'งานบริการอื่นๆ';

export type WorkScheduleType = 
  | 'mon_fri'            // จันทร์ - ศุกร์ (หยุด เสาร์-อาทิตย์ ~ 22 วัน/เดือน)
  | 'mon_fri_last_sat'   // จันทร์ - ศุกร์ + ทำเฉพาะวันเสาร์สุดท้ายของเดือน (~ 23 วัน/เดือน)
  | 'mon_sat'            // จันทร์ - เสาร์ (ทำทุกวันเสาร์ ~ 26 วัน/เดือน)
  | 'everyday_airport'   // ทำงานทุกวัน 30-31 วัน/เดือน (สนามบิน/รพ./24 ชม. สลับกะ & OT)
  | 'custom';            // กำหนดจำนวนวันทำงานเอง

export interface EBiddingProject {
  id: string;
  projectNo: string;            // เลขที่โครงการ e.g. "69089470200"
  fiscalYear: number;           // ปีงบประมาณ e.g. 2567, 2568, 2569
  agencyName: string;           // ชื่อส่วนราชการ / หน่วยงาน
  projectName: string;          // ชื่อโครงการ
  jobType: JobType;             // ประเภทงาน
  medianPrice: number;          // ราคากลาง (บาท)
  budgetPrice: number;          // ราคางบประมาณ (บาท)
  winningPrice: number;         // ราคาที่ชนะ / ราคาเสนอ (บาท)
  winnerName: string;           // ชื่อผู้ชนะ
  diffFromMedian: number;       // ผลต่างจากราคากลาง (บาท) [ราคากลาง - ราคาชนะ]
  diffFromMedianPercent: number;// ผลต่างจากราคากลาง (%)
  diffFromBudget: number;       // ผลต่างจากราคางบประมาณ (บาท) [งบประมาณ - ราคาชนะ]
  diffFromBudgetPercent: number;// ผลต่างจากราคางบประมาณ (%)
  winningToMedianPercent: number;// ราคาชนะคิดเป็น % ของราคากลาง
  winningToBudgetPercent: number;// ราคาชนะคิดเป็น % ของงบประมาณ
  totalWorkers: number;         // จำนวนคนงานทั้งหมด
  supervisors: number;          // จำนวนหัวหน้างาน
  workerStaff: number;          // จำนวนคนงานปฏิบัติการ
  durationMonths: number;       // ระยะเวลาสัญญา (เดือน)
  location: string;             // พื้นที่ / จังหวัด
  workScheduleType?: WorkScheduleType; // รูปแบบวันทำงาน
  workingDaysPerMonth?: number; // จำนวนวันทำงาน/เดือน
  notes?: string;               // หมายเหตุ หรือ สเปกสำคัญ

  // Standard Government Procurement Costing Fields (ตามสูตรจริงของระบบ e-Bidding)
  areaSqM?: number;             // พื้นที่ทำงาน (ตร.ม.)
  startDate?: string;           // วันเริ่มสัญญา (ISO Date string)
  endDate?: string;             // วันสิ้นสุดสัญญา (ISO Date string)
  supervisorWage?: number;      // เงินเดือนหัวหน้าคนงาน (บาท/คน/เดือน)
  workerWage?: number;          // เงินเดือนคนงาน (บาท/คน/เดือน)
  socialSecurityPercent?: number; // ค่าประกันสังคม % (เช่น 5%)
  managementFeePerPerson?: number; // ค่าบริหารจัดการ (บาท/คน/เดือน เช่น 900 บาท)
  materialEquipmentPerPerson?: number; // ค่าวัสดุอุปกรณ์ (บาท/คน/เดือน เช่น 1,000 บาท)
  vatPercent?: number;          // ภาษีมูลค่าเพิ่ม VAT % (เช่น 7%)
  totalExpenses?: number;       // รายจ่ายทั้งหมดรวม VAT (บาท)
  diffMargin?: number;          // ผลต่าง / กำไรส่วนต่างจากราคากลาง (บาท)
  recordedBy?: string;          // บันทึกโดย (เช่น "ผู้ดูแลระบบ")

  createdAt: string;
  updatedAt?: string;
}

export interface CostBreakdown {
  dailyMinWage: number;
  workScheduleType: WorkScheduleType;
  workingDaysPerMonth: number;
  isMonthlyFixedWage: boolean;
  baseWorkerMonthlyWage: number;
  monthlyLaborBase: number;
  
  // Overtime & Weekend / Holiday additions
  hasOvertime: boolean;
  otDaysPerMonth: number;
  otHoursPerDay: number;
  otHourlyRate: number;
  otDailyRate: number;
  otWorkersCount: number;
  totalOTCostPerMonth: number;
  nightShiftAllowancePerPerson: number;
  totalShiftAllowancePerMonth: number;
  
  // Weekend / Holiday Skeleton Crew (เวรวันหยุดเฉพาะบางคน เช่น 8 คน มา 2 คน)
  hasWeekendSkeletonCrew?: boolean;
  weekendDutyDaysPerMonth?: number;       // จำนวนวันหยุดต่อเดือน (เช่น 8 วัน = ส.-อา. 4 สัปดาห์)
  weekendWorkersCount?: number;           // จำนวนคนที่มาเข้าเวรวันหยุด (เช่น 2 คน จาก 8 คน)
  weekendDailyRate?: number;              // ค่าจ้างวันหยุดต่อคนต่อวัน (เช่น 2 เท่า = 740-800 บ./วัน)
  totalWeekendSkeletonCostPerMonth?: number; // รวมค่าจ้างเวรวันหยุดต่อเดือน

  totalLaborBaseWithOT: number;

  supervisorMonthlyWage: number;
  socialSecurity: number;       // ประกันสังคม 5%
  severanceAndWelfare: number;  // เงินชดเชย & สวัสดิการ
  uniformAndPPE: number;        // เครื่องแบบ & อุปกรณ์ป้องกัน
  totalLaborCostPerMonth: number;
  
  consumablesPerWorkerPerMonth: number; // วัสดุสิ้นเปลือง / ฟุ่มเฟือย / เคมีภัณฑ์
  totalConsumablesPerMonth: number;

  machineryDepreciationPerMonth: number; // ค่าเสื่อมและบำรุงรักษาเครื่องจักร
  
  overheadRatePercent: number;  // ค่าบริหารจัดการ %
  overheadCostPerMonth: number;
  
  targetProfitPercent: number;  // กำไรที่ต้องการ %
  profitPerMonth: number;
  
  subtotalMonthlyCost: number;
  subtotalAnnualCost: number;
  
  withholdingTaxPercent: number; // ภาษีหัก ณ ที่จ่าย 1%
  vatPercent: number;            // ภาษีมูลค่าเพิ่ม 7%
  
  recommendedPriceMonthly: number;
  recommendedPriceTotal: number;

  // Comparison Metrics
  costIf30DaysMonthly: number;
  costIf30DaysTotal: number;
  savingsVs30DaysMonthly: number;
  savingsVs30DaysTotal: number;
}

export interface MarketAnalytics {
  totalProjects: number;
  totalMedianValue: number;
  totalBudgetValue: number;
  totalWinningValue: number;
  avgDiscountFromMedianPercent: number;
  avgDiscountFromBudgetPercent: number;
  avgWinningToMedianPercent: number;
  avgWinningToBudgetPercent: number;
  medianDiscountFromMedianPercent: number;
  avgCostPerWorkerPerMonth: number;
  minDiscountPercent: number;
  maxDiscountPercent: number;
  topWinners: { name: string; count: number; totalWon: number; avgDiscount: number }[];
  jobTypeStats: {
    type: JobType;
    count: number;
    avgDiscountMedian: number;
    avgDiscountBudget: number;
    avgCostPerPersonMonth: number;
  }[];
  agencyStats: {
    agency: string;
    count: number;
    avgDiscountMedian: number;
    totalBudget: number;
  }[];
  discountDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export interface StandardCostCalculation {
  totalWorkers: number;
  supervisors: number;
  workerStaff: number;
  supervisorWage: number;
  workerWage: number;
  totalMonthlySalary: number;
  socialSecurityPercent: number;
  monthlySocialSecurity: number;
  managementFeePerPerson: number;
  monthlyManagementFee: number;
  materialEquipmentPerPerson: number;
  monthlyMaterialEquipment: number;
  monthlyBeforeVat: number;
  durationMonths: number;
  totalBeforeVat: number;
  vatPercent: number;
  vatAmount: number;
  totalExpenses: number;
  medianPrice: number;
  diffMargin: number;
  diffMarginPercent: number;
  areaSqM?: number;
  costPerSqM?: number;
}

export interface CostSimulationRecord {
  id: string;
  scenarioName: string;
  jobType: JobType;
  agencyName: string;
  location: string;
  durationMonths: number;
  medianPrice: number;
  budgetPrice: number;
  
  // Standard Government Procurement Costing Fields (ตรงตามสูตรคำนวณจริง 100%)
  areaSqM?: number;
  startDate?: string;
  endDate?: string;
  supervisorWage?: number;
  workerWage?: number;
  socialSecurityPercent?: number;
  managementFeePerPerson?: number;
  materialEquipmentPerPerson?: number;
  vatPercent?: number;
  totalExpenses?: number;
  diffMargin?: number;
  diffMarginPercent?: number;
  calculationMode?: 'standard' | 'advanced';
  recordedBy?: string;

  // Labor config
  totalWorkers: number;
  supervisors: number;
  dailyMinWage: number;
  supervisorMonthlyWage: number;
  workScheduleType: WorkScheduleType;
  customDays?: number;
  isMonthlyFixedWage?: boolean;
  
  // OT & Shift
  hasOvertime: boolean;
  otHoursPerDay: number;
  otDaysPerMonth: number;
  customOtHourlyRate: number;
  customOtDailyRate: number;
  otWorkersCount: number;
  nightShiftAllowance: number;
  
  // Weekend skeleton
  hasWeekendSkeletonCrew: boolean;
  weekendDutyDaysPerMonth: number;
  weekendWorkersCount: number;
  customWeekendDailyRate: number;
  
  // Costs & Margin
  consumablesPerWorker: number;
  machineryMonthly: number;
  overheadPercent: number;
  profitPercent: number;
  
  // Calculation Breakdown Summary
  totalLaborCostPerMonth: number;
  totalConsumablesPerMonth: number;
  machineryDepreciationPerMonth: number;
  overheadCostPerMonth: number;
  profitPerMonth: number;
  subtotalMonthlyCost: number;
  recommendedPriceMonthly: number;
  recommendedPriceTotal: number;
  discountFromMedianPercent: number;
  discountFromBudgetPercent: number;
  
  // Strategy & Competitor Intelligence
  competitorStrategyNotes?: string;
  competitorTargetName?: string;
  expectedCompetitorPrice?: number;
  
  createdAt: string;
  updatedAt: string;
}

