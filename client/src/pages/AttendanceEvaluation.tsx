import { useState, useEffect, useCallback, Fragment } from 'react';
import { downloadTemplateFile } from '../utils/EvaluationTemplates';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface AttendanceSummaryData {
  id: string;
  intern_id: string;
  p_no?: string;
  intern_name: string;
  intern?: { p_no?: string; full_name?: string };
  total_working_days: number;
  present_days: number;
  genuine_days: number;
  attendance_percentage: number;
  sincerity_percentage: number;
  attendance_score: number;
  flagged: boolean;
  flag_details: string | null;
}

interface AttendanceRecord {
  id: string;
  intern_id: string;
  intern_name: string;
  attendance_date: string;
  submitted_at: string;
  status: string;
}

export default function AttendanceEvaluation() {
  const [summaries, setSummaries] = useState<AttendanceSummaryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedIntern, setExpandedIntern] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/attendance/summaries`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSummaries(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/attendance/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadResult(data);
      fetchSummaries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all attendance data? This cannot be undone.')) return;
    try {
      const res = await fetch(`${BASE}/attendance/records`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear data');
      setSummaries([]);
      setUploadResult(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // For add form
  const [formPNo, setFormPNo] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStatus, setFormStatus] = useState('PRESENT');
  const [formSubmittedAt, setFormSubmittedAt] = useState('');
  
  // For edit form
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('PRESENT');
  const [editSubmittedAt, setEditSubmittedAt] = useState('');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/attendance/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_no: formPNo,
          attendance_date: formDate,
          status: formStatus,
          submitted_at: formSubmittedAt || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create record');
      
      setShowAddModal(false);
      setFormPNo('');
      setFormDate('');
      setFormStatus('PRESENT');
      setFormSubmittedAt('');
      
      fetchSummaries();
      if (expandedIntern) {
        const rRes = await fetch(`${BASE}/attendance/records/${expandedIntern}`);
        const rData = await rRes.json();
        setRecords(rData);
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/attendance/record/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_date: editDate,
          status: editStatus,
          submitted_at: editSubmittedAt,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update record');

      setShowEditModal(false);
      setSelectedRecord(null);

      fetchSummaries();
      if (expandedIntern) {
        const rRes = await fetch(`${BASE}/attendance/records/${expandedIntern}`);
        const rData = await rRes.json();
        setRecords(rData);
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`${BASE}/attendance/record/${recId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');

      fetchSummaries();
      if (expandedIntern) {
        const rRes = await fetch(`${BASE}/attendance/records/${expandedIntern}`);
        const rData = await rRes.json();
        setRecords(rData);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleExpand = async (internId: string) => {
    if (expandedIntern === internId) {
      setExpandedIntern(null);
      setRecords([]);
      return;
    }
    setExpandedIntern(internId);
    setRecordsLoading(true);
    try {
      const res = await fetch(`${BASE}/attendance/records/${internId}`);
      const data = await res.json();
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const filtered = summaries.filter(
    s =>
      s.intern_name.toLowerCase().includes(search.toLowerCase()) ||
      s.intern_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">📋 Attendance Evaluation</h1>
          <p className="text-gray-600 mt-2">
            Upload attendance data from Excel, view attendance scores, sincerity percentages, and flagged entries
          </p>
        </div>

        {/* Upload Area */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Attendance Excel</h2>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? 'border-tata-blue bg-tata-light'
                : 'border-gray-300 hover:border-tata-blue hover:bg-gray-50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-tata-blue border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600">Processing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-gray-600 mb-2">Drag & drop an Excel file here, or click to browse</p>
                <p className="text-xs text-gray-400 mb-4">Expected columns: P No, Candidate Name, Date, Attendance Status, Report Submitted, Submission Time, Department, Remarks</p>
                <div className="flex items-center gap-3">
                  <label className="btn-primary cursor-pointer">
                    Choose File
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => {
                      try {
                        downloadTemplateFile('daily_attendance');
                      } catch (err) {
                        alert("Download could not be started. Please verify browser download permissions.");
                      }
                    }}
                    type="button"
                    className="btn-secondary"
                  >
                    📥 Download Sample Format
                  </button>
                </div>
              </div>
            )}
          </div>

           {/* Upload Result */}
          {uploadResult && (
            <div className="mt-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">📋 Upload Successful</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-blue-700">{uploadResult.total_parsed || 0}</p>
                  <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Total Rows</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-green-700">{uploadResult.created || 0}</p>
                  <p className="text-[11px] font-bold text-green-500 uppercase tracking-wider">Imported / Updated</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-600">{uploadResult.warnings?.length || 0}</p>
                  <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Warnings</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-red-600">{uploadResult.errors?.length || 0}</p>
                  <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Errors</p>
                </div>
              </div>
              {uploadResult.warnings?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <p className="font-bold text-sm text-amber-800 mb-1.5 flex items-center gap-1">⚠️ Warnings ({uploadResult.warnings.length})</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-amber-800">
                    {uploadResult.warnings.map((w: any, index: number) => (
                      <li key={index}>
                        {w.warning || `Row ${w.row}: field is blank`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {uploadResult.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <p className="font-bold text-sm text-red-800 mb-1.5 flex items-center gap-1">❌ Errors ({uploadResult.errors.length})</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-red-800">
                    {uploadResult.errors.map((err: any, index: number) => (
                      <li key={index}>
                        {err.error || `Row ${err.row}: validation failed`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input max-w-sm"
          />
          <div className="flex gap-2">
            <button onClick={() => {
              setFormPNo('');
              setFormDate('');
              setFormStatus('PRESENT');
              setFormSubmittedAt('');
              setFormError('');
              setShowAddModal(true);
            }} className="btn-primary">
              + Add Manual Entry
            </button>
            <button onClick={fetchSummaries} className="btn-secondary" disabled={loading}>
              🔄 Refresh
            </button>
            {summaries.length > 0 && (
              <>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${BASE}/exports/attendance-evaluation`);
                      if (!res.ok) throw new Error('Export failed on backend');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const todayStr = new Date().toISOString().split('T')[0];
                      a.download = `Attendance_Evaluation_${todayStr}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      alert("Export Failed: Unable to generate Excel file. Please try again.");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs"
                >
                  📥 Export to Excel
                </button>
                <button onClick={handleClearData} className="btn-danger">
                  🗑️ Clear All Data
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Table */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-tata-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            {summaries.length === 0
              ? 'No attendance data uploaded yet. Upload an Excel file to get started.'
              : 'No results match your search.'}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">#</th>
                    <th className="th">P No</th>
                    <th className="th">Name</th>
                    <th className="th">Working Days</th>
                    <th className="th">Present</th>
                    <th className="th">Genuine</th>
                    <th className="th">Attendance %</th>
                    <th className="th">Sincerity %</th>
                    <th className="th">Score</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s, idx) => (
                    <Fragment key={s.id}>
                      <tr
                        className={`tr-hover ${s.flagged ? 'bg-red-50' : ''} cursor-pointer`}
                        onClick={() => toggleExpand(s.intern_id)}
                      >
                        <td className="td font-medium text-gray-500">{idx + 1}</td>
                        <td className="td font-mono text-xs">{s.p_no || s.intern?.p_no || s.intern_id}</td>
                        <td className="td font-medium">{s.intern_name}</td>
                        <td className="td text-center">{s.total_working_days}</td>
                        <td className="td text-center">{s.present_days}</td>
                        <td className="td text-center">{s.genuine_days}</td>
                        <td className="td">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-tata-blue rounded-full"
                                style={{ width: `${Math.min(s.attendance_percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{s.attendance_percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${Math.min(s.sincerity_percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{s.sincerity_percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="td">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-tata-light text-tata-blue">
                            {s.attendance_score.toFixed(2)}
                          </span>
                        </td>
                        <td className="td">
                          {s.flagged ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              ⚠️ Flagged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              ✅ OK
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {expandedIntern === s.intern_id && (
                        <tr key={`${s.id}-detail`}>
                          <td colSpan={10} className="p-4 bg-gray-50">
                            {s.flagged && s.flag_details && (
                              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                ⚠️ <strong>Flag:</strong> {s.flag_details}
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm text-gray-700">Attendance Records</h4>
                              <button onClick={() => {
                                setFormPNo(s.intern_id);
                                setFormDate('');
                                setFormStatus('PRESENT');
                                setFormSubmittedAt('');
                                setFormError('');
                                setShowAddModal(true);
                              }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-200 transition">
                                + Add Record
                              </button>
                            </div>
                            {recordsLoading ? (
                              <div className="flex justify-center py-4">
                                <div className="w-6 h-6 border-3 border-tata-blue border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : records.length === 0 ? (
                              <p className="text-sm text-gray-500">No records found</p>
                            ) : (
                              <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b">
                                      <th className="py-1 pr-4">Date</th>
                                      <th className="py-1 pr-4">Submitted At</th>
                                      <th className="py-1 pr-4">Status</th>
                                      <th className="py-1">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {records.map(r => (
                                      <tr key={r.id} className={r.status === 'BACKFILLED' ? 'text-orange-600' : ''}>
                                        <td className="py-1 pr-4">{new Date(r.attendance_date).toLocaleDateString()}</td>
                                        <td className="py-1 pr-4">{new Date(r.submitted_at).toLocaleString()}</td>
                                        <td className="py-1 pr-4">
                                          {r.status === 'BACKFILLED' ? (
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">BACKFILLED</span>
                                          ) : (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">PRESENT</span>
                                          )}
                                        </td>
                                        <td className="py-1 flex gap-2">
                                          <button onClick={() => {
                                            setSelectedRecord(r);
                                            setEditDate(new Date(r.attendance_date).toISOString().split('T')[0]);
                                            setEditSubmittedAt(new Date(r.submitted_at).toISOString().slice(0, 16));
                                            setEditStatus(r.status);
                                            setFormError('');
                                            setShowEditModal(true);
                                          }} className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">
                                            ✏️ Edit
                                          </button>
                                          <button onClick={() => handleDeleteRecord(r.id)} className="text-red-600 hover:text-red-900 text-xs font-semibold">
                                            🗑️ Delete
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {summaries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-tata-blue">{summaries.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Interns</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {(summaries.reduce((a, s) => a + s.attendance_percentage, 0) / summaries.length).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Avg Attendance</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {(summaries.reduce((a, s) => a + s.sincerity_percentage, 0) / summaries.length).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Avg Sincerity</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{summaries.filter(s => s.flagged).length}</p>
              <p className="text-xs text-gray-500 mt-1">Flagged Interns</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800">➕ Add Manual Attendance Record</h3>
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">{formError}</div>
            )}
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="label">P No *</label>
                <input
                  type="text"
                  required
                  value={formPNo}
                  onChange={e => setFormPNo(e.target.value)}
                  placeholder="e.g. 106245"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Attendance Date *</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Submission Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={formSubmittedAt}
                  onChange={e => setFormSubmittedAt(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="input">
                  <option value="PRESENT">PRESENT</option>
                  <option value="BACKFILLED">BACKFILLED</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800">✏️ Edit Attendance Record</h3>
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">{formError}</div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="label">Attendance Date *</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Submission Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={editSubmittedAt}
                  onChange={e => setEditSubmittedAt(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="input">
                  <option value="PRESENT">PRESENT</option>
                  <option value="BACKFILLED">BACKFILLED</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
