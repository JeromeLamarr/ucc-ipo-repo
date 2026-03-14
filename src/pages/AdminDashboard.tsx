import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Users, FileText, TrendingUp, Activity, BarChart2, Filter, Download } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { AdminPendingApplicants } from '../components/AdminPendingApplicants';
import type { Database } from '../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];
type IpRecord = Database['public']['Tables']['ip_records']['Row'];

interface VizRecord {
  status: string;
  category: string;
  created_at: string;
  department: string;
}

const VIZ_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'waiting_supervisor', label: 'Waiting Supervisor' },
  { value: 'supervisor_revision', label: 'Supervisor Revision' },
  { value: 'supervisor_approved', label: 'Supervisor Approved' },
  { value: 'waiting_evaluation', label: 'Waiting Evaluation' },
  { value: 'evaluator_revision', label: 'Evaluator Revision' },
  { value: 'evaluator_approved', label: 'Evaluator Approved' },
  { value: 'preparing_legal', label: 'Preparing Legal' },
  { value: 'ready_for_filing', label: 'Ready for Filing' },
  { value: 'rejected', label: 'Rejected' },
];

export function AdminDashboard() {
  const { primaryColor } = useBranding();
  const [stats, setStats] = useState({
    totalUsers: 0,
    applicants: 0,
    supervisors: 0,
    evaluators: 0,
    totalSubmissions: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [categoryStats, setCategoryStats] = useState<{ category: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [allVizRecords, setAllVizRecords] = useState<VizRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Data Visualization Panel filter state
  const [vizFromDate, setVizFromDate] = useState('');
  const [vizToDate, setVizToDate] = useState('');
  const [vizStatus, setVizStatus] = useState('');
  const [vizCategory, setVizCategory] = useState('');
  const [vizDepartment, setVizDepartment] = useState('');

  // Pagination state for recent activity
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, recordsRes, activityRes] = await Promise.all([
        supabase.from('users').select('role'),
        supabase.from('ip_records').select('status, category, created_at, applicant_id'),
        supabase
          .from('activity_logs')
          .select('*, user:users(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (usersRes.data) {
        const users = usersRes.data;
        setStats((prev) => ({
          ...prev,
          totalUsers: users.length,
          applicants: users.filter((u) => u.role === 'applicant').length,
          supervisors: users.filter((u) => u.role === 'supervisor').length,
          evaluators: users.filter((u) => u.role === 'evaluator').length,
        }));
      }

      if (recordsRes.data) {
        const records = recordsRes.data;
        setStats((prev) => ({
          ...prev,
          totalSubmissions: records.length,
          pending: records.filter((r) =>
            ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
          ).length,
          approved: records.filter((r) =>
            ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
          ).length,
          rejected: records.filter((r) => r.status === 'rejected').length,
        }));

        const categoryCounts: { [key: string]: number } = {};
        records.forEach((r) => {
          categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
        });
        setCategoryStats(
          Object.entries(categoryCounts).map(([category, count]) => ({ category, count }))
        );
      }

      if (activityRes.data) {
        setRecentActivity(activityRes.data);
      }

      // Dept user lookup + viz records: fetch with id to enable record→dept join
      const { data: deptRaw } = await supabase.from('users').select('id, affiliation, role');
      if (deptRaw) {
        type UserRaw = { id: string; affiliation: string | null; role: string };
        const allUsers = deptRaw as unknown as UserRaw[];

        // user-id → department lookup (used to annotate viz records)
        const userDeptMap: Record<string, string> = {};
        allUsers.forEach((u) => {
          userDeptMap[u.id] = u.affiliation?.trim() || 'Unaffiliated';
        });

        // Build allVizRecords annotated with department
        if (recordsRes.data) {
          type RecRaw = { status: string; category: string; created_at: string; applicant_id: string };
          const rawRecs = recordsRes.data as unknown as RecRaw[];
          setAllVizRecords(
            rawRecs.map((r) => ({
              status: r.status,
              category: r.category,
              created_at: r.created_at,
              department: userDeptMap[r.applicant_id] || 'Unaffiliated',
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // --- Data Visualization Panel: filter logic + reactive chart values ---
  const dateInvalid = !!(vizFromDate && vizToDate && vizFromDate > vizToDate);
  const hasActiveVizFilters = !!(vizFromDate || vizToDate || vizStatus || vizCategory || vizDepartment);

  const filteredVizRecords: VizRecord[] = dateInvalid
    ? allVizRecords
    : allVizRecords.filter((r) => {
        const recDate = r.created_at.substring(0, 10);
        if (vizFromDate && recDate < vizFromDate) return false;
        if (vizToDate && recDate > vizToDate) return false;
        if (vizStatus && r.status !== vizStatus) return false;
        if (vizCategory && r.category !== vizCategory) return false;
        if (vizDepartment && r.department !== vizDepartment) return false;
        return true;
      });

  // Filtered status counts
  const fPending = filteredVizRecords.filter((r) =>
    ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
  ).length;
  const fApproved = filteredVizRecords.filter((r) =>
    ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
  ).length;
  const fRejected = filteredVizRecords.filter((r) => r.status === 'rejected').length;
  const fTotal = fPending + fApproved + fRejected;

  // Filtered category stats
  const fCatMap: Record<string, number> = {};
  filteredVizRecords.forEach((r) => { fCatMap[r.category] = (fCatMap[r.category] || 0) + 1; });
  const fCategoryStats = Object.entries(fCatMap).map(([category, count]) => ({ category, count }));
  const fCatTotal = fCategoryStats.reduce((s, c) => s + c.count, 0);

  // Filtered department stats
  const fDeptMap: Record<string, number> = {};
  filteredVizRecords.forEach((r) => { fDeptMap[r.department] = (fDeptMap[r.department] || 0) + 1; });
  const fDeptStats = Object.entries(fDeptMap)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Dropdown options derived from ALL (unfiltered) records
  const allVizCategories = [...new Set(allVizRecords.map((r) => r.category))].sort();
  const allVizDepartments = [...new Set(allVizRecords.map((r) => r.department))].sort();

  // Conic gradient helpers
  const catPieColors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f472b6'];
  const vizStatusSegments = [
    { label: 'Pending', value: fPending, color: '#f59e0b' },
    { label: 'Approved', value: fApproved, color: '#22c55e' },
    { label: 'Rejected', value: fRejected, color: '#ef4444' },
  ];
  const statusDonutGradient = (() => {
    if (fTotal === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let deg = 0;
    const parts = vizStatusSegments.map((s) => {
      const span = (s.value / fTotal) * 360;
      const part = `${s.color} ${deg}deg ${deg + span}deg`;
      deg += span;
      return part;
    });
    return `conic-gradient(${parts.join(', ')})`;
  })();
  const categoryPieGradient = (() => {
    if (fCategoryStats.length === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    if (fCatTotal === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let deg = 0;
    const parts = fCategoryStats.map((cat, i) => {
      const span = (cat.count / fCatTotal) * 360;
      const color = catPieColors[i % catPieColors.length];
      const part = `${color} ${deg}deg ${deg + span}deg`;
      deg += span;
      return part;
    });
    return `conic-gradient(${parts.join(', ')})`;
  })();

  // Pagination calculation for recent activity
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivity = recentActivity.slice(startIndex, endIndex);
  const totalPages = Math.ceil(recentActivity.length / itemsPerPage);

  // --- Data Visualization Report (SVG charts, auto print-to-PDF) ---
  const handleDownloadVizReport = () => {
    const now = new Date();
    const generatedAt = now.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const fmt = (s: string) =>
      s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
    const fmtDate = (d: string) =>
      d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    const now = new Date();
    const generatedAt = now.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const fmt = (s: string) =>
      s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
    const fmtDate = (d: string) =>
      d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    // ── SVG pie/donut helper ──────────────────────────────────────────────
    const makePieSegments = (
      segs: { value: number; color: string }[],
      cx: number, cy: number, r: number, innerR = 0
    ): string => {
      const total = segs.reduce((s, g) => s + g.value, 0);
      if (total === 0) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e5e7eb"/>`;
      let paths = '';
      let startDeg = -90;
      segs.forEach((seg) => {
        if (seg.value === 0) return;
        const sweep = (seg.value / total) * 360;
        const endDeg = startDeg + Math.min(sweep, 359.99);
        const s = (startDeg * Math.PI) / 180;
        const e = (endDeg * Math.PI) / 180;
        const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
        const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
        const la = sweep > 180 ? 1 : 0;
        if (innerR > 0) {
          const ix1 = cx + innerR * Math.cos(s), iy1 = cy + innerR * Math.sin(s);
          const ix2 = cx + innerR * Math.cos(e), iy2 = cy + innerR * Math.sin(e);
          paths += `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${la} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${innerR} ${innerR} 0 ${la} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z" fill="${seg.color}"/>`;
        } else {
          paths += `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${la} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${seg.color}"/>`;
        }
        startDeg += sweep;
      });
      return paths;
    };

    // ── Status donut SVG ──────────────────────────────────────────────────
    const statusSegs = [
      { label: 'Pending',  value: fPending,  color: '#f59e0b' },
      { label: 'Approved', value: fApproved, color: '#22c55e' },
      { label: 'Rejected', value: fRejected, color: '#ef4444' },
    ];
    const statusSvg = `<svg viewBox="0 0 160 160" width="160" height="160">
      ${makePieSegments(statusSegs, 80, 80, 70, 42)}
      <circle cx="80" cy="80" r="41" fill="white"/>
      <text x="80" y="76" text-anchor="middle" font-size="20" font-weight="bold" fill="#1f2937">${fTotal}</text>
      <text x="80" y="90" text-anchor="middle" font-size="10" fill="#6b7280">Total</text>
    </svg>`;
    const statusLegend = statusSegs.map(({ label, value, color }) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <span style="font-size:12px;color:#374151">${label}: <strong>${value}</strong></span>
      </div>`
    ).join('');

    // ── Category pie SVG ─────────────────────────────────────────────────
    const catSegs = fCategoryStats.map((c, i) => ({
      label: fmt(c.category), value: c.count,
      color: catPieColors[i % catPieColors.length],
    }));
    const catSvg = `<svg viewBox="0 0 160 160" width="160" height="160">
      ${makePieSegments(catSegs, 80, 80, 70)}
    </svg>`;
    const catLegend = catSegs.map(({ label, value, color }) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <span style="font-size:12px;color:#374151">${label}: <strong>${value}</strong></span>
      </div>`
    ).join('');

    // ── Department bar chart SVG ──────────────────────────────────────────
    const maxDeptCount = fDeptStats.length > 0 ? fDeptStats[0].count : 1;
    const BAR_W = 260; const BAR_EACH = 26; const LBL_W = 130;
    const deptSvgH = fDeptStats.length * BAR_EACH + 10;
    const deptBars = fDeptStats.map(({ department, count }, i) => {
      const bw = maxDeptCount > 0 ? (count / maxDeptCount) * BAR_W : 0;
      const by = i * BAR_EACH + 5;
      const lbl = department.length > 20 ? department.substring(0, 19) + '…' : department;
      return `<text x="${LBL_W - 5}" y="${by + 15}" text-anchor="end" font-size="11" fill="#374151">${lbl}</text>
        <rect x="${LBL_W}" y="${by + 5}" width="${BAR_W}" height="14" rx="4" fill="#e5e7eb"/>
        <rect x="${LBL_W}" y="${by + 5}" width="${bw.toFixed(1)}" height="14" rx="4" fill="#166534"/>
        <text x="${LBL_W + bw + 5}" y="${by + 15}" font-size="11" font-weight="bold" fill="#1f2937">${count}</text>`;
    }).join('');
    const deptSvg = fDeptStats.length === 0
      ? '<p style="color:#9ca3af;font-size:12px">No data.</p>'
      : `<svg viewBox="0 0 ${LBL_W + BAR_W + 50} ${deptSvgH}" width="100%" style="max-width:500px">${deptBars}</svg>`;

    // ── Distribution table data ───────────────────────────────────────────
    const allStatusMap: Record<string, number> = {};
    filteredVizRecords.forEach((r) => { allStatusMap[r.status] = (allStatusMap[r.status] || 0) + 1; });
    const allStatusRows = Object.entries(allStatusMap).sort((a, b) => b[1] - a[1]);
    const catRows = fCategoryStats.slice().sort((a, b) => b.count - a.count);
    const fullDeptMap: Record<string, number> = {};
    filteredVizRecords.forEach((r) => { fullDeptMap[r.department] = (fullDeptMap[r.department] || 0) + 1; });
    const deptRows = Object.entries(fullDeptMap).sort((a, b) => b[1] - a[1]);

    const filterRows = [
      ['From Date', vizFromDate ? fmtDate(vizFromDate) : 'Not set'],
      ['To Date',   vizToDate   ? fmtDate(vizToDate)   : 'Not set'],
      ['Status',    vizStatus   ? fmt(vizStatus)        : 'All Statuses'],
      ['Category',  vizCategory ? fmt(vizCategory)      : 'All Categories'],
      ['Department', vizDepartment || 'All Departments'],
    ];

    const recordRows = filteredVizRecords
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r, i) =>
        `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">
          <td>${i + 1}</td><td>${fmt(r.category)}</td><td>${fmt(r.status)}</td>
          <td>${r.department}</td><td>${fmtDate(r.created_at)}</td></tr>`
      ).join('');

    const dateStr = now.toISOString().substring(0, 10);

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Data Visualization Report — ${dateStr}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:#f9fafb;padding:32px}.page{max-width:960px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}header{background:linear-gradient(135deg,#166534,#16a34a);color:#fff;padding:28px 36px}header h1{font-size:22px;font-weight:800;margin-bottom:4px}header p{font-size:12px;opacity:.85}header .meta{margin-top:8px;font-size:11px;opacity:.7}section{padding:22px 36px;border-bottom:1px solid #e5e7eb}section:last-child{border-bottom:none}h2{font-size:11px;font-weight:700;color:#166534;margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em}.charts-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;align-items:start}.chart-box{text-align:center}.chart-box h3{font-size:10px;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em}.chart-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}.legend{text-align:left;width:100%}.filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}.filter-grid th{font-size:11px;font-weight:600;color:#6b7280;padding:3px 0;width:100px;text-align:left}.filter-grid td{font-size:12px;color:#111827;padding:3px 0}.metrics{display:flex;gap:10px;flex-wrap:wrap}.metric{flex:1 1 100px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;text-align:center}.metric .num{font-size:24px;font-weight:900;color:#166534}.metric .lbl{font-size:10px;color:#6b7280;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:#166534;color:#fff}thead th{padding:7px 9px;text-align:left;font-weight:600;font-size:11px}tbody tr.even{background:#f9fafb}tbody tr.odd{background:#fff}tbody td{padding:6px 9px;border-bottom:1px solid #e5e7eb}td.num,th.num{text-align:right}.no-print{display:block}@media print{body{background:none;padding:0}.page{box-shadow:none;border-radius:0}.no-print{display:none}}.print-btn{display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:8px 18px;background:#166534;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}.print-btn:hover{background:#14532d}</style></head>
<body><div class="page">
  <header><h1>Data Visualization Report</h1><p>Generated from Admin Dashboard filtered data</p><div class="meta">Generated: ${generatedAt}</div></header>

  <section><h2>Active Filters</h2>
    <table class="filter-grid"><tbody>${filterRows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
  </section>

  <section><h2>Summary Metrics</h2>
    <div class="metrics">
      <div class="metric"><div class="num">${filteredVizRecords.length}</div><div class="lbl">Total Records</div></div>
      <div class="metric" style="border-color:#fde68a"><div class="num" style="color:#d97706">${fPending}</div><div class="lbl">Pending</div></div>
      <div class="metric" style="border-color:#86efac"><div class="num" style="color:#16a34a">${fApproved}</div><div class="lbl">Approved</div></div>
      <div class="metric" style="border-color:#fca5a5"><div class="num" style="color:#dc2626">${fRejected}</div><div class="lbl">Rejected</div></div>
    </div>
  </section>

  <section><h2>Visual Charts</h2>
    <div class="charts-grid">
      <div class="chart-box"><h3>Submission Status</h3><div class="chart-wrap">${statusSvg}<div class="legend">${statusLegend}</div></div></div>
      <div class="chart-box"><h3>Records by Category</h3><div class="chart-wrap">${catSegs.length > 0 ? catSvg : '<p style="color:#9ca3af;font-size:12px">No data.</p>'}<div class="legend">${catLegend}</div></div></div>
      <div class="chart-box" style="text-align:left"><h3>Records by Department</h3>${deptSvg}</div>
    </div>
  </section>

  <section><h2>Status Distribution</h2>
    ${allStatusRows.length === 0 ? '<p style="color:#9ca3af;font-size:12px">No data.</p>' : `<table><thead><tr><th>Status</th><th class="num">Count</th><th class="num">% of Total</th></tr></thead><tbody>${allStatusRows.map(([s, c], i) => `<tr class="${i%2===0?'even':'odd'}"><td>${fmt(s)}</td><td class="num">${c}</td><td class="num">${filteredVizRecords.length > 0 ? ((c/filteredVizRecords.length)*100).toFixed(1)+'%' : '0%'}</td></tr>`).join('')}</tbody></table>`}
  </section>

  <section><h2>Category Distribution</h2>
    ${catRows.length === 0 ? '<p style="color:#9ca3af;font-size:12px">No data.</p>' : `<table><thead><tr><th>Category</th><th class="num">Count</th><th class="num">% of Total</th></tr></thead><tbody>${catRows.map((c, i) => `<tr class="${i%2===0?'even':'odd'}"><td>${fmt(c.category)}</td><td class="num">${c.count}</td><td class="num">${fCatTotal > 0 ? ((c.count/fCatTotal)*100).toFixed(1)+'%' : '0%'}</td></tr>`).join('')}</tbody></table>`}
  </section>

  <section><h2>Department Distribution</h2>
    ${deptRows.length === 0 ? '<p style="color:#9ca3af;font-size:12px">No data.</p>' : `<table><thead><tr><th>Department</th><th class="num">Count</th><th class="num">% of Total</th></tr></thead><tbody>${deptRows.map(([d, c], i) => `<tr class="${i%2===0?'even':'odd'}"><td>${d}</td><td class="num">${c}</td><td class="num">${filteredVizRecords.length > 0 ? ((c/filteredVizRecords.length)*100).toFixed(1)+'%' : '0%'}</td></tr>`).join('')}</tbody></table>`}
  </section>

  <section><h2>Filtered Records (${filteredVizRecords.length})</h2>
    ${filteredVizRecords.length === 0 ? '<p style="color:#9ca3af;font-size:12px">No records match the selected filters.</p>' : `<table><thead><tr><th>#</th><th>Category</th><th>Status</th><th>Department</th><th>Submitted</th></tr></thead><tbody>${recordRows}</tbody></table>`}
  </section>

  <section class="no-print" style="background:#f9fafb">
    <p style="font-size:12px;color:#6b7280;margin-bottom:8px">To save as PDF: click the button below, then choose &ldquo;Save as PDF&rdquo; in the print dialog.</p>
    <button class="print-btn" onclick="window.print()">&#128438; Save as PDF / Print</button>
  </section>
</div></body></html>`;

    const newWin = window.open('', '_blank');
    if (newWin) {
      newWin.document.write(html);
      newWin.document.close();
      setTimeout(() => newWin.print(), 600);
    } else {
      // Fallback: download as HTML if popups are blocked
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-visualization-report-${dateStr}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-3">Admin Dashboard</h1>
        <p className="text-lg text-gray-600 font-medium">System overview and real-time analytics</p>
      </div>

      {/* Pending Applicants Section - HIGH PRIORITY */}
      <AdminPendingApplicants />

      {/* Data Visualization Panel */}
      <div
        className="rounded-2xl border shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`,
          borderColor: `${primaryColor}40`,
        }}
      >
        {/* Panel Header */}
        <div
          className="p-6 border-b"
          style={{
            borderBottomColor: `${primaryColor}40`,
            background: `linear-gradient(to right, ${primaryColor}08, #6366f108)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Data Visualization Panel</h2>
              <p className="text-sm text-gray-600 mt-1">Overview of records and user-managed data</p>
            </div>
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-4 border-b bg-white/40" style={{ borderBottomColor: `${primaryColor}20` }}>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">From</label>
              <input
                type="date"
                value={vizFromDate}
                onChange={(e) => setVizFromDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">To</label>
              <input
                type="date"
                value={vizToDate}
                onChange={(e) => setVizToDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Status</label>
              <select
                value={vizStatus}
                onChange={(e) => setVizStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All Statuses</option>
                {VIZ_STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Category</label>
              <select
                value={vizCategory}
                onChange={(e) => setVizCategory(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All Categories</option>
                {allVizCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Department</label>
              <select
                value={vizDepartment}
                onChange={(e) => setVizDepartment(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All Departments</option>
                {allVizDepartments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            {hasActiveVizFilters && (
              <button
                onClick={() => {
                  setVizFromDate('');
                  setVizToDate('');
                  setVizStatus('');
                  setVizCategory('');
                  setVizDepartment('');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors self-end"
              >
                <Filter className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            )}
            <button
              onClick={handleDownloadVizReport}
              disabled={allVizRecords.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors self-end disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: allVizRecords.length === 0 ? '#9ca3af' : `linear-gradient(135deg, ${primaryColor}, #16a34a)` }}
              title={filteredVizRecords.length === 0 ? 'No records match current filters' : 'Download filtered report'}
            >
              <Download className="h-3.5 w-3.5" />
              Download Report
            </button>
          </div>
          {dateInvalid && (
            <p className="text-xs text-red-500 mt-2 font-medium">
              "From" date cannot be later than "To" date — showing all data until corrected.
            </p>
          )}
        </div>

        {/* Charts Body */}
        <div className="p-6">
          {allVizRecords.length === 0 ? (
            <div className="text-center py-16">
              <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Not enough data to visualize yet.</p>
            </div>
          ) : filteredVizRecords.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No records found for the selected filters.</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting or resetting the filters above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Status Distribution Donut */}
              <div
                className="bg-white/60 rounded-xl p-5 border"
                style={{ borderColor: `${primaryColor}20` }}
              >
                <h3 className="text-sm font-bold text-gray-800 mb-4">Submission Status</h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
                    <div
                      className="w-full h-full rounded-full"
                      style={{ background: statusDonutGradient }}
                    />
                    <div
                      className="absolute rounded-full bg-white flex flex-col items-center justify-center"
                      style={{ top: '25%', left: '25%', width: '50%', height: '50%' }}
                    >
                      <span className="text-base font-black text-gray-900">{fTotal}</span>
                      <span className="text-xs text-gray-400">Total</span>
                    </div>
                  </div>
                  <div className="space-y-2 w-full">
                    {vizStatusSegments.map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-gray-600 font-medium">{label}</span>
                        </div>
                        <span className="font-bold text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Records by Category Pie */}
              <div
                className="bg-white/60 rounded-xl p-5 border"
                style={{ borderColor: `${primaryColor}20` }}
              >
                <h3 className="text-sm font-bold text-gray-800 mb-4">Records by Category</h3>
                {fCategoryStats.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Not enough data to visualize yet.</p>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
                      <div
                        className="w-full h-full rounded-full"
                        style={{ background: categoryPieGradient }}
                      />
                      <div
                        className="absolute rounded-full bg-white flex flex-col items-center justify-center"
                        style={{ top: '25%', left: '25%', width: '50%', height: '50%' }}
                      >
                        <span className="text-base font-black text-gray-900">{fCatTotal}</span>
                        <span className="text-xs text-gray-400">Records</span>
                      </div>
                    </div>
                    <div className="space-y-2 w-full">
                      {fCategoryStats.map((cat, i) => (
                        <div key={cat.category} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: catPieColors[i % catPieColors.length] }}
                            />
                            <span className="text-gray-600 font-medium capitalize">{cat.category}</span>
                          </div>
                          <span className="font-bold text-gray-800">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Records by Department Bar Chart */}
              <div
                className="bg-white/60 rounded-xl p-5 border"
                style={{ borderColor: `${primaryColor}20` }}
              >
                <h3 className="text-sm font-bold text-gray-800 mb-4">Records by Department</h3>
                {fDeptStats.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Not enough data to visualize yet.</p>
                ) : (
                  <div className="space-y-3">
                    {fDeptStats.map(({ department, count }) => {
                      const maxCount = fDeptStats[0].count;
                      return (
                        <div key={department}>
                          <div className="flex justify-between items-center mb-1">
                            <span
                              className="text-xs text-gray-600 font-medium truncate max-w-[70%]"
                              title={department}
                            >
                              {department}
                            </span>
                            <span className="text-xs font-bold text-gray-800">{count}</span>
                          </div>
                          <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${(count / maxCount) * 100}%`,
                                background: `linear-gradient(to right, ${primaryColor}, #6366f1)`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`, borderColor: `${primaryColor}40` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}, #6366f1)` }}>
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: primaryColor, backgroundColor: `${primaryColor}20` }}>Active</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Users</p>
          <p className="text-4xl font-black text-gray-900 mt-2">{stats.totalUsers}</p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            {stats.applicants} applicants, {stats.supervisors} supervisors, {stats.evaluators} evaluators
          </p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: `linear-gradient(135deg, #10b98108, #34d39908)`, borderColor: '#10b98140' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#10b981', backgroundColor: '#10b98120' }}>Submitted</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Submissions</p>
          <p className="text-4xl font-black text-gray-900 mt-2">{stats.totalSubmissions}</p>
          <p className="text-xs text-gray-500 mt-2">All categories combined</p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f5991808, #d97706108)', borderColor: '#f5991840' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f59918, #d97706)' }}>
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#f59918', backgroundColor: '#f5991820' }}>In Review</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Pending Review</p>
          <p className="text-4xl font-black mt-2" style={{ color: '#f59918' }}>{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-2">Awaiting approval</p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #22c55e08, #16a34a08)', borderColor: '#22c55e40' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#22c55e', backgroundColor: '#22c55e20' }}>Approved</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Approved</p>
          <p className="text-4xl font-black mt-2" style={{ color: '#22c55e' }}>{stats.approved}</p>
          <p className="text-xs text-gray-500 mt-2">Ready for filing</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border shadow-lg p-6 hover:shadow-xl transition-shadow duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`, borderColor: `${primaryColor}40` }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Submissions by Category</h2>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>
          </div>
          <div className="space-y-5">
            {categoryStats.map(({ category, count }) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700 capitalize">{category}</span>
                  <span className="text-sm font-bold px-2 py-1 rounded-lg" style={{ color: primaryColor, backgroundColor: `${primaryColor}20` }}>{count}</span>
                </div>
                <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                  <div
                    className="h-2.5 rounded-full shadow-md"
                    style={{
                      width: `${(count / stats.totalSubmissions) * 100}%`,
                      background: `linear-gradient(to right, ${primaryColor}, #6366f1)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl border border-indigo-200/40 shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Status Distribution</h2>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Pending</span>
                <span className="text-sm font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">{stats.pending}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 shadow-md"
                  style={{
                    width: `${(stats.pending / stats.totalSubmissions) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Approved</span>
                <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">{stats.approved}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-md"
                  style={{
                    width: `${(stats.approved / stats.totalSubmissions) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Rejected</span>
                <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">{stats.rejected}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 shadow-md"
                  style={{
                    width: `${(stats.rejected / stats.totalSubmissions) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #9333ea08)`, borderColor: `${primaryColor}40` }}>
        <div className="p-6 border-b" style={{ borderBottomColor: `${primaryColor}40`, background: `linear-gradient(to right, ${primaryColor}08, #9333ea08)` }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
            {recentActivity.length > 0 && <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>}
          </div>
        </div>
        <div style={{ borderColor: `${primaryColor}30` }} className="divide-y">
          {recentActivity.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No recent activity</p>
            </div>
          ) : (
            paginatedActivity.map((activity) => (
              <div key={activity.id} className="p-5 hover:transition-colors duration-200 group" style={{ _hover: { background: `linear-gradient(to right, ${primaryColor}08, #9333ea08)` } }}>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl group-hover:shadow-lg transition-all duration-300">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 font-medium">
                      <span className="text-blue-600 font-bold">
                        {activity.user?.full_name || 'System'}
                      </span>{' '}
                      <span className="text-gray-700">{formatAction(activity.action)}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(count) => {
              setItemsPerPage(count);
              setCurrentPage(1);
            }}
            totalItems={recentActivity.length}
          />
        )}
      </div>
    </div>
  );
}
