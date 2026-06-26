import { Link } from 'react-router-dom';

export default function ProjectReviewDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            📊 Project Review Dashboard
          </h1>

          <p className="text-gray-600 mt-2">
            Manage presentations, evaluations, leaderboard, and saved data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

          <Link
            to="/project-review/create"
            className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-6 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
          >
            <div className="text-4xl mb-3">🎤</div>
            <h2 className="text-xl font-bold">
              Create Presentation
            </h2>
            <p className="text-blue-100 mt-2 text-sm">
              Create new review batch
            </p>
          </Link>

          <Link
            to="/project-review/evaluation"
            className="bg-gradient-to-r from-green-500 to-green-700 text-white rounded-2xl p-6 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
          >
            <div className="text-4xl mb-3">📝</div>
            <h2 className="text-xl font-bold">
              Submit Evaluation
            </h2>
            <p className="text-green-100 mt-2 text-sm">
              Evaluate presenters
            </p>
          </Link>

          <Link
            to="/project-review/leaderboard"
            className="bg-gradient-to-r from-purple-500 to-purple-800 text-white rounded-2xl p-6 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
          >
            <div className="text-4xl mb-3">🏆</div>
            <h2 className="text-xl font-bold">
              Leaderboard
            </h2>
            <p className="text-purple-100 mt-2 text-sm">
              View rankings
            </p>
          </Link>

          <Link
            to="/project-review/results"
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl p-6 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
          >
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-xl font-bold">
              Final Results
            </h2>
            <p className="text-orange-100 mt-2 text-sm">
              View final scores
            </p>
          </Link>

          <Link
            to="/project-review/saved"
            className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-2xl p-6 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
          >
            <div className="text-4xl mb-3">💾</div>
            <h2 className="text-xl font-bold">
              Saved Data
            </h2>
            <p className="text-indigo-100 mt-2 text-sm">
              Manage evaluations
            </p>
          </Link>

        </div>
      </div>
    </div>
  );
}
