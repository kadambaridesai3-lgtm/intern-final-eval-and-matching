import { useState, useEffect, useCallback, useRef } from 'react';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface GuideFeedbackData {
  id: string;
  intern_id: string;
  intern_name: string | null;
  p_no: string | null;
  guide_name: string | null;
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
}

const DIMENSIONS = [
  {
    category: '🚀 Performance Dimension',
    items: [
      { key: 'task_completion', label: 'Task Completion', icon: '✅' },
      { key: 'quality_of_work', label: 'Quality of Work', icon: '🎯' },
      { key: 'problem_solving', label: 'Problem Solving', icon: '🧠' },
      { key: 'initiative_innovation', label: 'Initiative & Innovation', icon: '💡' },
      { key: 'learning_adaptability', label: 'Learning & Adaptability', icon: '📚' },
    ]
  },
  {
    category: '👔 Professionalism Dimension',
    items: [
      { key: 'attendance_punctuality', label: 'Attendance & Punctuality (Q10)', icon: '⏰', isQ10: true },
      { key: 'communication', label: 'Communication', icon: '💬' },
      { key: 'professionalism_ethics', label: 'Professionalism & Ethics', icon: '🛡️' },
      { key: 'respect_authority', label: 'Respect for Authority', icon: '🙇' },
      { key: 'accountability', label: 'Accountability', icon: '📊' },
    ]
  },
  {
    category: '🤝 Interpersonal Dimension',
    items: [
      { key: 'teamwork', label: 'Teamwork', icon: '🤝' },
      { key: 'conflict_resolution', label: 'Conflict Resolution', icon: '🕊️' },
      { key: 'empathy', label: 'Empathy', icon: '❤️' },
      { key: 'leadership_potential', label: 'Leadership Potential', icon: '👑' },
      { key: 'conflict_handling', label: 'Conflict Handling', icon: '🥊' },
    ]
  }
] as const;

const SCORE_OPTIONS = [
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
  task_completion: 3,
  quality_of_work: 3,
  problem_solving: 3,
  initiative_innovation: 3,
  learning_adaptability: 3,
  communication: 3,
  professionalism_ethics: 3,
  respect_authority: 3,
  accountability: 3,
  teamwork: 3,
  conflict_resolution: 3,
  empathy: 3,
  leadership_potential: 3,
  conflict_handling: 3,
  attendance_punctuality: 3,
};

export default function GuideFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<GuideFeedbackData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<{ row: number; error: string }[]>([]);
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
    Number(form.task_completion) +
    Number(form.quality_of_work) +
    Number(form.problem_solving) +
    Number(form.initiative_innovation) +
    Number(form.learning_adaptability) +
    Number(form.communication) +
    Number(form.professionalism_ethics) +
    Number(form.respect_authority) +
    Number(form.accountability) +
    Number(form.teamwork) +
    Number(form.conflict_resolution) +
    Number(form.empathy) +
    Number(form.leadership_potential) +
    Number(form.conflict_handling);

  const calculatedGuideScore = (nonAttendanceSum / 70) * 100;
  const calculatedTotalMarks = nonAttendanceSum + Number(form.attendance_punctuality);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.intern_id.trim()) {
      setError('Intern ID / P No is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setBulkErrors([]);

    try {
      const res = await fetch(`${BASE}/guide-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      task_completion: fb.task_completion || 3,
      quality_of_work: fb.quality_of_work || 3,
      problem_solving: fb.problem_solving || 3,
      initiative_innovation: fb.initiative_innovation || 3,
      learning_adaptability: fb.learning_adaptability || 3,
      communication: fb.communication || 3,
      professionalism_ethics: fb.professionalism_ethics || 3,
      respect_authority: fb.respect_authority || 3,
      accountability: fb.accountability || 3,
      teamwork: fb.teamwork || 3,
      conflict_resolution: fb.conflict_resolution || 3,
      empathy: fb.empathy || 3,
      leadership_potential: fb.leadership_potential || 3,
      conflict_handling: fb.conflict_handling || 3,
      attendance_punctuality: fb.attendance_punctuality || 3,
    });
    setEditingId(fb.id);
    setError(null);
    setSuccess(null);
    setBulkErrors([]);
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
    setBulkErrors([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BASE}/guide-feedback/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Excel upload failed');

      if (data.errors && data.errors.length > 0) {
        setBulkErrors(data.errors);
        setError(`Excel processed with ${data.errors.length} validation errors.`);
      }

      if (data.created > 0) {
        setSuccess(`Successfully imported/updated ${data.created} guide feedback records.`);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setBulkErrors([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">👨‍🏫 Guide Feedback Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Evaluate interns on 15 CIPAT dimensions. Attendance is excluded from the final guide score.
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
              <h3 className="font-bold text-emerald-950 flex items-center gap-2">📊 Scoring Rules</h3>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                Feedback is rated from 1 to 5. <strong>Question 10 (Attendance & Punctuality)</strong> does NOT contribute to the final Guide Score. The score is calculated based on the remaining 14 dimensions (Max Score = 70).
              </p>
              <code className="block mt-2 text-xs font-mono bg-emerald-950/10 p-2 rounded text-emerald-900">
                Guide Score = (Obtained Marks in 14 Dimensions / 70) * 100
              </code>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-800">📂 Excel Bulk Upload</h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload Excel file containing numeric ratings (1–5) or options ("Best", "Good", etc.).
              </p>
            </div>
            <div className="mt-3">
              <label className="w-full flex flex-center justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition text-center">
                {uploading ? 'Processing file...' : '📤 Upload Guide Feedback Excel'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={uploading}
                  className="hidden"
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>
        </div>

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
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700 flex items-start gap-2.5 shadow-sm">
            <span className="text-lg">✅</span>
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Row-Level Errors Details */}
        {bulkErrors.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 shadow-sm max-h-48 overflow-y-auto">
            <p className="font-bold text-sm mb-1.5 flex items-center gap-1">⚠️ Row-level validation errors:</p>
            <ul className="list-disc pl-4 space-y-1">
              {bulkErrors.map((err, index) => (
                <li key={index}>
                  <strong>Row {err.row}:</strong> {err.error}
                </li>
              ))}
            </ul>
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
                  <label className="label">Intern ID / P No *</label>
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
              </div>

              <div className="h-64 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-4">
                {DIMENSIONS.map((cat) => (
                  <div key={cat.category} className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase">{cat.category}</h4>
                    {cat.items.map((item) => (
                      <div key={item.key} className="space-y-1 bg-white p-2.5 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <span>{item.icon}</span> {item.label}
                          {item.key === 'attendance_punctuality' && <span className="text-[10px] font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-auto">No Contribution</span>}
                        </label>
                        <select
                          value={form[item.key as keyof typeof form]}
                          onChange={e => setForm({ ...form, [item.key]: Number(e.target.value) })}
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
                <p className="text-[11px] opacity-75 uppercase font-bold tracking-wider">Total Obtained Score</p>
                <p className="text-2xl font-black">{calculatedTotalMarks} <span className="text-sm opacity-60">/ 75</span></p>
                <div className="border-t border-white/20 mt-2 pt-2">
                  <p className="text-[11px] opacity-75 uppercase font-bold tracking-wider">Calculated Guide Score</p>
                  <p className="text-3xl font-black">{calculatedGuideScore.toFixed(1)}%</p>
                  <p className="text-[9px] opacity-50 mt-0.5">(Excluding Attendance & Punctuality)</p>
                </div>
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
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No guide feedbacks submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Intern Details</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Guide</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Score Summary</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Guide Score</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {feedbacks.map(fb => (
                      <tr key={fb.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{fb.intern_name || '—'}</p>
                          <p className="text-xs text-gray-500 font-mono">ID: {fb.intern_id} {fb.p_no && `· P No: ${fb.p_no}`}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-600">{fb.guide_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="font-bold text-gray-800">{fb.total_marks}/75</p>
                          <p className="text-[10px] text-gray-400">Total Marks</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            {fb.guide_score.toFixed(1)}%
                          </span>
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
