import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ProjectTable } from './components/ProjectTable';
import { PriceSimulator } from './components/PriceSimulator';
import { GoogleSheetsSync } from './components/GoogleSheetsSync';
import { ProjectModal } from './components/ProjectModal';
import { EBiddingProject } from './types';
import { initialProjects } from './data/mockProjects';
import { projectToSheetRow, appendSheetRows, readSheetRows, parseSheetRowToProject } from './utils/googleSheets';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [projects, setProjects] = useState<EBiddingProject[]>(() => {
    try {
      const saved = localStorage.getItem('ebidding_projects_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load local projects:', e);
    }
    return initialProjects;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<EBiddingProject | null>(null);

  // Google Sheets integration states
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [isTokenActive, setIsTokenActive] = useState(false);
  // Which sheet tab holds the project rows for THIS spreadsheet ('eBidding_Projects' is the
  // default created by the "New Spreadsheet" flow; 'eBidding_Data' is used by the Apps Script
  // backend). Detected on load, defaults to 'eBidding_Projects' for brand-new sheets.
  const [activeSheetTab, setActiveSheetTab] = useState<string>('eBidding_Projects');

  // Check and auto pull from Google Sheets on mount if connected
  useEffect(() => {
    const savedToken = sessionStorage.getItem('google_sheets_token');
    const savedSheetId = localStorage.getItem('ebidding_sheet_id');
    const savedSheetUrl = localStorage.getItem('ebidding_sheet_url');

    if (savedToken) {
      setIsTokenActive(true);
    }
    if (savedSheetId) {
      setSpreadsheetId(savedSheetId);
    }
    if (savedSheetUrl) {
      setSpreadsheetUrl(savedSheetUrl);
    }

    if (savedToken && savedSheetId) {
      // The tab may be named 'eBidding_Projects' (created by the in-app "New Spreadsheet"
      // flow) or 'eBidding_Data' (created by the Apps Script backend). Try both.
      const tryReadSheet = async () => {
        for (const tabName of ['eBidding_Projects', 'eBidding_Data']) {
          try {
            const rawRows = await readSheetRows(savedToken, savedSheetId, `${tabName}!A2:V1000`);
            if (rawRows.length > 0) {
              setActiveSheetTab(tabName);
              return rawRows;
            }
          } catch (err) {
            console.log(`Auto-fetch from tab "${tabName}" notice:`, (err as Error).message);
          }
        }
        return [];
      };

      tryReadSheet().then((rawRows) => {
        const sheetProjects: EBiddingProject[] = [];
        rawRows.forEach((row, i) => {
          const p = parseSheetRowToProject(row, i);
          if (p) sheetProjects.push(p);
        });
        if (sheetProjects.length > 0) {
          setProjects(sheetProjects);
        }
      });
    }
  }, []);

  // Save projects to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('ebidding_projects_data', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects:', e);
    }
  }, [projects]);

  // Handlers for project CRUD
  const handleSaveProject = async (savedProject: EBiddingProject) => {
    setProjects((prev) => {
      const index = prev.findIndex((p) => p.id === savedProject.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = savedProject;
        return updated;
      }
      return [savedProject, ...prev];
    });

    // Auto push to Google Sheet if token & sheet are connected
    const savedToken = sessionStorage.getItem('google_sheets_token');
    const targetSheetId = spreadsheetId || localStorage.getItem('ebidding_sheet_id');
    if (savedToken && targetSheetId) {
      try {
        const row = projectToSheetRow(savedProject);
        await appendSheetRows(savedToken, targetSheetId, `${activeSheetTab}!A:V`, [row]);
      } catch (err) {
        console.error('Failed to auto-append to Google Sheet:', err);
      }
    }
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleEditProject = (project: EBiddingProject) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleAddNewProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleImportCsv = (newProjects: EBiddingProject[]) => {
    setProjects((prev) => [...newProjects, ...prev]);
  };

  const handleSyncProjectsFromSheet = (sheetProjects: EBiddingProject[]) => {
    setProjects(sheetProjects);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewProjectModal={handleAddNewProject}
        totalProjects={projects.length}
        isSheetsConnected={isTokenActive}
      />

      {/* Sub-header Breadcrumb Bar (Professional Polish) */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-slate-400">Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">
              {activeTab === 'dashboard' && 'Bidding Analytics (Thailand) • สรุปภาพรวมสถิติ'}
              {activeTab === 'projects' && 'Project Database • ฐานข้อมูล 22 คอลัมน์'}
              {activeTab === 'simulator' && 'Labor & Cost Estimator • จำลองราคาเสนอ'}
              {activeTab === 'sheets' && 'Google Sheets & GAS Sync • การเชื่อมต่อชีต'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium text-[11px] border border-slate-200">
              FY 2568 / e-GP
            </span>
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
              AD
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <AnalyticsDashboard
            projects={projects}
            onNavigateToSimulator={() => setActiveTab('simulator')}
            onNavigateToProjects={() => setActiveTab('projects')}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectTable
            projects={projects}
            onAddNew={handleAddNewProject}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onImportCsv={handleImportCsv}
            onNavigateToSheets={() => setActiveTab('sheets')}
            onOpenSimulator={() => setActiveTab('simulator')}
          />
        )}

        {activeTab === 'simulator' && (
          <PriceSimulator
            historicalProjects={projects}
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            isTokenActive={isTokenActive}
            onSaveAsProject={(p) => {
              setEditingProject(p as EBiddingProject);
              setIsModalOpen(true);
            }}
          />
        )}

        {activeTab === 'sheets' && (
          <GoogleSheetsSync
            projects={projects}
            onSyncProjectsFromSheet={handleSyncProjectsFromSheet}
            spreadsheetId={spreadsheetId}
            setSpreadsheetId={setSpreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            setSpreadsheetUrl={setSpreadsheetUrl}
            isTokenActive={isTokenActive}
            setIsTokenActive={setIsTokenActive}
          />
        )}
      </main>

      {/* Project Add/Edit Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        editingProject={editingProject}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span className="font-semibold text-slate-700">E-BIDDING PRO</span>
            <span>• Decision Support System for Government Procurement</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Google Sheets 2-Way Sync (22-Cols) • Thai Government Procurement Analytics
          </div>
        </div>
      </footer>
    </div>
  );
}
