import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy init Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// API: AI Bid Intelligence & Market Analysis
app.post("/api/ai-analyze", async (req, res) => {
  try {
    const { projects, prompt, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured in server environment.",
      });
    }

    const systemInstruction = `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์ข้อมูลจัดซื้อจัดจ้างภาครัฐ (e-Bidding Specialist & Procurement Strategist) ประจำประเทศไทย
มีความเชี่ยวชาญสูงในการวิเคราะห์โครงสร้างราคาและต้นทุนงานบริการภาครัฐ เช่น งานจ้างเหมาบริการทำความสะอาดอาคาร, งานรักษาความปลอดภัย (รปภ.), งานจ้างเหมาบริการคนสวนและดูแลภูมิทัศน์, งานช่างและบำรุงรักษาอาคาร

ข้อมูลที่คุณต้องคำนึงถึง:
1. กฎหมายแรงงานไทย: ค่าแรงขั้นต่ำตามประกาศกระทรวงแรงงาน (330-400 บาท/วัน หรือประมาณ 10,000 - 12,000+ บาท/เดือน/คน), เงินสมทบประกันสังคม 5% (สูงสุด 750 บ./ด.), กองทุนเงินทดแทน, ค่าล่วงเวลา/วันหยุดตาม พรบ.คุ้มครองแรงงาน, สวัสดิการและชุดยูนิฟอร์ม
2. ค่าวัสดุสิ้นเปลือง / เคมีภัณฑ์ / ถุงขยะ / น้ำยาทำความสะอาด (Consumable materials): ปกติเฉลี่ยประมาณ 5-15% ของมูลค่างาน หรือ 500-1,500 บาท/คน/เดือน
3. ค่าเครื่องมือและเครื่องจักร (Scrubber, High pressure washer, Vacuum ฯลฯ): ค่าเสื่อมราคาและซ่อมบำรุง 3-8%
4. ค่าใช้จ่ายในการบริหารจัดการและกำไร (Overhead & Profit): ปกติ 8-15%, หักภาษี ณ ที่จ่าย 1%, VAT 7%
5. พฤติกรรมการตัดราคา (Price Cut Ratio): วิเคราะห์ว่างานประเภทนี้มักมีการเคาะราคาต่ำกว่าราคากลางกี่ % และต่ำกว่างบประมาณกี่ % คู่แข่งหลักชอบเคาะตัดราคาเท่าไหร่เพื่อชนะโดยไม่ขาดทุน

ให้ตอบเป็นภาษาไทยอย่างกระชับ ชัดเจน มีตัวเลขและเปอร์เซ็นต์ประกอบเพื่อการตัดสินใจที่แม่นยำ`;

    const userMessage = `นี่คือชุดข้อมูลโครงการ e-Bidding ที่บันทึกไว้:\n${JSON.stringify(
      projects,
      null,
      2
    )}\n\nคำถาม / เป้าหมายการวิเคราะห์: ${
      prompt ||
      "ช่วยวิเคราะห์ภาพรวมแนวโน้มราคาที่ชนะ สัดส่วนการลดราคาจากราคากลางและงบประมาณ พร้อมคำแนะนำการตั้งราคาเพื่อเข้าร่วมประมูลงานต่อไป"
    }\nบริบทเพิ่มเติม: ${context || "ไม่มี"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({
      analysis: response.text,
    });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate AI analysis",
    });
  }
});

// API: AI Cost Estimation Engine for Prospective Tender
app.post("/api/ai-cost-estimate", async (req, res) => {
  try {
    const { projectData } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    const prompt = `จากข้อมูลโครงการที่กำลังจะเข้าประมูลดังนี้:
- ประเภทงาน: ${projectData.jobType}
- หน่วยงาน: ${projectData.agencyName}
- ราคากลาง: ${Number(projectData.medianPrice).toLocaleString()} บาท
- ราคางบประมาณ: ${Number(projectData.budgetPrice).toLocaleString()} บาท
- จำนวนคนงาน: ${projectData.totalWorkers} คน (หัวหน้างาน: ${projectData.supervisors} คน)
- ระยะเวลาสัญญา: ${projectData.durationMonths || 12} เดือน
- พื้นที่/จังหวัด: ${projectData.location || "กรุงเทพฯ และปริมณฑล"}

ช่วยคำนวณและประเมิน:
1. โครงสร้างต้นทุนที่เหมาะสม (Cost Breakdown):
   - ค่าแรงงานรวมสวัสดิการ (Labor & Welfare Cost)
   - ค่าวัสดุสิ้นเปลือง/เคมีภัณฑ์/ฟุ่มเฟือย (Consumables)
   - ค่าเครื่องมือ อุปกรณ์ และค่าเสื่อม (Machinery & Tools)
   - ค่าบริหารจัดการสำนักงาน (Overhead)
   - กำไรสุทธิคาดการณ์ (Net Profit)
2. กลยุทธ์การตั้งราคาเสนอประมูล (3 ระดับ):
   - ราคาปลอดภัย (Safe Margin): ได้กำไรดี ชนะได้หากคู่แข่งไม่ตัดราคาดุเดือด
   - ราคากลยุทธ์แข่งขันสูง (Competitive Price): โอกาสชนะสูงมาก ยังมีกำไร
   - ราคาเส้นตายจุดคุ้มทุน (Break-even Floor): ต่ำกว่านี้จะขาดทุน ไม่ควรรับงาน
3. ข้อควรระวังในการประมูลงานนี้และเทคนิคการยื่นเอกสาร`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "คุณเป็นผู้เชี่ยวชาญการถอดแบบราคางานบริการและจัดทำใบเสนอราคา e-Bidding ภาครัฐ ตอบเป็นภาษาไทย มีตัวเลขคำนวณที่ชัดเจนและเป็นไปได้จริงตามมาตรฐานจัดซื้อจัดจ้างภาครัฐ (เงินเดือน + ประกันสังคม 5% + ค่าบริหารจัดการ + ค่าวัสดุอุปกรณ์ + VAT 7%)",
        temperature: 0.2,
      },
    });

    res.json({
      recommendation: response.text,
    });
  } catch (error: any) {
    console.error("AI Estimation Error:", error);
    res.status(500).json({
      error: error.message || "Failed to estimate cost",
    });
  }
});

// API: Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`e-Bidding Decision Engine Server running at http://localhost:${PORT}`);
  });
}

startServer();
