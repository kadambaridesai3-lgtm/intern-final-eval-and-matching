import { useState, useEffect, useCallback } from 'react';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

interface FinalResult {
  id: string;
  review_id: string;
  presenter_id: string;
  presenter_name: string;
  hr_score: number;
  peer_average: number;
  presentation_score: number;
  total_penalty: number;
  final_score: number;
  created_at: string;
  updated_at: string;
}

interface Review {
  id: string;
  title: string;
  batch_name: string;
}

interface Intern {
  intern_id: string;
  p_no: string;
  full_name: string;
  department: string;
}

interface Summary {
  total_presenters: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  average_hr_score: number;
  average_peer_score: number;
}

export default function ReviewResults() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState('');
  const [interns, setInterns] = useState<Intern[]>([]);
  const [results, setResults] = useState<FinalResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<FinalResult | null>(null);

  // Add Form fields
  const [formPNo, setFormPNo] = useState('');
  const [formHRScore, setFormHRScore] = useState('');
  const [formPeerAverage, setFormPeerAverage] = useState('');
  const [formPenalty, setFormPenalty] = useState('');

  // Edit Form fields
  const [editHRScore, setEditHRScore] = useState('');
  const [editPeerAverage, setEditPeerAverage] = useState('');
  const [editPenalty, setEditPenalty] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch reviews
  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await fetch(`${BASE}/Project-review`);
        if (!res.ok) throw new Error('Failed to load reviews');
        const data = await res.json();
        setReviews(data);
        if (data.length > 0) {
          setSelectedReviewId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
    loadReviews();
  }, []);

  // Fetch interns for dropdown
  useEffect(() => {
    async function loadInterns() {
      try {
        const res = await fetch(`${BASE}/interns`);
        if (!res.ok) throw new Error('Failed to load interns');
        const data = await res.json();
        setInterns(data);
      } catch (err: any) {
        console.error('Error loading interns:', err);
      }
    }
    loadInterns();
  }, []);

  // Fetch results and summary for selected review
  const loadReviewData = useCallback(async () => {
    if (!selectedReviewId) return;
    setLoading(true);
    setError(null);
    try {
      const [resResults, resSummary] = await Promise.all([
        fetch(`${BASE}/Project-review/final-results/${selectedReviewId}`),
        fetch(`${BASE}/Project-review/summary/${selectedReviewId}`)
      ]);

      if (!resResults.ok || !resSummary.ok) throw new Error('Failed to fetch review data');

      const dataResults = await resResults.json();
      const dataSummary = await resSummary.json();

      setResults(dataResults);
      setSummary(dataSummary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedReviewId]);

  useEffect(() => {
    loadReviewData();
  }, [loadReviewData]);

  // Map intern_id to P No helper
  const getPNo = (internId: string) => {
    const found = interns.find(i => i.intern_id === internId);
    return found ? found.p_no : '';
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId) return;
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/Project-review/final-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: selectedReviewId,
          p_no: formPNo,
          hr_score: Number(formHRScore),
          peer_average: Number(formPeerAverage),
          total_penalty: Number(formPenalty)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add score');

      setShowAddModal(false);
      setFormPNo('');
      setFormHRScore('');
      setFormPeerAverage('');
      setFormPenalty('');
      setSuccess('Successfully added final project score.');
      loadReviewData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult || !selectedReviewId) return;
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/Project-review/final-result/${selectedReviewId}/${selectedResult.presenter_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hr_score: Number(editHRScore),
          peer_average: Number(editPeerAverage),
          total_penalty: Number(editPenalty)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update score');

      setShowEditModal(false);
      setSelectedResult(null);
      setSuccess('Successfully updated project score.');
      loadReviewData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (presenterId: string) => {
    if (!confirm('Are you sure you want to delete this presenter score?')) return;
    try {
      const res = await fetch(`${BASE}/Project-review/final-result/${selectedReviewId}/${presenterId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete score');

      setSuccess('Successfully deleted project score.');
      loadReviewData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">📊 Project Review Results</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manually adjust HR Scores, Peer Averages, and Penalties for presentation reviews.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedReviewId}
              onChange={e => setSelectedReviewId(e.target.value)}
              className="input text-xs font-semibold bg-white border-gray-200"
            >
              <option value="">Select Presentation Batch...</option>
              {reviews.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.batch_name})
                </option>
              ))}
            </select>
            {selectedReviewId && (
              <button
                onClick={() => {
                  setFormPNo('');
                  setFormHRScore('');
                  setFormPeerAverage('');
                  setFormPenalty('');
                  setFormError('');
                  setShowAddModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition whitespace-nowrap"
              >
                + Add Score
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-start gap-2.5 shadow-sm">
            <span className="text-lg">❌</span>
            <p className="font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700 flex items-start gap-2.5 shadow-sm">
            <span className="text-lg">✅</span>
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Summary Stats */}
        {summary && selectedReviewId && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-indigo-600">{summary.total_presenters}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Total Evaluated</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-blue-600">{(summary.average_hr_score || 0).toFixed(1)}/10</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Avg HR Score</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-teal-600">{(summary.average_peer_score || 0).toFixed(1)}/10</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Avg Peer Score</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-green-600">{(summary.average_score || 0).toFixed(1)}/100</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Avg Final Score</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-emerald-600">{(summary.highest_score || 0).toFixed(1)}/100</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Highest Score</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-bold text-rose-600">{(summary.lowest_score || 0).toFixed(1)}/100</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Lowest Score</p>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-800">Final Results Table</h3>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No results calculated or entered for this batch yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Rank</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate Details</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">HR Score</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Peer Avg</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Avg Presentation</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center text-red-600">Penalty</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Final Score (Out of 100)</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {results.map((r, index) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3 text-center font-bold text-gray-400">{index + 1}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{r.presenter_name}</p>
                        <p className="text-xs text-gray-500 font-mono">P No: {getPNo(r.presenter_id)}</p>
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-gray-700">
                        {r.hr_score > 0 ? `${r.hr_score.toFixed(1)}/10` : ''}
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-gray-700">
                        {r.peer_average > 0 ? `${r.peer_average.toFixed(1)}/10` : ''}
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-gray-700">
                        {r.presentation_score > 0 ? `${r.presentation_score.toFixed(1)}/10` : ''}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-red-500">
                        {r.total_penalty > 0 ? `-${r.total_penalty.toFixed(1)}` : ''}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {r.final_score > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700">
                            {r.final_score.toFixed(1)}%
                          </span>
                        ) : ''}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedResult(r);
                              setEditHRScore(r.hr_score > 0 ? String(r.hr_score) : '');
                              setEditPeerAverage(r.peer_average > 0 ? String(r.peer_average) : '');
                              setEditPenalty(r.total_penalty > 0 ? String(r.total_penalty) : '');
                              setFormError('');
                              setShowEditModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold bg-indigo-50 px-2 py-1 rounded border border-indigo-100"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r.presenter_id)}
                            className="text-red-600 hover:text-red-900 text-xs font-semibold bg-red-50 px-2 py-1 rounded border border-red-100"
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800">➕ Add Project Review Score</h3>
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">{formError}</div>
            )}
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="label">Intern (P No) *</label>
                <select
                  required
                  value={formPNo}
                  onChange={e => setFormPNo(e.target.value)}
                  className="input"
                >
                  <option value="">Select Intern...</option>
                  {interns.map(i => (
                    <option key={i.intern_id} value={i.p_no}>
                      {i.full_name} (P No: {i.p_no})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">HR Score (0 - 10) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={formHRScore}
                  onChange={e => setFormHRScore(e.target.value)}
                  placeholder="e.g. 8.5"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Peer Average Score (0 - 10) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={formPeerAverage}
                  onChange={e => setFormPeerAverage(e.target.value)}
                  placeholder="e.g. 7.9"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Penalty (e.g. late submissions, presentation over-run) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={formPenalty}
                  onChange={e => setFormPenalty(e.target.value)}
                  placeholder="e.g. 1.0 (default 0)"
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Result'}
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
            <h3 className="text-lg font-bold text-gray-800">✏️ Edit Project Review Score</h3>
            <p className="text-xs text-gray-500">Presenter: <strong className="text-gray-700">{selectedResult?.presenter_name}</strong></p>
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">{formError}</div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="label">HR Score (0 - 10) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={editHRScore}
                  onChange={e => setEditHRScore(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Peer Average Score (0 - 10) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={editPeerAverage}
                  onChange={e => setEditPeerAverage(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Penalty *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={editPenalty}
                  onChange={e => setEditPenalty(e.target.value)}
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