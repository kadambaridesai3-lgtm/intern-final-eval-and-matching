import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

const assignGrade = (score: number): string => {
  if (score >= 90) return 'Outstanding';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Satisfactory';
  return 'Needs Improvement';
};

const assignRemarks = (grade: string): string => {
  switch (grade) {
    case 'Outstanding':
      return 'Recommended for PPO';
    case 'Excellent':
      return 'Strong Performer';
    case 'Very Good':
      return 'Good Performer';
    case 'Good':
      return 'Meets Expectations';
    case 'Satisfactory':
      return 'Needs Improvement';
    case 'Needs Improvement':
      return 'Performance Review Required';
    default:
      return '';
  }
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
  const [statusFilter, setStatusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [internsList, setInternsList] = useState<any[]>([]);
  const [selectedPNo, setSelectedPNo] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [guideName, setGuideName] = useState('');
  const [department, setDepartment] = useState('');
  const [attendanceScore, setAttendanceScore] = useState('');
  const [guideScore, setGuideScore] = useState('');
  const [projectScore, setProjectScore] = useState('');
  const [remarksInput, setRemarksInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingInternId, setEditingInternId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchInternsList = async () => {
      try {
        const res = await fetch(`${BASE}/interns`);
        if (res.ok) {
          const data = await res.json();
          setInternsList(data.filter((i: any) => i.p_no && i.p_no.trim() !== ''));
        }
      } catch (err) {
        console.error('Failed to load interns list:', err);
      }
    };
    fetchInternsList();
  }, []);

  useEffect(() => {
    const selectedIntern = internsList.find(i => i.p_no === selectedPNo);
    if (selectedIntern) {
      setCandidateName(selectedIntern.full_name || '');
      setGuideName(selectedIntern.assigned_guide?.full_name || selectedIntern.guide_name || '');
      setDepartment(selectedIntern.department || '');
    } else {
      setCandidateName('');
      setGuideName('');
      setDepartment('');
    }
  }, [selectedPNo, internsList]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedPNo('');
    setCandidateName('');
    setGuideName('');
    setDepartment('');
    setAttendanceScore('');
    setGuideScore('');
    setProjectScore('');
    setRemarksInput('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ev: FinalEvalData) => {
    setIsEditing(true);
    setEditingInternId(ev.intern_id);
    setSelectedPNo(ev.p_no || '');
    setCandidateName(ev.intern_name || '');
    setGuideName(ev.guide_name || '');
    setDepartment(ev.department || '');
    setAttendanceScore(ev.attendance_score !== null ? String(ev.attendance_score) : '');
    setGuideScore(ev.guide_score !== null ? String(ev.guide_score) : '');
    setProjectScore(ev.project_score !== null ? String(ev.project_score) : '');
    setRemarksInput(ev.remarks || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedPNo) {
      setModalError('P No is mandatory.');
      return;
    }

    const attVal = Number(attendanceScore);
    if (isNaN(attVal) || attVal < 0 || attVal > 100 || attendanceScore === '') {
      setModalError('Attendance Score must be between 0 and 100.');
      return;
    }

    const guiVal = Number(guideScore);
    if (isNaN(guiVal) || guiVal < 0 || guiVal > 100 || guideScore === '') {
      setModalError('Guide Score must be between 0 and 100.');
      return;
    }

    let projVal: number | null = null;
    if (projectScore !== '') {
      projVal = Number(projectScore);
      if (isNaN(projVal) || projVal < 0 || projVal > 100) {
        setModalError('Project Score must be between 0 and 100 or left blank.');
        return;
      }
    }

    try {
      const url = isEditing
        ? `${BASE}/final-evaluation/${editingInternId}`
        : `${BASE}/final-evaluation`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_no: selectedPNo,
          attendance_score: attVal,
          guide_score: guiVal,
          project_score: projVal,
          remarks: remarksInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSuccess(isEditing ? 'Evaluation updated successfully!' : 'Evaluation added successfully!');
      setIsModalOpen(false);
      fetchEvaluations();
    } catch (err: any) {
      setModalError(err.message || 'Something went wrong');
    }
  };

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

  const handleExportExcel = () => {
    if (filtered.length === 0) return;

    const dataToExport = filtered.map(ev => ({
      'P No': ev.p_no || '',
      'Candidate Name': ev.intern_name || '',
      'Guide Name': ev.guide_name || '',
      'Department': ev.department || '',
      'Attendance Score': ev.attendance_score,
      'Guide Score': ev.guide_score,
      'Project Score': ev.project_score !== null ? ev.project_score : '',
      'Final Score': ev.final_internship_score !== null ? ev.final_internship_score : '',
      'Grade': ev.grade || '',
      'Rank': ev.final_internship_score !== null && ev.rank > 0 ? ev.rank : '',
      'Remarks': ev.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Final Evaluations');
    
    // Auto-fit column widths
    const maxLens = Object.keys(dataToExport[0] || {}).map(key => {
      let maxLen = key.length;
      for (const row of dataToExport) {
        const val = String((row as any)[key] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      }
      return { wch: maxLen + 3 };
    });
    ws['!cols'] = maxLens;

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Final_Internship_Evaluations_${todayStr}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Helper lists for filters
  const departments = Array.from(new Set(evaluations.map(e => e.department).filter(Boolean))) as string[];

  const filtered = useMemo(() => {
    const searchTrimmed = search.trim().toLowerCase();
    
    return evaluations
      .filter(e => {
        const matchSearch =
          !searchTrimmed ||
          (e.intern_name || '').toLowerCase().includes(searchTrimmed) ||
          (e.intern_id || '').toLowerCase().includes(searchTrimmed) ||
          (e.p_no || '').toLowerCase().includes(searchTrimmed) ||
          (e.department || '').toLowerCase().includes(searchTrimmed) ||
          (e.guide_name || '').toLowerCase().includes(searchTrimmed) ||
          (e.grade || '').toLowerCase().includes(searchTrimmed) ||
          (e.evaluation_method || '').toLowerCase().includes(searchTrimmed) ||
          (e.evaluation_status || '').toLowerCase().includes(searchTrimmed);

        const matchDept = !deptFilter || e.department === deptFilter;
        const matchMethod = !methodFilter || e.evaluation_method === methodFilter;

        let matchStatus = true;
        if (statusFilter) {
          if (statusFilter === 'Complete') {
            matchStatus = e.evaluation_status === 'Complete';
          } else {
            matchStatus = e.evaluation_status.toLowerCase().includes(statusFilter.toLowerCase());
          }
        }

        let matchGrade = true;
        if (gradeFilter) {
          if (gradeFilter === 'Average') {
            matchGrade = e.grade === 'Satisfactory' || e.grade === 'Average';
          } else if (gradeFilter === 'Poor') {
            matchGrade = e.grade === 'Needs Improvement' || e.grade === 'Poor';
          } else {
            matchGrade = e.grade === gradeFilter;
          }
        }

        return matchSearch && matchDept && matchMethod && matchStatus && matchGrade;
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
  }, [evaluations, search, deptFilter, methodFilter, statusFilter, gradeFilter, sortField, sortDir]);

  // Real-time calculations inside Add Modal
  const attVal = attendanceScore !== '' ? Number(attendanceScore) : null;
  const guiVal = guideScore !== '' ? Number(guideScore) : null;
  const projVal = projectScore !== '' ? Number(projectScore) : null;

  const isProjectScoreBlank = projectScore === '';
  const calculatedMethod = isProjectScoreBlank ? 'Guide + Attendance' : 'Project + Guide + Attendance';
  
  let calculatedScore: number | null = null;
  let calculatedGrade = '';

  if (attVal !== null && guiVal !== null) {
    if (isProjectScoreBlank) {
      calculatedScore = (guiVal * 0.70) + (attVal * 0.30);
    } else if (projVal !== null) {
      calculatedScore = (projVal * 0.65) + (guiVal * 0.25) + (attVal * 0.10);
    }
    
    if (calculatedScore !== null) {
      calculatedScore = Math.round(calculatedScore * 100) / 100;
      calculatedGrade = assignGrade(calculatedScore);
    }
  }

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
            <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">🏆 Final Internship Evaluations</h1>
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
            <div className="flex gap-3">
              <button
                onClick={handleOpenAddModal}
                className="bg-tata-navy hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide hover:shadow transition flex items-center gap-2"
              >
                ➕ Add Final Evaluation
              </button>
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
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-800">📋 Final Rankings & Grades</h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                Showing {filtered.length} of {evaluations.length} Records
              </span>
            </div>
            <div className="relative w-full max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by P No, Candidate Name, Guide Name, Department or Grade..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9 w-full text-xs bg-white border-gray-200 rounded-xl"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 no-print bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-xs items-end">
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Evaluation Method</label>
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All</option>
                <option value="Project + Guide + Attendance">Project + Guide + Attendance</option>
                <option value="Guide + Attendance">Guide + Attendance</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Evaluation Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All</option>
                <option value="Complete">Complete</option>
                <option value="Pending Project Review">Pending Project Review</option>
                <option value="Pending Guide Feedback">Pending Guide Feedback</option>
                <option value="Pending Attendance">Pending Attendance</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grade</label>
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="select select-sm w-full bg-slate-50 border-slate-200 rounded-lg text-xs"
              >
                <option value="">All</option>
                <option value="Outstanding">Outstanding</option>
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            <div>
              <button
                onClick={() => {
                  setSearch('');
                  setDeptFilter('');
                  setMethodFilter('');
                  setStatusFilter('');
                  setGradeFilter('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-4 rounded-xl text-xs w-full transition-colors border border-slate-200"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white p-12 flex justify-center rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-8 h-8 border-4 border-tata-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-12 text-center text-gray-500 rounded-3xl border border-gray-100 shadow-sm">
              {evaluations.length === 0 ? (
                'No evaluations generated yet. Upload Intern Master first and run recalculations.'
              ) : (
                <div className="space-y-1">
                  <p className="font-bold text-slate-700">No Final Evaluation records found.</p>
                  <p className="text-xs text-slate-400">Try another search or filter.</p>
                </div>
              )}
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
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">P No</th>

                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('attendance_score')}>
                        Attendance Score {sortField === 'attendance_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('guide_score')}>
                        Guide Score {sortField === 'guide_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('project_score')}>
                        Project Score {sortField === 'project_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer text-center" onClick={() => handleSort('final_internship_score')}>
                        Final Score {sortField === 'final_internship_score' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Grade</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Evaluation Method</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Evaluation Status</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Remarks</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Guide Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider no-print text-center">Actions</th>
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
                        <td className="px-4 py-3 text-center font-bold text-cyan-600">
                          {ev.attendance_score !== null && ev.attendance_score >= 0 ? ev.attendance_score.toFixed(1) : '0.0'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">
                          {ev.guide_score !== null && ev.guide_score >= 0 ? ev.guide_score.toFixed(1) : '0.0'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600">
                          {ev.project_score !== null && ev.project_score >= 0 ? ev.project_score.toFixed(1) : ''}
                        </td>
                        <td className="px-4 py-3 text-center font-black">
                          {ev.final_internship_score !== null && ev.final_internship_score >= 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gradient-to-r from-tata-orange to-red-500 text-white shadow-sm">
                              {ev.final_internship_score.toFixed(2)}
                            </span>
                          ) : ''}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ev.final_internship_score !== null && ev.final_internship_score >= 0 ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${GRADE_STYLES[ev.grade] || 'bg-slate-100 text-slate-700'}`}>
                              {ev.grade}
                            </span>
                          ) : ''}
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
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.evaluation_status === 'Complete'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ev.evaluation_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 text-xs">
                          {ev.remarks || ''}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{ev.guide_name || ''}</td>
                        <td className="px-4 py-3 no-print text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleOpenEditModal(ev)}
                              className="text-blue-500 hover:text-blue-750 hover:bg-blue-50 p-1.5 rounded-lg transition"
                              title="Edit Evaluation"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(ev.intern_id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                              title="Delete Evaluation"
                            >
                              🗑️
                            </button>
                          </div>
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

      {/* Add / Edit Final Evaluation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 mx-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-tata-navy text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold tracking-wide">
                {isEditing ? '✏️ Edit Final Evaluation' : '➕ Add Final Evaluation'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  ⚠️ {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* P No Selection */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">P No *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedPNo}
                      disabled
                      className="input w-full bg-slate-50 border-slate-200 text-slate-500 rounded-xl text-xs cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={selectedPNo}
                      onChange={e => setSelectedPNo(e.target.value)}
                      className="select w-full border-slate-200 rounded-xl text-xs"
                      required
                    >
                      <option value="">Select P No</option>
                      {internsList.map(intern => (
                        <option key={intern.p_no} value={intern.p_no}>
                          {intern.p_no} — {intern.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Candidate Name (Auto Fill) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    readOnly
                    placeholder="Auto-filled"
                    className="input w-full bg-slate-50 border-slate-100 text-slate-500 rounded-xl text-xs cursor-not-allowed"
                  />
                </div>

                {/* Department (Auto Fill) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    readOnly
                    placeholder="Auto-filled"
                    className="input w-full bg-slate-50 border-slate-100 text-slate-500 rounded-xl text-xs cursor-not-allowed"
                  />
                </div>

                {/* Guide Name (Auto Fill) */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guide Name</label>
                  <input
                    type="text"
                    value={guideName}
                    readOnly
                    placeholder="Auto-filled"
                    className="input w-full bg-slate-50 border-slate-100 text-slate-500 rounded-xl text-xs cursor-not-allowed"
                  />
                </div>

                {/* Attendance Score */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Score (0–100) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={attendanceScore}
                    onChange={e => setAttendanceScore(e.target.value)}
                    required
                    placeholder="e.g. 95"
                    className="input w-full border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {/* Guide Score */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guide Score (0–100) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={guideScore}
                    onChange={e => setGuideScore(e.target.value)}
                    required
                    placeholder="e.g. 88"
                    className="input w-full border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {/* Project Score (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Score (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={projectScore}
                    onChange={e => setProjectScore(e.target.value)}
                    placeholder="e.g. 90 (or blank)"
                    className="input w-full border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {/* Evaluation Method (Auto) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Evaluation Method</label>
                  <span className={`inline-flex items-center px-2.5 py-2 rounded-xl text-xs font-bold w-full justify-center ${
                    calculatedMethod === 'Project + Guide + Attendance'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}>
                    {calculatedMethod}
                  </span>
                </div>

                {/* Final Score & Grade Preview */}
                <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-around text-center">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Score</span>
                    <span className="text-lg font-black text-slate-800">
                      {calculatedScore !== null ? calculatedScore.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="border-r border-slate-200" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${
                      GRADE_STYLES[calculatedGrade] || 'bg-slate-200 text-slate-700'
                    }`}>
                      {calculatedGrade || '—'}
                    </span>
                  </div>
                </div>

                {/* Remarks */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarksInput}
                    onChange={e => setRemarksInput(e.target.value)}
                    placeholder="Optional remarks (will auto-generate if blank)"
                    className="input w-full border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition animate-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-tata-navy hover:bg-blue-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition shadow-sm hover:shadow animate-all"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
