import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { downloadTemplateFile } from '../utils/EvaluationTemplates';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface FinalEvalData {
  id: string;
  intern_id: string;
  intern_name: string | null;
  p_no: string | null;
  department: string | null;
  intern_status: string | null;
  guide_name: string | null;
  project_required: string | null;
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
  'Outstanding': 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  'Excellent': 'bg-green-50 text-green-800 border border-green-200',
  'Very Good': 'bg-blue-50 text-blue-800 border border-blue-200',
  'Good': 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  'Satisfactory': 'bg-orange-50 text-orange-800 border border-orange-200',
  'Needs Improvement': 'bg-red-50 text-red-800 border border-red-200',
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

  // Dropdown filter states
  const [deptFilter, setDeptFilter] = useState('');
  const [guideFilter, setGuideFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projReqFilter, setProjReqFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Uploader states
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, { row: number; error: string }[]>>({});
  const [uploadWarnings, setUploadWarnings] = useState<Record<string, { row: number; warning: string }[]>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, string>>({});

  const fileInputs = {
    intern_master: useRef<HTMLInputElement>(null),
    smart_card: useRef<HTMLInputElement>(null),
    daily_attendance: useRef<HTMLInputElement>(null),
    guide_feedback: useRef<HTMLInputElement>(null),
    project_review: useRef<HTMLInputElement>(null),
  };

  const [uploadHistory, setUploadHistory] = useState<any[]>([]);

  const fetchUploadHistory = async () => {
    try {
      const res = await fetch(`${BASE}/upload-history`);
      if (res.ok) {
        const data = await res.json();
        setUploadHistory(data);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/final-evaluation`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      const mapped = data.map((d: any) => ({
        ...d,
        p_no: d.intern?.p_no ?? null,
        intern_name: d.intern?.full_name ?? '',
        department: d.intern?.department ?? '',
        intern_status: d.intern?.status ?? '',
        guide_name: d.intern?.assigned_guide?.full_name ?? d.intern?.guide_name ?? '',
        project_required: d.intern?.project_required ?? '',
        project_score: d.project_score ?? null,
        attendance_score: d.attendance_score ?? 0,
        guide_score: d.guide_score ?? 0,
        final_internship_score: d.final_internship_score ?? null,
        evaluation_method: d.evaluation_method ?? 'Project + Guide + Attendance',
        evaluation_status: d.evaluation_status ?? 'Pending',
        grade: d.grade ?? '',
        remarks: d.remarks ?? ''
      }));
      setEvaluations(mapped);
      fetchUploadHistory();
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

  const handleUploadFile = async (moduleKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [moduleKey]: true }));
    setUploadErrors(prev => ({ ...prev, [moduleKey]: [] }));
    setUploadWarnings(prev => ({ ...prev, [moduleKey]: [] }));
    setUploadSuccess(prev => ({ ...prev, [moduleKey]: '' }));
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    let uploadUrl = '';
    switch (moduleKey) {
      case 'intern_master':
        uploadUrl = `${BASE}/interns/import`;
        break;
      case 'smart_card':
        uploadUrl = `${BASE}/attendance/upload-smart-card`;
        break;
      case 'daily_attendance':
        uploadUrl = `${BASE}/attendance/upload`;
        break;
      case 'guide_feedback':
        uploadUrl = `${BASE}/guide-feedback/upload`;
        break;
      case 'project_review':
        uploadUrl = `${BASE}/Project-review/upload`;
        break;
      default:
        setUploading(prev => ({ ...prev, [moduleKey]: false }));
        return;
    }

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to process file');
      }

      if (resData.warnings && resData.warnings.length > 0) {
        setUploadWarnings(prev => ({ ...prev, [moduleKey]: resData.warnings }));
      }

      if (resData.errors && resData.errors.length > 0) {
        setUploadErrors(prev => ({ ...prev, [moduleKey]: resData.errors }));
        setUploadSuccess(prev => ({ ...prev, [moduleKey]: `Uploaded with ${resData.errors.length} error(s) and ${resData.warnings?.length || 0} warning(s).` }));
      } else if (resData.warnings && resData.warnings.length > 0) {
        setUploadSuccess(prev => ({ ...prev, [moduleKey]: `Successfully processed with ${resData.warnings.length} warning(s).` }));
      } else {
        setUploadSuccess(prev => ({ ...prev, [moduleKey]: `Successfully processed all rows!` }));
      }
      
      fetchEvaluations();
    } catch (err: any) {
      setUploadErrors(prev => ({ ...prev, [moduleKey]: [{ row: 0, error: err.message }] }));
    } finally {
      setUploading(prev => ({ ...prev, [moduleKey]: false }));
      if (e.target) e.target.value = ''; // reset file input
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`${BASE}/exports/final-evaluation`);
      if (!res.ok) throw new Error('Export failed on backend');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const todayStr = new Date().toISOString().split('T')[0];
      anchor.download = `Final_Internship_Evaluation_${todayStr}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Export Failed: Unable to generate Excel file. Please try again.");
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Helper lists for filters
  const departments = Array.from(new Set(evaluations.map(e => e.department).filter(Boolean))) as string[];
  const guides = Array.from(new Set(evaluations.map(e => e.guide_name).filter(Boolean))) as string[];
  const statuses = ['Applied', 'Matched', 'Assigned', 'Ongoing', 'Completed'];
  const grades = Array.from(new Set(evaluations.map(e => e.grade).filter(g => g && g !== ''))) as string[];
  const methods = ['Project + Guide + Attendance', 'Guide + Attendance'];

  const filtered = evaluations
    .filter(e => {
      const searchStr = search.toLowerCase();
      const matchSearch =
        !search ||
        (e.intern_name || '').toLowerCase().includes(searchStr) ||
        (e.intern_id || '').toLowerCase().includes(searchStr) ||
        (e.p_no || '').toLowerCase().includes(searchStr) ||
        (e.department || '').toLowerCase().includes(searchStr) ||
        (e.grade || '').toLowerCase().includes(searchStr) ||
        (e.evaluation_method || '').toLowerCase().includes(searchStr) ||
        (e.intern_status || '').toLowerCase().includes(searchStr);

      const matchDept = !deptFilter || e.department === deptFilter;
      const matchGuide = !guideFilter || e.guide_name === guideFilter;
      const matchStatus = !statusFilter || e.intern_status === statusFilter;
      const matchProjReq = !projReqFilter || e.project_required === projReqFilter;
      const matchGrade = !gradeFilter || e.grade === gradeFilter;
      const matchMethod = !methodFilter || e.evaluation_method === methodFilter;

      return matchSearch && matchDept && matchGuide && matchStatus && matchProjReq && matchGrade && matchMethod;
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = -1;
      if (valB === null || valB === undefined) valB = -1;

      if (sortField === 'rank') {
        if (valA === 0) valA = 999999;
        if (valB === 0) valB = 999999;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * mul;
      }
      return ((valA as number) - (valB as number)) * mul;
    });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      
      {/* Self-contained Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          aside, nav, header, footer, .sidebar, .navbar, .no-print, button, input, select, .upload-section {
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

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">🏆 Internship Evaluation Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Separate module uploads with Employee P No mapping & automatic grading/ranking evaluation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 no-print">
            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              📥 Export to Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filtered.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              📄 Export to PDF / Print
            </button>
          </div>
        </div>

        {/* 1. EXCEL UPLOADS CENTER (separate files upload) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 no-print space-y-6 upload-section">
          <div>
            <h2 className="text-lg font-bold text-gray-800">📊 Excel Modules Upload Center</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Download dummy templates filled with realistic evaluation data, edit/review, and upload them separately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              {
                key: 'intern_master',
                title: 'Intern Master',
                desc: 'Upload 10 master records (DO ONLY ONCE). Maps P No to Intern details.',
                icon: '👥',
              },
              {
                key: 'smart_card',
                title: 'Smart Card',
                desc: 'Monthly smart card punches (P No, Date, In/Out times) for working days.',
                icon: '💳',
              },
              {
                key: 'daily_attendance',
                title: 'Daily Attendance',
                desc: 'Daily status updates mapping P No and dates to PRESENT or BACKFILLED.',
                icon: '📅',
              },
              {
                key: 'guide_feedback',
                title: 'Guide Feedback',
                desc: 'Guide evaluations (Consistency, Quality, etc. rated 1 to 5).',
                icon: '👨‍🏫',
              },
              {
                key: 'project_review',
                title: 'Project Review',
                desc: 'HR/Peer reviews and penalty scores for project required interns.',
                icon: '📝',
              },
            ].map(mod => (
              <div key={mod.key} className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60 flex flex-col justify-between space-y-4 hover:border-slate-200 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mod.icon}</span>
                    <span className="font-bold text-xs text-slate-800">{mod.title}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">{mod.desc}</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => downloadTemplateFile(mod.key)}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] py-1.5 px-3 rounded-lg transition-all"
                  >
                    📥 Download Template
                  </button>

                  <label className={`w-full flex items-center justify-center font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                    uploading[mod.key]
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-tata-orange/10 hover:bg-tata-orange/20 text-tata-orange'
                  }`}>
                    {uploading[mod.key] ? '⏳ Uploading...' : '📤 Upload Excel'}
                    <input
                      type="file"
                      ref={fileInputs[mod.key as keyof typeof fileInputs]}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      disabled={uploading[mod.key]}
                      onChange={(e) => handleUploadFile(mod.key, e)}
                    />
                  </label>
                </div>

                {uploadSuccess[mod.key] && (
                  <p className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 p-1.5 rounded-md border border-emerald-100">
                    ✅ {uploadSuccess[mod.key]}
                  </p>
                )}

                {uploadWarnings[mod.key] && uploadWarnings[mod.key].length > 0 && (
                  <div className="bg-amber-50 p-1.5 rounded-md border border-amber-100 max-h-24 overflow-y-auto">
                    <p className="text-[9px] font-bold text-amber-700">⚠️ Warnings ({uploadWarnings[mod.key].length}):</p>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      {uploadWarnings[mod.key].map((w, wIdx) => (
                        <li key={wIdx} className="text-[9px] text-amber-700 leading-snug">
                          {w.warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {uploadErrors[mod.key] && uploadErrors[mod.key].length > 0 && (
                  <div className="bg-red-50 p-1.5 rounded-md border border-red-100 max-h-24 overflow-y-auto">
                    <p className="text-[9px] font-bold text-red-600">❌ Errors ({uploadErrors[mod.key].length}):</p>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      {uploadErrors[mod.key].map((err, errIdx) => (
                        <li key={errIdx} className="text-[9px] text-red-600 leading-snug">
                          {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Upload History Audit Log */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">🕒 Upload Audit History</h3>
            {uploadHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No upload history logged yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="p-2 font-semibold text-slate-500">File Name</th>
                      <th className="p-2 font-semibold text-slate-500">Uploaded Time</th>
                      <th className="p-2 font-semibold text-slate-500 text-center">Module</th>
                      <th className="p-2 font-semibold text-slate-500 text-center">Records</th>
                      <th className="p-2 font-semibold text-slate-500 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {uploadHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2 font-medium text-slate-700">{h.file_name}</td>
                        <td className="p-2 text-slate-500">{new Date(h.upload_time).toLocaleString()}</td>
                        <td className="p-2 text-center text-slate-500">{h.module}</td>
                        <td className="p-2 text-center font-bold text-slate-600">{h.records_imported}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            h.status === 'Success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Global Error Display */}
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

        {/* 2. RECALCULATOR & CALCULATION RULES CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 no-print space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Recalculate Evaluations & Ranks</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Evaluations auto-refresh on upload, but you can manually force rank recalculations at any time.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-tata-orange to-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide hover:shadow transition disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>🔄 Recalculate Rankings</>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs">
            <div className="space-y-1">
              <span className="font-bold text-blue-700 flex items-center gap-1">📘 Method 1 (Project Required = Yes):</span>
              <p className="text-slate-600 font-mono text-[11px]">Final Score = (Project × 65%) + (Guide × 25%) + (Attendance × 10%)</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-purple-700 flex items-center gap-1">📙 Method 2 (Project Required = No):</span>
              <p className="text-slate-600 font-mono text-[11px]">Final Score = (Guide × 70%) + (Attendance × 30%)</p>
            </div>
          </div>
        </div>

        {/* 3. MAIN FINAL EVALUATIONS TABLE */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <h3 className="text-lg font-bold text-gray-800">📋 Final Rankings & Grades</h3>
            <input
              type="text"
              placeholder="Search by P.No, Name, Department, Status, or Grade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full max-w-sm text-xs bg-white border-gray-200 rounded-xl"
            />
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 no-print bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Guide</label>
              <select
                value={guideFilter}
                onChange={e => setGuideFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Guides</option>
                {guides.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Intern Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Statuses</option>
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Required</label>
              <select
                value={projReqFilter}
                onChange={e => setProjReqFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grade</label>
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Grades</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Method</label>
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All Methods</option>
                {methods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-white p-12 flex justify-center rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-8 h-8 border-4 border-tata-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-12 text-center text-gray-500 rounded-3xl border border-gray-100 shadow-sm">
              {evaluations.length === 0
                ? 'No evaluations generated yet. Upload Intern Master first and run recalculations.'
                : 'No matching records found.'}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('rank')}>
                        Rank {sortField === 'rank' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">P.No</th>

                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Intern Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Intern Status</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('project_score')}>
                        Project Score {sortField === 'project_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('guide_score')}>
                        Guide Score {sortField === 'guide_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('attendance_score')}>
                        Attendance Score {sortField === 'attendance_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('final_internship_score')}>
                        Final Score {sortField === 'final_internship_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Grade</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Remarks</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Evaluation Method</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filtered.map(ev => (
                      <tr key={ev.id} className={`hover:bg-slate-50/40 transition-colors ${ev.rank > 0 && ev.rank <= 3 ? 'bg-amber-50/15' : ''}`}>
                        <td className="px-4 py-3 text-center font-bold">
                          {ev.final_internship_score !== null && ev.rank > 0 ? RANK_ICON(ev.rank) : ''}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 font-semibold">{ev.p_no || ''}</td>

                        <td className="px-4 py-3 font-semibold text-slate-800">{ev.intern_name || ''}</td>
                        <td className="px-4 py-3 text-slate-600">{ev.department || ''}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.evaluation_status.startsWith('Pending')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : ev.intern_status === 'Completed'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : ev.intern_status === 'Ongoing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {ev.evaluation_status.startsWith('Pending') ? ev.evaluation_status : ev.intern_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600">
                          {ev.project_score !== null && ev.project_score > 0 ? ev.project_score.toFixed(1) : ''}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">
                          {ev.guide_score !== null && ev.guide_score > 0 ? ev.guide_score.toFixed(1) : ''}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-cyan-600">
                          {ev.attendance_score !== null && ev.attendance_score > 0 ? ev.attendance_score.toFixed(1) : ''}
                        </td>
                        <td className="px-4 py-3 text-center font-black">
                          {ev.final_internship_score !== null && ev.final_internship_score > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gradient-to-r from-tata-orange to-red-500 text-white shadow-sm">
                              {ev.final_internship_score.toFixed(2)}
                            </span>
                          ) : ''}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ev.final_internship_score !== null && ev.final_internship_score > 0 ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${GRADE_STYLES[ev.grade] || 'bg-slate-100 text-slate-700'}`}>
                              {ev.grade}
                            </span>
                          ) : ''}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 text-xs">
                          {ev.remarks || ''}
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
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm no-print">
            <h3 className="font-bold text-gray-800 mb-4">🏅 Grading System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { grade: 'Outstanding', range: '90–100', style: 'Outstanding' },
                { grade: 'Excellent', range: '80–89', style: 'Excellent' },
                { grade: 'Very Good', range: '70–79', style: 'Very Good' },
                { grade: 'Good', range: '60–69', style: 'Good' },
                { grade: 'Satisfactory', range: '50–59', style: 'Satisfactory' },
                { grade: 'Needs Improvement', range: 'Below 50', style: 'Needs Improvement' },
              ].map(g => (
                <div key={g.grade} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100/60 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold ${GRADE_STYLES[g.style]}`}>
                    {g.grade}
                  </span>
                  <span className="text-xs font-black text-slate-700 mt-2 font-mono">{g.range}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
