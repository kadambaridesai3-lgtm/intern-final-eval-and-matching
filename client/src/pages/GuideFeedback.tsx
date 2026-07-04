import { useState, useEffect, useCallback, useRef } from 'react';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface GuideFeedbackData {
  id: string;
  intern_id: string;
  intern_name: string | null;
  p_no: string | null;
  guide_name: string | null;
  department: string | null;
  discipline: number;
  learning_ability: number;
  teamwork: number;
  communication: number;
  task_completion: number;
  quality_of_work: number;
  problem_solving: number;
  initiative_innovation: number;
  learning_adaptability: number;
  attendance_punctuality: number;
  professionalism_ethics: number;
  respect_authority: number;
  accountability: number;
  conflict_resolution: number;
  empathy: number;
  leadership_potential: number;
  conflict_handling: number;
  total_marks: number;
  guide_score: number;
  percentage: number;
}

interface ImportResult {
  total_parsed: number;
  created: number;
  failed: number;
  errors: { row: number; error: string }[];
  warnings: { row: number; warning: string }[];
}

const DIMENSIONS = [
  {
    category: '🚀 Performance Dimension (Q5–Q9)',
    items: [
      { key: 'task_completion', label: 'Q5 — Task Completion', icon: '✅' },
      { key: 'quality_of_work', label: 'Q6 — Quality of Work', icon: '🎯' },
      { key: 'problem_solving', label: 'Q7 — Problem Solving', icon: '🧠' },
      { key: 'initiative_innovation', label: 'Q8 — Initiative & Innovation', icon: '💡' },
      { key: 'learning_adaptability', label: 'Q9 — Learning & Adaptability', icon: '📚' },
    ]
  },
  {
    category: '👔 Professionalism Dimension (Q10–Q14)',
    items: [
      { key: 'attendance_punctuality', label: 'Q10 — Attendance & Punctuality', icon: '⏰', isQ10: true },
      { key: 'communication', label: 'Q11 — Communication', icon: '💬' },
      { key: 'professionalism_ethics', label: 'Q12 — Professionalism & Ethics', icon: '🛡️' },
      { key: 'respect_authority', label: 'Q13 — Respect for Authority', icon: '🙇' },
      { key: 'accountability', label: 'Q14 — Accountability', icon: '📊' },
    ]
  },
  {
    category: '🤝 Interpersonal Dimension (Q15–Q19)',
    items: [
      { key: 'teamwork', label: 'Q15 — Teamwork', icon: '🤝' },
      { key: 'conflict_resolution', label: 'Q16 — Conflict Resolution', icon: '🕊️' },
      { key: 'empathy', label: 'Q17 — Empathy', icon: '❤️' },
      { key: 'leadership_potential', label: 'Q18 — Leadership Potential', icon: '👑' },
      { key: 'conflict_handling', label: 'Q19 — Conflict Handling', icon: '🥊' },
    ]
  }
] as const;

const SCORE_OPTIONS = [
  { value: '', label: 'Blank / Unrated' },
  { value: 5, label: 'Best Option (5 pts)' },
  { value: 4, label: 'Good Option (4 pts)' },
  { value: 3, label: 'Average Option (3 pts)' },
  { value: 2, label: 'Poor Option (2 pts)' },
  { value: 1, label: 'Worst Option (1 pt)' },
];

const emptyForm = {
  intern_id: '',
  intern_name: '',
  guide_name: '',
  department: '',
  task_completion: '' as string | number,
  quality_of_work: '' as string | number,
  problem_solving: '' as string | number,
  initiative_innovation: '' as string | number,
  learning_adaptability: '' as string | number,
  communication: '' as string | number,
  professionalism_ethics: '' as string | number,
  respect_authority: '' as string | number,
  accountability: '' as string | number,
  teamwork: '' as string | number,
  conflict_resolution: '' as string | number,
  empathy: '' as string | number,
  leadership_potential: '' as string | number,
  conflict_handling: '' as string | number,
  attendance_punctuality: '' as string | number,
};

export default function GuideFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<GuideFeedbackData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/guide-feedback`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeedbacks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Live Score Calculator
  const nonAttendanceSum =
    Number(form.task_completion || 0) +
    Number(form.quality_of_work || 0) +
    Number(form.problem_solving || 0) +
    Number(form.initiative_innovation || 0) +
    Number(form.learning_adaptability || 0) +
    Number(form.communication || 0) +
    Number(form.professionalism_ethics || 0) +
    Number(form.respect_authority || 0) +
    Number(form.accountability || 0) +
    Number(form.teamwork || 0) +
    Number(form.conflict_resolution || 0) +
    Number(form.empathy || 0) +
    Number(form.leadership_potential || 0) +
    Number(form.conflict_handling || 0);

  const hasAnyScore = 
    form.task_completion !== '' ||
    form.quality_of_work !== '' ||
    form.problem_solving !== '' ||
    form.initiative_innovation !== '' ||
    form.learning_adaptability !== '' ||
    form.communication !== '' ||
    form.professionalism_ethics !== '' ||
    form.respect_authority !== '' ||
    form.accountability !== '' ||
    form.teamwork !== '' ||
    form.conflict_resolution !== '' ||
    form.empathy !== '' ||
    form.leadership_potential !== '' ||
    form.conflict_handling !== '';

  const calculatedGuideScore = (nonAttendanceSum / 70) * 100;
  const calculatedTotalMarks = nonAttendanceSum + Number(form.attendance_punctuality || 0);
  const calculatedPercentage = (calculatedTotalMarks / 75) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.intern_id.trim()) {
      setError('P.No is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setImportResult(null);

    // Map blank fields correctly to backend structure
    const payload = {
      ...form,
      task_completion: form.task_completion === '' ? '' : Number(form.task_completion),
      quality_of_work: form.quality_of_work === '' ? '' : Number(form.quality_of_work),
      problem_solving: form.problem_solving === '' ? '' : Number(form.problem_solving),
      initiative_innovation: form.initiative_innovation === '' ? '' : Number(form.initiative_innovation),
      learning_adaptability: form.learning_adaptability === '' ? '' : Number(form.learning_adaptability),
      communication: form.communication === '' ? '' : Number(form.communication),
      professionalism_ethics: form.professionalism_ethics === '' ? '' : Number(form.professionalism_ethics),
      respect_authority: form.respect_authority === '' ? '' : Number(form.respect_authority),
      accountability: form.accountability === '' ? '' : Number(form.accountability),
      teamwork: form.teamwork === '' ? '' : Number(form.teamwork),
      conflict_resolution: form.conflict_resolution === '' ? '' : Number(form.conflict_resolution),
      empathy: form.empathy === '' ? '' : Number(form.empathy),
      leadership_potential: form.leadership_potential === '' ? '' : Number(form.leadership_potential),
      conflict_handling: form.conflict_handling === '' ? '' : Number(form.conflict_handling),
      attendance_punctuality: form.attendance_punctuality === '' ? '' : Number(form.attendance_punctuality),
    };

    try {
      const url = editingId ? `${BASE}/guide-feedback/${editingId}` : `${BASE}/guide-feedback`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setSuccess(editingId ? 'Feedback updated successfully!' : 'Feedback submitted successfully!');
      setForm(emptyForm);
      setEditingId(null);
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (fb: GuideFeedbackData) => {
    setForm({
      intern_id: fb.intern_id,
      intern_name: fb.intern_name || '',
      guide_name: fb.guide_name || '',
      department: fb.department || '',
      task_completion: fb.task_completion || '',
      quality_of_work: fb.quality_of_work || '',
      problem_solving: fb.problem_solving || '',
      initiative_innovation: fb.initiative_innovation || '',
      learning_adaptability: fb.learning_adaptability || '',
      communication: fb.communication || '',
      professionalism_ethics: fb.professionalism_ethics || '',
      respect_authority: fb.respect_authority || '',
      accountability: fb.accountability || '',
      teamwork: fb.teamwork || '',
      conflict_resolution: fb.conflict_resolution || '',
      empathy: fb.empathy || '',
      leadership_potential: fb.leadership_potential || '',
      conflict_handling: fb.conflict_handling || '',
      attendance_punctuality: fb.attendance_punctuality || '',
    });
    setEditingId(fb.id);
    setError(null);
    setSuccess(null);
    setImportResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (internId: string) => {
    if (!confirm('Delete this feedback?')) return;
    try {
      const res = await fetch(`${BASE}/guide-feedback/${internId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setError(null);
    setSuccess(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BASE}/guide-feedback/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Excel upload failed');

      // Store full import result for the status panel
      setImportResult({
        total_parsed: data.total_parsed || 0,
        created: data.created || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
        warnings: data.warnings || [],
      });

      if (data.errors && data.errors.length > 0) {
        setError(`Import completed with ${data.errors.length} validation error(s).`);
      }

      if (data.created > 0) {
        setSuccess(`Successfully imported ${data.created} of ${data.total_parsed} guide feedback records.`);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Auto-refresh — data appears immediately
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const res = await fetch(`${BASE}/guide-feedback/sample`);
      if (!res.ok) throw new Error('Failed to download sample file');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Guide_Feedback_Sample_Format.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download could not be started. Please verify browser download permissions.");
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setImportResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">👨‍🏫 Guide Feedback Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tata Motors Guide Feedback Excel format (Q5–Q19). Q10 (Attendance) is excluded from Guide Score.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchFeedbacks} className="btn-secondary text-sm flex items-center gap-2" disabled={loading}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Info card & Excel uploader */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-r from-emerald-100 to-teal-100 p-5 rounded-2xl border-l-4 border-emerald-500 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-emerald-950 flex items-center gap-2">📊 Scoring Rules (Tata Motors Format)</h3>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                Excel uses <strong>Q5–Q19</strong> Score columns (1–5 each). <strong>Q10 (Attendance & Punctuality)</strong> is stored but does NOT contribute to Guide Score. 
                The score is calculated based on Q5–Q9 + Q11–Q19 (14 dimensions, Max = 70).
              </p>
              <div className="mt-2 space-y-1">
                <code className="block text-xs font-mono bg-emerald-950/10 p-2 rounded text-emerald-900">
                  Guide Score = (Sum of Q5–Q9 + Q11–Q19) / 70 × 100
                </code>
                <code className="block text-xs font-mono bg-emerald-950/10 p-2 rounded text-emerald-900">
                  Percentage  = (Total of Q5–Q19) / 75 × 100
                </code>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-800">📂 Guide Feedback Excel Upload</h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload the Tata Motors Guide Feedback Excel file. Interns are matched by <strong>P No</strong> only.
              </p>
            </div>
            <div className="mt-3 space-y-2">
              <label className="w-full flex flex-center justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition text-center">
                {uploading ? '⏳ Processing file...' : '📤 Upload Guide Feedback Excel'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={uploading}
                  className="hidden"
                  ref={fileInputRef}
                />
              </label>
              <button
                onClick={handleDownloadSample}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl transition"
              >
                📥 Download Sample Format
              </button>
            </div>
          </div>
        </div>

        {/* Import Status Panel */}
        {importResult && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">📋 Import Status</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-blue-700">{importResult.total_parsed}</p>
                <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Total Rows Parsed</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-green-700">{importResult.created}</p>
                <p className="text-[11px] font-bold text-green-500 uppercase tracking-wider">Successful Records</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${importResult.failed > 0 ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                <p className={`text-2xl font-black ${importResult.failed > 0 ? 'text-red-700' : 'text-gray-400'}`}>{importResult.failed}</p>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${importResult.failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>Failed Records</p>
              </div>
            </div>
            {importResult.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="font-bold text-sm text-amber-800 mb-1.5 flex items-center gap-1">⚠️ Warnings ({importResult.warnings.length})</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-amber-800">
                  {importResult.warnings.map((w, index) => (
                    <li key={index}>
                      {w.warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="font-bold text-sm text-red-800 mb-1.5 flex items-center gap-1">❌ Errors ({importResult.errors.length})</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-red-800">
                  {importResult.errors.map((err, index) => (
                    <li key={index}>
                      {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Success and Error messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-start gap-2.5 shadow-sm">
            <span className="text-lg">❌</span>
            <div>
              <p className="font-medium">Error occurred</p>
              <p className="opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
        )}
        {success && !importResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700 flex items-start gap-2.5 shadow-sm">
            <span className="text-lg">✅</span>
            <p className="font-medium">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Manual feedback submission form */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">
              {editingId ? '✏️ Edit Feedback Record' : '📝 Manual Entry Form'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <label className="label">P No *</label>
                  <input
                    type="text"
                    value={form.intern_id}
                    onChange={e => setForm({ ...form, intern_id: e.target.value })}
                    className="input"
                    placeholder="e.g., P12345"
                    disabled={!!editingId}
                    required
                  />
                </div>

                <div>
                  <label className="label">Intern Name (Optional)</label>
                  <input
                    type="text"
                    value={form.intern_name}
                    onChange={e => setForm({ ...form, intern_name: e.target.value })}
                    className="input"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="label">Guide Name (Optional)</label>
                  <input
                    type="text"
                    value={form.guide_name}
                    onChange={e => setForm({ ...form, guide_name: e.target.value })}
                    className="input"
                    placeholder="Mentor name"
                  />
                </div>

                <div>
                  <label className="label">Department (Optional)</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="input"
                    placeholder="e.g., Mechanical Engineering"
                  />
                </div>
              </div>

              <div className="h-64 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-4">
                {DIMENSIONS.map((cat) => (
                  <div key={cat.category} className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase">{cat.category}</h4>
                    {cat.items.map((item) => (
                      <div key={item.key} className="space-y-1 bg-white p-2.5 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <span>{item.icon}</span> {item.label}
                          {item.key === 'attendance_punctuality' && <span className="text-[10px] font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-auto">Excluded from Score</span>}
                        </label>
                        <select
                          value={form[item.key as keyof typeof form]}
                          onChange={e => setForm({ ...form, [item.key]: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full text-xs border border-gray-200 rounded-lg p-1.5 focus:outline-none focus:border-emerald-500"
                        >
                          {SCORE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Total & Guide Score Preview */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-4 text-center shadow-md">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] opacity-75 uppercase font-bold tracking-wider">Total Marks</p>
                    <p className="text-xl font-black">{calculatedTotalMarks} <span className="text-xs opacity-60">/ 75</span></p>
                  </div>
                  <div className="border-x border-white/20">
                    <p className="text-[10px] opacity-75 uppercase font-bold tracking-wider">Percentage</p>
                    <p className="text-xl font-black">{calculatedPercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] opacity-75 uppercase font-bold tracking-wider">Guide Score</p>
                    <p className="text-xl font-black">{calculatedGuideScore.toFixed(1)}%</p>
                  </div>
                </div>
                <p className="text-[9px] opacity-50 mt-2">Guide Score excludes Q10 (Attendance & Punctuality)</p>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Submit'}
                </button>
                {editingId && (
                  <button type="button" onClick={handleCancel} className="btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Submitted Feedbacks List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-extrabold text-gray-800">Submitted Feedbacks ({feedbacks.length})</h3>
              {feedbacks.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${BASE}/exports/guide-feedback`);
                      if (!res.ok) throw new Error('Export failed on backend');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const todayStr = new Date().toISOString().split('T')[0];
                      a.download = `Guide_Feedback_${todayStr}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      alert("Export Failed: Unable to generate Excel file. Please try again.");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs"
                >
                  📥 Export to Excel
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No guide feedbacks submitted yet. Upload a Tata Motors Guide Feedback Excel to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Intern Details</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Guide</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Total</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Percentage</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Q10</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Guide Score</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {feedbacks.map(fb => (
                      <tr key={fb.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{fb.intern_name || ''}</p>
                          <p className="text-xs text-gray-500 font-mono">{fb.p_no ? `P No: ${fb.p_no}` : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-600 text-xs">{fb.guide_name || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-600 text-xs">{fb.department || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="font-bold text-gray-800">{fb.total_marks ? `${fb.total_marks}/75` : ''}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {fb.total_marks ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                              {(fb.percentage ?? 0).toFixed(1)}%
                            </span>
                          ) : ''}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            {fb.attendance_punctuality || ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {fb.total_marks ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              {fb.guide_score.toFixed(1)}%
                            </span>
                          ) : ''}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(fb)}
                              className="text-emerald-600 hover:text-emerald-800 font-medium text-xs bg-emerald-50 px-2.5 py-1 rounded-lg"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(fb.intern_id)}
                              className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 px-2.5 py-1 rounded-lg"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
