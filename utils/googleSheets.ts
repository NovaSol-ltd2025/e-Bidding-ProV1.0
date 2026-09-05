import { EBiddingProject } from '../types';

export const SHEETS_HEADERS = [
  'เลขที่โครงการ (Project No.)',
  'ปีงบประมาณ (Fiscal Year)',
  'ชื่อส่วนราชการ / หน่วยงาน (Agency)',
  'ชื่อโครงการ (Project Name)',
  'ประเภทงาน (Job Type)',
  'ราคากลาง (Median Price)',
  'ราคางบประมาณ (Budget Price)',
  'ราคาที่ชนะ (Winning Price)',
  'ชื่อผู้ชนะ (Winner Name)',
  'ผลต่างจากราคากลาง (Diff Median ฿)',
  'ผลต่างจากราคากลาง (% Diff Median)',
  'ผลต่างจากงบประมาณ (Diff Budget ฿)',
  'ผลต่างจากงบประมาณ (% Diff Budget)',
  'ราคาชนะคิดเป็น % ราคากลาง',
  'ราคาชนะคิดเป็น % งบประมาณ',
  'จำนวนคนงานทั้งหมด (Total Workers)',
  'จำนวนหัวหน้างาน (Supervisors)',
  'คนงานปฏิบัติการ (Workers)',
  'ระยะเวลาสัญญา (เดือน)',
  'พื้นที่ / จังหวัด (Location)',
  'หมายเหตุ (Notes)',
  'วันที่บันทึก (Created At)',
];

export function projectToSheetRow(p: EBiddingProject): any[] {
  return [
    p.projectNo,
    p.fiscalYear,
    p.agencyName,
    p.projectName,
    p.jobType,
    p.medianPrice,
    p.budgetPrice,
    p.winningPrice,
    p.winnerName,
    p.diffFromMedian,
    `${p.diffFromMedianPercent}%`,
    p.diffFromBudget,
    `${p.diffFromBudgetPercent}%`,
    `${p.winningToMedianPercent}%`,
    `${p.winningToBudgetPercent}%`,
    p.totalWorkers,
    p.supervisors,
    p.workerStaff,
    p.durationMonths,
    p.location,
    p.notes || '',
    p.createdAt || new Date().toISOString(),
  ];
}

export function parseSheetRowToProject(row: any[], index: number): EBiddingProject | null {
  if (!row || row.length < 5) return null;
  const projectNo = String(row[0] || '').trim();
  if (!projectNo || projectNo.includes('เลขที่โครงการ')) return null;

  const fiscalYear = Number(row[1]) || new Date().getFullYear() + 543;
  const agencyName = String(row[2] || 'ไม่ระบุ');
  const projectName = String(row[3] || 'โครงการจ้างเหมาบริการ');
  const jobType = (row[4] || 'จ้างเหมาบริการทำความสะอาดอาคาร') as any;
  const medianPrice = Number(String(row[5]).replace(/[^0-9.-]+/g, '')) || 0;
  const budgetPrice = Number(String(row[6]).replace(/[^0-9.-]+/g, '')) || medianPrice;
  const winningPrice = Number(String(row[7]).replace(/[^0-9.-]+/g, '')) || 0;
  const winnerName = String(row[8] || 'ไม่ระบุ');
  
  const totalWorkers = Number(row[15]) || 1;
  const supervisors = Number(row[16]) || 0;
  const workerStaff = Math.max(0, totalWorkers - supervisors);
  const durationMonths = Number(row[18]) || 12;
  const location = String(row[19] || 'กรุงเทพมหานคร');
  const notes = String(row[20] || '');

  const safeMedian = medianPrice || 1;
  const safeBudget = budgetPrice || 1;
  const diffFromMedian = medianPrice - winningPrice;
  const diffFromMedianPercent = Number(((diffFromMedian / safeMedian) * 100).toFixed(2));
  const diffFromBudget = budgetPrice - winningPrice;
  const diffFromBudgetPercent = Number(((diffFromBudget / safeBudget) * 100).toFixed(2));
  const winningToMedianPercent = Number(((winningPrice / safeMedian) * 100).toFixed(2));
  const winningToBudgetPercent = Number(((winningPrice / safeBudget) * 100).toFixed(2));

  return {
    id: `sheet-${Date.now()}-${index}`,
    projectNo,
    fiscalYear,
    agencyName,
    projectName,
    jobType,
    medianPrice,
    budgetPrice,
    winningPrice,
    winnerName,
    diffFromMedian,
    diffFromMedianPercent,
    diffFromBudget,
    diffFromBudgetPercent,
    winningToMedianPercent,
    winningToBudgetPercent,
    totalWorkers,
    supervisors,
    workerStaff,
    durationMonths,
    location,
    notes,
    createdAt: row[21] || new Date().toISOString(),
  };
}

export async function createEBiddingSpreadsheet(
  accessToken: string,
  title: string = 'e-Bidding Analytics Database (ระบบจัดเก็บข้อมูลประมูลภาครัฐ)'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'eBidding_Projects',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Cost_Simulations',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create spreadsheet: ${response.statusText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write Headers for both sheets
  try {
    await updateSheetValues(accessToken, spreadsheetId, 'eBidding_Projects!A1:V1', [SHEETS_HEADERS]);
    await updateSheetValues(accessToken, spreadsheetId, 'Cost_Simulations!A1:X1', [SIMULATION_SHEETS_HEADERS]);
  } catch (e) {
    console.warn('Initial headers setup error:', e);
  }

  return { spreadsheetId, spreadsheetUrl };
}

export async function updateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update sheet values: ${response.statusText}`);
  }

  return await response.json();
}

export async function appendSheetRows(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  rows: any[][]
) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to append rows: ${response.statusText}`);
  }

  return await response.json();
}

export async function readSheetRows(
  accessToken: string,
  spreadsheetId: string,
  range: string = 'eBidding_Data!A2:V'
): Promise<any[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read sheet: ${response.statusText}`);
  }

  const data = await response.json();
  return data.values || [];
}

// ----------------------------------------------------
// Cost Simulation Specific Sheets Logic
// ----------------------------------------------------
import { CostSimulationRecord } from '../types';

export const SIMULATION_SHEETS_HEADERS = [
  'รหัสจำลอง (Simulation ID)',
  'ชื่อแผนกลยุทธ์ (Scenario Name)',
  'ประเภทงาน (Job Type)',
  'หน่วยงาน (Agency)',
  'ราคากลาง (Median Price)',
  'ราคางบประมาณ (Budget Price)',
  'คนงานทั้งหมด (Workers)',
  'หัวหน้างาน (Supervisors)',
  'ค่าแรงขั้นต่ำ (Daily Wage)',
  'เงินเดือนหัวหน้า (Sup Wage)',
  'รูปแบบเวลาทำงาน (Schedule)',
  'มี OT หรือไม่ (Has OT)',
  'เวรวันหยุดเฉพาะบางคน (Weekend Skeleton)',
  'ต้นทุนแรงงาน/เดือน (Labor Cost/Mo)',
  'วัสดุสิ้นเปลือง/เดือน (Consumables/Mo)',
  'เครื่องจักร/เดือน (Machinery/Mo)',
  'ค่าบริหาร/เดือน (Overhead/Mo)',
  'กำไรเป้าหมาย % (Profit %)',
  'กำไรสุทธิ/เดือน (Profit/Mo)',
  'ราคาเสนอต่อเดือน (Monthly Price)',
  'ราคาเสนอตลอดสัญญา (Total Bid Price)',
  'ส่วนต่างราคากลาง % (% vs Median)',
  'คู่แข่งที่จับตา / กลยุทธ์ (Competitor Strategy)',
  'วันที่บันทึก (Timestamp)',
];

export function simulationToSheetRow(s: CostSimulationRecord): any[] {
  const scheduleLabel = 
    s.workScheduleType === 'mon_fri' ? 'จันทร์-ศุกร์ (22 วัน)' :
    s.workScheduleType === 'mon_fri_last_sat' ? 'จันทร์-ศุกร์ + เสาร์สิ้นเดือน (23 วัน)' :
    s.workScheduleType === 'mon_sat' ? 'จันทร์-เสาร์ (26 วัน)' :
    s.workScheduleType === 'everyday_airport' ? 'ทุกวัน 24 ชม. (สนามบิน/ศูนย์การค้า)' :
    `กำหนดเอง (${s.customDays || 22} วัน)`;

  const skeletonInfo = s.hasWeekendSkeletonCrew 
    ? `มีเวร (${s.weekendWorkersCount} คน x ${s.weekendDutyDaysPerMonth} วัน)` 
    : 'ไม่มี';

  const otInfo = s.hasOvertime 
    ? `มี OT (${s.otWorkersCount} คน, วันละ ${s.otHoursPerDay} ชม., ${s.otDaysPerMonth} วัน/ด.)` 
    : 'ไม่มี';

  return [
    s.id,
    s.scenarioName || 'แผนจำลองราคา',
    s.jobType,
    s.agencyName,
    s.medianPrice,
    s.budgetPrice,
    s.totalWorkers,
    s.supervisors,
    s.dailyMinWage,
    s.supervisorMonthlyWage,
    scheduleLabel,
    otInfo,
    skeletonInfo,
    s.totalLaborCostPerMonth,
    s.totalConsumablesPerMonth,
    s.machineryDepreciationPerMonth,
    s.overheadCostPerMonth,
    `${s.profitPercent}%`,
    s.profitPerMonth,
    s.recommendedPriceMonthly,
    s.recommendedPriceTotal,
    `${s.discountFromMedianPercent}%`,
    s.competitorStrategyNotes || s.competitorTargetName || '',
    s.updatedAt || s.createdAt || new Date().toISOString(),
  ];
}

export function parseSheetRowToSimulation(row: any[], index: number): CostSimulationRecord | null {
  if (!row || row.length < 6) return null;
  const id = String(row[0] || `sim-sheet-${Date.now()}-${index}`);
  if (id.includes('รหัสจำลอง')) return null;

  const scenarioName = String(row[1] || `แผนจำลอง #${index + 1}`);
  const jobType = (row[2] || 'จ้างเหมาบริการทำความสะอาดอาคาร') as any;
  const agencyName = String(row[3] || 'หน่วยงานภาครัฐ');
  const medianPrice = Number(String(row[4]).replace(/[^0-9.-]+/g, '')) || 0;
  const budgetPrice = Number(String(row[5]).replace(/[^0-9.-]+/g, '')) || medianPrice;
  const totalWorkers = Number(row[6]) || 10;
  const supervisors = Number(row[7]) || 1;
  const dailyMinWage = Number(row[8]) || 380;
  const supervisorMonthlyWage = Number(row[9]) || 18000;
  const totalLaborCostPerMonth = Number(String(row[13]).replace(/[^0-9.-]+/g, '')) || 0;
  const totalConsumablesPerMonth = Number(String(row[14]).replace(/[^0-9.-]+/g, '')) || 0;
  const machineryDepreciationPerMonth = Number(String(row[15]).replace(/[^0-9.-]+/g, '')) || 0;
  const overheadCostPerMonth = Number(String(row[16]).replace(/[^0-9.-]+/g, '')) || 0;
  const profitPercent = Number(String(row[17]).replace(/[^0-9.-]+/g, '')) || 10;
  const profitPerMonth = Number(String(row[18]).replace(/[^0-9.-]+/g, '')) || 0;
  const recommendedPriceMonthly = Number(String(row[19]).replace(/[^0-9.-]+/g, '')) || 0;
  const recommendedPriceTotal = Number(String(row[20]).replace(/[^0-9.-]+/g, '')) || 0;
  const discountFromMedianPercent = Number(String(row[21]).replace(/[^0-9.-]+/g, '')) || 0;
  const competitorStrategyNotes = String(row[22] || '');
  const createdAt = String(row[23] || new Date().toISOString());

  return {
    id,
    scenarioName,
    jobType,
    agencyName,
    location: 'กรุงเทพมหานคร',
    durationMonths: 12,
    medianPrice,
    budgetPrice,
    totalWorkers,
    supervisors,
    dailyMinWage,
    supervisorMonthlyWage,
    workScheduleType: 'mon_fri',
    hasOvertime: false,
    otHoursPerDay: 0,
    otDaysPerMonth: 0,
    customOtHourlyRate: 0,
    customOtDailyRate: 0,
    otWorkersCount: totalWorkers,
    nightShiftAllowance: 0,
    hasWeekendSkeletonCrew: false,
    weekendDutyDaysPerMonth: 8,
    weekendWorkersCount: 0,
    customWeekendDailyRate: 0,
    consumablesPerWorker: totalWorkers > 0 ? Math.round(totalConsumablesPerMonth / totalWorkers) : 950,
    machineryMonthly: machineryDepreciationPerMonth,
    overheadPercent: 7,
    profitPercent,
    totalLaborCostPerMonth,
    totalConsumablesPerMonth,
    machineryDepreciationPerMonth,
    overheadCostPerMonth,
    profitPerMonth,
    subtotalMonthlyCost: totalLaborCostPerMonth + totalConsumablesPerMonth + machineryDepreciationPerMonth + overheadCostPerMonth,
    recommendedPriceMonthly,
    recommendedPriceTotal,
    discountFromMedianPercent,
    discountFromBudgetPercent: discountFromMedianPercent,
    competitorStrategyNotes,
    createdAt,
    updatedAt: createdAt,
  };
}

/**
 * Sends data directly via Google Apps Script Webhook (No OAuth setup required!)
 */
export async function sendToAppsScriptWebhook(
  webhookUrl: string,
  payload: { action: 'save_simulation' | 'save_project'; data: any }
): Promise<{ success: boolean; message: string }> {
  try {
    // Mode no-cors or standard POST
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { success: true, message: 'ส่งข้อมูลไปยัง Google Apps Script เรียบร้อยแล้ว' };
  } catch (error: any) {
    console.warn('Webhook POST error:', error);
    return { success: false, message: error.message || 'Failed to send to Webhook' };
  }
}

