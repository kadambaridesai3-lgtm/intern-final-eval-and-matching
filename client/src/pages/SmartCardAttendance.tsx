import { useState, useEffect, useCallback, useRef } from 'react';
import { downloadTemplateFile } from '../utils/EvaluationTemplates';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface PunchRecord {
  id: string;
  intern_id: string;
  intern_name: string;
  p_no: string;
  punch_date: string;
  in_time: string;
  out_time: string;
  is_late: boolean;
  is_early_exit: boolean;
  working_hours: number;
}

export default function SmartCardAttendance() {
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<{ row: number; error: string }[]>([]);
  const [bulkWarnings, setBulkWarnings] = useState<{ row: number; warning: string }[]>([]);
  const [workingDays, setWorkingDays] = useState<number>(20);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPunches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/attendance/smart-card/punches`);
      if (!res.ok) throw new Error('Failed to fetch smart card records');
      const data = await res.json();
      setPunches(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPunches();
  }, [fetchPunches]);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setError(null);
    setSuccess(null);
    setBulkErrors([]);
    setBulkWarnings([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('working_days', String(workingDays));

    try {
      const res = await fetch(`${BASE}/attendance/upload-smart-card`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Excel upload failed');

      if (data.warnings && data.warnings.length > 0) {
        setBulkWarnings(data.warnings);
      }

      if (data.errors && data.errors.length > 0) {
        setBulkErrors(data.errors);
        setError(`Smart card file processed with ${data.errors.length} errors.`);
      }

      if (data.created > 0) {
        setSuccess(`Successfully imported ${data.created} smart card punch records.`);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchPunches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRecalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecalculating(true);
    setError(null);
    setSuccess(null);
    setBulkErrors([]);
    setBulkWarnings([]);

    try {
      const res = await fetch(`${BASE}/attendance/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_days: workingDays }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recalculation failed');
      setSuccess(`Recalculation complete! Updated attendance summaries for all interns.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear ALL attendance and smart card data? This cannot be undone.')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${BASE}/attendance/records`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear data');
      setSuccess('All attendance and smart card records have been cleared.');
      setPunches([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PunchRecord | null>(null);

  // Add form fields
  const [formPNo, setFormPNo] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formInTime, setFormInTime] = useState('');
  const [formOutTime, setFormOutTime] = useState('');

  // Edit form fields
  const [editDate, setEditDate] = useState('');
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/attendance/smart-card/punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_no: formPNo,
          punch_date: formDate,
          in_time: formInTime || undefined,
          out_time: formOutTime || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create punch');

      setShowAddModal(false);
      setFormPNo('');
      setFormDate('');
      setFormInTime('');
      setFormOutTime('');

      fetchPunches();
      setSuccess('Successfully added punch record.');
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
      const res = await fetch(`${BASE}/attendance/smart-card/punch/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          punch_date: editDate,
          in_time: editInTime,
          out_time: editOutTime,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update punch');

      setShowEditModal(false);
      setSelectedRecord(null);

      fetchPunches();
      setSuccess('Successfully updated punch record.');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePunch = async (punchId: string) => {
    if (!confirm('Are you sure you want to delete this punch record?')) return;
    try {
      const res = await fetch(`${BASE}/attendance/smart-card/punch/${punchId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete punch');

      fetchPunches();
      setSuccess('Successfully deleted punch record.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = punches.filter(
    p =>
      p.intern_name.toLowerCase().includes(search.toLowerCase()) ||
      p.p_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">💳 Smart Card Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload physical punching records and manage configurable working days for attendance scoring.
            </p>
          </div>
          <button onClick={handleClearData} className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-4 py-2 rounded-lg border border-red-200 transition">
            🗑️ Clear All Attendance
          </button>
        </div>

        {/* Configuration & Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-extrabold text-gray-800">📤 Upload Smart Card File</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Upload an Excel sheet containing smart card entry logs.
              The sheet must contain the following columns: <strong>P No</strong>, <strong>Candidate Name</strong>, <strong>Date</strong>, <strong>In Time</strong>, <strong>Out Time</strong>, <strong>Working Hours</strong>, <strong>Status</strong>, <strong>Remarks</strong>.
            </p>
            <div className="pt-2 space-y-2">
              <label className="w-full flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl cursor-pointer shadow hover:shadow-md transition text-center text-sm">
                {uploading ? 'Processing file...' : '📂 Choose & Upload Excel'}
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
                onClick={() => {
                  try {
                    downloadTemplateFile('smart_card');
                  } catch (err) {
                    alert("Download could not be started. Please verify browser download permissions.");
                  }
                }}
                type="button"
                className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl transition"
              >
                📥 Download Sample Format
              </button>
            </div>
          </div>

          {/* Config Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-extrabold text-gray-800">⚙️ Working Days Configuration</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Set the total number of working days for this period. If left unconfigured, the system automatically uses the maximum unique punch dates found across all interns.
            </p>
            <form onSubmit={handleRecalculate} className="flex gap-3 items-end pt-2">
              <div className="flex-1">
                <label className="label">Total Working Days</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={workingDays}
                  onChange={e => setWorkingDays(Number(e.target.value))}
                  className="input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={recalculating}
                className="bg-gray-800 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition shadow"
              >
                {recalculating ? 'Recalculating...' : '🔄 Recalculate Scores'}
              </button>
            </form>
          </div>
        </div>

        {/* Notifications */}
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

        {/* Row-Level Warnings */}
        {bulkWarnings.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 shadow-sm max-h-48 overflow-y-auto">
            <p className="font-bold text-sm mb-1.5 flex items-center gap-1">⚠️ Warnings ({bulkWarnings.length})</p>
            <ul className="list-disc pl-4 space-y-1">
              {bulkWarnings.map((w, index) => (
                <li key={index}>
                  {w.warning || `Row ${w.row}: field is blank`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Row-Level Errors */}
        {bulkErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 shadow-sm max-h-48 overflow-y-auto">
            <p className="font-bold text-sm mb-1.5 flex items-center gap-1">❌ Errors ({bulkErrors.length})</p>
            <ul className="list-disc pl-4 space-y-1">
              {bulkErrors.map((err, index) => (
                <li key={index}>
                  <strong>Row {err.row}:</strong> {err.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Table List Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h3 className="font-extrabold text-gray-800">Smart Card Punch Records ({filtered.length})</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by name or Personal No..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input max-w-xs text-xs"
              />
              <button onClick={() => {
                setFormPNo('');
                setFormDate('');
                setFormInTime('');
                setFormOutTime('');
                setFormError('');
                setShowAddModal(true);
              }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs">
                + Add Manual Punch
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${BASE}/exports/smart-card-punches`);
                    if (!res.ok) throw new Error('Export failed on backend');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const todayStr = new Date().toISOString().split('T')[0];
                    a.download = `Smart_Card_Attendance_${todayStr}.xlsx`;
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
                📥 Export
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No punch records imported yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Intern Details</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Punch Date</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">In Time</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Out Time</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Working Hours</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status Flags</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{p.intern_name}</p>
                        <p className="text-xs text-gray-500 font-mono">P No: {p.p_no}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-medium">
                        {new Date(p.punch_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-gray-700">{p.in_time || ''}</td>
                      <td className="px-5 py-3 text-center font-semibold text-gray-700">{p.out_time || ''}</td>
                      <td className="px-5 py-3 text-center font-extrabold text-indigo-600">{p.working_hours.toFixed(2)} hrs</td>
                      <td className="px-5 py-3 space-x-1.5 text-xs">
                        {p.is_late && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⏱️ Late Arrival
                          </span>
                        )}
                        {p.is_early_exit && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            🏃 Early Exit
                          </span>
                        )}
                        {!p.is_late && !p.is_early_exit && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ On Time
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 flex gap-2">
                        <button onClick={() => {
                          setSelectedRecord(p);
                          setEditDate(new Date(p.punch_date).toISOString().split('T')[0]);
                          setEditInTime(p.in_time || '');
                          setEditOutTime(p.out_time || '');
                          setFormError('');
                          setShowEditModal(true);
                        }} className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDeletePunch(p.id)} className="text-red-600 hover:text-red-900 text-xs font-semibold">
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800">➕ Add Manual Punch Record</h3>
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
                <label className="label">Punch Date *</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">In Time (HH:MM)</label>
                <input
                  type="text"
                  value={formInTime}
                  onChange={e => setFormInTime(e.target.value)}
                  placeholder="e.g. 09:00"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Out Time (HH:MM)</label>
                <input
                  type="text"
                  value={formOutTime}
                  onChange={e => setFormOutTime(e.target.value)}
                  placeholder="e.g. 17:00"
                  className="input"
                />
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
            <h3 className="text-lg font-bold text-gray-800">✏️ Edit Punch Record</h3>
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">{formError}</div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="label">Punch Date *</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">In Time (HH:MM)</label>
                <input
                  type="text"
                  value={editInTime}
                  onChange={e => setEditInTime(e.target.value)}
                  placeholder="e.g. 09:00"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Out Time (HH:MM)</label>
                <input
                  type="text"
                  value={editOutTime}
                  onChange={e => setEditOutTime(e.target.value)}
                  placeholder="e.g. 17:00"
                  className="input"
                />
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
