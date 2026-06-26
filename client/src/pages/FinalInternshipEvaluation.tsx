import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface FinalEvalData {
  id: string;
  intern_id: string;
  intern_name: string | null;
  p_no: string | null;
  project_score: number | null;
  attendance_score: number;
  guide_score: number;
  final_internship_score: number | null;
  evaluation_method: string;
  evaluation_status: string;
  rank: number;
  grade: string;
  remarks: string;
}

const GRADE_STYLES: Record<string, string> = {
  'Outstanding': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  'Excellent': 'bg-green-100 text-green-800 border border-green-300',
  'Very Good': 'bg-blue-100 text-blue-800 border border-blue-300',
  'Good': 'bg-indigo-100 text-indigo-800 border border-indigo-300',
  'Satisfactory': 'bg-orange-100 text-orange-800 border border-orange-300',
  'Needs Improvement': 'bg-red-100 text-red-800 border border-red-300',
};

const RANK_STYLES = (rank: number) => {
  if (rank === 1) return 'text-2xl';
  if (rank === 2) return 'text-xl';
  if (rank === 3) return 'text-lg';
  return '';
};

const RANK_ICON = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export default function FinalInternshipEvaluation() {
  const [evaluations, setEvaluations] = useState<FinalEvalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'rank' | 'final_internship_score' | 'project_score' | 'attendance_score' | 'guide_score' | 'evaluation_method' | 'evaluation_status'>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/final-evaluation`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Map relations p_no
      const mapped = data.map((d: any) => ({
        ...d,
        p_no: d.intern?.p_no || null
      }));
      setEvaluations(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${BASE}/final-evaluation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setSuccess(`Successfully generated ${data.count} final evaluations`);
      fetchEvaluations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (internId: string) => {
    if (!confirm('Delete this evaluation?')) return;
    try {
      const res = await fetch(`${BASE}/final-evaluation/${internId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchEvaluations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'rank' || field === 'evaluation_status' ? 'asc' : 'desc');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filtered.map(ev => ({
      Rank: ev.rank > 0 ? ev.rank : '—',
      'Intern ID': ev.intern_id,
      'P No': ev.p_no || '',
      Name: ev.intern_name || '—',
      'Project Score': ev.project_score !== null ? ev.project_score : 'N/A',
      'Guide Feedback Score': ev.guide_score,
      'Attendance Score': ev.attendance_score,
      'Final Score': ev.final_internship_score !== null ? ev.final_internship_score : 'Pending',
      'Evaluation Method': ev.evaluation_method || 'Project + Guide + Attendance',
      'Evaluation Status': ev.evaluation_status || 'Complete',
      Grade: ev.final_internship_score !== null ? ev.grade : '—',
      Remarks: ev.remarks,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Final Evaluations');
    XLSX.writeFile(wb, 'Internship_Final_Evaluations.xlsx');
  };

  // Export to PDF (built-in browser print)
  const handleExportPDF = () => {
    window.print();
  };

  const filtered = evaluations
    .filter(
      e =>
        (e.intern_name || '').toLowerCase().includes(search.toLowerCase()) ||
        e.intern_id.toLowerCase().includes(search.toLowerCase()) ||
        (e.p_no || '').toLowerCase().includes(search.toLowerCase()) ||
        e.grade.toLowerCase().includes(search.toLowerCase()) ||
        (e.evaluation_method || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.evaluation_status || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle null project_score and final_internship_score
      if (valA === null || valA === undefined) valA = -1;
      if (valB === null || valB === undefined) valB = -1;

      // Handle rank 0 (put at bottom for ascending/descending)
      if (sortField === 'rank') {
        if (valA === 0) valA = 999999;
        if (valB === 0) valB = 999999;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * mul;
      }
      return ((valA as number) - (valB as number)) * mul;
    });

  // Analytics Metrics
  const totalCount = evaluations.length;
  const scoredEvaluations = evaluations.filter(e => e.final_internship_score !== null);
  const avgScore = scoredEvaluations.length > 0
    ? scoredEvaluations.reduce((sum, e) => sum + (e.final_internship_score as number), 0) / scoredEvaluations.length
    : 0;
  const highestFinal = scoredEvaluations.length > 0 ? Math.max(...scoredEvaluations.map(e => e.final_internship_score as number)) : 0;
  const highestProject = totalCount > 0 ? Math.max(...evaluations.map(e => e.project_score ?? 0)) : 0;
  const highestGuide = totalCount > 0 ? Math.max(...evaluations.map(e => e.guide_score)) : 0;
  const highestAttendance = totalCount > 0 ? Math.max(...evaluations.map(e => e.attendance_score)) : 0;

  // New analytics counts
  const completeCount = evaluations.filter(e => e.evaluation_status === 'Complete').length;
  const pendingCount = totalCount - completeCount;
  const pendingProjectReviewCount = evaluations.filter(e => e.evaluation_status === 'Pending Project Review').length;
  const method1Count = evaluations.filter(e => e.evaluation_method === 'Project + Guide + Attendance').length;
  const method2Count = evaluations.filter(e => e.evaluation_method === 'Guide + Attendance').length;

  const gradeCount = scoredEvaluations.reduce<Record<string, number>>((acc, e) => {
    acc[e.grade] = (acc[e.grade] || 0) + 1;
    return acc;
  }, {});

  const top10 = [...scoredEvaluations]
    .sort((a, b) => (b.final_internship_score as number) - (a.final_internship_score as number))
    .slice(0, 10);

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className="ml-1 text-xs opacity-50 no-print">
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6 md:p-8">
      
      {/* Self-contained Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          aside, .no-print, button, input {
            display: none !important;
          }
          body, main, div {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            background: none !important;
            padding: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 6px !important;
            font-size: 8px !important;
          }
        }
      `}} />

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">🏅 Final Internship Evaluation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Supports dynamic evaluation methods based on project completion status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 no-print">
            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold text-xs tracking-wide shadow transition"
            >
              📥 Export to Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filtered.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-xs tracking-wide shadow transition"
            >
              📄 Export to PDF / Print
            </button>
          </div>
        </div>

        {/* Action & Formula Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 no-print space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Generate Final Evaluation Dashboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Calculate overall score, apply ranking, and dynamically determine the evaluation method based on project review presence.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-tata-orange to-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>🔄 Generate / Recalculate Rankings</>
              )}
            </button>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs font-mono text-orange-950 space-y-2">
            <div><strong>🧮 Dynamic Evaluation Methods:</strong></div>
            <div className="flex flex-col md:flex-row md:gap-8 gap-2">
              <div>
                <span className="font-bold text-blue-700">Method 1 (With Project Review):</span><br />
                <span>Final Score = (Project × 0.65) + (Guide × 0.25) + (Attendance × 0.10)</span>
              </div>
              <div>
                <span className="font-bold text-purple-700">Method 2 (No Project Review):</span><br />
                <span>Final Score = (Guide × 0.70) + (Attendance × 0.30)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Success and Error messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 no-print flex items-center gap-2 shadow-sm">
            <span>❌</span> {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 no-print flex items-center gap-2 shadow-sm">
            <span>✅</span> {success}
          </div>
        )}

        {/* Analytics Section */}
        {totalCount > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">📊 Analytics Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Interns</p>
                <p className="text-3xl font-black text-tata-navy mt-1">{totalCount}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avg Final Score</p>
                <p className="text-3xl font-black text-gray-700 mt-1">{avgScore > 0 ? avgScore.toFixed(1) : '—'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Highest Final</p>
                <p className="text-3xl font-black text-amber-500 mt-1">{highestFinal > 0 ? highestFinal.toFixed(1) : '—'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Highest Project</p>
                <p className="text-3xl font-black text-blue-600 mt-1">{highestProject > 0 ? highestProject.toFixed(1) : 'N/A'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Highest Guide</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">{highestGuide.toFixed(1)}</p>
              </div>
              
              {/* Row 2 stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Complete Evals</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">{completeCount}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pending Evals</p>
                <p className="text-3xl font-black text-amber-500 mt-1">{pendingCount}</p>
                {pendingProjectReviewCount > 0 && (
                  <p className="text-[9px] text-gray-400 mt-0.5">({pendingProjectReviewCount} pending project review)</p>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Method 1 (Project)</p>
                <p className="text-3xl font-black text-blue-700 mt-1">{method1Count}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Method 2 (No Proj)</p>
                <p className="text-3xl font-black text-purple-700 mt-1">{method2Count}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider">Highest Attendance</p>
                <p className="text-3xl font-black text-cyan-600 mt-1">{highestAttendance.toFixed(1)}</p>
              </div>
            </div>

            {/* Top 10 & Grade Distribution Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Top 10 Interns List */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">⭐ Top 10 Performance Rankings</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold">
                        <th className="py-2">Rank</th>
                        <th className="py-2">Name</th>
                        <th className="py-2">P No</th>
                        <th className="py-2 text-center">Final Score</th>
                        <th className="py-2 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {top10.map((entry, index) => (
                        <tr key={entry.id} className="hover:bg-gray-50/50">
                          <td className="py-2 font-bold text-gray-600">{RANK_ICON(index + 1)}</td>
                          <td className="py-2 font-semibold text-gray-800">{entry.intern_name || '—'}</td>
                          <td className="py-2 text-gray-500 font-mono">{entry.p_no || '—'}</td>
                          <td className="py-2 text-center font-extrabold text-tata-orange">{entry.final_internship_score !== null ? (entry.final_internship_score as number).toFixed(2) : '—'}</td>
                          <td className="py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${GRADE_STYLES[entry.grade]}`}>
                              {entry.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grade Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-gray-800">📊 Grade Distribution</h4>
                <div className="space-y-3.5">
                  {['Outstanding', 'Excellent', 'Very Good', 'Good', 'Satisfactory', 'Needs Improvement'].map(g => {
                    const count = gradeCount[g] || 0;
                    const percent = scoredEvaluations.length > 0 ? (count / scoredEvaluations.length) * 100 : 0;
                    return (
                      <div key={g} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700">{g}</span>
                          <span className="font-bold text-gray-500">{count} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              g === 'Outstanding' ? 'bg-yellow-500' :
                              g === 'Excellent' ? 'bg-green-500' :
                              g === 'Very Good' ? 'bg-blue-500' :
                              g === 'Good' ? 'bg-indigo-500' :
                              g === 'Satisfactory' ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main List & Search */}
        <div className="space-y-4">
          <div className="flex justify-between items-center no-print">
            <h3 className="text-lg font-bold text-gray-800">📋 All Intern Evaluations ({filtered.length})</h3>
            <input
              type="text"
              placeholder="Search by name, ID, P No, grade, status, or method..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input max-w-sm text-xs"
            />
          </div>

          {loading ? (
            <div className="bg-white p-12 flex justify-center rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-8 h-8 border-4 border-tata-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-12 text-center text-gray-500 rounded-2xl border border-gray-100 shadow-sm">
              {evaluations.length === 0
                ? 'No final evaluations generated yet. Generate ratings using the recalculate/refresh button above.'
                : 'No results match your search.'}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('rank')}>
                        Rank <SortIcon field="rank" />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Intern ID</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">P No</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Intern Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('project_score')}>
                        Project Score <SortIcon field="project_score" />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('guide_score')}>
                        Guide Feedback <SortIcon field="guide_score" />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('attendance_score')}>
                        Attendance <SortIcon field="attendance_score" />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('final_internship_score')}>
                        Final Score <SortIcon field="final_internship_score" />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('evaluation_method')}>
                        Evaluation Method <SortIcon field="evaluation_method" />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('evaluation_status')}>
                        Status <SortIcon field="evaluation_status" />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Grade</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filtered.map(ev => (
                      <tr key={ev.id} className={`hover:bg-gray-50/50 transition ${ev.rank > 0 && ev.rank <= 3 ? 'bg-yellow-50/20' : ''}`}>
                        <td className={`px-4 py-3 font-extrabold text-center ${RANK_STYLES(ev.rank)}`}>
                          {ev.rank > 0 ? RANK_ICON(ev.rank) : <span className="text-gray-400 font-normal shrink-0">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          {ev.intern_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          {ev.p_no || '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {ev.intern_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-600">
                          {ev.project_score !== null ? ev.project_score.toFixed(1) : <span className="text-gray-400 font-normal italic">N/A</span>}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                          {ev.guide_score.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-cyan-600">
                          {ev.attendance_score.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ev.final_internship_score !== null ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-tata-orange to-red-500 text-white shadow-sm">
                              {ev.final_internship_score.toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.evaluation_method === 'Project + Guide + Attendance'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {ev.evaluation_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.evaluation_status === 'Complete' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ev.evaluation_status || 'Complete'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ev.final_internship_score !== null ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${GRADE_STYLES[ev.grade] || 'bg-gray-100 text-gray-700'}`}>
                              {ev.grade}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] leading-relaxed">
                          {ev.remarks}
                        </td>
                        <td className="px-4 py-3 no-print">
                          <button
                            onClick={() => handleDelete(ev.intern_id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Legend Card */}
        {evaluations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm no-print">
            <h3 className="font-bold text-gray-800 mb-3">🏅 Grade System & Remarks Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { grade: 'Outstanding', range: '90–100', remark: 'Recommended for PPO / Future Opportunities' },
                { grade: 'Excellent', range: '80–89', remark: 'Strong Performer' },
                { grade: 'Very Good', range: '70–79', remark: 'Good Performer' },
                { grade: 'Good', range: '60–69', remark: 'Meets Expectations' },
                { grade: 'Satisfactory', range: '50–59', remark: 'Needs Development' },
                { grade: 'Needs Improvement', range: 'Below 50', remark: 'Performance Review Required' },
              ].map(({ grade, range, remark }) => (
                <div key={grade} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${GRADE_STYLES[grade]}`}>
                    {grade}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{range}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{remark}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
