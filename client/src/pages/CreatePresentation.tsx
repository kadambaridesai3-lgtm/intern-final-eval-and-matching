import { useState } from 'react';

export default function CreatePresentation() {
  const [title, setTitle] = useState('');
  const [batchName, setBatchName] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [loading, setLoading] = useState(false);

  async function createPresentation() {
    if (!title || !batchName || !reviewDate) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        '/api/Project-review/presentation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            batch_name: batchName,
            review_date: reviewDate,
          }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to create presentation');
      }

      const data = await res.json();

      alert('✅ Presentation Created Successfully!');
      setReviewId(data.id);
      console.log(data);
    } catch (err) {
      console.error(err);
      alert('❌ Failed to create presentation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎤 Create Presentation Batch
          </h1>
          <p className="text-gray-600">
            Set up a new review session for interns to present and evaluate each other
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">📌 How It Works:</h3>
          <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
            <li>Create a batch for a group of interns presenting together</li>
            <li>Each intern will evaluate all other interns in the batch</li>
            <li>HR will provide the reference evaluation for each presenter</li>
            <li>Final scores include presentation quality and analytical skill assessment</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Batch</h2>

            <div className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Presentation Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Q2 2026 Intern Presentations"
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Name of this presentation event</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Batch Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Batch A, Engineering Batch 1"
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Group identifier for the batch</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Review Date *
                </label>
                <input
                  type="date"
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Date of the presentation event</p>
              </div>

              <button
                onClick={createPresentation}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-green-600 hover:shadow-lg cursor-pointer'
                }`}
              >
                {loading ? '⏳ Creating...' : '🎤 Create Presentation'}
              </button>

            </div>
          </div>

          {/* Result Section */}
          <div>
            {reviewId ? (
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-6">
                  <p className="text-5xl mb-3">✅</p>
                  <h3 className="text-2xl font-bold">Presentation Created!</h3>
                </div>

                <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-6">
                  <p className="text-sm text-green-100 mb-1">Presentation Title:</p>
                  <p className="text-lg font-bold mb-4">{title}</p>
                  
                  <p className="text-sm text-green-100 mb-1">Batch Name:</p>
                  <p className="text-lg font-bold mb-4">{batchName}</p>
                  
                  <p className="text-sm text-green-100 mb-1">Review Date:</p>
                  <p className="text-lg font-bold mb-6">{new Date(reviewDate).toLocaleDateString()}</p>

                  <p className="text-sm text-green-100 mb-1">Review ID (Use for Evaluations):</p>
                  <p className="text-2xl font-bold bg-white bg-opacity-20 p-4 rounded-lg break-all">
                    {reviewId}
                  </p>
                </div>

                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <p className="text-sm text-green-100 mb-2">📝 Next Steps:</p>
                  <ul className="text-sm text-green-50 space-y-2 list-disc list-inside">
                    <li>Add interns to this batch</li>
                    <li>Interns submit evaluations using this Review ID</li>
                    <li>HR provides reference evaluations</li>
                    <li>View final leaderboard with scores and penalties</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reviewId);
                    alert('Review ID copied to clipboard!');
                  }}
                  className="w-full mt-6 bg-white text-green-600 font-bold py-2 px-4 rounded-lg hover:bg-green-50 transition-all"
                >
                  📋 Copy Review ID
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-6xl mb-4">🎤</p>
                  <p className="text-gray-500 text-lg">
                    Fill in the form and create a new batch to get started
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}