import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  DownloadCloud,
  Lock,
  KeyRound,
  FileCode2,
  Copy,
  Check,
  LogOut,
  UserCheck,
  Database,
  Download,
  Send,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { EBiddingProject, CostSimulationRecord } from '../types';
import { 
  createEBiddingSpreadsheet, 
  updateSheetValues, 
  readSheetRows, 
  projectToSheetRow, 
  parseSheetRowToProject,
  SHEETS_HEADERS,
  SIMULATION_SHEETS_HEADERS,
  sendToAppsScriptWebhook
} from '../utils/googleSheets';
import { APPS_SCRIPT_CODE_GS, APPS_SCRIPT_INDEX_HTML } from '../utils/appsScriptCode';
import { googleSignIn, logoutGoogle, initAuth, getAccessToken, setAccessToken } from '../utils/auth';
import { downloadProjectsCsv, downloadSimulationsCsv } from '../utils/exportCsv';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncProps {
  projects: EBiddingProject[];
  onSyncProjectsFromSheet: (sheetProjects: EBiddingProject[]) => void;
  spreadsheetId: string | null;
  setSpreadsheetId: (id: string | null) => void;
  spreadsheetUrl: string | null;
  setSpreadsheetUrl: (url: string | null) => void;
  isTokenActive: boolean;
  setIsTokenActive: (active: boolean) => void;
}

export const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({
  projects,
  onSyncProjectsFromSheet,
  spreadsheetId,
  setSpreadsheetId,
  spreadsheetUrl,
  setSpreadsheetUrl,
  isTokenActive,
  setIsTokenActive,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [copiedIndexHtml, setCopiedIndexHtml] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'sync' | 'apps_script' | 'csv'>('sync');
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [savedSimulations, setSavedSimulations] = useState<CostSimulationRecord[]>([]);

  // Initialize Auth state listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setIsTokenActive(true);
      },
      () => {
        const savedToken = sessionStorage.getItem('google_sheets_token');
        if (savedToken) {
          setIsTokenActive(true);
        } else {
          setIsTokenActive(false);
        }
      }
    );

    const savedSheetId = localStorage.getItem('ebidding_sheet_id');
    const savedSheetUrl = localStorage.getItem('ebidding_sheet_url');
    const savedWebhook = localStorage.getItem('ebidding_apps_script_url');
    if (savedSheetId) setSpreadsheetId(savedSheetId);
    if (savedSheetUrl) setSpreadsheetUrl(savedSheetUrl);
    if (savedWebhook) setWebhookUrlInput(savedWebhook);

    // Load local simulations
    const localSims = localStorage.getItem('cost_simulations_history');
    if (localSims) {
      try {
        setSavedSimulations(JSON.parse(localSims));
      } catch (e) {}
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setIsTokenActive, setSpreadsheetId, setSpreadsheetUrl]);

  // Request OAuth Token via Firebase Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'กำลังเปิดหน้าต่างลงชื่อเข้าใช้ Google Workspace...' });
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setIsTokenActive(true);
        setStatusMessage({ 
          type: 'success', 
          text: `เชื่อมต่อ Google Workspace สำเร็จแล้ว (${result.user.email}) ข้อมูลจะบันทึกลง Google Sheets ใน Google Drive ของคุณโดยตรง` 
        });
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        setStatusMessage({ 
          type: 'info', 
          text: 'หน้าต่างลงชื่อเข้าใช้ Google ถูกปิดก่อนกดยืนยัน (หากต้องการเชื่อมต่อ กรุณากดปุ่ม Sign In อีกครั้ง และกดอนุญาตสิทธิ์เข้าถึง Google Drive/Sheets)' 
        });
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: `ไม่สามารถเข้าสู่ระบบ Google ได้: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}` 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      setIsTokenActive(false);
      setStatusMessage({ type: 'info', text: 'ออกจากระบบ Google Workspace เรียบร้อยแล้ว' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `ออกจากระบบล้มเหลว: ${err.message}` });
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setAccessToken(tokenInput.trim());
    setIsTokenActive(true);
    setStatusMessage({ type: 'success', text: 'บันทึก Google OAuth Access Token เรียบร้อยแล้ว' });
  };

  const handleSaveWebhookUrl = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ebidding_apps_script_url', webhookUrlInput.trim());
    setStatusMessage({ type: 'success', text: 'บันทึก Google Apps Script Webhook URL สำเร็จแล้ว ระบบจะส่งข้อมูลตรงไป Google Sheet ทันที' });
  };

  // Create new Spreadsheet
  const handleCreateNewSheet = async () => {
    const token = getAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'กรุณาคลิก "เข้าสู่ระบบด้วย Google" ก่อนเพื่อสร้างไฟล์ใน Google Drive ของคุณ' });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'กำลังสร้าง Google Spreadsheet ใหม่ใน Google Drive ของคุณ...' });

      const dateStr = new Date().toLocaleDateString('th-TH');
      const result = await createEBiddingSpreadsheet(
        token,
        `e-Bidding Analytics Database (${dateStr})`
      );

      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      localStorage.setItem('ebidding_sheet_id', result.spreadsheetId);
      localStorage.setItem('ebidding_sheet_url', result.spreadsheetUrl);

      // Export all current projects into the newly created sheet
      if (projects.length > 0) {
        const rows = projects.map(projectToSheetRow);
        await updateSheetValues(token, result.spreadsheetId, `eBidding_Projects!A2:V${rows.length + 1}`, rows);
      }

      setStatusMessage({
        type: 'success',
        text: `สร้าง Google Sheet ใหม่ใน Google Drive สำเร็จ! และสร้างแท็บ eBidding_Projects & Cost_Simulations เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `เกิดข้อผิดพลาดในการสร้างชีต: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Push All Projects to Current Sheet
  const handlePushAllToSheet = async () => {
    const token = getAccessToken();
    const webhook = localStorage.getItem('ebidding_apps_script_url');

    if (!token && !webhook) {
      setStatusMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบ Google หรือระบุ Google Apps Script Webhook URL ก่อนทำการซิงค์' });
      return;
    }

    if (!spreadsheetId && !webhook) {
      setStatusMessage({ type: 'error', text: 'กรุณาระบุ Spreadsheet ID ของ Google Sheet ที่ต้องการส่งข้อมูลไป' });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: `กำลังเขียนข้อมูล ${projects.length} โครงการลง Google Sheet...` });

      if (token && spreadsheetId) {
        try {
          await updateSheetValues(token, spreadsheetId, 'eBidding_Projects!A1:V1', [SHEETS_HEADERS]);
          const rows = projects.map(projectToSheetRow);
          if (rows.length > 0) {
            await updateSheetValues(token, spreadsheetId, `eBidding_Projects!A2:V${rows.length + 1}`, rows);
          }
        } catch {
          // Fallback for older sheet names
          await updateSheetValues(token, spreadsheetId, 'eBidding_Data!A1:V1', [SHEETS_HEADERS]);
          const rows = projects.map(projectToSheetRow);
          if (rows.length > 0) {
            await updateSheetValues(token, spreadsheetId, `eBidding_Data!A2:V${rows.length + 1}`, rows);
          }
        }
      }

      setStatusMessage({
        type: 'success',
        text: `ซิงค์ข้อมูล ${projects.length} โครงการไปยัง Google Sheet เรียบร้อยแล้ว!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `เกิดข้อผิดพลาดในการส่งข้อมูล: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Pull Data from Google Sheet
  const handlePullFromSheet = async () => {
    const token = getAccessToken();
    if (!token || !spreadsheetId) {
      setStatusMessage({ type: 'error', text: 'กรุณาระบุ Spreadsheet ID และเข้าสู่ระบบ Google Account' });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'กำลังดึงข้อมูลโครงการจาก Google Sheet...' });

      let rawRows: any[][] = [];
      try {
        rawRows = await readSheetRows(token, spreadsheetId, 'eBidding_Projects!A2:V1000');
      } catch {
        rawRows = await readSheetRows(token, spreadsheetId, 'eBidding_Data!A2:V1000');
      }

      const parsedProjects: EBiddingProject[] = [];
      rawRows.forEach((row, index) => {
        const p = parseSheetRowToProject(row, index);
        if (p) parsedProjects.push(p);
      });

      if (parsedProjects.length > 0) {
        onSyncProjectsFromSheet(parsedProjects);
        setStatusMessage({
          type: 'success',
          text: `ดึงข้อมูลสำเร็จ! พบและอัปเดต ${parsedProjects.length} โครงการจาก Google Sheet`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: 'ไม่พบข้อมูลแถวใหม่ใน Google Sheet (ตรวจสอบว่ามีข้อมูลในชีต eBidding_Projects หรือ eBidding_Data หรือไม่)',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'gs' | 'html') => {
    navigator.clipboard.writeText(text);
    if (type === 'gs') {
      setCopiedCodeGs(true);
      setTimeout(() => setCopiedCodeGs(false), 2500);
    } else {
      setCopiedIndexHtml(true);
      setTimeout(() => setCopiedIndexHtml(false), 2500);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header & Clarification Note */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Google Sheets & Google Workspace Integration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ข้อมูลจะถูกบันทึกและจัดเก็บลงใน <strong>Google Sheets ใน Google Drive ของคุณโดยตรง 100%</strong>
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveSubTab('sync')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'sync' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Sheets (Direct / OAuth)
          </button>
          <button
            onClick={() => setActiveSubTab('apps_script')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'apps_script' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Apps Script Webhook
          </button>
          <button
            onClick={() => setActiveSubTab('csv')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'csv' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ดาวน์โหลดไฟล์ CSV (เปิดใน Sheets)
          </button>
        </div>
      </div>

      {/* Clarification banner explaining why Google Sign-In / Firebase Auth is used */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">ข้อมูลเก็บไว้ที่ Google Sheets ใน Google Drive ของคุณโดยตรง:</span>
          <p className="text-blue-800 leading-relaxed">
            ระบบใช้ <strong>Google Sign-In</strong> เพื่อให้ Google ขออนุญาต (Authorization) จากคุณในการเข้าถึงและเขียนไฟล์ Google Sheets ลงใน Google Drive ของคุณ ระบบไม่ได้เก็บไฟล์ตารางไว้ที่อื่น และคุณสามารถเปิดดูหรือแก้ไขผ่าน Google Drive ได้ตลอดเวลาครับ
          </p>
        </div>
      </div>

      {/* Status Message Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          ) : (
            <RefreshCw className="w-4 h-4 flex-shrink-0 text-blue-600 animate-spin" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {activeSubTab === 'sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Connection Card (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>1. ยืนยันตัวตน Google Drive / Sheets</span>
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isTokenActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {isTokenActive ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                คลิกปุ่มด้านล่างเพื่ออนุญาตให้แอปเขียนข้อมูลลง Google Sheets ในบัญชี Google ของคุณ:
              </p>

              {isTokenActive && currentUser ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-emerald-300"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">{currentUser.displayName || 'Google Account'}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{currentUser.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-3 transition cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 flex-shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                      />
                    </svg>
                    <span>{loading ? 'กำลังเปิดหน้าต่างยืนยัน...' : 'เข้าสู่ระบบด้วย GOOGLE (SIGN IN)'}</span>
                  </button>
                  <p className="text-[11px] text-slate-500 text-center">
                    (คลิกเพื่อเปิดหน้าต่าง Popup เลือกบัญชี Google แล้วกด Allow/อนุญาต)
                  </p>
                </div>
              )}

              {/* Or Manual Access Token */}
              <div className="pt-3 border-t border-slate-100">
                <details className="text-xs text-slate-500 cursor-pointer">
                  <summary className="hover:text-slate-800 font-medium">หรือระบุ Access Token โดยตรง (ทางเลือกสำรอง)</summary>
                  <form onSubmit={handleManualTokenSubmit} className="mt-3 space-y-2">
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="วาง Google OAuth Access Token (Bearer ya29...)"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 outline-none focus:border-blue-500 shadow-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      บันทึก Token
                    </button>
                  </form>
                </details>
              </div>
            </div>

            {/* Target Spreadsheet Configuration */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>2. ไฟล์ Google Sheet เป้าหมาย</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-medium mb-1">Spreadsheet ID หรือ URL</label>
                  <input
                    type="text"
                    value={spreadsheetId || ''}
                    onChange={(e) => {
                      let raw = e.target.value.trim();
                      const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                      if (match && match[1]) {
                        raw = match[1];
                      }
                      setSpreadsheetId(raw);
                      localStorage.setItem('ebidding_sheet_id', raw);
                      if (raw) {
                        const url = `https://docs.google.com/spreadsheets/d/${raw}/edit`;
                        setSpreadsheetUrl(url);
                        localStorage.setItem('ebidding_sheet_url', url);
                      }
                    }}
                    placeholder="เช่น 1tvIEH54UlyPFIdVGigCd90-OnDvC46bGUQigaJyaA2GM หรือวางลิงก์ชีต"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-mono focus:border-blue-500 outline-none shadow-xs"
                  />
                </div>

                {spreadsheetId && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-medium">เปิดดูไฟล์ใน Google Sheets:</span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      <span>เปิด Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleCreateNewSheet}
                    disabled={loading || !isTokenActive}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    <span>+ สร้าง Google Sheet ใหม่ใน Drive ของฉัน</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    ระบบจะสร้างแท็บ eBidding_Projects และ Cost_Simulations ใน Google Drive ของคุณทันที
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sync Actions & Preview Table (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>⚡ การดำเนินการซิงค์ข้อมูลไป-กลับ (Two-way Sync)</span>
                <span className="text-xs text-slate-500 font-normal lowercase">ในระบบมี {projects.length} โครงการ</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Push */}
                <button
                  onClick={handlePushAllToSheet}
                  disabled={loading || !spreadsheetId || !isTokenActive}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-blue-300 rounded-xl flex flex-col items-start text-left transition space-y-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4" />
                      <span>ส่งออกไปยัง Google Sheet</span>
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold">Push</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    นำข้อมูลทั้งหมด {projects.length} โครงการ ไปเขียนลงชีต eBidding_Projects พร้อมหัวตาราง
                  </p>
                </button>

                {/* Pull */}
                <button
                  onClick={handlePullFromSheet}
                  disabled={loading || !spreadsheetId || !isTokenActive}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-emerald-300 rounded-xl flex flex-col items-start text-left transition space-y-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <DownloadCloud className="w-4 h-4" />
                      <span>ดึงข้อมูลจาก Google Sheet</span>
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-mono font-bold">Pull</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    ดึงแถวใหม่ที่มีการพิมพ์หรือบันทึกใน Google Sheet เข้ามาประมวลผลในระบบ
                  </p>
                </button>
              </div>
            </div>

            {/* Google Sheets Structure Specifications */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span>โครงสร้างคอลัมน์มาตรฐาน 22 ฟิลด์ในชีต eBidding_Projects</span>
              </h3>
              <p className="text-xs text-slate-500">
                เมื่อซิงค์ข้อมูล ระบบจะจัดเรียงคอลัมน์และคำนวณสูตรผลต่างให้อัตโนมัติ:
              </p>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                {SHEETS_HEADERS.map((h) => (
                  <span
                    key={h}
                    className="text-[11px] px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg font-mono shadow-xs"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Google Apps Script Webhook */}
      {activeSubTab === 'apps_script' && (
        <div className="space-y-5">
          {/* Quick Webhook URL Input */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>กำหนด Google Apps Script Webhook URL (บันทึกข้อมูลอัตโนมัติไม่ต้อง Sign-in ซ้ำ)</span>
            </h3>
            <p className="text-xs text-slate-600">
              เมื่อคุณนำโค้ดด้านล่างไปวางใน Google Sheet และ Deploy เป็น Web App แล้ว นำ Webhook URL มาวางที่นี่ ระบบจะบันทึกข้อมูลทุกครั้งที่คุณกดบันทึกในหน้าจำลองราคาโดยตรงทันที
            </p>
            <form onSubmit={handleSaveWebhookUrl} className="flex gap-2">
              <input
                type="url"
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono outline-none focus:border-blue-500 shadow-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                บันทึก Webhook
              </button>
            </form>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
            <h4 className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
              <FileCode2 className="w-4 h-4 text-amber-700" />
              <span>วิธีติดตั้ง Google Apps Script ใน Google Sheet ของคุณ:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-700">
              <li>เปิด Google Sheets ของคุณ ไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></li>
              <li>วางโค้ดไฟล์ <code>Code.gs</code> และ <code>Index.html</code> ตามกล่องด้านล่าง</li>
              <li>กด <strong>ทำให้ใช้งานได้ (Deploy) &gt; การปรับใช้ใหม่ (New Deployment)</strong> เลือกประเภท <strong>เว็บแอปพลิเคชัน (Web App)</strong> และตั้งค่าให้ <strong>ทุกคน (Anyone)</strong> เข้าถึงได้</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Code.gs */}
            <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-emerald-400">📄 Code.gs</span>
                <button
                  onClick={() => copyToClipboard(APPS_SCRIPT_CODE_GS, 'gs')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedCodeGs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeGs ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-96 text-slate-300 leading-relaxed">
                {APPS_SCRIPT_CODE_GS}
              </pre>
            </div>

            {/* Index.html */}
            <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-blue-400">📄 Index.html</span>
                <button
                  onClick={() => copyToClipboard(APPS_SCRIPT_INDEX_HTML, 'html')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedIndexHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndexHtml ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-96 text-slate-300 leading-relaxed">
                {APPS_SCRIPT_INDEX_HTML}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: CSV Export (Direct Download for Google Sheets / Excel) */}
      {activeSubTab === 'csv' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>ส่งออกไฟล์ CSV นำเข้าสู่ Google Sheets / Excel ได้ทันที</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ดาวน์โหลดไฟล์ข้อมูลโครงการและประวัติจำลองราคาในรูปแบบ UTF-8 CSV เพื่อนำไปเปิดใน Google Sheets หรือ Microsoft Excel ได้ทันทีโดยไม่ต้องเชื่อมต่อ API
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ข้อมูลโครงการ e-Bidding ({projects.length} รายการ)</span>
                </span>
              </div>
              <p className="text-xs text-slate-600">
                ไฟล์ประกอบด้วย 22 คอลัมน์มาตรฐาน (ราคากลาง, ราคาที่ชนะ, ผลต่าง %, จำนวนคนงาน ฯลฯ)
              </p>
              <button
                onClick={() => downloadProjectsCsv(projects)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด eBidding_Projects.csv</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <span>ประวัติแผนจำลองราคาเสนอ ({savedSimulations.length} แผน)</span>
                </span>
              </div>
              <p className="text-xs text-slate-600">
                ไฟล์ประกอบด้วย 24 คอลัมน์ (โครงสร้างค่าแรง, ประกันสังคม, ค่าบริหาร, VAT 7%, กำไรสุทธิ)
              </p>
              <button
                onClick={() => downloadSimulationsCsv(savedSimulations)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด Cost_Simulations.csv</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
