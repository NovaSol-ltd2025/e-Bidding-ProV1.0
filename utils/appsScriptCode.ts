export const APPS_SCRIPT_CODE_GS = `/**
 * @OnlyCurrentDoc
 * ระบบบันทึกและประมวลผลข้อมูลการจัดซื้อจัดจ้าง e-Bidding (Google Apps Script)
 * รองรับทั้ง:
 * 1. บันทึกฐานข้อมูลโครงการ e-Bidding (eBidding_Data)
 * 2. บันทึกประวัติการถอดต้นทุน & จำลองราคาเสนอแข่งกับคู่แข่ง (Cost_Simulations)
 * 3. Webhook (doPost) บันทึกผ่านเว็บได้ทันที 1-Click ไม่ต้องตั้งค่า OAuth ซับซ้อน
 */

// สร้างเมนูใน Google Sheets เมื่อเปิดไฟล์
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏛️ e-Bidding Analytics')
    .addItem('📊 เปิดหน้าต่างวิเคราะห์ราคา (Web App Dialog)', 'openSidebar')
    .addItem('🧮 คำนวณผลต่างราคากลาง-งบประมาณ อัตโนมัติ', 'calculateAllRows')
    .addItem('📋 จัดรูปแบบหัวตารางโครงการ (Format Projects Headers)', 'setupHeaders')
    .addItem('💡 จัดรูปแบบหัวตารางจำลองราคา (Format Simulation Headers)', 'setupSimulationHeaders')
    .addToUi();
}

// เปิดหน้าต่าง Sidebar ใน Google Sheets
function openSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('e-Bidding Analytics & Price Estimator')
    .setWidth(450);
  SpreadsheetApp.getUi().showSidebar(html);
}

// รองรับการเปิดเป็น Web App
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ระบบวิเคราะห์ราคา e-Bidding ภาครัฐ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Webhook API: รองรับการส่งข้อมูลมาบันทึกจากหน้าเว็บอัตโนมัติ (1-Click Auto Save)
function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const body = JSON.parse(rawData);
    
    if (body.action === 'save_simulation') {
      const result = saveSimulationToSheet(body.data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      const result = addNewProjectFromWeb(typeof body.data === 'string' ? body.data : JSON.stringify(body.data));
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --------------------------------------------------------------------
// จัดการแผ่นงาน eBidding_Data (ข้อมูลโครงการ)
// --------------------------------------------------------------------
function setupHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('eBidding_Data') || ss.getActiveSheet();
  sheet.setName('eBidding_Data');

  const headers = [
    'เลขที่โครงการ', 'ปีงบประมาณ', 'ชื่อส่วนราชการ/หน่วยงาน', 'ชื่อโครงการ', 'ประเภทงาน',
    'ราคากลาง (บาท)', 'ราคางบประมาณ (บาท)', 'ราคาที่ชนะ (บาท)', 'ชื่อผู้ชนะ',
    'ผลต่างจากราคากลาง (บาท)', 'ผลต่างจากราคากลาง (%)', 'ผลต่างจากงบประมาณ (บาท)', 'ผลต่างจากงบประมาณ (%)',
    '% ราคาชนะต่อราคากลาง', '% ราคาชนะต่องบประมาณ', 'จำนวนคนงานทั้งหมด', 'จำนวนหัวหน้างาน', 'คนงานปฏิบัติการ',
    'ระยะเวลาสัญญา (เดือน)', 'พื้นที่/จังหวัด', 'หมายเหตุ', 'วันที่บันทึก'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#0f172a')
    .setFontColor('#38bdf8')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  ss.toast('ตั้งค่าหัวตารางโครงการ eBidding_Data เรียบร้อยแล้ว', 'สำเร็จ', 3);
}

// --------------------------------------------------------------------
// จัดการแผ่นงาน Cost_Simulations (ประวัติจำลองราคาเสนอ & กลยุทธ์)
// --------------------------------------------------------------------
function setupSimulationHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Cost_Simulations');
  if (!sheet) {
    sheet = ss.insertSheet('Cost_Simulations');
  }

  const simHeaders = [
    'รหัสจำลอง', 'ชื่อแผนกลยุทธ์', 'ประเภทงาน', 'หน่วยงาน', 'ราคากลาง (บาท)', 'ราคางบประมาณ (บาท)',
    'คนงานทั้งหมด', 'หัวหน้างาน', 'ค่าแรงขั้นต่ำ', 'เงินเดือนหัวหน้า', 'รูปแบบเวลาทำงาน', 'มี OT หรือไม่',
    'เวรวันหยุดเฉพาะบางคน', 'ต้นทุนแรงงาน/เดือน', 'วัสดุสิ้นเปลือง/เดือน', 'เครื่องจักร/เดือน', 'ค่าบริหาร/เดือน',
    'กำไรเป้าหมาย %', 'กำไรสุทธิ/เดือน', 'ราคาเสนอต่อเดือน', 'ราคาเสนอตลอดสัญญา (บาท)', 'ส่วนต่างราคากลาง %',
    'คู่แข่งที่จับตา / กลยุทธ์ที่ใช้', 'วันที่บันทึก'
  ];

  sheet.getRange(1, 1, 1, simHeaders.length).setValues([simHeaders]);
  sheet.getRange(1, 1, 1, simHeaders.length)
    .setBackground('#1e1b4b')
    .setFontColor('#a5b4fc')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  ss.toast('ตั้งค่าหัวตาราง Cost_Simulations เรียบร้อยแล้ว', 'สำเร็จ', 3);
  return sheet;
}

// บันทึกการจำลองราคาลงแผ่นงาน Cost_Simulations
function saveSimulationToSheet(sim) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Cost_Simulations');
  if (!sheet) {
    sheet = setupSimulationHeaders();
  }

  const row = [
    sim.id || ('SIM-' + new Date().getTime()),
    sim.scenarioName || 'แผนจำลองราคา',
    sim.jobType || 'จ้างเหมาบริการทำความสะอาดอาคาร',
    sim.agencyName || '',
    Number(sim.medianPrice) || 0,
    Number(sim.budgetPrice) || 0,
    Number(sim.totalWorkers) || 0,
    Number(sim.supervisors) || 0,
    Number(sim.dailyMinWage) || 380,
    Number(sim.supervisorMonthlyWage) || 18000,
    sim.workScheduleType || 'mon_fri',
    sim.hasOvertime ? 'มี OT' : 'ไม่มี',
    sim.hasWeekendSkeletonCrew ? ('มีเวร ' + sim.weekendWorkersCount + ' คน x ' + sim.weekendDutyDaysPerMonth + ' วัน') : 'ไม่มี',
    Number(sim.totalLaborCostPerMonth) || 0,
    Number(sim.totalConsumablesPerMonth) || 0,
    Number(sim.machineryDepreciationPerMonth) || 0,
    Number(sim.overheadCostPerMonth) || 0,
    (sim.profitPercent || 10) + '%',
    Number(sim.profitPerMonth) || 0,
    Number(sim.recommendedPriceMonthly) || 0,
    Number(sim.recommendedPriceTotal) || 0,
    (sim.discountFromMedianPercent || 0) + '%',
    sim.competitorStrategyNotes || '',
    new Date()
  ];

  sheet.appendRow(row);
  return 'บันทึกประวัติจำลองราคาลง Cost_Simulations เรียบร้อยแล้ว';
}

// คำนวณผลต่างทุกแถวในชีต eBidding_Data
function calculateAllRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('eBidding_Data') || ss.getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 22).getValues();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const median = Number(row[5]) || 0;
    const budget = Number(row[6]) || 0;
    const winning = Number(row[7]) || 0;
    const totalWorkers = Number(row[15]) || 0;
    const supervisors = Number(row[16]) || 0;

    if (median > 0 && winning > 0) {
      const diffMedian = median - winning;
      const diffMedianPct = (diffMedian / median) * 100;
      const diffBudget = budget > 0 ? budget - winning : diffMedian;
      const diffBudgetPct = budget > 0 ? (diffBudget / budget) * 100 : diffMedianPct;
      const winToMedian = (winning / median) * 100;
      const winToBudget = budget > 0 ? (winning / budget) * 100 : winToMedian;
      const workers = Math.max(0, totalWorkers - supervisors);

      row[9] = diffMedian;
      row[10] = Number(diffMedianPct.toFixed(2)) + '%';
      row[11] = diffBudget;
      row[12] = Number(diffBudgetPct.toFixed(2)) + '%';
      row[13] = Number(winToMedian.toFixed(2)) + '%';
      row[14] = Number(winToBudget.toFixed(2)) + '%';
      row[17] = workers;
    }
  }

  sheet.getRange(2, 1, data.length, 22).setValues(data);
  ss.toast('คำนวณผลต่างราคากลาง-งบประมาณครบทุกแถวแล้ว', 'สำเร็จ', 3);
}

// เพิ่มโครงการใหม่ลงใน Sheet
function addNewProjectFromWeb(projectJson) {
  const p = typeof projectJson === 'string' ? JSON.parse(projectJson) : projectJson;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('eBidding_Data') || ss.getActiveSheet();
  
  const median = Number(p.medianPrice) || 0;
  const budget = Number(p.budgetPrice) || 0;
  const winning = Number(p.winningPrice) || 0;
  const totalWorkers = Number(p.totalWorkers) || 0;
  const supervisors = Number(p.supervisors) || 0;
  
  const diffMedian = median - winning;
  const diffMedianPct = median > 0 ? (diffMedian / median) * 100 : 0;
  const diffBudget = budget > 0 ? budget - winning : diffMedian;
  const diffBudgetPct = budget > 0 ? (diffBudget / budget) * 100 : diffMedianPct;
  const winToMedian = median > 0 ? (winning / median) * 100 : 0;
  const winToBudget = budget > 0 ? (winning / budget) * 100 : 0;
  const workers = Math.max(0, totalWorkers - supervisors);

  const newRow = [
    p.projectNo || '',
    p.fiscalYear || new Date().getFullYear() + 543,
    p.agencyName || '',
    p.projectName || '',
    p.jobType || 'จ้างเหมาบริการทำความสะอาดอาคาร',
    median,
    budget,
    winning,
    p.winnerName || '',
    diffMedian,
    diffMedianPct.toFixed(2) + '%',
    diffBudget,
    diffBudgetPct.toFixed(2) + '%',
    winToMedian.toFixed(2) + '%',
    winToBudget.toFixed(2) + '%',
    totalWorkers,
    supervisors,
    workers,
    p.durationMonths || 12,
    p.location || 'กรุงเทพมหานคร',
    p.notes || '',
    new Date()
  ];

  sheet.appendRow(newRow);
  return { status: 'success', message: 'บันทึกข้อมูลลง Google Sheet เรียบร้อยแล้ว' };
}
`;

export const APPS_SCRIPT_INDEX_HTML = `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Chakra Petch', sans-serif;
        background-color: #0b1329;
        color: #f8fafc;
        padding: 16px;
        margin: 0;
      }
      h2 { color: #38bdf8; margin-top: 0; border-bottom: 2px solid #1e293b; padding-bottom: 8px; }
      .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
      .form-group { margin-bottom: 10px; }
      label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
      input, select {
        width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155;
        color: #fff; padding: 8px; border-radius: 6px; font-family: 'Chakra Petch', sans-serif;
      }
      button {
        background: #0284c7; color: #fff; border: none; padding: 10px 16px; border-radius: 6px;
        font-weight: 600; cursor: pointer; width: 100%; font-family: 'Chakra Petch', sans-serif;
      }
      button:hover { background: #0369a1; }
      .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
      .stat-box { background: #0f172a; padding: 8px; border-radius: 6px; border-left: 3px solid #38bdf8; }
      .stat-val { font-size: 16px; font-weight: bold; color: #38bdf8; }
      .stat-label { font-size: 11px; color: #64748b; }
    </style>
  </head>
  <body>
    <h2>🏛️ e-Bidding Decision Tool</h2>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-label">ลดเฉลี่ยจากราคากลาง</div>
        <div class="stat-val" id="avgDiscount">~11.5%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">เกณฑ์ต้นทุนแรงงาน</div>
        <div class="stat-val">370-400 บ./วัน</div>
      </div>
    </div>

    <div class="card">
      <div class="form-group">
        <label>เลขที่โครงการ / ชื่อโครงการ</label>
        <input type="text" id="pName" placeholder="เช่น 6701234567 จ้างทำความสะอาด">
      </div>
      <div class="form-group">
        <label>หน่วยงาน</label>
        <input type="text" id="pAgency" placeholder="เช่น กรมสรรพากร">
      </div>
      <div class="form-group">
        <label>ประเภทงาน</label>
        <select id="pJobType">
          <option value="จ้างเหมาบริการทำความสะอาดอาคาร">ทำความสะอาดอาคาร</option>
          <option value="จ้างเหมาบริการรักษาความปลอดภัย">รักษาความปลอดภัย (รปภ.)</option>
          <option value="จ้างเหมาบริการดูแลภูมิทัศน์และคนสวน">คนสวน/ภูมิทัศน์</option>
          <option value="จ้างเหมาบริการงานช่างและบำรุงรักษาอาคาร">งานช่าง/ซ่อมบำรุง</option>
        </select>
      </div>
      <div class="form-group">
        <label>ราคากลาง (บาท)</label>
        <input type="number" id="pMedian" placeholder="10000000">
      </div>
      <div class="form-group">
        <label>ราคาที่ชนะ / ราคาเสนอ (บาท)</label>
        <input type="number" id="pWinning" placeholder="8800000">
      </div>
      <div class="form-group">
        <label>จำนวนคนงานทั้งหมด (คน)</label>
        <input type="number" id="pWorkers" placeholder="30">
      </div>
      <button onclick="saveProject()">💾 บันทึกลง Google Sheet</button>
    </div>

    <script>
      function saveProject() {
        const payload = {
          projectNo: document.getElementById('pName').value,
          projectName: document.getElementById('pName').value,
          agencyName: document.getElementById('pAgency').value,
          jobType: document.getElementById('pJobType').value,
          medianPrice: Number(document.getElementById('pMedian').value) || 0,
          budgetPrice: Number(document.getElementById('pMedian').value) || 0,
          winningPrice: Number(document.getElementById('pWinning').value) || 0,
          totalWorkers: Number(document.getElementById('pWorkers').value) || 1,
          supervisors: 1,
          durationMonths: 12
        };

        google.script.run
          .withSuccessHandler(function(res) {
            alert(res.message);
            document.getElementById('pName').value = '';
            document.getElementById('pMedian').value = '';
            document.getElementById('pWinning').value = '';
          })
          .withFailureHandler(function(err) {
            alert('เกิดข้อผิดพลาด: ' + err);
          })
          .addNewProjectFromWeb(JSON.stringify(payload));
      }
    </script>
  </body>
</html>
`;
