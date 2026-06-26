import { useState, useEffect, useCallback } from 'react';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface AttendanceSummaryData {
  id: string;
  intern_id: string;
  intern_name: string;
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
              <>
                <div className="text-4xl mb-3">📄</div>
                <p className="text-gray-600 mb-2">Drag & drop an Excel file here, or click to browse</p>
                <p className="text-xs text-gray-400 mb-4">Expected columns: Date, Intern ID, Intern Name, Submitted At</p>
                <label className="btn-primary cursor-pointer">
                  Choose File
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-800">✅ {uploadResult.message}</p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-green-700">
                <span>Records created: <strong>{uploadResult.created}</strong></span>
                <span>Summaries updated: <strong>{uploadResult.summaries_updated}</strong></span>
                <span>Bulk flags: <strong>{uploadResult.bulk_flags?.length || 0}</strong></span>
              </div>
              {uploadResult.errors?.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  {uploadResult.errors.length} error(s) during import
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
            <button onClick={fetchSummaries} className="btn-secondary" disabled={loading}>
              🔄 Refresh
            </button>
            {summaries.length > 0 && (
              <button onClick={handleClearData} className="btn-danger">
                🗑️ Clear All Data
              </button>
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
                    <th className="th">Intern ID</th>
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
                    <>
                      <tr
                        key={s.id}
                        className={`tr-hover ${s.flagged ? 'bg-red-50' : ''}`}
                        onClick={() => toggleExpand(s.intern_id)}
                      >
                        <td className="td font-medium text-gray-500">{idx + 1}</td>
                        <td className="td font-mono text-xs">{s.intern_id}</td>
                        <td className="td font-medium">{s.intern_name}</td>
                        <td className="td text-center">{s.total_working_days}</td>
                        <td className="td text-center">{s.present_days}</td>
                        <td className="td text-center">{s.genuine_days}</td>
                        <td className="td">
                          <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-2">
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
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Attendance Records</h4>
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
                                      <th className="py-1">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {records.map(r => (
                                      <tr key={r.id} className={r.status === 'BACKFILLED' ? 'text-orange-600' : ''}>
                                        <td className="py-1 pr-4">{new Date(r.attendance_date).toLocaleDateString()}</td>
                                        <td className="py-1 pr-4">{new Date(r.submitted_at).toLocaleString()}</td>
                                        <td className="py-1">
                                          {r.status === 'BACKFILLED' ? (
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">BACKFILLED</span>
                                          ) : (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">PRESENT</span>
                                          )}
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
                    </>
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
    </div>
  );
}
