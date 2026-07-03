import { useEffect, useState } from 'react';

interface SavedEvaluation {
  id: string;
  review_id: string;
  presenter_id: string;
  presenter_name: string;
  evaluator_id: string;
  is_hr: boolean;
  total_marks: number;
  created_at: string;
}

export default function SavedEvaluations() {
  const [evaluations, setEvaluations] = useState<SavedEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReviewId, setFilterReviewId] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
    loadEvaluations();
  }, []);

  async function loadReviews() {
    try {
      const res = await fetch('/api/Project-review');
      const result = await res.json();
      setReviews(result);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  async function loadEvaluations() {
    setLoading(true);
    try {
      const res = await fetch('/api/Project-review/evaluations');
      if (res.ok) {
        const result = await res.json();
        setEvaluations(result);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEvaluation(id: string) {
    if (!window.confirm('Are you sure you want to delete this evaluation?')) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/Project-review/evaluation/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setEvaluations(evaluations.filter(e => e.id !== id));
        setSelectedForDelete(null);
        alert('✅ Evaluation deleted successfully');
      } else {
        alert('❌ Failed to delete evaluation');
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      alert('❌ Error deleting evaluation');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredEvaluations = filterReviewId
    ? evaluations.filter(e => e.review_id === filterReviewId)
    : evaluations;

  const getReviewTitle = (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    return review ? `${review.title} - ${review.batch_name}` : reviewId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            💾 Saved Evaluations
          </h1>
          <p className="text-gray-600">
            View, manage, and delete all submitted evaluations
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Filter by Batch</h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterReviewId}
              onChange={(e) => setFilterReviewId(e.target.value)}
              className="flex-1 border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="">All Batches</option>
              {reviews.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.title} - {r.batch_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setFilterReviewId('');
                loadEvaluations();
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Clear Filter
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">Total Evaluations</p>
            <p className="text-3xl font-bold text-blue-600">{evaluations.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">HR Evaluations</p>
            <p className="text-3xl font-bold text-green-600">
              {evaluations.filter(e => e.is_hr).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">Peer Evaluations</p>
            <p className="text-3xl font-bold text-orange-600">
              {evaluations.filter(e => !e.is_hr).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-purple-600">
              {evaluations.length > 0
                ? (evaluations.reduce((sum, e) => sum + e.total_marks, 0) / evaluations.length).toFixed(1)
                : '0'}
            </p>
          </div>
        </div>

        {/* Evaluations Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">Loading evaluations...</p>
          </div>
        ) : filteredEvaluations.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <th className="px-6 py-4 text-left font-bold">Batch</th>
                    <th className="px-6 py-4 text-left font-bold">Presenter ID</th>
                    <th className="px-6 py-4 text-left font-bold">Presenter Name</th>
                    <th className="px-6 py-4 text-left font-bold">Evaluator ID</th>
                    <th className="px-6 py-4 text-center font-bold">Role</th>
                    <th className="px-6 py-4 text-center font-bold">Score</th>
                    <th className="px-6 py-4 text-left font-bold">Date</th>
                    <th className="px-6 py-4 text-center font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEvaluations.map((evaluation, index) => (
                    <tr
                      key={evaluation.id}
                      className={`border-t border-gray-200 transition-colors ${
                        selectedForDelete === evaluation.id
                          ? 'bg-red-50'
                          : index % 2 === 0
                          ? 'bg-gray-50'
                          : 'bg-white'
                      } hover:bg-purple-50`}
                    >
                      <td className="px-6 py-4 text-gray-700 font-medium text-sm">
                        {getReviewTitle(evaluation.review_id)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                        {evaluation.presenter_id}
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {evaluation.presenter_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                        {evaluation.evaluator_id}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          evaluation.is_hr
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {evaluation.is_hr ? '👔 HR' : '👥 Peer'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold">
                          {evaluation.total_marks}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(evaluation.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => deleteEvaluation(evaluation.id)}
                          disabled={deletingId === evaluation.id}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            deletingId === evaluation.id
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              : 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                          }`}
                        >
                          {deletingId === evaluation.id ? '⏳' : '🗑️ Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <strong>{filteredEvaluations.length}</strong> of <strong>{evaluations.length}</strong> evaluations
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-6xl mb-4">📋</p>
            <p className="text-gray-500 text-lg">
              {evaluations.length === 0
                ? 'No evaluations saved yet. Submit some evaluations to see them here.'
                : 'No evaluations found for the selected filter.'}
            </p>
          </div>
        )}

        {/* Bulk Actions */}
        {evaluations.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Bulk Actions</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete ALL evaluations for this batch?')) {
                    // Implement bulk delete if needed
                    alert('Bulk delete functionality - implement as needed');
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🗑️ Delete All Selected
              </button>

              <button
                onClick={() => {
                  try {
                    // Export functionality
                    const csvContent = [
                      ['Batch', 'Presenter ID', 'Presenter Name', 'Evaluator ID', 'Role', 'Score', 'Date'].join(','),
                      ...filteredEvaluations.map(e =>
                        [
                          getReviewTitle(e.review_id),
                          e.presenter_id,
                          e.presenter_name,
                          e.evaluator_id,
                          e.is_hr ? 'HR' : 'Peer',
                          e.total_marks,
                          new Date(e.created_at).toISOString()
                        ].join(',')
                      )
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `evaluations_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert("Export Failed: Unable to generate CSV file. Please try again.");
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                📥 Export to CSV
              </button>

              <button
                onClick={loadEvaluations}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
