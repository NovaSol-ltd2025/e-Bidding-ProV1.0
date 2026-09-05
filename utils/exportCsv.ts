import { EBiddingProject, CostSimulationRecord } from '../types';
import { SHEETS_HEADERS, SIMULATION_SHEETS_HEADERS, projectToSheetRow, simulationToSheetRow } from './googleSheets';

function escapeCsvCell(cell: any): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadProjectsCsv(projects: EBiddingProject[]) {
  const headerRow = SHEETS_HEADERS.map(escapeCsvCell).join(',');
  const dataRows = projects.map((p) => {
    const row = projectToSheetRow(p);
    return row.map(escapeCsvCell).join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `eBidding_Projects_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSimulationsCsv(simulations: CostSimulationRecord[]) {
  const headerRow = SIMULATION_SHEETS_HEADERS.map(escapeCsvCell).join(',');
  const dataRows = simulations.map((s) => {
    const row = simulationToSheetRow(s);
    return row.map(escapeCsvCell).join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `Cost_Simulations_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
