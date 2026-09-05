import { EBiddingProject, CostBreakdown, MarketAnalytics, JobType, WorkScheduleType, StandardCostCalculation } from '../types';

export function calculateStandardProcurementCost(params: {
  supervisorCount: number;
  workerCount: number;
  supervisorWage: number;
  workerWage: number;
  socialSecurityPercent?: number;
  managementFeePerPerson?: number;
  materialEquipmentPerPerson?: number;
  vatPercent?: number;
  durationMonths?: number;
  medianPrice?: number;
  areaSqM?: number;
}): StandardCostCalculation {
  const {
    supervisorCount = 1,
    workerCount = 5,
    supervisorWage = 12000,
    workerWage = 9900,
    socialSecurityPercent = 5,
    managementFeePerPerson = 900,
    materialEquipmentPerPerson = 1000,
    vatPercent = 7,
    durationMonths = 12,
    medianPrice = 0,
    areaSqM = 0,
  } = params;

  const totalWorkers = supervisorCount + workerCount;
  const totalMonthlySalary = (supervisorCount * supervisorWage) + (workerCount * workerWage);
  const monthlySocialSecurity = Math.round(totalMonthlySalary * (socialSecurityPercent / 100));
  const monthlyManagementFee = totalWorkers * managementFeePerPerson;
  const monthlyMaterialEquipment = totalWorkers * materialEquipmentPerPerson;
  
  const monthlyBeforeVat = totalMonthlySalary + monthlySocialSecurity + monthlyManagementFee + monthlyMaterialEquipment;
  const totalBeforeVat = monthlyBeforeVat * durationMonths;
  const vatAmount = Math.round(totalBeforeVat * (vatPercent / 100));
  const totalExpenses = totalBeforeVat + vatAmount;

  const diffMargin = medianPrice > 0 ? (medianPrice - totalExpenses) : 0;
  const diffMarginPercent = medianPrice > 0 ? Number(((diffMargin / medianPrice) * 100).toFixed(2)) : 0;
  const costPerSqM = areaSqM > 0 ? Number((totalExpenses / areaSqM).toFixed(2)) : 0;

  return {
    totalWorkers,
    supervisors: supervisorCount,
    workerStaff: workerCount,
    supervisorWage,
    workerWage,
    totalMonthlySalary,
    socialSecurityPercent,
    monthlySocialSecurity,
    managementFeePerPerson,
    monthlyManagementFee,
    materialEquipmentPerPerson,
    monthlyMaterialEquipment,
    monthlyBeforeVat,
    durationMonths,
    totalBeforeVat,
    vatPercent,
    vatAmount,
    totalExpenses,
    medianPrice,
    diffMargin,
    diffMarginPercent,
    areaSqM,
    costPerSqM,
  };
}

export function calculateProjectMetrics(
  medianPrice: number,
  budgetPrice: number,
  winningPrice: number,
  totalWorkers: number,
  supervisors: number
) {
  const safeMedian = medianPrice || 1;
  const safeBudget = budgetPrice || 1;
  
  const diffFromMedian = medianPrice - winningPrice;
  const diffFromMedianPercent = Number(((diffFromMedian / safeMedian) * 100).toFixed(2));
  
  const diffFromBudget = budgetPrice - winningPrice;
  const diffFromBudgetPercent = Number(((diffFromBudget / safeBudget) * 100).toFixed(2));
  
  const winningToMedianPercent = Number(((winningPrice / safeMedian) * 100).toFixed(2));
  const winningToBudgetPercent = Number(((winningPrice / safeBudget) * 100).toFixed(2));
  
  const workerStaff = Math.max(0, totalWorkers - supervisors);
  
  return {
    diffFromMedian,
    diffFromMedianPercent,
    diffFromBudget,
    diffFromBudgetPercent,
    winningToMedianPercent,
    winningToBudgetPercent,
    workerStaff,
  };
}

export function computeMarketAnalytics(projects: EBiddingProject[]): MarketAnalytics {
  if (!projects || projects.length === 0) {
    return {
      totalProjects: 0,
      totalMedianValue: 0,
      totalBudgetValue: 0,
      totalWinningValue: 0,
      avgDiscountFromMedianPercent: 0,
      avgDiscountFromBudgetPercent: 0,
      avgWinningToMedianPercent: 0,
      avgWinningToBudgetPercent: 0,
      medianDiscountFromMedianPercent: 0,
      avgCostPerWorkerPerMonth: 0,
      minDiscountPercent: 0,
      maxDiscountPercent: 0,
      topWinners: [],
      jobTypeStats: [],
      agencyStats: [],
      discountDistribution: [],
    };
  }

  const totalProjects = projects.length;
  let totalMedianValue = 0;
  let totalBudgetValue = 0;
  let totalWinningValue = 0;
  let totalDiscountMedianPct = 0;
  let totalDiscountBudgetPct = 0;
  let totalWinningMedianPct = 0;
  let totalWinningBudgetPct = 0;
  let totalWorkerMonths = 0;

  const discountMedianList: number[] = [];
  const winnerMap: Record<string, { count: number; totalWon: number; discounts: number[] }> = {};
  const jobTypeMap: Record<string, { count: number; discountsMedian: number[]; discountsBudget: number[]; totalWinning: number; workerMonths: number }> = {};
  const agencyMap: Record<string, { count: number; discountsMedian: number[]; totalBudget: number }> = {};

  // Distribution bins: <5%, 5-10%, 10-15%, 15-20%, >20%
  const distributionBins: Record<string, number> = {
    '0% - 5%': 0,
    '5.1% - 10%': 0,
    '10.1% - 15%': 0,
    '15.1% - 20%': 0,
    '> 20%': 0,
  };

  projects.forEach((p) => {
    totalMedianValue += p.medianPrice;
    totalBudgetValue += p.budgetPrice;
    totalWinningValue += p.winningPrice;
    totalDiscountMedianPct += p.diffFromMedianPercent;
    totalDiscountBudgetPct += p.diffFromBudgetPercent;
    totalWinningMedianPct += p.winningToMedianPercent;
    totalWinningBudgetPct += p.winningToBudgetPercent;

    const workerMonth = (p.totalWorkers || 1) * (p.durationMonths || 12);
    totalWorkerMonths += workerMonth;
    discountMedianList.push(p.diffFromMedianPercent);

    // Distribution
    const d = p.diffFromMedianPercent;
    if (d <= 5) distributionBins['0% - 5%']++;
    else if (d <= 10) distributionBins['5.1% - 10%']++;
    else if (d <= 15) distributionBins['10.1% - 15%']++;
    else if (d <= 20) distributionBins['15.1% - 20%']++;
    else distributionBins['> 20%']++;

    // Winners Map
    const winner = p.winnerName?.trim() || 'ไม่ระบุ';
    if (!winnerMap[winner]) {
      winnerMap[winner] = { count: 0, totalWon: 0, discounts: [] };
    }
    winnerMap[winner].count += 1;
    winnerMap[winner].totalWon += p.winningPrice;
    winnerMap[winner].discounts.push(p.diffFromMedianPercent);

    // JobType Map
    const jType = p.jobType || 'งานบริการอื่นๆ';
    if (!jobTypeMap[jType]) {
      jobTypeMap[jType] = { count: 0, discountsMedian: [], discountsBudget: [], totalWinning: 0, workerMonths: 0 };
    }
    jobTypeMap[jType].count += 1;
    jobTypeMap[jType].discountsMedian.push(p.diffFromMedianPercent);
    jobTypeMap[jType].discountsBudget.push(p.diffFromBudgetPercent);
    jobTypeMap[jType].totalWinning += p.winningPrice;
    jobTypeMap[jType].workerMonths += workerMonth;

    // Agency Map
    const agency = p.agencyName?.trim() || 'ไม่ระบุ';
    if (!agencyMap[agency]) {
      agencyMap[agency] = { count: 0, discountsMedian: [], totalBudget: 0 };
    }
    agencyMap[agency].count += 1;
    agencyMap[agency].discountsMedian.push(p.diffFromMedianPercent);
    agencyMap[agency].totalBudget += p.budgetPrice;
  });

  discountMedianList.sort((a, b) => a - b);
  const midIndex = Math.floor(discountMedianList.length / 2);
  const medianDiscountFromMedianPercent =
    discountMedianList.length % 2 !== 0
      ? discountMedianList[midIndex]
      : (discountMedianList[midIndex - 1] + discountMedianList[midIndex]) / 2;

  const topWinners = Object.entries(winnerMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalWon: data.totalWon,
      avgDiscount: Number((data.discounts.reduce((a, b) => a + b, 0) / data.discounts.length).toFixed(2)),
    }))
    .sort((a, b) => b.totalWon - a.totalWon)
    .slice(0, 8);

  const jobTypeStats = Object.entries(jobTypeMap).map(([type, data]) => ({
    type: type as JobType,
    count: data.count,
    avgDiscountMedian: Number((data.discountsMedian.reduce((a, b) => a + b, 0) / data.count).toFixed(2)),
    avgDiscountBudget: Number((data.discountsBudget.reduce((a, b) => a + b, 0) / data.count).toFixed(2)),
    avgCostPerPersonMonth: data.workerMonths > 0 ? Math.round(data.totalWinning / data.workerMonths) : 0,
  }));

  const agencyStats = Object.entries(agencyMap)
    .map(([agency, data]) => ({
      agency,
      count: data.count,
      avgDiscountMedian: Number((data.discountsMedian.reduce((a, b) => a + b, 0) / data.count).toFixed(2)),
      totalBudget: data.totalBudget,
    }))
    .sort((a, b) => b.totalBudget - a.totalBudget)
    .slice(0, 8);

  const discountDistribution = Object.entries(distributionBins).map(([range, count]) => ({
    range,
    count,
    percentage: Number(((count / totalProjects) * 100).toFixed(1)),
  }));

  const avgCostPerWorkerPerMonth = totalWorkerMonths > 0 ? Math.round(totalWinningValue / totalWorkerMonths) : 0;

  return {
    totalProjects,
    totalMedianValue,
    totalBudgetValue,
    totalWinningValue,
    avgDiscountFromMedianPercent: Number((totalDiscountMedianPct / totalProjects).toFixed(2)),
    avgDiscountFromBudgetPercent: Number((totalDiscountBudgetPct / totalProjects).toFixed(2)),
    avgWinningToMedianPercent: Number((totalWinningMedianPct / totalProjects).toFixed(2)),
    avgWinningToBudgetPercent: Number((totalWinningBudgetPct / totalProjects).toFixed(2)),
    medianDiscountFromMedianPercent: Number(medianDiscountFromMedianPercent.toFixed(2)),
    avgCostPerWorkerPerMonth,
    minDiscountPercent: discountMedianList[0] || 0,
    maxDiscountPercent: discountMedianList[discountMedianList.length - 1] || 0,
    topWinners,
    jobTypeStats,
    agencyStats,
    discountDistribution,
  };
}

export function estimateCostStructure(params: {
  totalWorkers: number;
  supervisors: number;
  dailyMinWage: number;
  workScheduleType?: WorkScheduleType;
  workingDaysPerMonth?: number;
  isMonthlyFixedWage?: boolean;
  hasOvertime?: boolean;
  otDaysPerMonth?: number;
  otHoursPerDay?: number;
  otHourlyRate?: number;
  otDailyRate?: number;
  otWorkersCount?: number;
  nightShiftAllowancePerPerson?: number;
  hasWeekendSkeletonCrew?: boolean;
  weekendDutyDaysPerMonth?: number;
  weekendWorkersCount?: number;
  weekendDailyRate?: number;
  supervisorMonthlyWage?: number;
  consumablesPerWorkerPerMonth: number;
  machineryDepreciationPerMonth: number;
  uniformAndPPEPerPersonPerYear?: number;
  overheadRatePercent: number;
  targetProfitPercent: number;
  durationMonths?: number;
}): CostBreakdown {
  const {
    totalWorkers,
    supervisors,
    dailyMinWage,
    workScheduleType = 'mon_fri',
    workingDaysPerMonth: customDays,
    isMonthlyFixedWage = false,
    hasOvertime = false,
    otDaysPerMonth = 0,
    otHoursPerDay = 0,
    otHourlyRate: customOtHourlyRate,
    otDailyRate: customOtDailyRate,
    otWorkersCount = 0,
    nightShiftAllowancePerPerson = 0,
    hasWeekendSkeletonCrew = false,
    weekendDutyDaysPerMonth = 8,
    weekendWorkersCount = 0,
    weekendDailyRate: customWeekendDailyRate,
    supervisorMonthlyWage = 18000,
    consumablesPerWorkerPerMonth,
    machineryDepreciationPerMonth,
    uniformAndPPEPerPersonPerYear = 1800,
    overheadRatePercent,
    targetProfitPercent,
    durationMonths = 12,
  } = params;

  // Determine working days per month based on schedule preset
  let effectiveWorkingDays = 22;
  if (customDays !== undefined && customDays > 0) {
    effectiveWorkingDays = customDays;
  } else {
    switch (workScheduleType) {
      case 'mon_fri':
        effectiveWorkingDays = 22; // จันทร์ - ศุกร์ (หยุด ส.-อา.)
        break;
      case 'mon_fri_last_sat':
        effectiveWorkingDays = 23; // จันทร์ - ศุกร์ + เสาร์สุดท้ายของเดือน
        break;
      case 'mon_sat':
        effectiveWorkingDays = 26; // จันทร์ - เสาร์ (ทำทุกเสาร์)
        break;
      case 'everyday_airport':
        effectiveWorkingDays = 30; // สนามบิน / รพ. / 24 ชม. ทำงานทุกวัน
        break;
      case 'custom':
      default:
        effectiveWorkingDays = customDays || 22;
        break;
    }
  }

  const workerStaff = Math.max(0, totalWorkers - supervisors);
  
  // 1. ค่าแรงงานฐาน (Base Labor)
  // หากเป็นแบบเหมาจ่าย 30 วันตามเกณฑ์มติ ครม. ให้คิด 30 วัน หากคิดตามวันทำงานจริงคิด effectiveWorkingDays
  const calculationDays = isMonthlyFixedWage ? 30 : effectiveWorkingDays;
  const baseWorkerMonthlyWage = dailyMinWage * calculationDays;
  const monthlyLaborBase = workerStaff * baseWorkerMonthlyWage + supervisors * supervisorMonthlyWage;

  // 2. การคำนวณค่าล่วงเวลา (Overtime - OT) และวันทำงานเพิ่ม/วันหยุด
  const standardHourlyWage = dailyMinWage / 8;
  const standardOtHourlyRate = Math.round(standardHourlyWage * 1.5);
  const otHourlyRate = customOtHourlyRate || standardOtHourlyRate;
  const otDailyRate = customOtDailyRate || (dailyMinWage * 2); // ค่าจ้างทำงานในวันหยุด (2 เท่า)

  let totalOTCostPerMonth = 0;
  const activeOtWorkers = otWorkersCount > 0 ? Math.min(otWorkersCount, totalWorkers) : (hasOvertime ? totalWorkers : 0);

  if (hasOvertime || workScheduleType === 'everyday_airport' || otDaysPerMonth > 0 || otHoursPerDay > 0) {
    // คิดจาก OT รายชั่วโมงในวันทำงาน
    const monthlyHourlyOT = activeOtWorkers * otHoursPerDay * calculationDays * otHourlyRate;
    // คิดจาก OT วันทำงานเพิ่ม / วันหยุดเสาร์-อาทิตย์ (แบบคิดทุกคนที่เลือก)
    const monthlyDailyOT = activeOtWorkers * otDaysPerMonth * otDailyRate;
    totalOTCostPerMonth = Math.round(monthlyHourlyOT + monthlyDailyOT);
  }

  // 2.1 Weekend / Holiday Skeleton Crew (เวรวันหยุดเฉพาะบางคน เช่น มีคนงาน 8 คน มาเวรวันหยุด 2 คน)
  const activeWeekendDailyRate = customWeekendDailyRate || (dailyMinWage * 2);
  const activeWeekendWorkers = Math.min(weekendWorkersCount, totalWorkers);
  let totalWeekendSkeletonCostPerMonth = 0;
  if (hasWeekendSkeletonCrew && activeWeekendWorkers > 0 && weekendDutyDaysPerMonth > 0) {
    totalWeekendSkeletonCostPerMonth = Math.round(activeWeekendWorkers * weekendDutyDaysPerMonth * activeWeekendDailyRate);
  }

  // เบี้ยเลี้ยงกะดึก / ค่าความเสี่ยงพิเศษ (เช่น งานสนามบิน 24 ชั่วโมง)
  const totalShiftAllowancePerMonth = Math.round(activeOtWorkers * nightShiftAllowancePerPerson);

  const totalLaborBaseWithOT = monthlyLaborBase + totalOTCostPerMonth + totalWeekendSkeletonCostPerMonth + totalShiftAllowancePerMonth;

  // 3. ประกันสังคม 5% ของค่าจ้างฐาน (เพดาน 750 บาท/คน/เดือน)
  const workerSocialSec = Math.min(baseWorkerMonthlyWage * 0.05, 750);
  const supervisorSocialSec = Math.min(supervisorMonthlyWage * 0.05, 750);
  const socialSecurity = Math.round(workerStaff * workerSocialSec + supervisors * supervisorSocialSec);

  // 4. สำรองเงินชดเชยตามกฎหมาย & กองทุนเงินทดแทน 4.5% ของฐานค่าจ้าง
  const severanceAndWelfare = Math.round(totalLaborBaseWithOT * 0.045);

  // 5. ชุดเครื่องแบบ PPE และตรวจสุขภาพ (เฉลี่ยต่อเดือน)
  const uniformAndPPE = Math.round((totalWorkers * uniformAndPPEPerPersonPerYear) / 12);

  // รวมต้นทุนแรงงานและสวัสดิการต่อเดือน
  const totalLaborCostPerMonth = totalLaborBaseWithOT + socialSecurity + severanceAndWelfare + uniformAndPPE;

  // 6. ค่าวัสดุสิ้นเปลือง / เคมีภัณฑ์ / ถุงขยะ / ฟุ่มเฟือยต่อเดือน
  const totalConsumablesPerMonth = totalWorkers * consumablesPerWorkerPerMonth;

  // 7. ต้นทุนทางตรงรวมต่อเดือน (Direct Monthly Cost)
  const directMonthlyCost = totalLaborCostPerMonth + totalConsumablesPerMonth + machineryDepreciationPerMonth;

  // 8. ค่าบริหารจัดการสำนักงาน (Overhead)
  const overheadCostPerMonth = Math.round(directMonthlyCost * (overheadRatePercent / 100));

  // 9. ต้นทุนรวมก่อนกำไร
  const subtotalBeforeProfitMonthly = directMonthlyCost + overheadCostPerMonth;

  // 10. กำไรสุทธิคาดการณ์ (Target Profit)
  const profitPerMonth = Math.round(subtotalBeforeProfitMonthly * (targetProfitPercent / 100));

  // 11. ราคารวมต่อเดือนก่อนภาษี
  const subtotalMonthlyCost = subtotalBeforeProfitMonthly + profitPerMonth;
  const subtotalAnnualCost = subtotalMonthlyCost * durationMonths;

  // ภาษี (VAT 7%, หัก ณ ที่จ่าย 1%)
  const withholdingTaxPercent = 1;
  const vatPercent = 7;

  // ราคาที่ควรเสนอ (รวม VAT 7%)
  const recommendedPriceMonthly = Math.round(subtotalMonthlyCost * (1 + vatPercent / 100));
  const recommendedPriceTotal = recommendedPriceMonthly * durationMonths;

  // เปรียบเทียบ: หากคู่แข่งคำนวณแบบ 30 วันเต็ม (ไม่ปรับตามวันทำงานราชการ 22 วัน)
  const worker30Wage = dailyMinWage * 30;
  const labor30Base = workerStaff * worker30Wage + supervisors * supervisorMonthlyWage;
  const soc30 = Math.min(worker30Wage * 0.05, 750) * workerStaff + Math.min(supervisorMonthlyWage * 0.05, 750) * supervisors;
  const sev30 = Math.round(labor30Base * 0.045);
  const labor30Cost = labor30Base + soc30 + sev30 + uniformAndPPE;
  const direct30 = labor30Cost + totalConsumablesPerMonth + machineryDepreciationPerMonth;
  const oh30 = Math.round(direct30 * (overheadRatePercent / 100));
  const prof30 = Math.round((direct30 + oh30) * (targetProfitPercent / 100));
  const costIf30DaysMonthly = Math.round((direct30 + oh30 + prof30) * (1 + vatPercent / 100));
  const costIf30DaysTotal = costIf30DaysMonthly * durationMonths;

  const savingsVs30DaysMonthly = costIf30DaysMonthly - recommendedPriceMonthly;
  const savingsVs30DaysTotal = costIf30DaysTotal - recommendedPriceTotal;

  return {
    dailyMinWage,
    workScheduleType,
    workingDaysPerMonth: effectiveWorkingDays,
    isMonthlyFixedWage,
    baseWorkerMonthlyWage,
    monthlyLaborBase,
    hasOvertime,
    otDaysPerMonth,
    otHoursPerDay,
    otHourlyRate,
    otDailyRate,
    otWorkersCount: activeOtWorkers,
    totalOTCostPerMonth,
    nightShiftAllowancePerPerson,
    totalShiftAllowancePerMonth,
    hasWeekendSkeletonCrew,
    weekendDutyDaysPerMonth,
    weekendWorkersCount: activeWeekendWorkers,
    weekendDailyRate: activeWeekendDailyRate,
    totalWeekendSkeletonCostPerMonth,
    totalLaborBaseWithOT,
    supervisorMonthlyWage,
    socialSecurity,
    severanceAndWelfare,
    uniformAndPPE,
    totalLaborCostPerMonth,
    consumablesPerWorkerPerMonth,
    totalConsumablesPerMonth,
    machineryDepreciationPerMonth,
    overheadRatePercent,
    overheadCostPerMonth,
    targetProfitPercent,
    profitPerMonth,
    subtotalMonthlyCost,
    subtotalAnnualCost,
    withholdingTaxPercent,
    vatPercent,
    recommendedPriceMonthly,
    recommendedPriceTotal,
    costIf30DaysMonthly,
    costIf30DaysTotal,
    savingsVs30DaysMonthly,
    savingsVs30DaysTotal,
  };
}

export function formatBaht(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ฿';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(amount).replace('THB', '฿');
}

export function formatNumber(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('th-TH').format(amount);
}

export function formatPercent(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  return `${val.toFixed(2)}%`;
}
