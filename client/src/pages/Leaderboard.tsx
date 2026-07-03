import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  internId: string;
  internName: string;
  hrScore: number;
  peerAverage: number;
  presentationScore: number;
  totalPenalty: number;
  finalScore: number;
}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setReviewsLoading(true);
    try {
      console.log('[Leaderboard UI] Loading reviews...');
      const res = await fetch('/api/Project-review');

      if (!res.ok) {
        throw new Error(`Failed to fetch reviews: ${res.status} ${res.statusText}`);
      }

      const result = await res.json();
      console.log('[Leaderboard UI] Reviews loaded:', result?.length ?? 0, 'reviews');
      setReviews(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('[Leaderboard UI] ERROR loading reviews:', err);
      setError(`Failed to load reviews: ${err.message}`);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }

  async function generateLeaderboard() {
    if (!selectedReviewId) {
      alert('Please select a presentation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Leaderboard UI] Generating leaderboard for reviewId:', selectedReviewId);
      const res = await fetch(
        `/api/Project-review/leaderboard/${selectedReviewId}`
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error: ${res.status} ${res.statusText}`);
      }

      const result = await res.json();
      console.log('[Leaderboard UI] Raw API response:', JSON.stringify(result));

      if (!Array.isArray(result)) {
        console.error('[Leaderboard UI] API did not return an array:', typeof result, result);
        setData([]);
        setError('Unexpected response format from server');
        return;
      }

      // Map snake_case backend fields to camelCase frontend fields
      const mapped: LeaderboardEntry[] = result.map((item: any, index: number) => {
        const entry: LeaderboardEntry = {
          rank: item.rank ?? index + 1,
          internId: item.presenter_id ?? item.internId ?? 'N/A',
          internName: item.presenter_name ?? item.internName ?? 'Unknown',
          hrScore: Number(item.hr_score ?? item.hrScore ?? 0),
          peerAverage: Number(item.peer_average ?? item.peerAverage ?? 0),
          presentationScore: Number(item.presentation_score ?? item.presentationScore ?? 0),
          totalPenalty: Number(item.total_penalty ?? item.totalPenalty ?? 0),
          finalScore: Number(item.final_score ?? item.finalScore ?? 0),
        };
        console.log('[Leaderboard UI] Mapped entry:', entry);
        return entry;
      });

      console.log('[Leaderboard UI] Total mapped entries:', mapped.length);
      setData(mapped);
    } catch (err: any) {
      console.error('[Leaderboard UI] ERROR generating leaderboard:', err);
      setError(err.message || 'Failed to generate leaderboard');
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord(presenterId: string) {
    if (!confirm(`Delete record for ${presenterId}?`)) return;

    try {
      console.log('[Leaderboard UI] Deleting record for presenter:', presenterId);
      const res = await fetch(
        `/api/Project-review/final-result/${selectedReviewId}/${presenterId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }

      console.log('[Leaderboard UI] Record deleted, refreshing leaderboard...');
      generateLeaderboard();
    } catch (err: any) {
      console.error('[Leaderboard UI] ERROR deleting record:', err);
      alert(`Failed to delete: ${err.message}`);
    }
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '🎖️';
  };

  const safeFixed = (value: any, digits: number = 2): string => {
    const num = Number(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(digits);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏆 Project Review Leaderboard
          </h1>
          <p className="text-gray-600">
            View project review rankings with presentation scores and analytical skill penalties
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-l-4 border-purple-500 p-4 mb-8 rounded-lg">
          <p className="text-sm text-purple-900">
            <strong>📊 Scoring Formula:</strong> Project Review Score = (HR Score + Peer Average) / 2 - Analytical Penalty
          </p>
          <p className="text-sm text-purple-900 mt-2">
            <strong>⚠️ Analytical Penalty:</strong> Applied based on how each evaluator's score compares to HR's evaluation (±5 tolerance)
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Selection Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Select Presentation Batch
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedReviewId}
              onChange={(e) =>
                setSelectedReviewId(e.target.value)
              }
              disabled={reviewsLoading}
              className="flex-1 border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="">
                {reviewsLoading ? 'Loading presentations...' : 'Select Presentation...'}
              </option>

              {reviews.map((r: any) => (
                <option
                  key={r.id}
                  value={r.id}
                >
                  {r.title} - {r.batch_name} ({new Date(r.review_date).toLocaleDateString()})
                </option>
              ))}
            </select>

            <button
              onClick={generateLeaderboard}
              disabled={loading || !selectedReviewId}
              className={`px-8 py-3 rounded-lg font-bold transition-all duration-200 ${
                loading || !selectedReviewId
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
              }`}
            >
              {loading ? '⏳ Generating...' : 'Generate Leaderboard'}
            </button>
            {data.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/exports/project-review/${selectedReviewId}`);
                    if (!res.ok) throw new Error('Export failed on backend');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const todayStr = new Date().toISOString().split('T')[0];
                    a.download = `Project_Review_${todayStr}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    alert("Export Failed: Unable to generate Excel file. Please try again.");
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all shadow hover:shadow-md"
              >
                📥 Export to Excel
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center mb-8">
            <div className="animate-spin inline-block w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600 text-lg">Calculating scores and generating leaderboard...</p>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && data.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <th className="px-6 py-4 text-left font-bold">Rank</th>
                    <th className="px-6 py-4 text-left font-bold">P.No</th>
                    <th className="px-6 py-4 text-left font-bold">Name</th>
                    <th className="px-6 py-4 text-center font-bold">HR Score</th>
                    <th className="px-6 py-4 text-center font-bold">Peer Avg</th>
                    <th className="px-6 py-4 text-center font-bold">Presentation Score</th>
                    <th className="px-6 py-4 text-center font-bold">⚠️ Penalty</th>
                    <th className="px-6 py-4 text-center font-bold text-yellow-300">Final Project Review Score</th>
                    <th className="px-6 py-4 text-center font-bold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item: LeaderboardEntry, index: number) => {
                    return (
                      <tr
                        key={item.internId + '-' + index}
                        className={`border-t border-gray-200 transition-colors ${
                          index === 0
                            ? 'bg-gradient-to-r from-yellow-50 to-yellow-100'
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-100 to-gray-50'
                            : index === 2
                            ? 'bg-gradient-to-r from-orange-50 to-orange-100'
                            : index % 2 === 0
                            ? 'bg-gray-50'
                            : 'bg-white'
                        } hover:shadow-md`}
                      >
                        <td className="px-6 py-4 text-center font-bold text-2xl">
                          {getMedalEmoji(index)}
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">
                          {item.internId ?? 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-800 font-semibold">
                          {item.internName ?? 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                            {safeFixed(item.hrScore, 1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                            {safeFixed(item.peerAverage, 1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-semibold">
                            {safeFixed(item.presentationScore)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full font-semibold ${
                            (item.totalPenalty ?? 0) === 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {safeFixed(item.totalPenalty)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-900 px-4 py-2 rounded-full font-bold text-lg">
                            {safeFixed(item.finalScore)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() =>
                              deleteRecord(item.internId)
                            }
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Participants</p>
                  <p className="text-3xl font-bold text-blue-600">{data.length}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Highest Score</p>
                  <p className="text-3xl font-bold text-green-600">
                    {data.length > 0 ? safeFixed(Math.max(...data.map(d => d.finalScore ?? 0))) : '0.00'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Average Score</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {data.length > 0
                      ? safeFixed(data.reduce((sum, d) => sum + (d.finalScore ?? 0), 0) / data.length)
                      : '0.00'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Penalties</p>
                  <p className="text-3xl font-bold text-red-600">
                    {safeFixed(data.reduce((sum, d) => sum + (d.totalPenalty ?? 0), 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : !loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">
              {error
                ? 'No leaderboard data available. Please check the error above.'
                : selectedReviewId
                ? 'No data available. Click "Generate Leaderboard" or submit evaluations first.'
                : 'Select a presentation batch to view the leaderboard'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}