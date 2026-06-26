import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api';
import { DashboardData } from '../types';

function StatCard({
  label,
  value,
  sub,
  color,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`card p-5 h-full ${
        onClick ? 'cursor-pointer hover:shadow-md transition' : ''
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-4xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-tata-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-red-600">Failed to load dashboard.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-tata-navy">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tata Motors Pimpri Plant — Intern Guide Matching</p>
      </div>

      {/* Alert banner */}
      {data.long_waitlisted_count > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
          <span className="text-orange-500 text-xl mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {data.long_waitlisted_count} intern{data.long_waitlisted_count > 1 ? 's' : ''} waitlisted for more than 7 days
            </p>
            <ul className="mt-1 space-y-0.5">
              {data.long_waitlisted.map((i) => (
                <li key={i.id} className="text-xs text-orange-700">
                  {i.full_name} ({i.intern_type}, {i.branch}) — since{' '}
                  {new Date(i.waiting_since).toLocaleDateString('en-IN')}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/waitlist')}
              className="mt-2 text-xs font-medium text-orange-700 underline hover:no-underline"
            >
              View Waitlist →
            </button>
          </div>
        </div>
      )}

      {/* Stat cards */}
     <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
  <StatCard
    label="Completed Interns"
    value={data.total_completed}
    sub="Internship Finished"
    color="text-green-600"
  />

  <StatCard
    label="Allotted Interns"
    value={data.total_allotted ?? 0}
    sub="Currently Assigned"
    color="text-purple-600"
    onClick={() => navigate('/allotted-breakdown')}
  />

  <StatCard
    label="Guides at Capacity"
    value={data.guides_at_capacity}
    sub="No slots available"
    color="text-red-600"
  />

  <StatCard
    label="Waitlisted"
    value={data.waitlisted}
    sub="Awaiting placement"
    color="text-orange-500"
    onClick={() => navigate('/waitlisted-breakdown')}
  />

  <StatCard
    label="Pending Confirmation"
    value={data.pending_confirmation}
    sub="Matches awaiting HR"
    color="text-yellow-600"
  />

  <StatCard
    label="Left / Removed"
    value={data.left_count}
    sub="Interns who left or were removed"
    color="text-pink-600"
  />

  <StatCard
    label="Yet to Join"
    value={data.yet_to_join_count}
    sub="Interns who have not joined yet"
    color="text-blue-600"
    onClick={() => navigate('/yet-to-join-breakdown')}
  />
</div>

      {/* Quick actions */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {data.pending_confirmation > 0 && (
            <button
              onClick={() => navigate('/interns?status=Matched')}
              className="btn-primary"
            >
              Review {data.pending_confirmation} Pending Match{data.pending_confirmation > 1 ? 'es' : ''}
            </button>
          )}
          <button onClick={() => navigate('/interns/new')} className="btn-secondary">
            + Add New Intern
          </button>
          <button onClick={() => navigate('/guides/new')} className="btn-secondary">
            + Add New Guide
          </button>
          {data.total_allotted && data.total_allotted > 0 && (
            <button onClick={() => navigate('/interns?status=Allotted')} className="btn-secondary">
              View Allotted ({data.total_allotted})
            </button>
          )}
          {data.waitlisted > 0 && (
            <button onClick={() => navigate('/waitlist')} className="btn-secondary">
              View Waitlist ({data.waitlisted})
            </button>
          )}
        </div>
      </div>

      {/* Status overview */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Status Overview</h2>
        <div className="space-y-3">
          {[
            { label: 'Allotted', value: data.total_allotted ?? 0, color: 'bg-green-500', total: data.total_completed + data.waitlisted + data.pending_confirmation + (data.total_allotted ?? 0) + (data.left_count ?? 0) + (data.yet_to_join_count ?? 0)},
            { label: 'Pending Confirmation', value: data.pending_confirmation, color: 'bg-yellow-400', total: data.total_completed + data.waitlisted + data.pending_confirmation + (data.total_allotted ?? 0) + (data.left_count ?? 0) + (data.yet_to_join_count ?? 0)},
            { label: 'Waitlisted', value: data.waitlisted, color: 'bg-orange-400', total: data.total_completed + data.waitlisted + data.pending_confirmation + (data.total_allotted ?? 0) + (data.left_count ?? 0) + (data.yet_to_join_count ?? 0)},
            { label: 'Completed', value: data.total_completed, color: 'bg-purple-500', total: data.total_completed + data.waitlisted + data.pending_confirmation + (data.total_allotted ?? 0) + (data.left_count ?? 0) + (data.yet_to_join_count ?? 0)},
            { label: 'Left / Removed', value: data.left_count, color: 'bg-pink-500', total: data.total_completed + data.waitlisted + data.pending_confirmation + (data.total_allotted ?? 0) + (data.left_count ?? 0) + (data.yet_to_join_count ?? 0)},
          ].map(({ label, value, color, total }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-44">{label}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 w-6 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
