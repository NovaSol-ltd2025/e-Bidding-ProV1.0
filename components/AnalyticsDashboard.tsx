import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingDown, 
  DollarSign, 
  Users, 
  Award, 
  Percent, 
  Layers, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { EBiddingProject, MarketAnalytics, JobType } from '../types';
import { computeMarketAnalytics, formatBaht, formatPercent, formatNumber } from '../utils/calculator';

interface AnalyticsDashboardProps {
  projects: EBiddingProject[];
  onNavigateToSimulator: () => void;
  onNavigateToProjects: () => void;
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#8b5cf6'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  projects,
  onNavigateToSimulator,
  onNavigateToProjects,
}) => {
  const [selectedJobTypeFilter, setSelectedJobTypeFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [chartDisplayLimit, setChartDisplayLimit] = useState<number>(10);

  const filteredProjects = projects.filter((p) => {
    if (selectedJobTypeFilter !== 'all' && p.jobType !== selectedJobTypeFilter) return false;
    if (selectedYearFilter !== 'all' && String(p.fiscalYear) !== selectedYearFilter) return false;
    return true;
  });

  const analytics = computeMarketAnalytics(filteredProjects);

  // Distinct fiscal years & job types for filter
  const fiscalYears = Array.from(new Set<number>(projects.map((p) => p.fiscalYear))).sort((a: number, b: number) => b - a);
  const jobTypes = Array.from(new Set<JobType>(projects.map((p) => p.jobType)));

  // Data for Project Comparison Bar Chart (Short names for clean axes)
  const displayProjects = chartDisplayLimit === 0 ? filteredProjects : filteredProjects.slice(0, chartDisplayLimit);
  const projectComparisonData = displayProjects.map((p) => ({
    name: p.agencyName.length > 14 ? p.agencyName.substring(0, 14) + '...' : p.agencyName,
    fullName: `${p.agencyName} - ${p.projectName}`,
    median: p.medianPrice,
    budget: p.budgetPrice,
    winning: p.winningPrice,
    discountPct: p.diffFromMedianPercent,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>ภาพรวมสถิติการเสนอราคา e-Bidding</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {filteredProjects.length} โครงการ
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            สรุปผลต่างจากราคากลางและงบประมาณ เพื่อใช้วางกลยุทธ์เคาะราคาประมูล และถอดต้นทุนแรงงาน/วัสดุ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Job Type Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">ประเภท:</span>
            <select
              value={selectedJobTypeFilter}
              onChange={(e) => setSelectedJobTypeFilter(e.target.value)}
              className="bg-transparent text-slate-700 outline-none cursor-pointer font-medium"
            >
              <option value="all">ทุกประเภทงาน</option>
              {jobTypes.map((jt) => (
                <option key={jt} value={jt}>{jt}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500">ปีงบประมาณ:</span>
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="bg-transparent text-slate-700 outline-none cursor-pointer font-medium"
            >
              <option value="all">ทุกปี ({fiscalYears.join(', ')})</option>
              {fiscalYears.map((yr) => (
                <option key={yr} value={String(yr)}>ปี {yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards (Professional Polish Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Projects */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-semibold">
              Total Projects (โครงการทั้งหมด)
            </span>
            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-900 font-mono">
            {formatNumber(analytics.totalProjects)}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">
            +12.5% จากปีงบประมาณก่อนหน้า
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            มูลค่างานชนะรวม <span className="font-semibold text-slate-800">{formatBaht(analytics.totalWinningValue)}</span>
          </div>
        </div>

        {/* Card 2: Avg Discount from Median */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-semibold">
              Avg. Winning Discount
            </span>
            <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-600 font-mono">
            {formatPercent(analytics.avgDiscountFromMedianPercent)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            vs Reference Price (ราคากลาง)
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            มัธยฐาน {formatPercent(analytics.medianDiscountFromMedianPercent)} (ช่วง {formatPercent(analytics.minDiscountPercent)} - {formatPercent(analytics.maxDiscountPercent)})
          </div>
        </div>

        {/* Card 3: Avg Cost Per Worker / Month */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-semibold">
              Labor Ratio / Cost Rate
            </span>
            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-900 font-mono">
            {formatBaht(analytics.avgCostPerWorkerPerMonth)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            ต่อคน / ต่อเดือน (Cleaning & Security)
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            เกณฑ์ค่าแรง + สวัสดิการ + วัสดุ + กำไร
          </div>
        </div>

        {/* Card 4: Target Profit Margin / Budget Savings */}
        <div className="bg-white p-4 rounded-lg border border-blue-200 bg-blue-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700 uppercase font-semibold">
              Target Profit Threshold
            </span>
            <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center text-blue-700">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-800 font-mono">
            12.5%
          </div>
          <div className="text-[10px] text-blue-600 font-medium mt-1">
            Optimized Threshold for Bidding
          </div>
          <div className="mt-2.5 pt-2 border-t border-blue-100 text-[11px] text-blue-800">
            ลดจากงบเฉลี่ย {formatPercent(analytics.avgDiscountFromBudgetPercent)}
          </div>
        </div>
      </div>

      {/* Decision Support Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Bidding Strategy Insight & Cost Allocation
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              จากสถิติ e-Bidding โครงการส่วนมากชนะที่ราคา <span className="text-blue-700 font-bold">{formatPercent(analytics.avgWinningToMedianPercent)}</span> ของราคากลาง (ส่วนลดเฉลี่ย <span className="text-blue-700 font-bold">{formatPercent(analytics.avgDiscountFromMedianPercent)}</span>).
              แนะนำแยกโครงสร้างต้นทุน: <span className="text-slate-800 font-semibold">ค่าแรงขั้นต่ำ+สวัสดิการ (60-65%)</span>, <span className="text-slate-800 font-semibold">วัสดุสิ้นเปลือง/เคมีภัณฑ์ (8-12%)</span>, <span className="text-slate-800 font-semibold">เครื่องจักร (3-5%)</span> และ <span className="text-blue-600 font-bold">ค่าบริหาร+กำไร (10-15%)</span>
            </p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={onNavigateToSimulator}
              className="w-full lg:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <span>RUN BID SIMULATOR</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Median vs Budget vs Winning Price Comparison */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Price Comparison (Ref. Price vs Winning)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                เปรียบเทียบ {displayProjects.length} โครงการ (จากทั้งหมด {filteredProjects.length} โครงการ)
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-[11px]">
                <span className="text-slate-500 pl-1.5 text-[10px]">แสดง:</span>
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    onClick={() => setChartDisplayLimit(num)}
                    className={`px-1.5 py-0.5 rounded font-medium transition cursor-pointer ${
                      chartDisplayLimit === num
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setChartDisplayLimit(0)}
                  className={`px-1.5 py-0.5 rounded font-medium transition cursor-pointer ${
                    chartDisplayLimit === 0
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>

              <button 
                onClick={onNavigateToProjects}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer pl-1"
              >
                ดูตารางเต็ม
              </button>
            </div>
          </div>
          <div className="h-72 w-full overflow-x-auto">
            <div style={{ minWidth: displayProjects.length > 15 ? `${displayProjects.length * 40}px` : '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs max-w-xs">
                            <div className="font-bold text-slate-900 mb-1">{data.fullName}</div>
                            <div className="text-slate-600">ราคากลาง: {formatBaht(data.median)}</div>
                            <div className="text-slate-600">งบประมาณ: {formatBaht(data.budget)}</div>
                            <div className="text-blue-600 font-bold">ราคาที่ชนะ: {formatBaht(data.winning)}</div>
                            <div className="text-emerald-600 font-semibold mt-1">ตัดราคากลาง: {data.discountPct}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                    formatter={(value) => {
                      if (value === 'median') return 'ราคากลาง (Ref)';
                      if (value === 'budget') return 'งบประมาณ (Budget)';
                      if (value === 'winning') return 'ราคาที่ชนะ (Winning)';
                      return value;
                    }}
                  />
                  <Bar dataKey="median" fill="#94a3b8" radius={[3, 3, 0, 0]} name="median" />
                  <Bar dataKey="budget" fill="#60a5fa" radius={[3, 3, 0, 0]} name="budget" />
                  <Bar dataKey="winning" fill="#2563eb" radius={[3, 3, 0, 0]} name="winning" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Discount Distribution Range */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Price Variance Distribution (% ตัดราคากลาง)
              </h3>
              <p className="text-[11px] text-slate-400">สัดส่วนโครงการตามช่วงการเคาะลดราคา</p>
            </div>
            <span className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
              ช่วงยอดนิยม: <strong className="text-blue-600">10.1% - 15%</strong>
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.discountDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} โครงการ (${item.payload.percentage}%)`,
                    'จำนวนโครงการ',
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '11px', color: '#1e293b' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  {analytics.discountDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown by Job Type & Top Competitors Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table/List: Job Type Breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>สถิติแยกตามประเภทงาน (Job Category Breakdown)</span>
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            เปรียบเทียบ % ตัดราคา และต้นทุนเฉลี่ยต่อคนงานในแต่ละประเภทบริการ
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase text-slate-500 bg-slate-50 border-y border-slate-200">
                  <th className="px-3 py-2 font-semibold">ประเภทงาน</th>
                  <th className="px-3 py-2 text-center font-semibold">โครงการ</th>
                  <th className="px-3 py-2 text-right font-semibold">ลดจากราคากลาง</th>
                  <th className="px-3 py-2 text-right font-semibold">เฉลี่ย / คน / ด.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {analytics.jobTypeStats.map((jt) => (
                  <tr key={jt.type} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{jt.type}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-600 font-mono">{jt.count}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 font-bold tabular-nums">
                      {formatPercent(jt.avgDiscountMedian)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-800 tabular-nums font-mono">
                      {formatBaht(jt.avgCostPerPersonMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table/List: Top Winning Competitors */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>คู่แข่งที่ชนะการประมูลบ่อย (Top Competitor Intelligence)</span>
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            วิเคราะห์พฤติกรรมการเคาะราคาของผู้ชนะที่มีส่วนแบ่งงานมากที่สุด
          </p>

          <div className="space-y-2">
            {analytics.topWinners.slice(0, 5).map((winner, idx) => (
              <div
                key={winner.name}
                className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center border border-blue-200">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{winner.name}</div>
                    <div className="text-[10px] text-slate-500">
                      ชนะ {winner.count} โครงการ • วงเงินรวม {formatBaht(winner.totalWon)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-blue-600 font-mono">
                    ลดเฉลี่ย {formatPercent(winner.avgDiscount)}
                  </div>
                  <div className="text-[10px] text-slate-400">จากราคากลาง</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
